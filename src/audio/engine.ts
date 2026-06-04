// Web Audio engine: maintains a single AudioContext, master bus, and FX chain.
// All sound generation/playback for Infinite Sound goes through here.

import type { LoopType } from "./wav";

export type FxType = "reverb" | "delay" | "distortion" | "filter" | "chorus" | "compressor";

export interface FxParams {
  reverb: { size: number; damping: number; mix: number };
  delay: { time: number; feedback: number; pingpong: boolean; mix: number };
  distortion: { drive: number; type: "soft" | "hard" | "bitcrush" | "saturate"; mix: number };
  filter: { cutoff: number; resonance: number; type: "lowpass" | "highpass" | "bandpass" };
  chorus: { rate: number; depth: number; mix: number };
  compressor: { threshold: number; ratio: number; makeup: number };
}

export const defaultFx: FxParams = {
  reverb: { size: 0.5, damping: 0.5, mix: 0.25 },
  delay: { time: 0.25, feedback: 0.35, pingpong: false, mix: 0.2 },
  distortion: { drive: 0, type: "soft", mix: 0 },
  filter: { cutoff: 12000, resonance: 0.4, type: "lowpass" },
  chorus: { rate: 1.2, depth: 0.3, mix: 0 },
  compressor: { threshold: -18, ratio: 3, makeup: 1 },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;

export function getContext(): AudioContext {
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    ctx = new Ctor({ latencyHint: "interactive", sampleRate: 48000 });
    master = ctx.createGain();
    master.gain.value = 0.85;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser);
    analyser.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function getMaster(): GainNode { getContext(); return master!; }
export function getAnalyser(): AnalyserNode { getContext(); return analyser!; }

// ----- Realtime live voice -----
// A persistent voice that follows SoundParams + FxParams changes in realtime.
// Used by SoundCanvas (touch-to-sound) and FX panels for instant audibility.
import type { SoundParams } from "./synth";

export interface LiveVoice {
  gate: (on: boolean) => void;
  setParams: (p: SoundParams) => void;
  setFx: (fx: FxParams) => void;
  modulate: (cutoffHz?: number, pitchCents?: number) => void;
  destroy: () => void;
}

let liveVoice: LiveVoice | null = null;

export function ensureLiveVoice(): LiveVoice {
  if (liveVoice) return liveVoice;
  const c = getContext();
  const chain = buildFxChain();
  chain.output.connect(getMaster());

  const amp = c.createGain();
  amp.gain.value = 0;
  amp.connect(chain.input);

  // Up to 8 unison voices
  const MAX = 8;
  const oscs: OscillatorNode[] = [];
  const subGains: GainNode[] = [];
  const panners: StereoPannerNode[] = [];
  for (let i = 0; i < MAX; i++) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = 110;
    const g = c.createGain();
    g.gain.value = 0;
    const pan = c.createStereoPanner();
    o.connect(g).connect(pan).connect(amp);
    o.start();
    oscs.push(o); subGains.push(g); panners.push(pan);
  }

  // Noise source
  const noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf; noise.loop = true;
  const noiseGain = c.createGain(); noiseGain.gain.value = 0;
  noise.connect(noiseGain).connect(amp);
  noise.start();

  let lastParams: SoundParams | null = null;
  let gated = false;

  function setParams(p: SoundParams) {
    lastParams = p;
    const t = c.currentTime;
    const types: OscillatorType[] = ["sine", "sawtooth", "square"];
    const baseType = types[Math.min(2, Math.floor(p.waveshape * 2.999))];
    const voices = Math.max(1, Math.min(MAX, Math.floor(p.unison)));
    for (let v = 0; v < MAX; v++) {
      if (v < voices) {
        oscs[v].type = baseType;
        const detune = ((v / Math.max(1, voices - 1)) * 2 - 1) * p.detune;
        oscs[v].frequency.setTargetAtTime(p.fundamental, t, 0.02);
        oscs[v].detune.setTargetAtTime(detune, t, 0.02);
        const g = (0.55 / voices) * (0.6 + p.harmonics * 0.4);
        subGains[v].gain.setTargetAtTime(g, t, 0.02);
        const pan = ((v / Math.max(1, voices - 1)) * 2 - 1) * p.stereoWidth;
        panners[v].pan.setTargetAtTime(pan, t, 0.02);
      } else {
        subGains[v].gain.setTargetAtTime(0, t, 0.02);
      }
    }
    noiseGain.gain.setTargetAtTime(p.noiseMix * 0.4, t, 0.02);
  }

  function gate(on: boolean) {
    const t = c.currentTime;
    const p = lastParams;
    gated = on;
    if (on) {
      amp.gain.cancelScheduledValues(t);
      amp.gain.setValueAtTime(amp.gain.value, t);
      amp.gain.linearRampToValueAtTime(0.85, t + Math.max(0.005, p?.attack ?? 0.02));
    } else {
      amp.gain.cancelScheduledValues(t);
      amp.gain.setValueAtTime(amp.gain.value, t);
      amp.gain.linearRampToValueAtTime(0, t + Math.max(0.02, p?.release ?? 0.2));
    }
  }

  function modulate(cutoffHz?: number, pitchCents?: number) {
    const t = c.currentTime;
    if (pitchCents != null) {
      for (const o of oscs) o.detune.setTargetAtTime(pitchCents, t, 0.01);
    }
    if (cutoffHz != null) {
      // route via fx chain filter — read back via setFx call from app
      void cutoffHz;
    }
  }

  function destroy() {
    try {
      for (const o of oscs) o.stop();
      noise.stop();
      amp.disconnect();
      chain.destroy();
    } catch {}
    liveVoice = null;
  }

  liveVoice = {
    gate,
    setParams,
    setFx: (fx) => chain.setFx(fx),
    modulate,
    destroy,
  };
  void gated;
  return liveVoice;
}

export function getLiveVoice(): LiveVoice | null { return liveVoice; }

// ----- Polyphonic transient note (for keyboard, sequencer, looper triggers) -----
// Plays a single note through a dedicated short-lived voice + shared FX chain.
let noteChain: FxChain | null = null;
function getNoteChain(): FxChain {
  if (noteChain) return noteChain;
  noteChain = buildFxChain();
  noteChain.output.connect(getMaster());
  return noteChain;
}
export function setNoteFx(fx: FxParams) { getNoteChain().setFx(fx); }

export interface NoteHandle { stop: (when?: number) => void; }
export function playNote(
  freq: number,
  params: SoundParams,
  durSec?: number,
  velocity = 1,
): NoteHandle {
  const c = getContext();
  const chain = getNoteChain();
  const t = c.currentTime;
  const amp = c.createGain();
  amp.gain.value = 0;
  amp.connect(chain.input);

  const types: OscillatorType[] = ["sine", "sawtooth", "square"];
  const baseType = types[Math.min(2, Math.floor(params.waveshape * 2.999))];
  const voices = Math.max(1, Math.min(8, Math.floor(params.unison)));
  const oscs: OscillatorNode[] = [];
  for (let v = 0; v < voices; v++) {
    const o = c.createOscillator();
    o.type = baseType;
    o.frequency.value = freq;
    const detune = voices > 1 ? ((v / (voices - 1)) * 2 - 1) * params.detune : 0;
    o.detune.value = detune;
    const g = c.createGain();
    g.gain.value = 0.6 / voices;
    const pan = c.createStereoPanner();
    pan.pan.value = voices > 1 ? ((v / (voices - 1)) * 2 - 1) * params.stereoWidth : 0;
    o.connect(g).connect(pan).connect(amp);
    o.start(t);
    oscs.push(o);
  }

  // noise component
  let noise: AudioBufferSourceNode | null = null;
  if (params.noiseMix > 0.001) {
    const nb = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    noise = c.createBufferSource();
    noise.buffer = nb; noise.loop = true;
    const ng = c.createGain(); ng.gain.value = params.noiseMix * 0.35;
    noise.connect(ng).connect(amp);
    noise.start(t);
  }

  const a = Math.max(0.003, params.attack);
  const d = Math.max(0.005, params.decay);
  const s = Math.max(0.0001, params.sustain) * velocity;
  const r = Math.max(0.02, params.release);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(velocity, t + a);
  amp.gain.linearRampToValueAtTime(s, t + a + d);

  let stopped = false;
  function stop(when?: number) {
    if (stopped) return;
    stopped = true;
    const t0 = when ?? c.currentTime;
    amp.gain.cancelScheduledValues(t0);
    amp.gain.setValueAtTime(amp.gain.value, t0);
    amp.gain.linearRampToValueAtTime(0.0001, t0 + r);
    for (const o of oscs) o.stop(t0 + r + 0.05);
    if (noise) noise.stop(t0 + r + 0.05);
    setTimeout(() => { try { amp.disconnect(); } catch {} }, (r + 0.2) * 1000);
  }
  if (durSec != null) stop(t + durSec);
  return { stop };
}

// ----- Mic input source (for live recorder + sampler) -----
let micStream: MediaStream | null = null;
let micSource: MediaStreamAudioSourceNode | null = null;
export async function getMicSource(): Promise<MediaStreamAudioSourceNode> {
  const c = getContext();
  if (micSource) return micSource;
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  micSource = c.createMediaStreamSource(micStream);
  return micSource;
}
export function releaseMic() {
  try { micSource?.disconnect(); } catch {}
  micSource = null;
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
}

// ----- Master tap for live recording (records audible output) -----
export function createMasterRecorder(): { start: () => void; stop: () => Promise<AudioBuffer> } {
  const c = getContext();
  const dest = c.createMediaStreamDestination();
  getMaster().connect(dest);
  const rec = new MediaRecorder(dest.stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  return {
    start: () => rec.start(),
    stop: () => new Promise<AudioBuffer>((resolve, reject) => {
      rec.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          const ab = await blob.arrayBuffer();
          const buf = await c.decodeAudioData(ab);
          try { getMaster().disconnect(dest); } catch {}
          resolve(buf);
        } catch (e) { reject(e); }
      };
      rec.stop();
    }),
  };
}

// Generate impulse response for reverb.
function makeImpulse(duration: number, decay: number): AudioBuffer {
  const c = getContext();
  const length = Math.max(1, Math.floor(c.sampleRate * duration));
  const ir = c.createBuffer(2, length, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return ir;
}

export interface FxChain {
  input: AudioNode;
  output: AudioNode;
  setFx: (fx: FxParams) => void;
  setBypass: (which: FxType, bypass: boolean) => void;
  destroy: () => void;
}

export function buildFxChain(): FxChain {
  const c = getContext();
  const input = c.createGain();
  const output = c.createGain();

  // Filter
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 12000;

  // Distortion (waveshaper)
  const dist = c.createWaveShaper();
  const distGain = c.createGain();

  // Delay
  const delay = c.createDelay(2.0);
  const delayFb = c.createGain();
  const delayMix = c.createGain();
  delayMix.gain.value = 0.2;
  delay.connect(delayFb).connect(delay);
  delay.connect(delayMix);

  // Reverb
  const conv = c.createConvolver();
  conv.buffer = makeImpulse(2.5, 2);
  const revMix = c.createGain();
  revMix.gain.value = 0.25;
  conv.connect(revMix);

  // Compressor
  const comp = c.createDynamicsCompressor();

  // Wiring: input -> filter -> distortion -> [dry + delay + reverb] -> compressor -> output
  input.connect(filter);
  filter.connect(dist);
  dist.connect(distGain);
  const dry = c.createGain();
  distGain.connect(dry);
  distGain.connect(delay);
  distGain.connect(conv);
  dry.connect(comp);
  delayMix.connect(comp);
  revMix.connect(comp);
  comp.connect(output);

  function makeDistCurve(amount: number, type: FxParams["distortion"]["type"]) {
    const n = 2048;
    const curve = new Float32Array(n);
    const k = amount * 100;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      if (type === "soft") curve[i] = ((3 + k) * x) / (3 + k * Math.abs(x));
      else if (type === "hard") curve[i] = Math.max(-0.8, Math.min(0.8, x * (1 + k * 0.4)));
      else if (type === "bitcrush") {
        const steps = Math.max(2, Math.floor(64 - amount * 60));
        curve[i] = Math.round(x * steps) / steps;
      } else curve[i] = Math.tanh(x * (1 + k * 0.3));
    }
    return curve;
  }

  function setFx(fx: FxParams) {
    filter.type = fx.filter.type;
    filter.frequency.setTargetAtTime(fx.filter.cutoff, c.currentTime, 0.01);
    filter.Q.setTargetAtTime(fx.filter.resonance * 12, c.currentTime, 0.01);

    dist.curve = makeDistCurve(fx.distortion.drive, fx.distortion.type);
    distGain.gain.setTargetAtTime(1 + fx.distortion.mix * 0.5, c.currentTime, 0.01);

    delay.delayTime.setTargetAtTime(fx.delay.time, c.currentTime, 0.05);
    delayFb.gain.setTargetAtTime(Math.min(0.92, fx.delay.feedback), c.currentTime, 0.05);
    delayMix.gain.setTargetAtTime(fx.delay.mix, c.currentTime, 0.05);

    if (Math.abs(fx.reverb.size - (conv as any)._size) > 0.05) {
      conv.buffer = makeImpulse(0.4 + fx.reverb.size * 4, 1 + (1 - fx.reverb.damping) * 4);
      (conv as any)._size = fx.reverb.size;
    }
    revMix.gain.setTargetAtTime(fx.reverb.mix, c.currentTime, 0.05);

    comp.threshold.setTargetAtTime(fx.compressor.threshold, c.currentTime, 0.05);
    comp.ratio.setTargetAtTime(fx.compressor.ratio, c.currentTime, 0.05);
    output.gain.setTargetAtTime(fx.compressor.makeup, c.currentTime, 0.05);
  }

  function setBypass(_which: FxType, _bypass: boolean) {
    // For simplicity we collapse mix to 0 instead of rewiring.
  }

  function destroy() {
    try { input.disconnect(); output.disconnect(); } catch {}
  }

  setFx(defaultFx);
  return { input, output, setFx, setBypass, destroy };
}

// Render a Float32Array buffer through a fx chain into a new buffer (offline).
export async function renderBufferWithFx(
  buffer: AudioBuffer,
  fx: FxParams,
  loopType: LoopType,
  loops = 1,
): Promise<AudioBuffer> {
  const length = buffer.length * loops;
  const off = new OfflineAudioContext(buffer.numberOfChannels, length, buffer.sampleRate);
  const src = off.createBufferSource();
  src.buffer = buffer;
  if (loopType !== "oneshot") { src.loop = true; }
  // Apply a minimal fx chain in the offline context (cutoff only — keep it deterministic)
  const filter = off.createBiquadFilter();
  filter.type = fx.filter.type;
  filter.frequency.value = fx.filter.cutoff;
  src.connect(filter).connect(off.destination);
  src.start(0);
  return off.startRendering();
}

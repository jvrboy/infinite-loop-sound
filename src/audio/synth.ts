// Synthesis primitives: render a sound into an AudioBuffer based on the SoundParams model.
// Used by both real-time playback and the export renderer.

import { getContext } from "./engine";

export type Waveshape = "sine" | "saw" | "square" | "triangle";
export type FlowShape = "sine" | "rise" | "fall" | "oscillate" | "spike" | "random";

export interface SoundParams {
  // Shape
  fundamental: number;       // Hz
  harmonics: number;         // 0..1 (sine -> rich)
  waveshape: number;         // 0..1 maps sine->saw->square
  noiseMix: number;          // 0..1
  brightness: number;        // 0..1 (filter cutoff target)
  sharpness: number;         // 0..1 (resonance / formant)
  unison: number;            // 1..8
  detune: number;            // cents
  stereoWidth: number;       // 0..1
  // Envelope
  attack: number;            // s
  decay: number;             // s
  sustain: number;           // 0..1
  release: number;           // s
  duration: number;          // s
  // Flow / modulation
  flowShape: FlowShape;
  flowRate: number;          // Hz
  flowDepth: number;         // 0..1
  flowTarget: "pitch" | "cutoff" | "volume" | "pan";
  // Polyphony
  chord: number[];           // semitone offsets
}

export const defaultParams: SoundParams = {
  fundamental: 110,
  harmonics: 0.4,
  waveshape: 0.0,
  noiseMix: 0.0,
  brightness: 0.6,
  sharpness: 0.3,
  unison: 1,
  detune: 8,
  stereoWidth: 0.4,
  attack: 0.02,
  decay: 0.2,
  sustain: 0.8,
  release: 0.4,
  duration: 3.0,
  flowShape: "sine",
  flowRate: 0.5,
  flowDepth: 0.0,
  flowTarget: "cutoff",
  chord: [0],
};

function flowValue(shape: FlowShape, t: number): number {
  switch (shape) {
    case "sine": return Math.sin(t * Math.PI * 2);
    case "rise": return Math.min(1, t * 2 - 1);
    case "fall": return Math.max(-1, 1 - t * 2);
    case "oscillate": return Math.sin(t * Math.PI * 4);
    case "spike": return t < 0.05 ? 1 : Math.exp(-(t - 0.05) * 8);
    case "random": return Math.sin(t * 17.3) * Math.cos(t * 9.7);
  }
}

// Render the SoundParams to a Float32Array stereo buffer (offline).
export async function renderSound(params: SoundParams): Promise<AudioBuffer> {
  const sampleRate = 48000;
  const length = Math.max(1, Math.floor(params.duration * sampleRate));
  const off = new OfflineAudioContext(2, length, sampleRate);

  const gain = off.createGain();
  gain.connect(off.destination);

  // Envelope automation
  const t0 = 0;
  const a = Math.max(0.001, params.attack);
  const d = Math.max(0.001, params.decay);
  const s = params.sustain;
  const r = Math.max(0.01, params.release);
  const releaseStart = Math.max(a + d, params.duration - r);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(1, t0 + a);
  gain.gain.linearRampToValueAtTime(s, t0 + a + d);
  gain.gain.setValueAtTime(s, releaseStart);
  gain.gain.linearRampToValueAtTime(0, params.duration);

  const filter = off.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 200 + params.brightness * 18000;
  filter.Q.value = params.sharpness * 12;
  filter.connect(gain);

  const merger = off.createChannelMerger(2);
  merger.connect(filter);

  const types: OscillatorType[] = ["sine", "sawtooth", "square"];
  const shapeIdx = Math.min(2, Math.floor(params.waveshape * 2.999));
  const baseType = types[shapeIdx];

  for (const semi of params.chord) {
    const baseFreq = params.fundamental * Math.pow(2, semi / 12);
    const voices = Math.max(1, Math.floor(params.unison));
    for (let v = 0; v < voices; v++) {
      const detune = ((v / Math.max(1, voices - 1)) * 2 - 1) * params.detune;
      const pan = ((v / Math.max(1, voices - 1)) * 2 - 1) * params.stereoWidth;

      const osc = off.createOscillator();
      osc.type = baseType;
      osc.frequency.value = baseFreq;
      osc.detune.value = detune;

      // Harmonic richness via additional sines
      const subGain = off.createGain();
      subGain.gain.value = 0.55;
      osc.connect(subGain);

      // Add harmonic partials
      const partials = Math.floor(params.harmonics * 6);
      for (let h = 2; h <= 1 + partials; h++) {
        const p = off.createOscillator();
        p.type = "sine";
        p.frequency.value = baseFreq * h;
        const pg = off.createGain();
        pg.gain.value = (params.harmonics * 0.4) / h;
        p.connect(pg).connect(subGain);
        p.start(0); p.stop(params.duration);
      }

      const panner = off.createStereoPanner();
      panner.pan.value = pan;
      subGain.connect(panner);

      // Split to L/R via merger
      panner.connect(merger, 0, 0);
      panner.connect(merger, 0, 1);

      osc.start(0); osc.stop(params.duration);

      // Flow modulation (sampled discretely)
      if (params.flowDepth > 0.001) {
        const steps = 64;
        const targetParam =
          params.flowTarget === "pitch" ? osc.detune :
          params.flowTarget === "cutoff" ? filter.frequency :
          params.flowTarget === "volume" ? subGain.gain :
          panner.pan;
        const baseVal = targetParam.value;
        for (let i = 0; i <= steps; i++) {
          const tt = (i / steps) * params.duration;
          const v = flowValue(params.flowShape, (tt * params.flowRate) % 1);
          const scale =
            params.flowTarget === "pitch" ? 200 :
            params.flowTarget === "cutoff" ? 8000 :
            params.flowTarget === "volume" ? 0.5 : 1;
          targetParam.linearRampToValueAtTime(baseVal + v * params.flowDepth * scale, tt);
        }
      }
    }
  }

  // Noise layer
  if (params.noiseMix > 0.001) {
    const noiseBuf = off.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuf.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * params.noiseMix * 0.5;
    }
    const ns = off.createBufferSource();
    ns.buffer = noiseBuf;
    ns.connect(filter);
    ns.start(0);
  }

  return off.startRendering();
}

// Get mono Float32Array of an AudioBuffer (mix down).
export function bufferToMono(buf: AudioBuffer): Float32Array {
  if (buf.numberOfChannels === 1) return buf.getChannelData(0);
  const len = buf.length;
  const out = new Float32Array(len);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) out[i] += data[i];
  }
  for (let i = 0; i < len; i++) out[i] /= buf.numberOfChannels;
  return out;
}

export function bufferChannels(buf: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let ch = 0; ch < buf.numberOfChannels; ch++) out.push(buf.getChannelData(ch).slice());
  return out;
}

// Quick analyze: fundamental via autocorrelation, peak amp.
export function analyzeBuffer(data: Float32Array, sampleRate: number) {
  const len = Math.min(data.length, sampleRate); // up to 1s
  // Peak
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(data[i]));
  // RMS
  let rms = 0;
  for (let i = 0; i < len; i++) rms += data[i] * data[i];
  rms = Math.sqrt(rms / len);
  // Autocorrelation pitch (very rough)
  let bestLag = 0, bestVal = 0;
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.floor(sampleRate / 60);
  for (let lag = minLag; lag < maxLag; lag++) {
    let s = 0;
    for (let i = 0; i < len - lag; i++) s += data[i] * data[i + lag];
    if (s > bestVal) { bestVal = s; bestLag = lag; }
  }
  const fundamental = bestLag > 0 ? sampleRate / bestLag : 0;
  return { peak, rms, fundamental, dynamicRange: 20 * Math.log10((peak + 1e-9) / (rms + 1e-9)) };
}

// Realtime playback helper: plays a sound (synth-rendered or imported buffer) with loop settings.
import { getContext, getMaster, buildFxChain, type FxChain } from "./engine";
import { renderSound } from "./synth";
import type { Sound } from "@/state/store";

let current: {
  src: AudioBufferSourceNode;
  chain: FxChain;
  startedAt: number;
  buffer: AudioBuffer;
  loopStartSec: number;
  loopEndSec: number;
  mode: "sustain" | "oneshot" | "pingpong";
  cycles: number;
  onCycle?: () => void;
} | null = null;

// Build a ping-pong buffer: forward + reversed concatenated with short crossfade.
function buildPingPongBuffer(src: AudioBuffer, loopStart: number, loopEnd: number, xfadeSec: number): AudioBuffer {
  const ctx = getContext();
  const sr = src.sampleRate;
  const len = loopEnd - loopStart;
  const xfade = Math.min(Math.floor(xfadeSec * sr), Math.floor(len / 4));
  const total = len * 2;
  const out = ctx.createBuffer(src.numberOfChannels, total, sr);
  for (let c = 0; c < src.numberOfChannels; c++) {
    const inp = src.getChannelData(c);
    const o = out.getChannelData(c);
    // forward
    for (let i = 0; i < len; i++) o[i] = inp[loopStart + i] ?? 0;
    // reverse
    for (let i = 0; i < len; i++) o[len + i] = inp[loopEnd - 1 - i] ?? 0;
    // equal-power xfade at the two seams
    for (let i = 0; i < xfade; i++) {
      const t = i / xfade;
      const a = Math.cos(t * Math.PI / 2);
      const b = Math.sin(t * Math.PI / 2);
      // seam 1: end of forward → start of reverse
      const i1 = len - xfade + i;
      o[i1] = o[i1] * a + (inp[loopEnd - 1 - i] ?? 0) * b;
      // seam 2: end of reverse → start of forward (loop wrap)
      const i2 = total - xfade + i;
      o[i2] = o[i2] * a + (inp[loopStart + i] ?? 0) * b;
    }
  }
  return out;
}

export async function ensureBuffer(sound: Sound): Promise<AudioBuffer> {
  if (sound.buffer) return sound.buffer;
  return renderSound(sound.params);
}

export async function playSound(
  sound: Sound,
  opts?: { loopOnly?: boolean; xfadeMs?: number; onCycle?: () => void },
): Promise<AudioBuffer> {
  stopPlayback();
  const ctx = getContext();
  const buffer = await ensureBuffer(sound);
  const sr = buffer.sampleRate;
  const loopStartSec = sound.loopStart / sr;
  const loopEndSec = (sound.loopEnd || buffer.length) / sr;

  const src = ctx.createBufferSource();
  const chain = buildFxChain();
  let mode: "sustain" | "oneshot" | "pingpong" = "sustain";

  if (sound.loopType === "oneshot") {
    mode = "oneshot";
    src.buffer = buffer;
    src.loop = false;
    // schedule a tail fade if loopEnd defined
    if (loopEndSec > loopStartSec) {
      const tailGain = ctx.createGain();
      src.disconnect();
      src.connect(tailGain).connect(chain.input);
      const now = ctx.currentTime;
      tailGain.gain.setValueAtTime(1, now + loopStartSec);
      tailGain.gain.linearRampToValueAtTime(0.0001, now + loopEndSec);
    } else {
      src.connect(chain.input);
    }
  } else if (sound.loopType === "pingpong") {
    mode = "pingpong";
    const ppBuf = buildPingPongBuffer(
      buffer,
      sound.loopStart,
      sound.loopEnd || buffer.length,
      (opts?.xfadeMs ?? 5) / 1000,
    );
    src.buffer = ppBuf;
    src.loop = true;
    src.loopStart = 0;
    src.loopEnd = ppBuf.duration;
    src.connect(chain.input);
  } else {
    mode = "sustain";
    src.buffer = buffer;
    src.loop = true;
    if (loopEndSec > loopStartSec) {
      src.loopStart = loopStartSec;
      src.loopEnd = loopEndSec;
    }
    src.connect(chain.input);
  }

  chain.setFx(sound.fx);
  chain.output.connect(getMaster());

  src.onended = () => { if (current?.src === src) current = null; };
  src.start(0, opts?.loopOnly && mode !== "pingpong" ? loopStartSec : 0);

  current = {
    src, chain,
    startedAt: ctx.currentTime,
    buffer,
    loopStartSec,
    loopEndSec,
    mode,
    cycles: 0,
    onCycle: opts?.onCycle,
  };

  // cycle counter timer
  if (mode !== "oneshot" && opts?.onCycle) {
    const period = mode === "pingpong"
      ? src.buffer!.duration
      : (loopEndSec - loopStartSec);
    if (period > 0.05) {
      const tick = () => {
        if (!current || current.src !== src) return;
        current.cycles++;
        opts.onCycle?.();
        setTimeout(tick, period * 1000);
      };
      setTimeout(tick, period * 1000);
    }
  }

  return buffer;
}

export function stopPlayback() {
  if (current) {
    try { current.src.stop(); } catch {}
    try { current.chain.destroy(); } catch {}
    current = null;
  }
}

export function isPlaying() { return current != null; }

// Returns current playhead position in source-buffer sample index, or null if stopped.
export function getPlayheadSample(): number | null {
  if (!current) return null;
  const ctx = getContext();
  const elapsed = ctx.currentTime - current.startedAt;
  const sr = current.buffer.sampleRate;
  if (current.mode === "oneshot") {
    return Math.min(current.buffer.length - 1, Math.floor(elapsed * sr));
  }
  if (current.mode === "sustain") {
    const ls = current.loopStartSec, le = current.loopEndSec;
    if (elapsed < ls || le <= ls) return Math.floor(elapsed * sr) % current.buffer.length;
    const into = (elapsed - ls) % (le - ls);
    return Math.floor((ls + into) * sr);
  }
  // pingpong: src.buffer is the synthesized 2x buffer, but playhead inside
  // refers to the original buffer's [loopStart, loopEnd] either forward or reversed.
  const period = current.buffer ? (current.loopEndSec - current.loopStartSec) : 0;
  if (period <= 0) return current.loopStart ?? 0;
  const ppElapsed = elapsed % (period * 2);
  if (ppElapsed < period) {
    return Math.floor((current.loopStartSec + ppElapsed) * sr);
  }
  return Math.floor((current.loopEndSec - (ppElapsed - period)) * sr);
}

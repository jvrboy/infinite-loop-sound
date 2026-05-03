// Light DSP: morph two buffers, granulate, time-stretch (basic), pitch-shift via playback rate.
export function morphBuffers(a: Float32Array, b: Float32Array, amount: number): Float32Array {
  const len = Math.max(a.length, b.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i % b.length] ?? 0;
    out[i] = av * (1 - amount) + bv * amount;
  }
  return out;
}

// Granulate: rearrange `source` grains using onset times derived from `target`.
export function granulate(
  source: Float32Array,
  target: Float32Array,
  sampleRate: number,
  grainMs = 60,
): Float32Array {
  const grainSize = Math.max(64, Math.floor((grainMs / 1000) * sampleRate));
  const onsets = detectOnsets(target, sampleRate);
  if (!onsets.length) onsets.push(0);
  const out = new Float32Array(target.length);
  for (let i = 0; i < onsets.length; i++) {
    const writePos = onsets[i];
    const readPos = (i * 9301 + 49297) % Math.max(1, source.length - grainSize);
    const len = Math.min(grainSize, out.length - writePos, source.length - readPos);
    for (let j = 0; j < len; j++) {
      const env = Math.sin((j / len) * Math.PI);
      out[writePos + j] += source[readPos + j] * env;
    }
  }
  // normalize
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] /= peak;
  return out;
}

export function detectOnsets(data: Float32Array, sampleRate: number, threshold = 0.1): number[] {
  const win = Math.floor(sampleRate / 100); // 10ms
  const out: number[] = [];
  let prev = 0;
  let last = -win * 5;
  for (let i = 0; i < data.length - win; i += win) {
    let energy = 0;
    for (let j = 0; j < win; j++) energy += data[i + j] * data[i + j];
    energy = Math.sqrt(energy / win);
    if (energy - prev > threshold && i - last > win * 4) {
      out.push(i);
      last = i;
    }
    prev = energy;
  }
  return out;
}

export function normalizeBuffer(data: Float32Array, target = 0.9): Float32Array {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak < 1e-6) return data;
  const gain = target / peak;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] * gain;
  return out;
}

export function reverseBuffer(data: Float32Array): Float32Array {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[data.length - 1 - i];
  return out;
}

export function stripSilence(data: Float32Array, threshold = 0.005): { data: Float32Array; offset: number } {
  let start = 0, end = data.length;
  while (start < data.length && Math.abs(data[start]) < threshold) start++;
  while (end > start && Math.abs(data[end - 1]) < threshold) end--;
  return { data: data.slice(start, end), offset: start };
}

// Suggest 3 loop regions ranked by spectral similarity score.
import { findNearestZeroCrossing, loopabilityScore } from "./wav";
export interface LoopSuggestion { start: number; end: number; score: number; }
export function suggestLoops(data: Float32Array, sampleRate: number): LoopSuggestion[] {
  const minLen = Math.floor(sampleRate * 0.25);
  const maxLen = Math.min(data.length - 1, Math.floor(sampleRate * 4));
  const candidates: LoopSuggestion[] = [];
  const startCandidates = [0.1, 0.25, 0.4].map((p) => Math.floor(data.length * p));
  for (const s0 of startCandidates) {
    let bestEnd = s0 + minLen;
    let bestScore = 0;
    for (let len = minLen; len < maxLen && s0 + len < data.length; len += Math.floor(sampleRate * 0.05)) {
      const e = s0 + len;
      const score = loopabilityScore(data, s0, e);
      if (score > bestScore) { bestScore = score; bestEnd = e; }
    }
    const s = findNearestZeroCrossing(data, s0);
    const e = findNearestZeroCrossing(data, bestEnd);
    candidates.push({ start: s, end: e, score: bestScore });
  }
  return candidates.sort((a, b) => b.score - a.score);
}

// Float32 buffer -> stereo AudioBuffer
export function monoToBuffer(ctx: BaseAudioContext, data: Float32Array, sampleRate: number): AudioBuffer {
  const buf = ctx.createBuffer(1, data.length, sampleRate);
  buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
  return buf;
}

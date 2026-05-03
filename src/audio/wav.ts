// 24-bit / 48kHz WAV encoder with smpl + acid + LIST INFO chunks for seamless loop playback in DAW samplers.
// Reference: https://www.recordingblogs.com/wiki/sample-chunk-of-a-wave-file

export type LoopType = "forward" | "pingpong" | "oneshot";

export interface WavExportOptions {
  channels: Float32Array[]; // each channel of audio data
  sampleRate: number;
  bitDepth?: 16 | 24 | 32; // 32 = float
  loopStart?: number; // sample index
  loopEnd?: number; // sample index (exclusive)
  loopType?: LoopType;
  bpm?: number;
  rootNote?: number; // MIDI note number
  tags?: string[];
  name?: string;
  acidized?: boolean;
}

const SMPL_TYPE: Record<LoopType, number> = {
  forward: 0,
  pingpong: 1,
  oneshot: 0,
};

function fourcc(s: string): number[] { return [...s].map((c) => c.charCodeAt(0)); }

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function interleave(channels: Float32Array[]): Float32Array {
  const ch = channels.length;
  const len = channels[0].length;
  if (ch === 1) return channels[0];
  const out = new Float32Array(len * ch);
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) out[i * ch + c] = channels[c][i];
  }
  return out;
}

function pad(v: number) { return Math.max(-1, Math.min(1, v)); }

export function encodeWav(opts: WavExportOptions): Blob {
  const bitDepth = opts.bitDepth ?? 24;
  const channels = opts.channels;
  const numChannels = channels.length;
  const sampleRate = opts.sampleRate;
  const bytesPerSample = bitDepth / 8;
  const interleaved = interleave(channels);
  const numFrames = channels[0].length;

  const dataSize = numFrames * numChannels * bytesPerSample;
  const fmtSize = bitDepth === 32 ? 18 : 16;
  const audioFormat = bitDepth === 32 ? 3 : 1; // 3 = IEEE float

  // smpl chunk: 36 base + 24 per loop
  const includeSmpl = opts.loopType && opts.loopType !== "oneshot" && opts.loopStart != null && opts.loopEnd != null;
  const smplSize = includeSmpl ? 36 + 24 : 0;

  // acid chunk: 24 bytes
  const includeAcid = opts.acidized ?? !!includeSmpl;
  const acidSize = includeAcid ? 24 : 0;

  // LIST INFO chunk: variable
  const listEntries: Array<[string, string]> = [];
  if (opts.name) listEntries.push(["INAM", opts.name]);
  if (opts.tags && opts.tags.length) listEntries.push(["ICMT", opts.tags.map((t) => "#" + t).join(" ")]);
  listEntries.push(["ISFT", "Infinite Sound"]);
  listEntries.push(["ICRD", new Date().toISOString().slice(0, 10)]);

  const listChunkSize = 4 + listEntries.reduce((acc, [, v]) => {
    const len = v.length + 1; // null terminator
    return acc + 8 + len + (len % 2);
  }, 0);

  const totalChunksSize =
    8 + fmtSize + 8 + dataSize +
    (includeSmpl ? 8 + smplSize : 0) +
    (includeAcid ? 8 + acidSize : 0) +
    8 + listChunkSize;

  const buffer = new ArrayBuffer(8 + 4 + totalChunksSize);
  const view = new DataView(buffer);
  let off = 0;

  // RIFF header
  writeString(view, off, "RIFF"); off += 4;
  view.setUint32(off, buffer.byteLength - 8, true); off += 4;
  writeString(view, off, "WAVE"); off += 4;

  // fmt chunk
  writeString(view, off, "fmt "); off += 4;
  view.setUint32(off, fmtSize, true); off += 4;
  view.setUint16(off, audioFormat, true); off += 2;
  view.setUint16(off, numChannels, true); off += 2;
  view.setUint32(off, sampleRate, true); off += 4;
  view.setUint32(off, sampleRate * numChannels * bytesPerSample, true); off += 4;
  view.setUint16(off, numChannels * bytesPerSample, true); off += 2;
  view.setUint16(off, bitDepth, true); off += 2;
  if (bitDepth === 32) { view.setUint16(off, 0, true); off += 2; }

  // data chunk
  writeString(view, off, "data"); off += 4;
  view.setUint32(off, dataSize, true); off += 4;

  if (bitDepth === 16) {
    for (let i = 0; i < interleaved.length; i++) {
      view.setInt16(off, pad(interleaved[i]) * 0x7fff, true);
      off += 2;
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < interleaved.length; i++) {
      const s = Math.round(pad(interleaved[i]) * 0x7fffff);
      view.setUint8(off, s & 0xff);
      view.setUint8(off + 1, (s >> 8) & 0xff);
      view.setUint8(off + 2, (s >> 16) & 0xff);
      off += 3;
    }
  } else {
    for (let i = 0; i < interleaved.length; i++) {
      view.setFloat32(off, interleaved[i], true);
      off += 4;
    }
  }

  // smpl chunk
  if (includeSmpl) {
    writeString(view, off, "smpl"); off += 4;
    view.setUint32(off, smplSize, true); off += 4;
    view.setUint32(off, 0, true); off += 4; // manufacturer
    view.setUint32(off, 0, true); off += 4; // product
    view.setUint32(off, Math.round(1e9 / sampleRate), true); off += 4; // sample period
    view.setUint32(off, opts.rootNote ?? 60, true); off += 4; // MIDI unity note
    view.setUint32(off, 0, true); off += 4; // pitch fraction
    view.setUint32(off, 0, true); off += 4; // SMPTE format
    view.setUint32(off, 0, true); off += 4; // SMPTE offset
    view.setUint32(off, 1, true); off += 4; // num sample loops
    view.setUint32(off, 0, true); off += 4; // sampler data
    // loop
    view.setUint32(off, 0, true); off += 4; // cue id
    view.setUint32(off, SMPL_TYPE[opts.loopType!], true); off += 4;
    view.setUint32(off, opts.loopStart!, true); off += 4;
    view.setUint32(off, Math.max(opts.loopStart! + 1, opts.loopEnd! - 1), true); off += 4;
    view.setUint32(off, 0, true); off += 4; // fraction
    view.setUint32(off, 0, true); off += 4; // play count (0 = infinite)
  }

  // acid chunk (signals seamless loop)
  if (includeAcid) {
    writeString(view, off, "acid"); off += 4;
    view.setUint32(off, acidSize, true); off += 4;
    let flags = 0;
    if (includeSmpl) flags |= 0x01; // one shot OFF + loop bit
    flags |= 0x10; // acidizer - disabled stretch
    view.setUint32(off, flags, true); off += 4;
    view.setUint16(off, opts.rootNote ?? 60, true); off += 2;
    view.setUint16(off, 0x8000, true); off += 2;
    view.setFloat32(off, 0, true); off += 4;
    view.setUint32(off, opts.bpm ? Math.max(1, Math.round(numFrames / sampleRate * (opts.bpm / 60))) : 0, true); off += 4;
    view.setFloat32(off, opts.bpm ?? 120, true); off += 4;
  }

  // LIST INFO
  writeString(view, off, "LIST"); off += 4;
  view.setUint32(off, listChunkSize, true); off += 4;
  writeString(view, off, "INFO"); off += 4;
  for (const [id, val] of listEntries) {
    writeString(view, off, id); off += 4;
    const strLen = val.length + 1;
    const padded = strLen + (strLen % 2);
    view.setUint32(off, padded, true); off += 4;
    writeString(view, off, val); off += val.length;
    view.setUint8(off, 0); off += 1;
    if (strLen % 2) { view.setUint8(off, 0); off += 1; }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// Find nearest zero-crossing within `windowSamples` of target.
export function findNearestZeroCrossing(
  data: Float32Array,
  target: number,
  windowSamples = 480,
): number {
  const start = Math.max(1, target - windowSamples);
  const end = Math.min(data.length - 1, target + windowSamples);
  let best = target;
  let bestDist = Infinity;
  for (let i = start; i < end; i++) {
    if ((data[i - 1] <= 0 && data[i] > 0) || (data[i - 1] >= 0 && data[i] < 0)) {
      const d = Math.abs(i - target);
      if (d < bestDist) { bestDist = d; best = i; }
    }
  }
  return best;
}

// Spectral similarity score between two short windows (for "loopability").
export function loopabilityScore(
  data: Float32Array,
  loopStart: number,
  loopEnd: number,
  windowSize = 1024,
): number {
  if (loopEnd - loopStart < windowSize * 2) return 0;
  const a = data.subarray(loopStart, loopStart + windowSize);
  const b = data.subarray(loopEnd - windowSize, loopEnd);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < windowSize; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const sim = dot / (Math.sqrt(na * nb) + 1e-9);
  return Math.max(0, Math.min(100, Math.round((sim * 0.5 + 0.5) * 100)));
}

export function applyCrossfade(data: Float32Array, loopEnd: number, fadeSamples: number) {
  if (fadeSamples <= 0) return data;
  const out = new Float32Array(data);
  const start = Math.max(0, loopEnd - fadeSamples);
  for (let i = 0; i < fadeSamples && start + i < data.length; i++) {
    const t = i / fadeSamples;
    out[start + i] = data[start + i] * (1 - t) + (data[i] ?? 0) * t;
  }
  return out;
}

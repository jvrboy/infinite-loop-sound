// Realtime playback helper: plays a sound (synth-rendered or imported buffer) with loop settings.
import { getContext, getMaster, buildFxChain, type FxChain } from "./engine";
import { renderSound } from "./synth";
import type { Sound } from "@/state/store";

let current: { src: AudioBufferSourceNode; chain: FxChain } | null = null;

export async function ensureBuffer(sound: Sound): Promise<AudioBuffer> {
  if (sound.buffer) return sound.buffer;
  return renderSound(sound.params);
}

export async function playSound(sound: Sound, opts?: { loopOnly?: boolean }): Promise<AudioBuffer> {
  stopPlayback();
  const ctx = getContext();
  const buffer = await ensureBuffer(sound);
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const sr = buffer.sampleRate;
  const loopStart = sound.loopStart / sr;
  const loopEnd = (sound.loopEnd || buffer.length) / sr;

  if (sound.loopType !== "oneshot") {
    src.loop = true;
    if (loopEnd > loopStart) {
      src.loopStart = loopStart;
      src.loopEnd = loopEnd;
    }
  }

  const chain = buildFxChain();
  chain.setFx(sound.fx);
  src.connect(chain.input);
  chain.output.connect(getMaster());

  src.onended = () => {
    if (current?.src === src) current = null;
  };
  src.start(0, opts?.loopOnly ? loopStart : 0);
  current = { src, chain };
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

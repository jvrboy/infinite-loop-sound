import { useApp, haptic } from "@/state/store";
import { Slider } from "../Slider";
import { Sparkles, Dices, Undo, Redo, Wand2 } from "lucide-react";
import { useState } from "react";
import { saveToLibrary } from "@/state/library";
import { encodeWav } from "@/audio/wav";
import { ensureBuffer } from "@/audio/playback";
import { bufferChannels } from "@/audio/synth";

export function DnaPanel() {
  const sound = useApp((s) => s.sound);
  const updateParams = useApp((s) => s.updateParams);
  const pushHistory = useApp((s) => s.pushHistory);
  const undo = useApp((s) => s.undo);
  const redo = useApp((s) => s.redo);
  const mode = useApp((s) => s.mode);
  const [variants, setVariants] = useState<Array<typeof sound.params>>([]);
  const [diversity, setDiversity] = useState(0.3);
  const [chaos, setChaos] = useState(0.2);

  function mutateOnce(amount: number) {
    const p = sound.params;
    const jitter = (v: number, scale = 1) => v + (Math.random() - 0.5) * amount * scale;
    return {
      ...p,
      fundamental: Math.max(20, Math.min(4000, p.fundamental * (1 + (Math.random() - 0.5) * amount * 0.5))),
      harmonics: Math.max(0, Math.min(1, jitter(p.harmonics))),
      waveshape: Math.max(0, Math.min(1, jitter(p.waveshape))),
      noiseMix: Math.max(0, Math.min(1, jitter(p.noiseMix, 0.6))),
      brightness: Math.max(0, Math.min(1, jitter(p.brightness))),
      sharpness: Math.max(0, Math.min(1, jitter(p.sharpness))),
      flowDepth: Math.max(0, Math.min(1, jitter(p.flowDepth))),
      flowRate: Math.max(0.05, Math.min(20, p.flowRate * (1 + (Math.random() - 0.5) * amount))),
    };
  }

  function evolve() {
    pushHistory();
    const list = Array.from({ length: 4 }, () => mutateOnce(diversity + chaos * 0.5));
    setVariants(list);
    haptic("medium");
  }
  function mutate() {
    pushHistory();
    updateParams(mutateOnce(0.15));
    haptic("light");
  }
  function pickVariant(p: typeof sound.params) {
    pushHistory();
    updateParams(p);
    setVariants([]);
    haptic("medium");
  }
  async function saveToLib() {
    const buf = await ensureBuffer(sound);
    const channels = bufferChannels(buf);
    const blob = encodeWav({
      channels, sampleRate: buf.sampleRate, bitDepth: 24,
      loopStart: sound.loopStart, loopEnd: sound.loopEnd || buf.length, loopType: sound.loopType, name: sound.name,
    });
    const ab = await blob.arrayBuffer();
    await saveToLibrary({
      id: sound.id, name: sound.name, createdAt: Date.now(), buffer: ab,
      meta: { duration: buf.duration, loopStart: sound.loopStart, loopEnd: sound.loopEnd, loopType: sound.loopType },
    });
    haptic("medium");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={evolve} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-aurora py-3 text-xs font-bold uppercase tracking-wider text-background shadow-[0_0_20px_oklch(0.72_0.17_215/0.3)] active:scale-95">
          <Sparkles className="h-4 w-4" /> Evolve ×4
        </button>
        <button onClick={mutate} className="flex items-center justify-center gap-2 rounded-xl glass py-3 text-xs font-bold uppercase tracking-wider active:scale-95">
          <Dices className="h-4 w-4" /> Mutate
        </button>
      </div>
      {variants.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {variants.map((v, i) => (
            <button key={i} onClick={() => pickVariant(v)}
              className="rounded-xl glass p-3 text-left transition hover:bg-white/10">
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Variant {i + 1}</div>
              <div className="mt-1 font-mono text-[10px] text-foreground/80">
                {v.fundamental.toFixed(0)}Hz · {(v.harmonics * 100).toFixed(0)}%
              </div>
            </button>
          ))}
        </div>
      )}
      <Slider label="Diversity" value={diversity} onChange={setDiversity} />
      <Slider label="Chaos" value={chaos} onChange={setChaos} accent="magenta" />
      <div className="flex items-center justify-between gap-2">
        <button onClick={undo} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl glass py-2 text-[11px] font-semibold uppercase tracking-wider"><Undo className="h-3.5 w-3.5" />Undo</button>
        <button onClick={redo} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl glass py-2 text-[11px] font-semibold uppercase tracking-wider"><Redo className="h-3.5 w-3.5" />Redo</button>
        <button onClick={saveToLib} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl glass py-2 text-[11px] font-semibold uppercase tracking-wider"><Wand2 className="h-3.5 w-3.5" />Save</button>
      </div>
      {mode === "import" && <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tip: import a sound, then Evolve creates 4 mutations of its loop region.</div>}
    </div>
  );
}

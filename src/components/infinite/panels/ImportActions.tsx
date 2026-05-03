import { useApp, haptic } from "@/state/store";
import { useRef, useState } from "react";
import { getContext } from "@/audio/engine";
import { Slider } from "../Slider";
import { suggestLoops, normalizeBuffer, reverseBuffer, stripSilence, monoToBuffer } from "@/audio/dsp";
import { analyzeBuffer } from "@/audio/synth";
import { Upload, Wand2, RotateCcw, Volume2, Scissors, FileAudio2 } from "lucide-react";

export function ImportActions() {
  const sound = useApp((s) => s.sound);
  const setBuffer = useApp((s) => s.setBuffer);
  const setLoop = useApp((s) => s.setLoop);
  const fileRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeBuffer> | null>(null);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof suggestLoops>>([]);

  async function onPick(file: File) {
    const ctx = getContext();
    const ab = await file.arrayBuffer();
    const buf = await ctx.decodeAudioData(ab.slice(0));
    setBuffer(buf, { name: file.name.replace(/\.[^.]+$/, ""), importedFile: file.name });
    setLoop(0, buf.length);
    const ch0 = buf.getChannelData(0);
    setAnalysis(analyzeBuffer(ch0, buf.sampleRate));
    setSuggestions(suggestLoops(ch0, buf.sampleRate));
    haptic("medium");
  }

  function transform(fn: (data: Float32Array) => Float32Array | { data: Float32Array; offset: number }) {
    if (!sound.buffer) return;
    const data = sound.buffer.getChannelData(0).slice();
    const result = fn(data);
    const out = "data" in result ? result.data : result;
    const buf = monoToBuffer(getContext(), out, sound.buffer.sampleRate);
    setBuffer(buf, { name: sound.name });
    setLoop(0, buf.length);
    haptic("light");
  }

  return (
    <div className="space-y-4">
      <button onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-cyan py-3 text-sm font-bold uppercase tracking-wider text-background shadow-[0_0_24px_oklch(0.72_0.17_215/0.4)] active:scale-[0.98]">
        <Upload className="h-4 w-4" />
        {sound.importedFile ? "Replace audio" : "Import audio"}
      </button>
      <input ref={fileRef} type="file" accept="audio/*"
        onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
        className="hidden" />

      {sound.importedFile && (
        <div className="space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {sound.importedFile} · {sound.buffer?.duration.toFixed(2)}s
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ActionBtn icon={Wand2} label="Auto-Loop" onClick={() => {
              if (!sound.buffer) return;
              const s = suggestLoops(sound.buffer.getChannelData(0), sound.buffer.sampleRate);
              if (s[0]) setLoop(s[0].start, s[0].end);
              setSuggestions(s); haptic("medium");
            }} />
            <ActionBtn icon={Volume2} label="Normalize" onClick={() => transform((d) => normalizeBuffer(d))} />
            <ActionBtn icon={RotateCcw} label="Reverse" onClick={() => transform(reverseBuffer)} />
            <ActionBtn icon={Scissors} label="Strip Silence" onClick={() => transform(stripSilence)} />
            <ActionBtn icon={FileAudio2} label="Trim to loop" onClick={() => {
              if (!sound.buffer) return;
              const data = sound.buffer.getChannelData(0).slice(sound.loopStart, sound.loopEnd);
              const buf = monoToBuffer(getContext(), data, sound.buffer.sampleRate);
              setBuffer(buf); setLoop(0, buf.length);
            }} />
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Smart Loop suggestions</div>
              <div className="grid grid-cols-3 gap-2">
                {suggestions.slice(0, 3).map((s, i) => {
                  const tone = s.score > 70 ? "border-[color:var(--success)] text-[color:var(--success)]"
                    : s.score > 40 ? "border-[color:var(--warning)] text-[color:var(--warning)]"
                    : "border-white/10 text-muted-foreground";
                  return (
                    <button key={i} onClick={() => setLoop(s.start, s.end)}
                      className={`rounded-xl border bg-white/[0.03] p-3 text-left ${tone}`}>
                      <div className="font-mono text-[9px] uppercase tracking-widest">Option {i + 1}</div>
                      <div className="mt-1 text-base font-bold">{s.score}%</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {analysis && (
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/[0.03] p-3 text-center">
              <Stat label="Fundamental" value={`${analysis.fundamental.toFixed(0)} Hz`} />
              <Stat label="Peak" value={analysis.peak.toFixed(2)} />
              <Stat label="Dyn Range" value={`${analysis.dynamicRange.toFixed(1)} dB`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 rounded-xl glass py-3 text-[10px] font-semibold uppercase tracking-wider transition active:scale-95">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-xs">{value}</div>
    </div>
  );
}

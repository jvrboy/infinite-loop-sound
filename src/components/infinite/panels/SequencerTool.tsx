import { useEffect, useRef, useState } from "react";
import { Play, Square, Trash2 } from "lucide-react";
import { getContext, playNote, setNoteFx } from "@/audio/engine";
import { useApp } from "@/state/store";
import { cn } from "@/lib/utils";

/** 16-step sequencer: realtime trigger of the current sound across two octaves. */
const ROWS = ["C5","B4","A4","G4","F4","E4","D4","C4"];
const NOTE_HZ: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
};

export function SequencerTool() {
  const [grid, setGrid] = useState<boolean[][]>(() => Array.from({ length: ROWS.length }, () => Array(16).fill(false)));
  const [bpm, setBpm] = useState(110);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const sound = useApp((s) => s.sound);
  const fxRef = useRef(sound.fx);
  const paramsRef = useRef(sound.params);
  useEffect(() => { fxRef.current = sound.fx; setNoteFx(sound.fx); }, [sound.fx]);
  useEffect(() => { paramsRef.current = sound.params; }, [sound.params]);

  function toggle(r: number, c: number) {
    setGrid((g) => g.map((row, ri) => ri === r ? row.map((v, ci) => ci === c ? !v : v) : row));
  }
  function clearGrid() { setGrid(Array.from({ length: ROWS.length }, () => Array(16).fill(false))); }

  function startSeq() {
    if (playing) return;
    getContext();
    setNoteFx(sound.fx);
    stepRef.current = 0;
    setPlaying(true);
    const intervalMs = (60_000 / bpm) / 4; // 16th notes
    const tick = () => {
      const s = stepRef.current;
      setStep(s);
      for (let r = 0; r < ROWS.length; r++) {
        if (grid[r][s]) {
          const freq = NOTE_HZ[ROWS[r]] * (paramsRef.current.fundamental / 110); // detune relative to current fundamental
          playNote(freq, paramsRef.current, intervalMs / 1000 * 1.4, 0.7);
        }
      }
      stepRef.current = (s + 1) % 16;
    };
    tick();
    timerRef.current = window.setInterval(tick, intervalMs);
  }
  function stopSeq() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setStep(-1);
  }
  // restart on bpm change while playing
  useEffect(() => {
    if (playing) { stopSeq(); startSeq(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);
  useEffect(() => () => stopSeq(), []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Step Sequencer</div>
        <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
          <input type="range" min={40} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-24 accent-[color:var(--cyan)]" />
          <span className="w-12 text-right">{bpm} BPM</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[2.2rem_repeat(16,minmax(1.4rem,1fr))] gap-0.5">
          {grid.map((row, r) => (
            <Row key={r} row={row} rIdx={r} step={step} onToggle={toggle} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {!playing ? (
          <button onClick={startSeq} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-cyan py-2.5 text-sm font-bold uppercase tracking-wider text-background active:scale-[0.98]">
            <Play className="h-4 w-4" /> Play
          </button>
        ) : (
          <button onClick={stopSeq} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[color:var(--magenta)]/80 py-2.5 text-sm font-bold uppercase tracking-wider text-background active:scale-[0.98]">
            <Square className="h-4 w-4" /> Stop
          </button>
        )}
        <button onClick={clearGrid} className="flex items-center justify-center gap-2 rounded-xl glass py-2 text-[11px] font-semibold uppercase tracking-wider active:scale-95">
          <Trash2 className="h-3 w-3" /> Clear
        </button>
      </div>
    </div>
  );
}

function Row({ row, rIdx, step, onToggle }: { row: boolean[]; rIdx: number; step: number; onToggle: (r: number, c: number) => void }) {
  return (
    <>
      <div className="grid place-items-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{ROWS[rIdx]}</div>
      {row.map((on, c) => (
        <button key={c} onClick={() => onToggle(rIdx, c)}
          className={cn(
            "h-7 rounded-md border transition-colors",
            c % 4 === 0 ? "border-white/15" : "border-white/5",
            on ? "bg-gradient-cyan shadow-[0_0_10px_oklch(0.72_0.17_215/0.6)]" : "bg-white/[0.03] hover:bg-white/[0.07]",
            step === c && "ring-1 ring-[color:var(--cyan)]",
          )}
        />
      ))}
    </>
  );
}
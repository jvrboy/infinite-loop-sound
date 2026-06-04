import { useEffect, useRef, useState } from "react";
import { Disc, Square, Trash2, Volume2 } from "lucide-react";
import { getContext, getMaster, createMasterRecorder } from "@/audio/engine";
import { cn } from "@/lib/utils";

/** Live looper — records the audible output into up to 4 stacked loops that
 *  play back in sync. All audio is real (master tap). */
interface Track {
  id: number;
  buf: AudioBuffer;
  src?: AudioBufferSourceNode;
  gain: GainNode;
  level: number;
  muted: boolean;
}

export function LooperTool() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<ReturnType<typeof createMasterRecorder> | null>(null);
  const baseDurRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number>(0);

  function tick() {
    setElapsed((performance.now() - startedAtRef.current) / 1000);
    rafRef.current = requestAnimationFrame(tick);
  }

  async function startRec() {
    getContext();
    const r = createMasterRecorder();
    r.start();
    recRef.current = r;
    startedAtRef.current = performance.now();
    setRecording(true);
    tick();
  }
  async function stopRec() {
    cancelAnimationFrame(rafRef.current);
    setRecording(false);
    const r = recRef.current;
    if (!r) return;
    recRef.current = null;
    const buf = await r.stop();
    if (!baseDurRef.current) baseDurRef.current = buf.duration;
    const ctx = getContext();
    const gain = ctx.createGain();
    gain.connect(getMaster());
    const t: Track = { id: Date.now(), buf, gain, level: 0.9, muted: false };
    gain.gain.value = t.level;
    setTracks((arr) => [...arr, t].slice(-4));
    startTrack(t);
  }

  function startTrack(t: Track) {
    const ctx = getContext();
    const s = ctx.createBufferSource();
    s.buffer = t.buf;
    s.loop = true;
    s.connect(t.gain);
    s.start();
    t.src = s;
  }

  function clearAll() {
    tracks.forEach((t) => { try { t.src?.stop(); } catch {} try { t.gain.disconnect(); } catch {} });
    setTracks([]);
    baseDurRef.current = null;
  }
  function removeTrack(id: number) {
    setTracks((arr) => arr.filter((t) => {
      if (t.id === id) { try { t.src?.stop(); } catch {} try { t.gain.disconnect(); } catch {} return false; }
      return true;
    }));
  }
  function setLevel(id: number, v: number) {
    setTracks((arr) => arr.map((t) => {
      if (t.id === id) { t.gain.gain.setTargetAtTime(t.muted ? 0 : v, getContext().currentTime, 0.02); return { ...t, level: v }; }
      return t;
    }));
  }
  function toggleMute(id: number) {
    setTracks((arr) => arr.map((t) => {
      if (t.id === id) { const m = !t.muted; t.gain.gain.setTargetAtTime(m ? 0 : t.level, getContext().currentTime, 0.02); return { ...t, muted: m }; }
      return t;
    }));
  }

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    tracks.forEach((t) => { try { t.src?.stop(); } catch {} try { t.gain.disconnect(); } catch {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Live Looper · taps master output
        </div>
        <div className="font-mono text-[11px] tabular-nums text-foreground/80">
          {recording ? `REC ${elapsed.toFixed(1)}s` : baseDurRef.current ? `base ${baseDurRef.current.toFixed(2)}s` : "empty"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {!recording ? (
          <button onClick={startRec} className="col-span-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-cyan py-2.5 text-sm font-bold uppercase tracking-wider text-background active:scale-[0.98]">
            <Disc className="h-4 w-4" /> Rec layer
          </button>
        ) : (
          <button onClick={stopRec} className="col-span-1 flex items-center justify-center gap-2 rounded-xl bg-[color:var(--magenta)]/80 py-2.5 text-sm font-bold uppercase tracking-wider text-background active:scale-[0.98]">
            <Square className="h-4 w-4" /> Stop
          </button>
        )}
        <button onClick={clearAll} className="flex items-center justify-center gap-2 rounded-xl glass py-2.5 text-[11px] font-semibold uppercase tracking-wider active:scale-95 disabled:opacity-40" disabled={!tracks.length && !recording}>
          <Trash2 className="h-3 w-3" /> Clear all
        </button>
      </div>
      <div className="space-y-1.5">
        {tracks.length === 0 && <div className="rounded-xl border border-dashed border-white/10 py-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Trigger a sound, then press REC LAYER</div>}
        {tracks.map((t, i) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-2">
            <button onClick={() => toggleMute(t.id)} className={cn("grid h-7 w-7 place-items-center rounded-md", t.muted ? "bg-white/5 text-muted-foreground" : "bg-gradient-cyan text-background")}>
              <Volume2 className="h-3 w-3" />
            </button>
            <div className="w-12 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">L{i + 1}</div>
            <div className="font-mono text-[10px] tabular-nums text-muted-foreground">{t.buf.duration.toFixed(2)}s</div>
            <input type="range" min={0} max={1} step={0.01} value={t.level} onChange={(e) => setLevel(t.id, Number(e.target.value))} className="flex-1 accent-[color:var(--cyan)]" />
            <button onClick={() => removeTrack(t.id)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-foreground">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
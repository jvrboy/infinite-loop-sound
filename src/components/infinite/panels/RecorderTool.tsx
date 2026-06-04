import { useEffect, useRef, useState } from "react";
import { Mic, Square, Wand2, Save, Loader2 } from "lucide-react";
import { getContext, getMicSource, releaseMic } from "@/audio/engine";
import { useApp, haptic } from "@/state/store";
import { monoToBuffer, normalizeBuffer, stripSilence, suggestLoops } from "@/audio/dsp";

/** Live audio recorder — captures real input from the mic with a real time
 *  RMS meter and waveform sparkline, then loads it into the editor. */
export function RecorderTool() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const setBuffer = useApp((s) => s.setBuffer);
  const setLoop = useApp((s) => s.setLoop);
  const settings = useApp((s) => s.settings);

  useEffect(() => () => { stop(false); releaseMic(); }, []);

  async function start() {
    setError(null);
    try {
      const src = await getMicSource();
      const ctx = getContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;

      const dest = ctx.createMediaStreamDestination();
      src.connect(dest);
      const rec = new MediaRecorder(dest.stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.start();
      recRef.current = rec;
      startedAtRef.current = performance.now();
      setRecording(true);
      tick();
    } catch (e: any) {
      setError(e?.message ?? "Microphone permission denied");
    }
  }

  function tick() {
    const a = analyserRef.current;
    const cnv = sparkRef.current;
    if (a && cnv) {
      const buf = new Uint8Array(a.fftSize);
      a.getByteTimeDomainData(buf);
      let peak = 0, sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128;
        if (Math.abs(x) > peak) peak = Math.abs(x);
        sumSq += x * x;
      }
      setLevel(Math.sqrt(sumSq / buf.length));
      // sparkline scroll
      const c = cnv.getContext("2d")!;
      const r = cnv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (cnv.width !== r.width * dpr) { cnv.width = r.width * dpr; cnv.height = r.height * dpr; c.scale(dpr, dpr); }
      const img = c.getImageData(2, 0, Math.max(0, r.width - 2), r.height);
      c.clearRect(0, 0, r.width, r.height);
      c.putImageData(img, 0, 0);
      c.fillStyle = "oklch(0.08 0 0)";
      c.fillRect(r.width - 2, 0, 2, r.height);
      const h = peak * r.height;
      c.fillStyle = "oklch(0.72 0.17 215)";
      c.fillRect(r.width - 2, (r.height - h) / 2, 2, h);
    }
    setElapsed((performance.now() - startedAtRef.current) / 1000);
    rafRef.current = requestAnimationFrame(tick);
  }

  async function stop(keep = true) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const rec = recRef.current;
    recRef.current = null;
    setRecording(false);
    if (!rec || !keep) return;
    setProcessing(true);
    await new Promise<void>((resolve) => {
      rec.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          const ab = await blob.arrayBuffer();
          const buf = await getContext().decodeAudioData(ab);
          // mix to mono
          const len = buf.length;
          const mono = new Float32Array(len);
          for (let c = 0; c < buf.numberOfChannels; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < len; i++) mono[i] += d[i] / buf.numberOfChannels;
          }
          const trimmed = stripSilence(mono).data;
          const final = settings.normalizeOnExport ? normalizeBuffer(trimmed) : trimmed;
          const ab2 = monoToBuffer(getContext(), final, buf.sampleRate);
          setBuffer(ab2, { name: `Live ${new Date().toLocaleTimeString()}`, importedFile: "live-recording" });
          setLoop(0, ab2.length);
          haptic("medium");
        } catch (e: any) { setError(e?.message ?? "Decode failed"); }
        resolve();
      };
      rec.stop();
    });
    setProcessing(false);
  }

  function autoLoop() {
    const s = useApp.getState().sound;
    if (!s.buffer) return;
    const r = suggestLoops(s.buffer.getChannelData(0), s.buffer.sampleRate);
    if (r[0]) useApp.getState().setLoop(r[0].start, r[0].end);
    haptic("medium");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Live Recorder</div>
        <div className="font-mono text-[11px] tabular-nums text-foreground/80">{elapsed.toFixed(2)}s</div>
      </div>
      <canvas ref={sparkRef} className="h-16 w-full rounded-xl bg-white/[0.03]" />
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
          <div className="h-full transition-[width] duration-75"
            style={{
              width: `${Math.min(100, level * 140)}%`,
              background: level > 0.9 ? "oklch(0.65 0.24 0)" : "linear-gradient(90deg, oklch(0.72 0.17 215), oklch(0.75 0.18 150))",
            }} />
        </div>
        <span className="w-10 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
          {Math.round(20 * Math.log10(Math.max(level, 1e-6)))} dB
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {!recording ? (
          <button onClick={start} className="col-span-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-cyan py-3 text-sm font-bold uppercase tracking-wider text-background shadow-[0_0_24px_oklch(0.72_0.17_215/0.4)] active:scale-[0.98]">
            <Mic className="h-4 w-4" /> Record
          </button>
        ) : (
          <button onClick={() => stop(true)} className="col-span-3 flex items-center justify-center gap-2 rounded-xl bg-[color:var(--magenta)]/80 py-3 text-sm font-bold uppercase tracking-wider text-background active:scale-[0.98]">
            <Square className="h-4 w-4" /> Stop & load
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={processing} onClick={autoLoop} className="flex items-center justify-center gap-2 rounded-xl glass py-2 text-[11px] font-semibold uppercase tracking-wider active:scale-95 disabled:opacity-40">
          {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Auto-loop
        </button>
        <button onClick={() => useApp.getState().setMode("import")} className="flex items-center justify-center gap-2 rounded-xl glass py-2 text-[11px] font-semibold uppercase tracking-wider active:scale-95">
          <Save className="h-3 w-3" /> Open in Import
        </button>
      </div>
      {error && <div className="rounded-xl border border-[color:var(--magenta)]/40 bg-[color:var(--magenta)]/10 p-2 text-[11px] text-[color:var(--magenta)]">{error}</div>}
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { useApp, haptic } from "@/state/store";
import { findSnapPoint, slopeAt, loopabilityScore, type LoopType } from "@/audio/wav";
import { ensureBuffer, playSound, stopPlayback, getPlayheadSample, isPlaying } from "@/audio/playback";
import { suggestLoops } from "@/audio/dsp";
import {
  Repeat, Shuffle, Square, Magnet, ZoomIn, ZoomOut, Maximize2, Sparkles,
  Play, StopCircle, Rewind, FastForward, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LOOP_LABEL: Record<LoopType, string> = { forward: "SUSTAIN", oneshot: "ONE-SHOT", pingpong: "PING-PONG" };

export function WaveformLoop() {
  const sound = useApp((s) => s.sound);
  const setLoop = useApp((s) => s.setLoop);
  const setLoopType = useApp((s) => s.setLoopType);
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const nudgeLoop = useApp((s) => s.nudgeLoop);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<Float32Array | null>(null);
  const [data, setData] = useState<Float32Array | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [drag, setDrag] = useState<"start" | "end" | "pan" | null>(null);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const [cycles, setCycles] = useState(0);
  const [playMode, setPlayMode] = useState<"none" | "loop" | "full">("none");

  // Render buffer when params/buffer change
  useEffect(() => {
    let alive = true;
    (async () => {
      const buf = await ensureBuffer(sound);
      if (!alive) return;
      const ch0 = buf.getChannelData(0).slice();
      dataRef.current = ch0;
      setData(ch0);
      // initialize loop if not set
      if (sound.loopEnd === 0) {
        setLoop(0, ch0.length);
      }
      setScore(loopabilityScore(ch0, sound.loopStart, sound.loopEnd || ch0.length));
    })();
    return () => { alive = false; };
  }, [sound.params, sound.buffer]);

  // Update score when loop changes
  useEffect(() => {
    (async () => {
      const d = dataRef.current; if (!d) return;
      setScore(loopabilityScore(d, sound.loopStart, sound.loopEnd || d.length));
    })();
  }, [sound.loopStart, sound.loopEnd]);

  // Main canvas draw (responds to view zoom/offset)
  useEffect(() => {
    drawMain();
    drawMini();
  }, [data, sound.loopStart, sound.loopEnd, sound.loopType, view, settings.crossfadeMs]);

  function drawMain() {
    const canvas = canvasRef.current;
    const d = dataRef.current;
    if (!canvas || !d) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const total = d.length;
    const viewLen = total / view.zoom;
    const viewStart = Math.max(0, Math.min(total - viewLen, view.offset * total));
    const viewEnd = viewStart + viewLen;

    const sampleToX = (s: number) => ((s - viewStart) / viewLen) * w;

    // crossfade overlay (under loop region)
    if (sound.loopType !== "oneshot" && settings.crossfadeMs > 0) {
      const sr = sound.buffer?.sampleRate ?? 48000;
      const fade = Math.floor((settings.crossfadeMs / 1000) * sr);
      const xfStart = sampleToX(Math.max(sound.loopStart, sound.loopEnd - fade));
      const xfEnd = sampleToX(sound.loopEnd);
      ctx.fillStyle = "oklch(0.78 0.17 65 / 0.10)";
      ctx.fillRect(xfStart, 0, xfEnd - xfStart, h);
    }

    // Loop region
    const lsX = sampleToX(sound.loopStart);
    const leX = sampleToX(sound.loopEnd || total);
    if (sound.loopType !== "oneshot") {
      const grd = ctx.createLinearGradient(lsX, 0, leX, 0);
      if (sound.loopType === "pingpong") {
        grd.addColorStop(0, "oklch(0.65 0.24 0 / 0.22)");
        grd.addColorStop(1, "oklch(0.65 0.24 320 / 0.22)");
      } else {
        grd.addColorStop(0, "oklch(0.72 0.17 215 / 0.20)");
        grd.addColorStop(1, "oklch(0.72 0.17 215 / 0.20)");
      }
      ctx.fillStyle = grd;
      ctx.fillRect(lsX, 0, leX - lsX, h);
    } else {
      // tail fade illustration
      const grd = ctx.createLinearGradient(lsX, 0, leX, 0);
      grd.addColorStop(0, "oklch(0.78 0.17 65 / 0.22)");
      grd.addColorStop(1, "oklch(0.78 0.17 65 / 0)");
      ctx.fillStyle = grd;
      ctx.fillRect(lsX, 0, leX - lsX, h);
    }

    // Waveform — sample-accurate when very zoomed in
    ctx.strokeStyle = "oklch(0.98 0.005 250 / 0.7)";
    ctx.lineWidth = 1;
    const mid = h / 2;
    const samplesPerPx = viewLen / w;
    if (samplesPerPx > 1) {
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const s0 = Math.floor(viewStart + x * samplesPerPx);
        const s1 = Math.floor(viewStart + (x + 1) * samplesPerPx);
        let mn = 0, mx = 0;
        for (let i = s0; i < s1 && i < total; i++) {
          const v = d[i];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
        ctx.moveTo(x, mid - mx * (h / 2 - 4));
        ctx.lineTo(x, mid - mn * (h / 2 - 4));
      }
      ctx.stroke();
    } else {
      // sample dots + line
      ctx.beginPath();
      let first = true;
      for (let s = Math.floor(viewStart); s < Math.ceil(viewEnd); s++) {
        const x = sampleToX(s);
        const y = mid - d[s] * (h / 2 - 4);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "oklch(0.72 0.17 215 / 0.9)";
      for (let s = Math.floor(viewStart); s < Math.ceil(viewEnd); s++) {
        const x = sampleToX(s);
        const y = mid - d[s] * (h / 2 - 4);
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Center line
    ctx.strokeStyle = "oklch(1 0 0 / 0.06)";
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

    // ping-pong reverse ghost
    if (sound.loopType === "pingpong" && samplesPerPx > 1) {
      ctx.strokeStyle = "oklch(0.65 0.24 320 / 0.35)";
      ctx.beginPath();
      const ls = sound.loopStart, le = sound.loopEnd || total;
      const x0 = sampleToX(ls), x1 = sampleToX(le);
      const segs = 60;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const srcIdx = Math.floor(le - 1 - t * (le - ls));
        const x = x0 + t * (x1 - x0);
        const y = mid - (d[srcIdx] ?? 0) * (h / 4);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Markers (hide in oneshot for start; show tail end)
    if (sound.loopType !== "oneshot") {
      drawMarker(ctx, lsX, h, "oklch(0.72 0.17 215)", "S");
    }
    drawMarker(ctx, leX, h, "oklch(0.75 0.18 150)", sound.loopType === "oneshot" ? "T" : "E");
  }

  function drawMini() {
    const canvas = miniRef.current;
    const d = dataRef.current;
    if (!canvas || !d) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    const total = d.length;
    // peaks
    ctx.fillStyle = "oklch(0.98 0.005 250 / 0.35)";
    const mid = h / 2;
    const step = Math.max(1, Math.floor(total / w));
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let i = 0; i < step; i++) m = Math.max(m, Math.abs(d[x * step + i] ?? 0));
      ctx.fillRect(x, mid - m * (h / 2), 1, m * h);
    }
    // loop region
    const ls = (sound.loopStart / total) * w;
    const le = ((sound.loopEnd || total) / total) * w;
    ctx.fillStyle = "oklch(0.72 0.17 215 / 0.25)";
    ctx.fillRect(ls, 0, le - ls, h);
    // view window
    const viewLen = total / view.zoom;
    const vs = Math.max(0, Math.min(total - viewLen, view.offset * total));
    const vsX = (vs / total) * w;
    const veX = ((vs + viewLen) / total) * w;
    ctx.strokeStyle = "oklch(0.78 0.18 65 / 0.9)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vsX, 1, Math.max(2, veX - vsX), h - 2);
  }

  // Animated playhead loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const d = dataRef.current;
      const el = playheadRef.current;
      const canvas = canvasRef.current;
      if (d && el && canvas && isPlaying()) {
        const head = getPlayheadSample();
        if (head != null) {
          const total = d.length;
          const viewLen = total / view.zoom;
          const vs = Math.max(0, Math.min(total - viewLen, view.offset * total));
          const x = ((head - vs) / viewLen) * canvas.getBoundingClientRect().width;
          if (x >= 0 && x <= canvas.getBoundingClientRect().width) {
            el.style.display = "block";
            el.style.transform = `translateX(${x}px)`;
          } else {
            el.style.display = "none";
          }
        }
      } else if (el) {
        el.style.display = "none";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  function drawMarker(ctx: CanvasRenderingContext2D, x: number, h: number, color: string, label: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, 10, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "oklch(0.08 0.015 280)";
    ctx.font = "bold 9px ui-monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, x, 13);
  }

  function pointerToSample(e: React.PointerEvent): number {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const xN = (e.clientX - rect.left) / rect.width;
    const total = (dataRef.current?.length) ?? Math.floor(sound.params.duration * 48000);
    const viewLen = total / view.zoom;
    const vs = Math.max(0, Math.min(total - viewLen, view.offset * total));
    return Math.max(0, Math.min(total, Math.floor(vs + xN * viewLen)));
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const sample = pointerToSample(e);
    const total = dataRef.current?.length ?? 1;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewLen = total / view.zoom;
    const pxPerSample = rect.width / viewLen;
    // marker hit radius ~14px
    const dStart = Math.abs(sample - sound.loopStart) * pxPerSample;
    const dEnd = Math.abs(sample - sound.loopEnd) * pxPerSample;
    if (sound.loopType !== "oneshot" && dStart < 14 && dStart < dEnd) {
      setDrag("start"); haptic("medium"); return;
    }
    if (dEnd < 14) { setDrag("end"); haptic("medium"); return; }
    // pan
    setDrag("pan");
    dragStartX.current = e.clientX;
    dragStartOffset.current = view.offset;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const d = dataRef.current;
    if (drag === "pan") {
      const canvas = canvasRef.current; if (!canvas || !d) return;
      const w = canvas.getBoundingClientRect().width;
      const total = d.length;
      const viewLen = total / view.zoom;
      const dxN = (e.clientX - dragStartX.current) / w;
      const newOffset = Math.max(0, Math.min(1 - viewLen / total, dragStartOffset.current - dxN * (viewLen / total)));
      setView({ offset: newOffset });
      return;
    }
    if (!d) return;
    const sample = pointerToSample(e);
    const sr = sound.buffer?.sampleRate ?? 48000;
    const win = Math.max(8, Math.floor((settings.snapWindowMs / 1000) * sr));
    let snapped = sample;
    if (settings.snapToZero) {
      // reference slope from opposite marker so seams match in zeroSlope mode
      const refIdx = drag === "start" ? (sound.loopEnd - 1) : sound.loopStart;
      const refSlope = slopeAt(d, refIdx);
      snapped = findSnapPoint(d, sample, win, settings.snapMode, refSlope);
    }
    if (drag === "start") {
      setLoop(Math.min(snapped, sound.loopEnd - 64), sound.loopEnd);
    } else {
      setLoop(sound.loopStart, Math.max(snapped, sound.loopStart + 64));
    }
  }

  function handlePointerUp() { setDrag(null); }

  function handleWheel(e: React.WheelEvent) {
    if (!dataRef.current) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const xN = (e.clientX - rect.left) / rect.width;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      const total = dataRef.current.length;
      const newZoom = Math.max(1, Math.min(64, view.zoom * factor));
      // keep cursor anchored
      const viewLen = total / view.zoom;
      const cursorSample = view.offset * total + xN * viewLen;
      const newViewLen = total / newZoom;
      const newOffset = Math.max(0, Math.min(1 - newViewLen / total, (cursorSample - xN * newViewLen) / total));
      setView({ zoom: newZoom, offset: newOffset });
    } else {
      const total = dataRef.current.length;
      const viewLen = total / view.zoom;
      const newOffset = Math.max(0, Math.min(1 - viewLen / total, view.offset + (e.deltaY / 1000)));
      setView({ offset: newOffset });
    }
  }

  function zoomBy(factor: number) {
    const total = dataRef.current?.length ?? 1;
    const newZoom = Math.max(1, Math.min(64, view.zoom * factor));
    const viewLen = total / view.zoom;
    const center = view.offset + (viewLen / total) / 2;
    const newViewLen = total / newZoom;
    const newOffset = Math.max(0, Math.min(1 - newViewLen / total, center - (newViewLen / total) / 2));
    setView({ zoom: newZoom, offset: newOffset });
  }
  function fitAll() { setView({ zoom: 1, offset: 0 }); }
  function zoomToLoop() {
    const total = dataRef.current?.length ?? 1;
    const ls = sound.loopStart, le = sound.loopEnd || total;
    const len = Math.max(64, le - ls);
    const pad = len * 0.25;
    const start = Math.max(0, ls - pad);
    const newViewLen = Math.min(total, len + pad * 2);
    setView({ zoom: total / newViewLen, offset: start / total });
  }

  async function previewLoop() {
    if (sound.loopType === "oneshot") return;
    setCycles(0);
    setPlayMode("loop");
    await playSound(sound, {
      loopOnly: true,
      xfadeMs: settings.crossfadeMs,
      onCycle: () => setCycles((c) => c + 1),
    });
  }
  async function previewFull() {
    setCycles(0);
    setPlayMode("full");
    await playSound(sound, {
      xfadeMs: settings.crossfadeMs,
      onCycle: () => setCycles((c) => c + 1),
    });
  }
  function stop() { stopPlayback(); setPlayMode("none"); }

  function findBest() {
    const d = dataRef.current; if (!d) return;
    const sr = sound.buffer?.sampleRate ?? 48000;
    const s = suggestLoops(d, sr);
    if (s[0]) { setLoop(s[0].start, s[0].end); haptic("medium"); }
  }

  const loopBtns: { id: LoopType; icon: any; label: string }[] = [
    { id: "forward", icon: Repeat, label: "SUSTAIN" },
    { id: "oneshot", icon: Square, label: "ONE-SHOT" },
    { id: "pingpong", icon: Shuffle, label: "PING-PONG" },
  ];

  const sr = sound.buffer?.sampleRate ?? 48000;
  const loopMs = ((sound.loopEnd - sound.loopStart) / sr * 1000).toFixed(0);
  const loopHz = (sr / Math.max(1, sound.loopEnd - sound.loopStart)).toFixed(1);

  return (
    <div className="space-y-2 px-3 sm:px-6">
      {/* top status row */}
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        <span>WAVEFORM · LOOP EDITOR · {view.zoom.toFixed(1)}×</span>
        <div className="flex items-center gap-3">
          {score != null && sound.loopType !== "oneshot" && (
            <span className={cn(
              "rounded-full px-2 py-0.5",
              score > 70 ? "text-[color:var(--success)] bg-[oklch(0.75_0.18_150/0.12)]" :
              score > 40 ? "text-[color:var(--warning)] bg-[oklch(0.78_0.17_65/0.12)]" :
              "text-muted-foreground bg-white/5"
            )}>⏺ {score}% loopable</span>
          )}
          <span className="text-foreground/70">{loopMs}ms · ≈{loopHz}Hz</span>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ToolBtn icon={ZoomOut} onClick={() => zoomBy(1 / 1.6)} label="Zoom out" />
        <ToolBtn icon={ZoomIn} onClick={() => zoomBy(1.6)} label="Zoom in" />
        <ToolBtn icon={Maximize2} onClick={fitAll} label="Fit" />
        <ToolBtn icon={Sparkles} onClick={zoomToLoop} label="Loop" />
        <ToolBtn icon={Sparkles} onClick={findBest} label="Find best" highlight />
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => { haptic("light"); setSettings({ snapToZero: !settings.snapToZero }); }}
            className={cn(
              "flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wider transition",
              settings.snapToZero ? "text-[color:var(--cyan)] bg-[oklch(0.72_0.17_215/0.12)]" : "glass text-muted-foreground"
            )}
          >
            <Magnet className="h-3 w-3" /> Snap
          </button>
          {settings.snapToZero && (
            <>
              <select value={settings.snapMode} onChange={(e) => setSettings({ snapMode: e.target.value as any })}
                className="h-7 rounded-full bg-white/[0.06] px-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/80 outline-none">
                <option value="zero">Zero</option>
                <option value="zeroSlope">Zero+slope</option>
                <option value="peak">Peak</option>
              </select>
              <input type="range" min={1} max={50} value={settings.snapWindowMs}
                onChange={(e) => setSettings({ snapWindowMs: Number(e.target.value) })}
                className="h-1 w-20 accent-[color:var(--cyan)]" title={`Snap window ${settings.snapWindowMs}ms`} />
            </>
          )}
        </div>
      </div>

      {/* main waveform */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="block h-32 w-full cursor-ew-resize touch-none rounded-xl glass"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={zoomToLoop}
        />
        <div ref={playheadRef}
          style={{ display: "none" }}
          className="pointer-events-none absolute left-0 top-0 h-32 w-px bg-[color:var(--cyan)] shadow-[0_0_8px_oklch(0.72_0.17_215)]" />
      </div>

      {/* mini-map */}
      <canvas
        ref={miniRef}
        className="block h-6 w-full cursor-pointer rounded-md bg-white/[0.03]"
        onPointerDown={(e) => {
          const d = dataRef.current; if (!d) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const xN = (e.clientX - rect.left) / rect.width;
          const viewLen = d.length / view.zoom;
          setView({ offset: Math.max(0, Math.min(1 - viewLen / d.length, xN - (viewLen / d.length) / 2)) });
        }}
      />

      {/* loop type selector */}
      <div className="flex gap-1.5">
        {loopBtns.map((b) => {
          const Icon = b.icon;
          const active = sound.loopType === b.id;
          return (
            <button
              key={b.id}
              onClick={() => { haptic("medium"); setLoopType(b.id); setCycles(0); }}
              className={cn(
                "flex flex-1 h-10 items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition",
                active
                  ? b.id === "pingpong"
                    ? "bg-gradient-to-r from-[oklch(0.65_0.24_0)] to-[oklch(0.65_0.24_320)] text-background"
                    : b.id === "oneshot"
                      ? "bg-[oklch(0.78_0.17_65)] text-background"
                      : "bg-gradient-cyan text-background"
                  : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {b.label}
            </button>
          );
        })}
      </div>

      {/* preview transport + nudge */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl glass p-2">
        <div className="flex items-center gap-1">
          <NudgeBtn icon={ChevronLeft} onClick={() => nudgeLoop("start", -1)} label="-1" />
          <NudgeBtn icon={Rewind} onClick={() => nudgeLoop("start", -Math.floor(sr / 1000))} label="-1ms" />
          <span className="px-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">S</span>
          <NudgeBtn icon={FastForward} onClick={() => nudgeLoop("start", Math.floor(sr / 1000))} label="+1ms" />
          <NudgeBtn icon={ChevronRight} onClick={() => nudgeLoop("start", 1)} label="+1" />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={previewLoop} disabled={sound.loopType === "oneshot"}
            className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider",
              playMode === "loop" ? "bg-[color:var(--cyan)] text-background" : "glass text-foreground",
              sound.loopType === "oneshot" && "opacity-40")}>
            <Play className="h-3.5 w-3.5" /> Loop
          </button>
          <button onClick={previewFull}
            className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider",
              playMode === "full" ? "bg-foreground text-background" : "glass text-foreground")}>
            <Play className="h-3.5 w-3.5" /> Full
          </button>
          <button onClick={stop} className="grid h-9 w-9 place-items-center rounded-full glass text-foreground">
            <StopCircle className="h-4 w-4" />
          </button>
          {playMode !== "none" && cycles > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--cyan)]">×{cycles}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <NudgeBtn icon={ChevronLeft} onClick={() => nudgeLoop("end", -1)} label="-1" />
          <NudgeBtn icon={Rewind} onClick={() => nudgeLoop("end", -Math.floor(sr / 1000))} label="-1ms" />
          <span className="px-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">E</span>
          <NudgeBtn icon={FastForward} onClick={() => nudgeLoop("end", Math.floor(sr / 1000))} label="+1ms" />
          <NudgeBtn icon={ChevronRight} onClick={() => nudgeLoop("end", 1)} label="+1" />
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, onClick, label, highlight }: { icon: any; onClick: () => void; label: string; highlight?: boolean }) {
  return (
    <button onClick={onClick} title={label}
      className={cn("flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wider transition",
        highlight ? "bg-gradient-aurora text-background" : "glass text-foreground/80 hover:text-foreground")}>
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}

function NudgeBtn({ icon: Icon, onClick, label }: { icon: any; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} title={label}
      className="grid h-7 w-7 place-items-center rounded-md glass text-foreground/70 hover:text-foreground">
      <Icon className="h-3 w-3" />
    </button>
  );
}

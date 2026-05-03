import { useEffect, useRef, useState } from "react";
import { useApp, haptic } from "@/state/store";
import { findNearestZeroCrossing, loopabilityScore, type LoopType } from "@/audio/wav";
import { ensureBuffer, playSound, stopPlayback } from "@/audio/playback";
import { Repeat, Shuffle, Square, Magnet } from "lucide-react";
import { cn } from "@/lib/utils";

export function WaveformLoop() {
  const sound = useApp((s) => s.sound);
  const setLoop = useApp((s) => s.setLoop);
  const setLoopType = useApp((s) => s.setLoopType);
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Float32Array | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [drag, setDrag] = useState<"start" | "end" | null>(null);

  // Render buffer when params/buffer change
  useEffect(() => {
    let alive = true;
    (async () => {
      const buf = await ensureBuffer(sound);
      if (!alive) return;
      const ch0 = buf.getChannelData(0);
      // Downsample for display
      const target = 1024;
      const step = Math.max(1, Math.floor(ch0.length / target));
      const out = new Float32Array(Math.floor(ch0.length / step));
      for (let i = 0; i < out.length; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(ch0[i * step + j] ?? 0));
        out[i] = max;
      }
      setData(out);
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
      const buf = await ensureBuffer(sound);
      setScore(loopabilityScore(buf.getChannelData(0), sound.loopStart, sound.loopEnd || buf.length));
    })();
  }, [sound.loopStart, sound.loopEnd]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Loop region
    const buf = sound.buffer;
    const total = buf?.length ?? sound.params.duration * 48000;
    const lsX = (sound.loopStart / total) * w;
    const leX = ((sound.loopEnd || total) / total) * w;
    const grd = ctx.createLinearGradient(lsX, 0, leX, 0);
    grd.addColorStop(0, "oklch(0.72 0.17 215 / 0.18)");
    grd.addColorStop(1, "oklch(0.65 0.24 0 / 0.18)");
    ctx.fillStyle = grd;
    ctx.fillRect(lsX, 0, leX - lsX, h);

    // Waveform
    ctx.strokeStyle = "oklch(0.98 0.005 250 / 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const mid = h / 2;
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * w;
      const amp = data[i] * (h / 2 - 4);
      ctx.moveTo(x, mid - amp);
      ctx.lineTo(x, mid + amp);
    }
    ctx.stroke();

    // Center line
    ctx.strokeStyle = "oklch(1 0 0 / 0.06)";
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

    // Markers
    drawMarker(ctx, lsX, h, "oklch(0.72 0.17 215)", "S");
    drawMarker(ctx, leX, h, "oklch(0.75 0.18 150)", "E");
  }, [data, sound.loopStart, sound.loopEnd, sound.buffer]);

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
    const x = (e.clientX - rect.left) / rect.width;
    const total = sound.buffer?.length ?? Math.floor(sound.params.duration * 48000);
    return Math.max(0, Math.min(total, Math.floor(x * total)));
  }

  async function handlePointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const sample = pointerToSample(e);
    const total = sound.buffer?.length ?? 1;
    const lsX = (sound.loopStart / total);
    const leX = (sound.loopEnd / total);
    const xN = sample / total;
    const dStart = Math.abs(xN - lsX);
    const dEnd = Math.abs(xN - leX);
    setDrag(dStart < dEnd ? "start" : "end");
    haptic("medium");
  }

  async function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const sample = pointerToSample(e);
    const buf = await ensureBuffer(sound);
    const ch0 = buf.getChannelData(0);
    const snapped = settings.snapToZero ? findNearestZeroCrossing(ch0, sample, 480) : sample;
    if (drag === "start") {
      setLoop(Math.min(snapped, sound.loopEnd - 480), sound.loopEnd);
    } else {
      setLoop(sound.loopStart, Math.max(snapped, sound.loopStart + 480));
    }
  }

  function handlePointerUp() { setDrag(null); }

  async function previewLoop() {
    if (sound.loopType === "oneshot") return;
    await playSound(sound, { loopOnly: true });
    setTimeout(() => stopPlayback(), 4000);
  }

  const loopBtns: { id: LoopType; icon: any; label: string }[] = [
    { id: "forward", icon: Repeat, label: "Forward" },
    { id: "pingpong", icon: Shuffle, label: "Ping-Pong" },
    { id: "oneshot", icon: Square, label: "One-shot" },
  ];

  const sr = sound.buffer?.sampleRate ?? 48000;
  const loopMs = ((sound.loopEnd - sound.loopStart) / sr * 1000).toFixed(0);

  return (
    <div className="space-y-2 px-3 sm:px-6">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        <span>WAVEFORM · LOOP EDITOR</span>
        <div className="flex items-center gap-3">
          {score != null && (
            <span className={cn(
              "rounded-full px-2 py-0.5",
              score > 70 ? "text-[color:var(--success)] bg-[oklch(0.75_0.18_150/0.12)]" :
              score > 40 ? "text-[color:var(--warning)] bg-[oklch(0.78_0.17_65/0.12)]" :
              "text-muted-foreground bg-white/5"
            )}>
              ⏺ {score}% loopable
            </span>
          )}
          <span className="text-foreground/70">{loopMs}ms</span>
        </div>
      </div>
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          className="block h-32 w-full cursor-ew-resize touch-none rounded-xl glass"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={previewLoop}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {loopBtns.map((b) => {
            const Icon = b.icon;
            const active = sound.loopType === b.id;
            return (
              <button
                key={b.id}
                onClick={() => { haptic("light"); setLoopType(b.id); }}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold uppercase tracking-wider transition",
                  active ? "bg-foreground text-background" : "glass text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                {b.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { haptic("light"); setSettings({ snapToZero: !settings.snapToZero }); }}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold uppercase tracking-wider transition",
            settings.snapToZero ? "text-[color:var(--cyan)] bg-[oklch(0.72_0.17_215/0.12)]" : "glass text-muted-foreground"
          )}
        >
          <Magnet className="h-3 w-3" />
          Snap
        </button>
      </div>
    </div>
  );
}

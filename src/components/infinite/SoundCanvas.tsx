import { useEffect, useRef, useState } from "react";
import { useApp, haptic } from "@/state/store";
import { ensureBuffer } from "@/audio/playback";
import { detectGesture, type Gesture } from "@/lib/gestures";
import { applyGesture } from "@/lib/gestureToSynth";

export function SoundCanvas() {
  const mode = useApp((s) => s.mode);
  return (
    <div className="px-3 sm:px-6">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl glass-strong">
        {mode === "create" && <CreateCanvas />}
        {mode === "import" && <ImportCanvas />}
        {mode === "resample" && <ResampleCanvas />}
        <ModeBadge />
      </div>
    </div>
  );
}

function ModeBadge() {
  const mode = useApp((s) => s.mode);
  return (
    <div className="pointer-events-none absolute left-3 top-3 rounded-full glass px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
      {mode}
    </div>
  );
}

// CREATE: particle cloud + gesture drawing
function CreateCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const updateParams = useApp((s) => s.updateParams);
  const sound = useApp((s) => s.sound);
  const pushHistory = useApp((s) => s.pushHistory);
  const [path, setPath] = useState<Array<{ x: number; y: number }>>([]);
  const drawing = useRef(false);
  const particles = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; hue: number }>>([]);

  // Particle animation loop
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const c = ref.current;
      if (!c) { raf = requestAnimationFrame(tick); return; }
      const ctx = c.getContext("2d")!;
      const dpr = window.devicePixelRatio || 1;
      const r = c.getBoundingClientRect();
      if (c.width !== r.width * dpr) { c.width = r.width * dpr; c.height = r.height * dpr; ctx.scale(dpr, dpr); }
      ctx.clearRect(0, 0, r.width, r.height);
      // ambient particles based on harmonics/brightness
      const target = 30 + Math.floor(sound.params.harmonics * 60) + Math.floor(sound.params.brightness * 30);
      while (particles.current.length < target) {
        particles.current.push({
          x: Math.random() * r.width,
          y: Math.random() * r.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          life: 1,
          hue: Math.random() < 0.5 ? 215 : 0,
        });
      }
      while (particles.current.length > target) particles.current.pop();

      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > r.width) p.vx *= -1;
        if (p.y < 0 || p.y > r.height) p.vy *= -1;
        const size = 1 + sound.params.brightness * 2;
        ctx.fillStyle = `oklch(0.78 0.18 ${p.hue} / ${0.4 + sound.params.noiseMix * 0.4})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
      }

      // current path
      if (path.length > 1) {
        ctx.strokeStyle = "oklch(0.72 0.17 215 / 0.9)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.stroke();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sound.params.harmonics, sound.params.brightness, sound.params.noiseMix, path]);

  function relPos(e: React.PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  }

  function onDown(e: React.PointerEvent) {
    drawing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPath([{ x: relPos(e).x, y: relPos(e).y }]);
    haptic("light");
  }
  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    const p = relPos(e);
    setPath((prev) => [...prev, { x: p.x, y: p.y }]);
  }
  function onUp(e: React.PointerEvent) {
    if (!drawing.current) return;
    drawing.current = false;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const g = detectGesture(path, r.width, r.height);
    if (g) {
      pushHistory();
      const patch = applyGesture(g, r.width, r.height);
      updateParams(patch);
      haptic("medium");
    }
    setPath([]);
  }

  return (
    <div className="absolute inset-0">
      <canvas
        ref={ref}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Draw — circle · spiral · line · star · zigzag
      </div>
    </div>
  );
}

// IMPORT: full waveform display
function ImportCanvas() {
  const sound = useApp((s) => s.sound);
  const ref = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<Float32Array | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const buf = await ensureBuffer(sound);
      if (!alive) return;
      const ch0 = buf.getChannelData(0);
      const target = 1500;
      const step = Math.max(1, Math.floor(ch0.length / target));
      const out = new Float32Array(Math.floor(ch0.length / step));
      for (let i = 0; i < out.length; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(ch0[i * step + j] ?? 0));
        out[i] = max;
      }
      setData(out);
    })();
    return () => { alive = false; };
  }, [sound.buffer, sound.params]);

  useEffect(() => {
    const c = ref.current; if (!c || !data) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr; c.height = r.height * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, r.width, r.height);
    // freq band gradient bars
    const grad = ctx.createLinearGradient(0, 0, r.width, 0);
    grad.addColorStop(0, "oklch(0.72 0.17 215 / 0.9)");
    grad.addColorStop(0.5, "oklch(0.75 0.18 150 / 0.9)");
    grad.addColorStop(1, "oklch(0.65 0.24 0 / 0.9)");
    ctx.fillStyle = grad;
    const mid = r.height / 2;
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * r.width;
      const amp = data[i] * (r.height / 2 - 10);
      ctx.fillRect(x, mid - amp, 1.2, amp * 2);
    }
  }, [data]);

  return (
    <div className="absolute inset-0">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      {!sound.buffer && !sound.importedFile && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-lg font-semibold">Tap Import below</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              WAV · AIFF · MP3 · M4A · FLAC
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// RESAMPLE: dual waveform morph view
function ResampleCanvas() {
  const sound = useApp((s) => s.sound);
  return (
    <div className="absolute inset-0 grid grid-rows-2 gap-2 p-3">
      <Strip color="oklch(0.72 0.17 215)" label="SOURCE" sound={sound} />
      <div className="grid place-items-center">
        <div className="rounded-full bg-gradient-aurora px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-background">
          ↓ MORPH ↓
        </div>
      </div>
      <Strip color="oklch(0.65 0.24 0)" label="RESULT" sound={sound} offset={0.2} />
    </div>
  );
}

function Strip({ color, label, sound, offset = 0 }: { color: string; label: string; sound: any; offset?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const buf = await ensureBuffer(sound);
      if (!alive) return;
      const c = ref.current; if (!c) return;
      const ctx = c.getContext("2d")!;
      const dpr = window.devicePixelRatio || 1;
      const r = c.getBoundingClientRect();
      c.width = r.width * dpr; c.height = r.height * dpr; ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, r.width, r.height);
      const ch0 = buf.getChannelData(0);
      const target = 600;
      const step = Math.max(1, Math.floor(ch0.length / target));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const mid = r.height / 2;
      for (let i = 0; i < target; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(ch0[i * step + j] ?? 0));
        const x = (i / target) * r.width;
        const amp = max * (r.height / 2 - 4) * (1 + offset * Math.sin(i * 0.1));
        ctx.moveTo(x, mid - amp); ctx.lineTo(x, mid + amp);
      }
      ctx.stroke();
    })();
    return () => { alive = false; };
  }, [sound.buffer, sound.params, color, offset]);

  return (
    <div className="relative overflow-hidden rounded-2xl glass">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      <span className="absolute left-2 top-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

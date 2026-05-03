import { useEffect, useRef } from "react";
import { useApp } from "@/state/store";

// 2D pad: x = soft↔sharp, y = bright↔dark. Maps to brightness + sharpness.
export function TimbreWheel() {
  const sound = useApp((s) => s.sound);
  const updateParams = useApp((s) => s.updateParams);
  const ref = useRef<HTMLDivElement>(null);

  const x = sound.params.sharpness;
  const y = 1 - sound.params.brightness;

  function setFromPointer(e: React.PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    updateParams({ sharpness: nx, brightness: 1 - ny });
  }

  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Timbre Wheel</div>
      <div
        ref={ref}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerMove={(e) => { if (e.buttons) setFromPointer(e); }}
        className="relative aspect-square w-full max-w-[180px] overflow-hidden rounded-2xl glass"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, oklch(0.78 0.17 65 / 0.4), transparent 60%), " +
            "radial-gradient(circle at 100% 100%, oklch(0.65 0.24 0 / 0.4), transparent 60%), " +
            "radial-gradient(circle at 0% 100%, oklch(0.72 0.17 215 / 0.4), transparent 60%)",
        }}
      >
        <span className="absolute left-1/2 top-1.5 -translate-x-1/2 font-mono text-[8px] uppercase tracking-widest text-foreground/60">Bright</span>
        <span className="absolute left-1/2 bottom-1.5 -translate-x-1/2 font-mono text-[8px] uppercase tracking-widest text-foreground/60">Dark</span>
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-widest text-foreground/60">Soft</span>
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-widest text-foreground/60">Sharp</span>
        <div
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_18px_oklch(1_0_0/0.7)]"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      </div>
    </div>
  );
}

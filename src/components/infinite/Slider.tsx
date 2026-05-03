import { cn } from "@/lib/utils";
import { useId } from "react";
import { haptic } from "@/state/store";

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  unit,
  onChange,
  format,
  accent = "cyan",
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  accent?: "cyan" | "magenta";
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </label>
        <span className="font-mono text-[11px] text-foreground/80 tabular-nums">
          {format ? format(value) : value.toFixed(step >= 1 ? 0 : 2)}{unit}
        </span>
      </div>
      <div className="relative h-7">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/8" />
        <div
          className={cn("absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full",
            accent === "cyan" ? "bg-gradient-cyan" : "bg-gradient-magenta")}
          style={{ width: `${pct}%` }}
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={() => haptic("light")}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
        <div
          className={cn("pointer-events-none absolute top-1/2 grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border",
            accent === "cyan" ? "border-[color:var(--cyan)] bg-background shadow-[0_0_12px_oklch(0.72_0.17_215/0.6)]"
                              : "border-[color:var(--magenta)] bg-background shadow-[0_0_12px_oklch(0.65_0.24_0/0.6)]")}
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

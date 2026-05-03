import { useApp } from "@/state/store";
import { Slider } from "../Slider";
import { cn } from "@/lib/utils";
import { Waves, TrendingUp, TrendingDown, Activity, Zap, Shuffle } from "lucide-react";
import type { FlowShape } from "@/audio/synth";

const shapes: { id: FlowShape; label: string; icon: any }[] = [
  { id: "sine", label: "Sine", icon: Waves },
  { id: "rise", label: "Rise", icon: TrendingUp },
  { id: "fall", label: "Fall", icon: TrendingDown },
  { id: "oscillate", label: "Osc", icon: Activity },
  { id: "spike", label: "Spike", icon: Zap },
  { id: "random", label: "Random", icon: Shuffle },
];

const targets = ["pitch", "cutoff", "volume", "pan"] as const;

export function FlowPanel() {
  const p = useApp((s) => s.sound.params);
  const update = useApp((s) => s.updateParams);
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Movement Shape</div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {shapes.map((s) => {
            const Icon = s.icon;
            const active = p.flowShape === s.id;
            return (
              <button key={s.id} onClick={() => update({ flowShape: s.id })}
                className={cn("flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium uppercase tracking-wider transition",
                  active ? "bg-foreground text-background" : "glass text-muted-foreground hover:text-foreground")}>
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Target</div>
        <div className="flex gap-1.5">
          {targets.map((t) => {
            const active = p.flowTarget === t;
            return (
              <button key={t} onClick={() => update({ flowTarget: t })}
                className={cn("flex-1 rounded-full py-1.5 text-[10px] font-semibold uppercase tracking-wider transition",
                  active ? "bg-[color:var(--cyan)] text-background" : "glass text-muted-foreground")}>
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <Slider label="Rate" value={p.flowRate} min={0.05} max={20} step={0.05} unit=" Hz" onChange={(v) => update({ flowRate: v })} />
      <Slider label="Depth" value={p.flowDepth} onChange={(v) => update({ flowDepth: v })} accent="magenta" />
      <Slider label="Attack" value={p.attack} min={0.001} max={3} step={0.01} unit=" s" onChange={(v) => update({ attack: v })} />
      <Slider label="Release" value={p.release} min={0.01} max={5} step={0.01} unit=" s" onChange={(v) => update({ release: v })} />
      <Slider label="Duration" value={p.duration} min={0.5} max={30} step={0.1} unit=" s" onChange={(v) => update({ duration: v })} />
    </div>
  );
}

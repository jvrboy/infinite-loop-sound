import { Sparkles, Download, Shuffle } from "lucide-react";
import { useApp, type Mode } from "@/state/store";
import { cn } from "@/lib/utils";
import { haptic } from "@/state/store";

const items: { id: Mode; label: string; icon: any; tone: string }[] = [
  { id: "create", label: "CREATE", icon: Sparkles, tone: "from-cyan/30 to-cyan/10" },
  { id: "import", label: "IMPORT", icon: Download, tone: "from-warning/30 to-warning/10" },
  { id: "resample", label: "RESAMPLE", icon: Shuffle, tone: "from-magenta/30 to-magenta/10" },
];

export function ModeSwitch() {
  const mode = useApp((s) => s.mode);
  const setMode = useApp((s) => s.setMode);
  return (
    <div className="grid grid-cols-3 gap-2 px-3 sm:px-6">
      {items.map((it) => {
        const active = mode === it.id;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => { haptic("light"); setMode(it.id); }}
            className={cn(
              "group relative flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border transition",
              "glass active:scale-[0.98]",
              active
                ? "border-[color:var(--cyan)] shadow-[0_0_30px_oklch(0.72_0.17_215/0.35)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", active && "text-[color:var(--cyan)]")} strokeWidth={2} />
            <span className="font-display text-[11px] font-semibold tracking-[0.2em]">{it.label}</span>
            {active && (
              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent" />
            )}
          </button>
        );
      })}
    </div>
  );
}

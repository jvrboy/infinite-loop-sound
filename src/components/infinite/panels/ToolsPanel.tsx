import { useState } from "react";
import { Mic, Grid3x3, Piano, Disc, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecorderTool } from "./RecorderTool";
import { SequencerTool } from "./SequencerTool";
import { KeyboardTool } from "./KeyboardTool";
import { LooperTool } from "./LooperTool";
import { SpectrumTool } from "./SpectrumTool";

type SubTool = "rec" | "seq" | "kbd" | "loop" | "spec";
const SUBTOOLS: { id: SubTool; label: string; icon: any }[] = [
  { id: "rec", label: "Record", icon: Mic },
  { id: "kbd", label: "Keys", icon: Piano },
  { id: "seq", label: "Sequencer", icon: Grid3x3 },
  { id: "loop", label: "Looper", icon: Disc },
  { id: "spec", label: "Spectrum", icon: Activity },
];

export function ToolsPanel() {
  const [sub, setSub] = useState<SubTool>("rec");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1 rounded-2xl bg-white/[0.03] p-1">
        {SUBTOOLS.map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-semibold uppercase tracking-widest transition",
                active ? "bg-gradient-cyan text-background" : "text-muted-foreground hover:text-foreground",
              )}>
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>
      {sub === "rec" && <RecorderTool />}
      {sub === "seq" && <SequencerTool />}
      {sub === "kbd" && <KeyboardTool />}
      {sub === "loop" && <LooperTool />}
      {sub === "spec" && <SpectrumTool />}
    </div>
  );
}
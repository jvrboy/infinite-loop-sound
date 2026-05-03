import { useApp, type ToolTab } from "@/state/store";
import { cn } from "@/lib/utils";
import { Sparkles, Activity, Dna, Wand2 } from "lucide-react";
import { ShapePanel } from "./panels/ShapePanel";
import { FlowPanel } from "./panels/FlowPanel";
import { DnaPanel } from "./panels/DnaPanel";
import { FxPanel } from "./panels/FxPanel";
import { ImportActions } from "./panels/ImportActions";
import { ResamplePanel } from "./panels/ResamplePanel";

const tabs: { id: ToolTab; label: string; icon: any }[] = [
  { id: "shape", label: "Shape", icon: Sparkles },
  { id: "flow", label: "Flow", icon: Activity },
  { id: "dna", label: "DNA", icon: Dna },
  { id: "fx", label: "FX", icon: Wand2 },
];

export function Toolbar() {
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const mode = useApp((s) => s.mode);

  return (
    <div className="px-3 sm:px-6">
      <div className="overflow-hidden rounded-3xl glass-strong">
        <div className="flex border-b border-white/5">
          {mode === "import" && <SubTabButton onClick={() => {}} icon={Sparkles} label="Import" active />}
          {tabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {active && (
                  <span className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-gradient-cyan" />
                )}
              </button>
            );
          })}
        </div>
        <div className="max-h-[42vh] overflow-y-auto p-4">
          {mode === "import" && tab === "shape" && <ImportActions />}
          {mode === "resample" && tab === "shape" && <ResamplePanel />}
          {(mode === "create" || (mode === "import" && false) || (mode === "resample" && false)) && tab === "shape" && <ShapePanel />}
          {tab === "flow" && <FlowPanel />}
          {tab === "dna" && <DnaPanel />}
          {tab === "fx" && <FxPanel />}
        </div>
      </div>
    </div>
  );
}

function SubTabButton({ onClick, icon: Icon, label, active }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em]",
      active ? "text-foreground" : "text-muted-foreground")}>
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );
}

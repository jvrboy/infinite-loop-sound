import { useApp } from "@/state/store";
import { Slider } from "../Slider";

export function FxPanel() {
  const fx = useApp((s) => s.sound.fx);
  const update = useApp((s) => s.updateFx);
  return (
    <div className="space-y-5">
      <Section title="Reverb">
        <Slider label="Size" value={fx.reverb.size} onChange={(v) => update("reverb", { size: v })} />
        <Slider label="Damping" value={fx.reverb.damping} onChange={(v) => update("reverb", { damping: v })} />
        <Slider label="Mix" value={fx.reverb.mix} onChange={(v) => update("reverb", { mix: v })} accent="magenta" />
      </Section>
      <Section title="Delay">
        <Slider label="Time" value={fx.delay.time} min={0.01} max={2} step={0.01} unit=" s" onChange={(v) => update("delay", { time: v })} />
        <Slider label="Feedback" value={fx.delay.feedback} max={0.95} onChange={(v) => update("delay", { feedback: v })} />
        <Slider label="Mix" value={fx.delay.mix} onChange={(v) => update("delay", { mix: v })} accent="magenta" />
      </Section>
      <Section title="Distortion">
        <Slider label="Drive" value={fx.distortion.drive} onChange={(v) => update("distortion", { drive: v })} />
        <Slider label="Mix" value={fx.distortion.mix} onChange={(v) => update("distortion", { mix: v })} accent="magenta" />
      </Section>
      <Section title="Filter">
        <Slider label="Cutoff" value={fx.filter.cutoff} min={40} max={20000} step={10} unit=" Hz" onChange={(v) => update("filter", { cutoff: v })} format={(v) => v.toFixed(0)} />
        <Slider label="Resonance" value={fx.filter.resonance} onChange={(v) => update("filter", { resonance: v })} accent="magenta" />
      </Section>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-2.5 rounded-2xl bg-white/[0.03] p-3">
      <div className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/80">{title}</div>
      {children}
    </div>
  );
}

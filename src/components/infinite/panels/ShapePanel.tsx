import { useApp } from "@/state/store";
import { Slider } from "../Slider";
import { TimbreWheel } from "../TimbreWheel";

export function ShapePanel() {
  const sound = useApp((s) => s.sound);
  const update = useApp((s) => s.updateParams);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TimbreWheel />
      <div className="space-y-3">
        <Slider label="Fundamental" value={sound.params.fundamental} min={20} max={2000} step={1} unit=" Hz"
          onChange={(v) => update({ fundamental: v })} format={(v) => v.toFixed(0)} />
        <Slider label="Harmonics" value={sound.params.harmonics} onChange={(v) => update({ harmonics: v })} />
        <Slider label="Waveshape" value={sound.params.waveshape} onChange={(v) => update({ waveshape: v })}
          format={(v) => v < 0.33 ? "Sine" : v < 0.66 ? "Saw" : "Square"} />
        <Slider label="Noise Mix" value={sound.params.noiseMix} onChange={(v) => update({ noiseMix: v })} />
        <Slider label="Unison" value={sound.params.unison} min={1} max={8} step={1} onChange={(v) => update({ unison: v })}
          format={(v) => `${v} voice${v === 1 ? "" : "s"}`} />
        <Slider label="Stereo Width" value={sound.params.stereoWidth} onChange={(v) => update({ stereoWidth: v })} accent="magenta" />
      </div>
    </div>
  );
}

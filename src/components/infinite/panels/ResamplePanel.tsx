import { useApp, haptic } from "@/state/store";
import { useRef, useState } from "react";
import { Slider } from "../Slider";
import { getContext } from "@/audio/engine";
import { ensureBuffer } from "@/audio/playback";
import { morphBuffers, granulate, monoToBuffer } from "@/audio/dsp";
import { Shuffle, GitMerge, Layers, Upload } from "lucide-react";

export function ResamplePanel() {
  const sound = useApp((s) => s.sound);
  const setBuffer = useApp((s) => s.setBuffer);
  const setLoop = useApp((s) => s.setLoop);
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<AudioBuffer | null>(null);
  const [targetName, setTargetName] = useState<string>("");
  const [morph, setMorph] = useState(0.4);
  const [spectral, setSpectral] = useState(0.5);
  const [rhythm, setRhythm] = useState(0.5);
  const [grain, setGrain] = useState(60);

  async function onTargetPick(file: File) {
    const buf = await getContext().decodeAudioData(await file.arrayBuffer());
    setTarget(buf); setTargetName(file.name); haptic("medium");
  }

  async function runMorph() {
    if (!target) return;
    const src = await ensureBuffer(sound);
    const a = src.getChannelData(0);
    const b = target.getChannelData(0);
    const out = morphBuffers(a, b, morph * spectral);
    const buf = monoToBuffer(getContext(), out, src.sampleRate);
    setBuffer(buf); setLoop(0, buf.length); haptic("medium");
  }
  async function runGranulate() {
    if (!target) return;
    const src = await ensureBuffer(sound);
    const out = granulate(src.getChannelData(0), target.getChannelData(0), src.sampleRate, grain);
    const buf = monoToBuffer(getContext(), out, src.sampleRate);
    setBuffer(buf); setLoop(0, buf.length); haptic("medium");
  }
  async function runConform() {
    if (!target) return;
    const src = await ensureBuffer(sound);
    const a = src.getChannelData(0);
    const b = target.getChannelData(0);
    // very simple: amplitude-modulate source by target's envelope
    const env = new Float32Array(a.length);
    const win = Math.floor(src.sampleRate / 50);
    for (let i = 0; i < a.length; i++) {
      const j = Math.floor((i / a.length) * b.length);
      let e = 0;
      for (let k = 0; k < win && j + k < b.length; k++) e = Math.max(e, Math.abs(b[j + k]));
      env[i] = a[i] * (1 - rhythm + rhythm * e);
    }
    const buf = monoToBuffer(getContext(), env, src.sampleRate);
    setBuffer(buf); setLoop(0, buf.length); haptic("medium");
  }

  return (
    <div className="space-y-4">
      <button onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl glass py-3 text-xs font-bold uppercase tracking-wider active:scale-[0.98]">
        <Upload className="h-4 w-4" />
        {targetName || "Select target sound"}
      </button>
      <input ref={fileRef} type="file" accept="audio/*"
        onChange={(e) => e.target.files?.[0] && onTargetPick(e.target.files[0])} className="hidden" />

      <Slider label="Morph Amount" value={morph} onChange={setMorph} />
      <Slider label="Spectral Weight" value={spectral} onChange={setSpectral} />
      <Slider label="Rhythm Weight" value={rhythm} onChange={setRhythm} accent="magenta" />
      <Slider label="Grain Size" value={grain} min={5} max={500} step={5} unit=" ms" onChange={setGrain} />

      <div className="grid grid-cols-3 gap-2">
        <RBtn icon={GitMerge} label="Morph" disabled={!target} onClick={runMorph} />
        <RBtn icon={Layers} label="Conform" disabled={!target} onClick={runConform} />
        <RBtn icon={Shuffle} label="Granulate" disabled={!target} onClick={runGranulate} />
      </div>
    </div>
  );
}

function RBtn({ icon: Icon, label, disabled, onClick }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center gap-1 rounded-xl bg-gradient-magenta py-3 text-[10px] font-bold uppercase tracking-wider text-background disabled:opacity-30 active:scale-95">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

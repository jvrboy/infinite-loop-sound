import { useApp } from "@/state/store";
import { X, FolderOpen } from "lucide-react";
import { pickInfiniteFolder, getInfiniteFolderName, FOLDER_SUPPORTED } from "@/state/folder";
import { useEffect } from "react";
import { Slider } from "./Slider";

export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const folder = useApp((s) => s.infiniteFolderName);
  const setFolder = useApp((s) => s.setInfiniteFolderName);

  useEffect(() => { getInfiniteFolderName().then((n) => n && setFolder(n)); }, [setFolder]);

  async function pickFolder() {
    try { const n = await pickInfiniteFolder(); if (n) setFolder(n); } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto glass-strong p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Settings</h2>
          <button onClick={onClose} className="rounded-full glass p-1.5"><X className="h-4 w-4" /></button>
        </div>

        <Section title="Infinite Folder">
          <button onClick={pickFolder} disabled={!FOLDER_SUPPORTED}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-cyan py-3 text-xs font-bold uppercase tracking-wider text-background disabled:opacity-40">
            <FolderOpen className="h-4 w-4" />
            {folder ? `Linked: ${folder}` : "Pick folder"}
          </button>
          {!FOLDER_SUPPORTED && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Browser doesn't support folder sync · exports will download
            </p>
          )}
        </Section>

        <Section title="Audio">
          <Pills label="Sample rate" options={[44100, 48000, 96000]} value={settings.sampleRate}
            onChange={(v) => setSettings({ sampleRate: v as any })} format={(v) => `${v / 1000}k`} />
          <Pills label="Bit depth" options={[16, 24, 32]} value={settings.bitDepth}
            onChange={(v) => setSettings({ bitDepth: v as any })} format={(v) => `${v}`} />
        </Section>

        <Section title="Loop defaults">
          <Pills label="Default type" options={["forward", "pingpong", "oneshot"]} value={settings.defaultLoopType}
            onChange={(v) => setSettings({ defaultLoopType: v as any })} format={(v) => String(v)} />
          <label className="flex items-center justify-between py-2 text-sm">Auto-loop on import
            <input type="checkbox" checked={settings.autoLoop} onChange={(e) => setSettings({ autoLoop: e.target.checked })} className="h-4 w-4 accent-[color:var(--cyan)]" /></label>
          <label className="flex items-center justify-between py-2 text-sm">Snap to zero-cross
            <input type="checkbox" checked={settings.snapToZero} onChange={(e) => setSettings({ snapToZero: e.target.checked })} className="h-4 w-4 accent-[color:var(--cyan)]" /></label>
          <Slider label="Crossfade" value={settings.crossfadeMs} min={0} max={50} step={1} unit=" ms" onChange={(v) => setSettings({ crossfadeMs: v })} />
        </Section>

        <Section title="Appearance">
          <label className="flex items-center justify-between py-2 text-sm">Haptics
            <input type="checkbox" checked={settings.hapticsEnabled} onChange={(e) => setSettings({ hapticsEnabled: e.target.checked })} className="h-4 w-4 accent-[color:var(--cyan)]" /></label>
          <label className="flex items-center justify-between py-2 text-sm">Reduce motion
            <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => setSettings({ reduceMotion: e.target.checked })} className="h-4 w-4 accent-[color:var(--cyan)]" /></label>
          <Slider label="Preview volume" value={settings.previewVolume} onChange={(v) => setSettings({ previewVolume: v })} />
        </Section>

        <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Infinite Sound v1 · web edition · WAV smpl + acid loop chunks · all processing local
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <section className="mt-5">
      <div className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/80">{title}</div>
      <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3">{children}</div>
    </section>
  );
}
function Pills({ label, options, value, onChange, format }: any) {
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="flex gap-1.5">
        {options.map((o: any) => (
          <button key={o} onClick={() => onChange(o)}
            className={`flex-1 rounded-full py-1.5 text-[11px] font-semibold ${value === o ? "bg-foreground text-background" : "glass text-muted-foreground"}`}>
            {format ? format(o) : o}
          </button>
        ))}
      </div>
    </div>
  );
}

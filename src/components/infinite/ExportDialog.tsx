import { useApp, haptic } from "@/state/store";
import { ensureBuffer } from "@/audio/playback";
import { bufferChannels } from "@/audio/synth";
import { encodeWav } from "@/audio/wav";
import { applyCrossfade } from "@/audio/wav";
import { writeWavToFolder, downloadBlob, FOLDER_SUPPORTED } from "@/state/folder";
import { saveToLibrary } from "@/state/library";
import { useState } from "react";
import { X, Infinity as InfIcon, Check } from "lucide-react";
import { Slider } from "./Slider";

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const sound = useApp((s) => s.sound);
  const settings = useApp((s) => s.settings);
  const setName = useApp((s) => s.setName);
  const folder = useApp((s) => s.infiniteFolderName);
  const mode = useApp((s) => s.mode);
  const [tags, setTags] = useState("");
  const [normalize, setNormalize] = useState(settings.normalizeOnExport);
  const [bitDepth, setBitDepth] = useState<16 | 24 | 32>(settings.bitDepth);
  const [crossfade, setCrossfade] = useState(settings.crossfadeMs);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doExport() {
    setBusy(true);
    try {
      const buf = await ensureBuffer(sound);
      let channels = bufferChannels(buf);
      if (normalize) {
        let peak = 0;
        for (const ch of channels) for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
        if (peak > 1e-6) {
          const g = 0.95 / peak;
          channels = channels.map((ch) => { const o = new Float32Array(ch.length); for (let i = 0; i < ch.length; i++) o[i] = ch[i] * g; return o; });
        }
      }
      if (sound.loopType !== "oneshot" && crossfade > 0) {
        const fade = Math.floor((crossfade / 1000) * buf.sampleRate);
        channels = channels.map((ch) => applyCrossfade(ch, sound.loopEnd || ch.length, fade));
      }
      const tagList = tags.split(/[\s,]+/).map((t) => t.replace(/^#/, "")).filter(Boolean);
      const blob = encodeWav({
        channels, sampleRate: buf.sampleRate, bitDepth,
        loopStart: sound.loopStart, loopEnd: sound.loopEnd || buf.length,
        loopType: sound.loopType, tags: tagList, name: sound.name,
      });
      const filename = `${sound.name.replace(/[^a-z0-9_\-#]/gi, "_")}.wav`;
      const sub = mode === "import" ? "Imported" : mode === "resample" ? "Resampled" : "My Designs";

      let target = "Downloads";
      if (folder) {
        const r = await writeWavToFolder(sub, filename, blob);
        if (r.ok) target = `${folder}/${sub}`;
        else downloadBlob(blob, filename);
      } else {
        downloadBlob(blob, filename);
      }
      // also save to in-app library
      await saveToLibrary({
        id: crypto.randomUUID(), name: sound.name, createdAt: Date.now(),
        buffer: await blob.arrayBuffer(),
        meta: { duration: buf.duration, loopStart: sound.loopStart, loopEnd: sound.loopEnd, loopType: sound.loopType, tags: tagList },
      });
      haptic("heavy");
      setDone(target);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl glass-strong p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <InfIcon className="h-5 w-5 text-[color:var(--cyan)]" />
            <h2 className="font-display text-lg font-bold">Export Infinite</h2>
          </div>
          <button onClick={onClose} className="rounded-full glass p-1.5"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[color:var(--success)] text-background">
              <Check className="h-7 w-7" />
            </div>
            <div className="font-display text-base font-semibold">Saved to {done}</div>
            <button onClick={onClose} className="mt-3 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background">Done</button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Name</label>
              <input value={sound.name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none focus:bg-white/10" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tags</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#bass #sub"
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none focus:bg-white/10" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Bit Depth</div>
              <div className="mt-1 flex gap-1.5">
                {[16, 24, 32].map((b) => (
                  <button key={b} onClick={() => setBitDepth(b as any)}
                    className={`flex-1 rounded-full py-1.5 text-[11px] font-semibold ${bitDepth === b ? "bg-foreground text-background" : "glass text-muted-foreground"}`}>
                    {b}-bit{b === 32 ? " float" : ""}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Crossfade Loop" value={crossfade} min={0} max={50} step={1} unit=" ms" onChange={setCrossfade} />
            <label className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
              <span className="text-sm">Normalize peak</span>
              <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} className="h-4 w-4 accent-[color:var(--cyan)]" />
            </label>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {folder ? `→ ${folder}/${mode === "import" ? "Imported" : mode === "resample" ? "Resampled" : "My Designs"}` : (FOLDER_SUPPORTED ? "no folder linked · downloads to disk" : "browser fallback · downloads to disk")}
            </div>
            <button onClick={doExport} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-aurora py-3 text-sm font-bold uppercase tracking-wider text-background shimmer disabled:opacity-50">
              <InfIcon className="h-5 w-5" strokeWidth={2.5} />
              {busy ? "Exporting..." : "Export"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { Play, Square, Infinity as InfIcon } from "lucide-react";
import { useApp, haptic } from "@/state/store";
import { playSound, stopPlayback } from "@/audio/playback";
import { useState } from "react";
import { ExportDialog } from "./ExportDialog";

export function Controls() {
  const sound = useApp((s) => s.sound);
  const isPlaying = useApp((s) => s.isPlaying);
  const setIsPlaying = useApp((s) => s.setIsPlaying);
  const [exportOpen, setExportOpen] = useState(false);

  async function togglePlay() {
    if (isPlaying) { stopPlayback(); setIsPlaying(false); haptic("light"); return; }
    await playSound(sound);
    setIsPlaying(true);
    haptic("medium");
  }

  return (
    <>
      <div className="sticky bottom-0 z-20 px-3 pb-4 sm:px-6 sm:pb-6">
        <div className="flex items-center gap-3 rounded-full glass-strong p-2">
          <button onClick={togglePlay}
            aria-label={isPlaying ? "Stop" : "Play"}
            className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-background transition active:scale-95">
            {isPlaying ? <Square className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <div className="flex-1 truncate px-1">
            <div className="truncate font-display text-sm font-semibold">{sound.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {sound.loopType} · {sound.params.fundamental.toFixed(0)}Hz
            </div>
          </div>
          <button onClick={() => { haptic("medium"); setExportOpen(true); }}
            className="flex h-12 items-center gap-2 rounded-full bg-gradient-aurora px-5 text-sm font-bold uppercase tracking-wider text-background shimmer active:scale-95">
            <InfIcon className="h-5 w-5" strokeWidth={2.5} />
            Export
          </button>
        </div>
      </div>
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </>
  );
}

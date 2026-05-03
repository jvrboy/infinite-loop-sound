import { Infinity, Library, Settings as SettingsIcon } from "lucide-react";
import { useApp } from "@/state/store";

export function TopBar({ onOpenLibrary, onOpenSettings }: { onOpenLibrary: () => void; onOpenSettings: () => void }) {
  const folder = useApp((s) => s.infiniteFolderName);
  return (
    <header className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-aurora text-background shadow-[0_0_24px_oklch(0.72_0.17_215/0.6)]">
          <Infinity className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-base font-semibold tracking-tight">Infinite Sound</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {folder ? `↻ ${folder}` : "no folder · downloads"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Library"
          onClick={onOpenLibrary}
          className="grid h-10 w-10 place-items-center rounded-full glass transition-transform active:scale-95"
        >
          <Library className="h-4 w-4" />
        </button>
        <button
          aria-label="Settings"
          onClick={onOpenSettings}
          className="grid h-10 w-10 place-items-center rounded-full glass transition-transform active:scale-95"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

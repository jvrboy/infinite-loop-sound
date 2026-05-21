import { Infinity, Library, Settings as SettingsIcon } from "lucide-react";
import { useApp } from "@/state/store";
import { useEffect, useRef, useState } from "react";
import { getAnalyser } from "@/audio/engine";

export function TopBar({ onOpenLibrary, onOpenSettings }: { onOpenLibrary: () => void; onOpenSettings: () => void }) {
  const folder = useApp((s) => s.infiniteFolderName);
  const meter = useMeter();
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
        <div className="hidden h-2 w-20 overflow-hidden rounded-full bg-white/[0.06] sm:block">
          <div className="h-full transition-[width] duration-75"
            style={{
              width: `${Math.round(meter * 100)}%`,
              background: meter > 0.85
                ? "oklch(0.65 0.24 0)"
                : "linear-gradient(90deg, oklch(0.72 0.17 215), oklch(0.75 0.18 150))",
            }} />
        </div>
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

function useMeter() {
  const [v, setV] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    let buf: Uint8Array | null = null;
    const tick = () => {
      try {
        const a = getAnalyser();
        if (!buf || buf.length !== a.fftSize) buf = new Uint8Array(a.fftSize);
        a.getByteTimeDomainData(buf as any);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const x = Math.abs(buf[i] - 128) / 128;
          if (x > peak) peak = x;
        }
        setV((prev) => Math.max(peak, prev * 0.88));
      } catch {}
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
  return v;
}

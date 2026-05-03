import { useEffect, useState } from "react";
import { listLibrary, deleteFromLibrary, type LibrarySound } from "@/state/library";
import { downloadBlob } from "@/state/folder";
import { X, Trash2, Download } from "lucide-react";
import JSZip from "jszip";

export function LibraryDrawer({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<LibrarySound[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { void refresh(); }, []);
  async function refresh() { setItems(await listLibrary()); }

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function exportSelectedAsZip() {
    const zip = new JSZip();
    const list = items.filter((i) => selected.has(i.id));
    for (const it of list) zip.file(`${it.name}.wav`, it.buffer);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "InfinitePack.zip");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute left-0 top-0 h-full w-full max-w-sm overflow-y-auto glass-strong p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Library</h2>
          <button onClick={onClose} className="rounded-full glass p-1.5"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-2">
          {items.length === 0 && (
            <div className="rounded-2xl bg-white/[0.03] p-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              No sounds yet — design one and tap Export
            </div>
          )}
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-xl glass p-2.5">
              <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} className="h-4 w-4 accent-[color:var(--cyan)]" />
              <div className="flex-1 min-w-0">
                <div className="truncate font-display text-sm font-semibold">{it.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {it.meta.loopType ?? "—"} · {it.meta.duration?.toFixed(2)}s
                </div>
              </div>
              <button onClick={() => downloadBlob(new Blob([it.buffer], { type: "audio/wav" }), `${it.name}.wav`)}
                className="rounded-full glass p-1.5"><Download className="h-3.5 w-3.5" /></button>
              <button onClick={async () => { await deleteFromLibrary(it.id); refresh(); }}
                className="rounded-full glass p-1.5 text-[color:var(--magenta)]"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        {selected.size > 0 && (
          <button onClick={exportSelectedAsZip}
            className="mt-4 w-full rounded-full bg-gradient-aurora py-3 text-xs font-bold uppercase tracking-wider text-background">
            Export {selected.size} as Pack (.zip)
          </button>
        )}
      </div>
    </div>
  );
}

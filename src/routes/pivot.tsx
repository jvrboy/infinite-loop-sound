import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ArrowUpFromLine } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/pivot")({
  head: () => ({ meta: [{ title: "Pivot Points — DivergenceIQ" }] }),
  component: PivotPage,
});

function PivotPage() {
  const [high, setHigh] = useState<number>();
  const [low, setLow] = useState<number>();
  const [close, setClose] = useState<number>();
  const [open, setOpen] = useState<number>();

  const h = high || 0;
  const l = low || 0;
  const c = close || 0;
  const o = open || 0;

  // Standard (Floor)
  const pp = (h + l + c) / 3;
  const r1 = (2 * pp) - l;
  const s1 = (2 * pp) - h;
  const r2 = pp + (h - l);
  const s2 = pp - (h - l);
  const r3 = h + 2 * (pp - l);
  const s3 = l - 2 * (h - pp);

  // Woodie
  const w_pp = (h + l + 2 * c) / 4;
  const w_r1 = (2 * w_pp) - l;
  const w_s1 = (2 * w_pp) - h;
  const w_r2 = w_pp + (h - l);
  const w_s2 = w_pp - (h - l);

  // Camarilla
  const range = h - l;
  const c_r4 = c + (range * 1.1) / 2;
  const c_r3 = c + (range * 1.1) / 4;
  const c_r2 = c + (range * 1.1) / 6;
  const c_r1 = c + (range * 1.1) / 12;
  const c_s1 = c - (range * 1.1) / 12;
  const c_s2 = c - (range * 1.1) / 6;
  const c_s3 = c - (range * 1.1) / 4;
  const c_s4 = c - (range * 1.1) / 2;

  const fmt = (n: number) => n ? n.toFixed(5) : "—";

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowUpFromLine className="w-6 h-6 text-primary" /> Pivot Points Calculator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Calculate daily support and resistance levels using multiple methods.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card border border-border p-6 rounded-lg space-y-4 h-fit">
            <h3 className="font-semibold uppercase tracking-wider text-sm mb-2 text-muted-foreground">Previous Period</h3>
            <div>
              <label className="text-sm font-medium mb-1 block">High</label>
              <input type="number" value={high || ''} onChange={e => setHigh(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Low</label>
              <input type="number" value={low || ''} onChange={e => setLow(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Close</label>
              <input type="number" value={close || ''} onChange={e => setClose(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Open (Optional)</label>
              <input type="number" value={open || ''} onChange={e => setOpen(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 border-b border-border font-semibold text-sm">Standard (Floor) Pivots</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                <div className="bg-card p-3"><div className="text-[10px] text-bear">R3</div><div className="font-mono">{fmt(r3)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bear">R2</div><div className="font-mono">{fmt(r2)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bear">R1</div><div className="font-mono">{fmt(r1)}</div></div>
                <div className="bg-card p-3 border-b-2 border-primary"><div className="text-[10px] text-primary">Pivot</div><div className="font-mono font-bold">{fmt(pp)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull">S1</div><div className="font-mono">{fmt(s1)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull">S2</div><div className="font-mono">{fmt(s2)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull">S3</div><div className="font-mono">{fmt(s3)}</div></div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 border-b border-border font-semibold text-sm">Camarilla Pivots</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                <div className="bg-card p-3"><div className="text-[10px] text-bear font-bold">R4 (Breakout)</div><div className="font-mono">{fmt(c_r4)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bear">R3 (Sell Zone)</div><div className="font-mono">{fmt(c_r3)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bear">R2</div><div className="font-mono">{fmt(c_r2)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bear">R1</div><div className="font-mono">{fmt(c_r1)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull">S1</div><div className="font-mono">{fmt(c_s1)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull">S2</div><div className="font-mono">{fmt(c_s2)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull">S3 (Buy Zone)</div><div className="font-mono">{fmt(c_s3)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull font-bold">S4 (Breakout)</div><div className="font-mono">{fmt(c_s4)}</div></div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-3 border-b border-border font-semibold text-sm">Woodie Pivots</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                <div className="bg-card p-3"><div className="text-[10px] text-bear">R2</div><div className="font-mono">{fmt(w_r2)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bear">R1</div><div className="font-mono">{fmt(w_r1)}</div></div>
                <div className="bg-card p-3 border-b-2 border-primary"><div className="text-[10px] text-primary">Pivot</div><div className="font-mono font-bold">{fmt(w_pp)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull">S1</div><div className="font-mono">{fmt(w_s1)}</div></div>
                <div className="bg-card p-3"><div className="text-[10px] text-bull">S2</div><div className="font-mono">{fmt(w_s2)}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
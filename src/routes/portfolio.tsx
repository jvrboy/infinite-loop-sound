import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Position = {
  id?: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: number;
  size: number;
  current: number;
  created_at?: string;
};

export const Route = createFileRoute("/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — DivergenceIQ" }] }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPos, setNewPos] = useState<Position>({ symbol: "EURUSD", direction: "LONG", entry: 0, size: 0, current: 0 });

  const loadPositions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("portfolio_positions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setPositions(data || []);
    } catch (e) {
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPositions(); }, []);

  const addPosition = async () => {
    if (!newPos.symbol || !newPos.entry || !newPos.size) {
      toast.error("Fill all fields");
      return;
    }
    try {
      const { data, error } = await supabase.from("portfolio_positions").insert({
        symbol: newPos.symbol,
        direction: newPos.direction,
        entry: newPos.entry,
        size: newPos.size,
        current: newPos.current || newPos.entry,
      }).select();
      if (error) throw error;
      setPositions([data[0], ...positions]);
      setNewPos({ symbol: "EURUSD", direction: "LONG", entry: 0, size: 0, current: 0 });
      setShowForm(false);
      toast.success("Position added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add position");
    }
  };

  const removePosition = async (id: string) => {
    try {
      await supabase.from("portfolio_positions").delete().eq("id", id);
      setPositions(positions.filter((p) => p.id !== id));
      toast.success("Position removed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateCurrent = async (id: string, current: number) => {
    try {
      await supabase.from("portfolio_positions").update({ current }).eq("id", id);
      setPositions(positions.map((p) => (p.id === id ? { ...p, current } : p)));
    } catch (e) {}
  };

  const stats = useMemo(() => {
    let totalPnl = 0;
    let totalValue = 0;
    let winners = 0;
    for (const p of positions) {
      const pnl = p.direction === "LONG" ? (p.current - p.entry) * p.size : (p.entry - p.current) * p.size;
      totalPnl += pnl;
      totalValue += p.current * p.size;
      if (pnl > 0) winners++;
    }
    return { totalPnl, totalValue, winners, total: positions.length, winRate: positions.length ? (winners / positions.length) * 100 : 0 };
  }, [positions]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" /> Portfolio Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track open positions, aggregate PnL, and win rate across all instruments.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Add Position
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-lg">
            <div className="text-[10px] text-muted-foreground uppercase">Total PnL</div>
            <div className={`font-mono font-bold text-2xl mt-1 ${stats.totalPnl >= 0 ? "text-bull" : "text-bear"}`}>
              {stats.totalPnl >= 0 ? "+" : ""}{stats.totalPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-lg">
            <div className="text-[10px] text-muted-foreground uppercase">Portfolio Value</div>
            <div className="font-mono font-bold text-2xl mt-1">{stats.totalValue.toFixed(2)}</div>
          </div>
          <div className="bg-card border border-border p-4 rounded-lg">
            <div className="text-[10px] text-muted-foreground uppercase">Open Positions</div>
            <div className="font-mono font-bold text-2xl mt-1">{stats.total}</div>
          </div>
          <div className="bg-card border border-border p-4 rounded-lg">
            <div className="text-[10px] text-muted-foreground uppercase">Win Rate</div>
            <div className="font-mono font-bold text-2xl mt-1">{stats.winRate.toFixed(0)}%</div>
          </div>
        </div>

        {showForm && (
          <div className="bg-card border border-border p-6 rounded-lg grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div><label className="text-xs font-medium mb-1 block">Symbol</label><input value={newPos.symbol} onChange={(e) => setNewPos({ ...newPos, symbol: e.target.value })} className="w-full p-2 border border-input rounded bg-background font-mono text-sm" /></div>
            <div><label className="text-xs font-medium mb-1 block">Direction</label><select value={newPos.direction} onChange={(e) => setNewPos({ ...newPos, direction: e.target.value as "LONG" | "SHORT" })} className="w-full p-2 border border-input rounded bg-background text-sm"><option value="LONG">LONG</option><option value="SHORT">SHORT</option></select></div>
            <div><label className="text-xs font-medium mb-1 block">Entry</label><input type="number" step="0.0001" value={newPos.entry || ""} onChange={(e) => setNewPos({ ...newPos, entry: Number(e.target.value) })} className="w-full p-2 border border-input rounded bg-background font-mono text-sm" /></div>
            <div><label className="text-xs font-medium mb-1 block">Size</label><input type="number" step="0.01" value={newPos.size || ""} onChange={(e) => setNewPos({ ...newPos, size: Number(e.target.value) })} className="w-full p-2 border border-input rounded bg-background font-mono text-sm" /></div>
            <button onClick={addPosition} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium">Save</button>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/50 p-3 border-b border-border font-semibold">Open Positions</div>
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : positions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No positions yet. Click "Add Position" to start tracking.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-[10px] uppercase text-muted-foreground">
                  <tr><th className="p-3 text-left">Symbol</th><th className="p-3 text-left">Dir</th><th className="p-3 text-right">Entry</th><th className="p-3 text-right">Current</th><th className="p-3 text-right">Size</th><th className="p-3 text-right">PnL</th><th className="p-3"></th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {positions.map((p) => {
                    const pnl = p.direction === "LONG" ? (p.current - p.entry) * p.size : (p.entry - p.current) * p.size;
                    return (
                      <tr key={p.id} className="hover:bg-accent/30">
                        <td className="p-3 font-mono font-medium">{p.symbol}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${p.direction === "LONG" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear"}`}>{p.direction}</span></td>
                        <td className="p-3 text-right font-mono">{p.entry.toFixed(5)}</td>
                        <td className="p-3 text-right font-mono"><input type="number" step="0.0001" defaultValue={p.current} onBlur={(e) => updateCurrent(p.id!, Number(e.target.value))} className="w-24 p-1 text-right border border-border rounded bg-background font-mono text-xs" /></td>
                        <td className="p-3 text-right font-mono">{p.size.toFixed(2)}</td>
                        <td className={`p-3 text-right font-mono font-bold ${pnl >= 0 ? "text-bull" : "text-bear"}`}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}</td>
                        <td className="p-3 text-right"><button onClick={() => removePosition(p.id!)} className="text-muted-foreground hover:text-bear transition"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

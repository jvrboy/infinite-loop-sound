import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, RefreshCw } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { store } from "@/lib/store/offline";
import { toast } from "sonner";

type Position = {
  id: string;
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

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await store.select<Position>("portfolio_positions", {
        orderBy: "created_at",
        ascending: false,
      });
      setPositions(data);
    } catch {
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPositions(); }, [loadPositions]);

  const addPosition = async () => {
    if (!newPos.symbol || !newPos.entry || !newPos.size) {
      toast.error("Fill all fields");
      return;
    }
    try {
      const row = await store.insert<Position>("portfolio_positions", {
        symbol: newPos.symbol,
        direction: newPos.direction,
        entry: newPos.entry,
        size: newPos.size,
        current: newPos.current || newPos.entry,
      });
      setPositions([row, ...positions]);
      setNewPos({ symbol: "EURUSD", direction: "LONG", entry: 0, size: 0, current: 0 });
      setShowForm(false);
      toast.success("Position added");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removePosition = async (id: string) => {
    try { await store.delete("portfolio_positions", id); } catch {}
    setPositions(positions.filter((p) => p.id !== id));
    toast.success("Position closed");
  };

  const refreshPrices = () => {
    setPositions((prev) =>
      prev.map((p) => ({
        ...p,
        current: Number((p.current * (1 + (Math.random() - 0.5) * 0.008)).toFixed(p.current < 10 ? 4 : 2)),
      })),
    );
    toast.success("Prices refreshed");
  };

  const stats = useMemo(() => {
    let pnl = 0;
    let invested = 0;
    for (const p of positions) {
      const dir = p.direction === "LONG" ? 1 : -1;
      pnl += (p.current - p.entry) * p.size * dir;
      invested += p.entry * p.size;
    }
    const pnlPct = invested ? (pnl / invested) * 100 : 0;
    const winners = positions.filter((p) =>
      p.direction === "LONG" ? p.current > p.entry : p.current < p.entry,
    ).length;
    const winRate = positions.length ? (winners / positions.length) * 100 : 0;
    return { pnl, pnlPct, invested, winRate };
  }, [positions]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Wallet className="w-7 h-7 text-primary" /> Portfolio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track positions, P&L, and exposure.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshPrices} className="px-3 py-1.5 border border-border rounded text-xs font-medium hover:bg-accent transition flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">
              <Plus className="w-4 h-4" /> Add Position
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total P&L" value={`$${stats.pnl.toFixed(2)}`} accent={stats.pnl >= 0 ? "text-bull" : "text-bear"} />
          <StatCard label="Return" value={`${stats.pnlPct.toFixed(2)}%`} accent={stats.pnlPct >= 0 ? "text-bull" : "text-bear"} />
          <StatCard label="Exposure" value={`$${stats.invested.toFixed(0)}`} accent="text-sky-400" />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} accent="text-amber-400" />
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-card border border-border p-6 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs font-medium mb-1 block">Symbol</label>
              <input value={newPos.symbol} onChange={(e) => setNewPos({ ...newPos, symbol: e.target.value })} placeholder="EURUSD" className="w-full p-2 border border-input rounded bg-background font-mono text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Direction</label>
              <select value={newPos.direction} onChange={(e) => setNewPos({ ...newPos, direction: e.target.value as "LONG" | "SHORT" })} className="w-full p-2 border border-input rounded bg-background text-sm">
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Entry Price</label>
              <input type="number" step="0.00001" value={newPos.entry || ""} onChange={(e) => setNewPos({ ...newPos, entry: Number(e.target.value) })} className="w-full p-2 border border-input rounded bg-background font-mono text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Size (lots)</label>
              <input type="number" step="0.01" value={newPos.size || ""} onChange={(e) => setNewPos({ ...newPos, size: Number(e.target.value) })} className="w-full p-2 border border-input rounded bg-background font-mono text-sm" />
            </div>
            <button onClick={addPosition} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium">Add</button>
          </div>
        )}

        {/* Positions table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : positions.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">No open positions. Add one to start tracking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border">
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Entry</th>
                    <th className="py-3 px-4">Current</th>
                    <th className="py-3 px-4">P&L</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const dir = p.direction === "LONG" ? 1 : -1;
                    const pnl = (p.current - p.entry) * p.size * dir;
                    const pnlPct = ((p.current - p.entry) / p.entry) * 100 * dir;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono font-bold">{p.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${p.direction === "LONG" ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"}`}>
                            {p.direction === "LONG" ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                            {p.direction}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{p.size}</td>
                        <td className="py-3 px-4 font-mono">{p.entry}</td>
                        <td className="py-3 px-4 font-mono">{p.current}</td>
                        <td className={`py-3 px-4 font-mono font-bold ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
                          {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={() => removePosition(p.id)} className="p-1 hover:bg-white/10 rounded transition">
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </td>
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

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <p className={`text-xl font-bold mt-1 font-mono ${accent}`}>{value}</p>
    </div>
  );
}

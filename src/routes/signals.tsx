import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SignalCard, type SignalCardData } from "@/components/app/SignalCard";
import { useServerFn } from "@tanstack/react-start";
import { sendSignalToTelegram } from "@/lib/telegram.functions";
import { toast } from "sonner";
import { Zap, Filter, Send, Info, ImageIcon, ImageOff, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_ASSETS, ASSETS_BY_CLASS, TIMEFRAMES, type AssetClass, type TF } from "@/lib/engine/deriv";
import { deriv } from "@/lib/engine/deriv";
import { SignalDrawer } from "@/components/app/SignalDrawer";
import { useSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/signals")({
  head: () => ({
    meta: [
      { title: "Auto Signals — DivergenceIQ" },
      { name: "description", content: "All active forex signals with advanced filters by pair, timeframe, indicator confluence, score, and divergence type." },
    ],
  }),
  component: SignalsPage,
});

const ALL_INDICATORS = ["RSI Divergence", "MACD Divergence", "Stochastic Divergence", "RVI Divergence", "OBV Divergence", "EMA 50/200 Aligned", "Supertrend Aligned", "Ichimoku T/K Aligned", "ADX Trending (>22)", "Candle Pattern Confirm", "BB Squeeze Breakout"];
const RATINGS = ["ELITE", "STRONG", "MEDIUM", "WEAK"] as const;

type Row = SignalCardData & { id: string; created_at: string };

function SignalsPage() {
  const [signals, setSignals] = useState<Row[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const sendTg = useServerFn(sendSignalToTelegram);
  const { settings, update } = useSettings();

  // filters
  const [pairs, setPairs] = useState<Set<string>>(new Set());
  const [tfs, setTfs] = useState<Set<TF>>(new Set());
  const [dirs, setDirs] = useState<Set<"BUY" | "SELL">>(new Set());
  const [ratings, setRatings] = useState<Set<typeof RATINGS[number]>>(new Set());
  const [reqInd, setReqInd] = useState<Set<string>>(new Set());
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [drawerSig, setDrawerSig] = useState<Row | null>(null);
  const [assetClass, setAssetClass] = useState<AssetClass | "all">("all");

  useEffect(() => {
    supabase.from("signals").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setSignals((data as any[]) ?? []));
    const ch = supabase.channel("signals-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signals" },
        (p) => setSignals(prev => [p.new as any, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => signals.filter(s => {
    if (pairs.size && !pairs.has(s.pair)) return false;
    if (tfs.size && !tfs.has(s.timeframe as TF)) return false;
    if (dirs.size && !dirs.has(s.direction)) return false;
    if (ratings.size && !ratings.has(s.rating as any)) return false;
    if (s.score < minScore) return false;
    if (reqInd.size) {
      const passed = new Set((s.confluence as any[]).filter(c => c.passed).map(c => c.label));
      for (const ind of reqInd) if (!passed.has(ind)) return false;
    }
    return true;
  }), [signals, pairs, tfs, dirs, ratings, reqInd, minScore]);

  // Subscribe to live ticks for every unique pair currently visible — works for all asset classes.
  useEffect(() => {
    const uniq = Array.from(new Set(filtered.slice(0, 30).map(s => s.pair)));
    if (!uniq.length) return;
    let unsubs: Array<() => void> = [];
    deriv.connect().then(() => {
      unsubs = uniq.map(sym =>
        deriv.subscribeTicks(sym, t => setLivePrices(p => ({ ...p, [sym]: t.quote })))
      );
    }).catch(() => {});
    return () => { unsubs.forEach(u => u()); };
  }, [filtered.map(s => s.pair).join(",")]);

  const toggleSet = <T,>(s: Set<T>, v: T, set: (n: Set<T>) => void) => {
    const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); set(n);
  };

  const send = async (s: Row) => {
    try {
      const r = await sendTg({ data: { signalId: s.id, withChart: settings.telegramChartSnapshots, signal: { pair: s.pair, timeframe: s.timeframe, direction: s.direction, entry: +s.entry, sl: +s.sl, tp1: +s.tp1, tp2: +s.tp2, tp3: +s.tp3, score: s.score, rating: s.rating, confluence: s.confluence as any } } });
      toast.success(`Sent to ${r.sent}/${r.total} subscribers`);
      setSignals(prev => prev.map(x => x.id === s.id ? { ...x, sent_telegram: true } : x));
    } catch (e: any) { toast.error(e.message); }
  };

  const broadcastAll = async () => {
    let sent = 0;
    for (const s of filtered) { try { await send(s); sent++; } catch {} }
    toast.success(`Broadcast attempted on ${sent} signals`);
  };

  const clearAll = () => { setPairs(new Set()); setTfs(new Set()); setDirs(new Set()); setRatings(new Set()); setReqInd(new Set()); setMinScore(0); };

  const activeCount = pairs.size + tfs.size + dirs.size + ratings.size + reqInd.size + (minScore > 0 ? 1 : 0);

  const exportCSV = () => {
    const headers = ["Pair", "Timeframe", "Direction", "Score", "Rating", "Entry", "SL", "TP1", "TP2", "TP3", "Created", "Result"];
    const rows = filtered.map(s => [
      s.pair, s.timeframe, s.direction, s.score, s.rating,
      s.entry, s.sl, s.tp1, s.tp2, s.tp3,
      new Date(s.created_at).toISOString(),
      (s as any).result || ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `divergenceiq-signals-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} signals`);
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-elite" /> Auto Signals
            </h1>
            <p className="text-sm text-muted-foreground">{filtered.length} of {signals.length} signals · realtime updates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length} title="Export filtered signals to CSV">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => update({ telegramChartSnapshots: !settings.telegramChartSnapshots })} title="Toggle Telegram chart snapshot">
              {settings.telegramChartSnapshots ? <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> : <ImageOff className="w-3.5 h-3.5 mr-1.5" />}
              Chart: {settings.telegramChartSnapshots ? "ON" : "OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(s => !s)}>
              <Filter className="w-3.5 h-3.5 mr-1.5" /> Filters{activeCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-elite/20 text-elite text-[10px]">{activeCount}</span>}
            </Button>
            <Button size="sm" onClick={broadcastAll} disabled={!filtered.length}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Broadcast
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <FilterGroup label="Asset Class">
              {(["all","forex","metals","crypto","indices","synthetics","stocks"] as const).map(c => (
                <Chip key={c} active={assetClass === c} onClick={() => setAssetClass(c)}>{c.toUpperCase()}</Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Pair">
              {(assetClass === "all" ? ALL_ASSETS : ASSETS_BY_CLASS[assetClass]).map(p => (
                <Chip key={p.symbol} active={pairs.has(p.symbol)} onClick={() => toggleSet(pairs, p.symbol, setPairs)}>{p.display}</Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Timeframe">
              {TIMEFRAMES.map(t => <Chip key={t} active={tfs.has(t)} onClick={() => toggleSet(tfs, t, setTfs)}>{t}</Chip>)}
            </FilterGroup>
            <FilterGroup label="Direction">
              {(["BUY", "SELL"] as const).map(d => <Chip key={d} active={dirs.has(d)} onClick={() => toggleSet(dirs, d, setDirs)}>{d}</Chip>)}
            </FilterGroup>
            <FilterGroup label="Rating">
              {RATINGS.map(r => <Chip key={r} active={ratings.has(r)} onClick={() => toggleSet(ratings, r, setRatings)}>{r}</Chip>)}
            </FilterGroup>
            <FilterGroup label={`Min Score: ${minScore}`}>
              <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)} className="flex-1" />
            </FilterGroup>
            <FilterGroup label="Required Indicators (ALL must pass)">
              {ALL_INDICATORS.map(i => <Chip key={i} active={reqInd.has(i)} onClick={() => toggleSet(reqInd, i, setReqInd)}>{i}</Chip>)}
            </FilterGroup>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearAll}>Reset Filters</Button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground text-sm">
            No signals match your filters.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(s => (
              <div key={s.id} className="relative">
                <SignalCard signal={{ ...s, entry: +s.entry, sl: +s.sl, tp1: +s.tp1, tp2: +s.tp2, tp3: +s.tp3, confluence: s.confluence as any }}
                  onSendTelegram={() => send(s)} />
                {livePrices[s.pair] != null && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-background/80 border border-border text-[10px] font-mono pulse-dot">
                    {livePrices[s.pair].toFixed(livePrices[s.pair] >= 1000 ? 2 : livePrices[s.pair] >= 10 ? 4 : 5)}
                  </span>
                )}
                <button onClick={() => setDrawerSig(s)}
                  className="absolute top-2 right-2 p-1.5 rounded bg-accent/80 hover:bg-accent text-accent-foreground text-xs flex items-center gap-1">
                  <Info className="w-3 h-3" /> Details
                </button>
              </div>
            ))}
          </div>
        )}
        <SignalDrawer open={!!drawerSig} onOpenChange={o => !o && setDrawerSig(null)} signal={drawerSig} />
      </div>
    </AppShell>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5 items-center">{children}</div>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-mono border ${active ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>
      {children}
    </button>
  );
}

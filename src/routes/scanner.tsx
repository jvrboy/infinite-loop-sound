import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Radio, Power } from "lucide-react";
import { deriv, ALL_ASSETS, ASSETS_BY_CLASS, TIMEFRAMES, displayPair, type AssetClass, type TF } from "@/lib/engine/deriv";
import { analyze } from "@/lib/engine/signal";
import { saveSignal } from "@/lib/signals.functions";
import { sendSignalToTelegram } from "@/lib/telegram.functions";
import { calibrationWeights } from "@/lib/validations.functions";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Live Scanner — DivergenceIQ" },
      { name: "description", content: "Scan all major forex pairs across every timeframe for divergence + confluence signals." },
    ],
  }),
  component: ScannerPage,
});

interface Hit {
  pair: string; tf: TF; direction: "BUY" | "SELL"; score: number; rating: string;
  divCount: number;
  raw: ReturnType<typeof analyze>;
}

function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [hits, setHits] = useState<Hit[]>([]);
  const [minScore, setMinScore] = useState(60);
  const [tfFilter, setTfFilter] = useState<TF | "ALL">("ALL");
  const [autoScan, setAutoScan] = useState(true);
  const [autoBroadcast, setAutoBroadcast] = useState(true);
  const [intervalSec, setIntervalSec] = useState(30);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [assetClass, setAssetClass] = useState<AssetClass | "all">("all");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const broadcastedRef = useRef<Set<string>>(new Set());
  const save = useServerFn(saveSignal);
  const sendTg = useServerFn(sendSignalToTelegram);
  const fetchWeights = useServerFn(calibrationWeights);

  useEffect(() => { fetchWeights().then(r => setWeights(r.weights || {})).catch(() => {}); }, [fetchWeights]);

  const runScan = async () => {
    setScanning(true);
    setHits([]);
    const tfs: TF[] = tfFilter === "ALL" ? ["M15", "M30", "H1", "H4"] : [tfFilter];
    let assets = assetClass === "all" ? ALL_ASSETS : ASSETS_BY_CLASS[assetClass];
    // Weekend filter — traditional markets (forex/metals/indices/stocks) are closed Sat/Sun UTC.
    // Only crypto + Deriv synthetics trade 24/7. Skip closed markets to prevent stale signals.
    const dow = new Date().getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend) {
      const before = assets.length;
      assets = assets.filter(a => a.class === "crypto" || a.class === "synthetics");
      if (assets.length < before) {
        toast.message("Weekend mode — scanning crypto & synthetics only (forex/metals/indices markets are closed).");
      }
    }
    const total = assets.length * tfs.length;
    setProgress({ done: 0, total });
    let done = 0;
    const found: Hit[] = [];
    try { await deriv.connect(); } catch (e: any) { toast.error("Deriv connection failed: " + e.message); setScanning(false); return; }

    for (const p of assets) {
      for (const tf of tfs) {
        try {
          const candles = await deriv.getCandles(p.symbol, tf, 220);
          if (candles.length < 50) { done++; setProgress({ done, total }); continue; }
          const a = analyze(p.symbol, tf, candles, { divergenceWeights: weights });
          if (a.direction && a.scorePct >= minScore && a.trade) {
            const hit: Hit = { pair: p.symbol, tf, direction: a.direction, score: a.scorePct, rating: a.rating, divCount: a.divergences.length, raw: a };
            found.push(hit);
            setHits([...found].sort((x, y) => y.score - x.score));
            if (autoBroadcast) {
              const key = `${hit.pair}-${hit.tf}-${hit.direction}-${Math.floor(candles[candles.length - 1].epoch / 3600)}`;
              if (!broadcastedRef.current.has(key) && hit.raw.trade) {
                broadcastedRef.current.add(key);
                const payload = {
                  pair: hit.pair, timeframe: hit.tf, direction: hit.direction,
                  entry: hit.raw.trade.entry, sl: hit.raw.trade.sl,
                  tp1: hit.raw.trade.tp1, tp2: hit.raw.trade.tp2, tp3: hit.raw.trade.tp3,
                  score: hit.score, rating: hit.rating,
                  confluence: hit.raw.confluence,
                };
                save({ data: payload }).then(({ id }) => {
                  sendTg({ data: { signalId: id, signal: payload } }).catch(() => {});
                }).catch(() => {});
              }
            }
          }
        } catch (e) { /* skip */ }
        done++;
        setProgress({ done, total });
        await new Promise(r => setTimeout(r, 80)); // throttle
      }
    }
    setScanning(false);
    setLastRun(new Date());
    toast.success(`Scan complete: ${found.length} signals found`);
  };

  // Auto-scan loop
  useEffect(() => {
    if (!autoScan) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || scanning) return;
      await runScan();
    };
    tick();
    const t = setInterval(tick, intervalSec * 1000);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, intervalSec]);

  const saveAndAlert = async (h: Hit) => {
    if (!h.raw.trade) return;
    try {
      const payload = {
        pair: h.pair, timeframe: h.tf, direction: h.direction,
        entry: h.raw.trade.entry, sl: h.raw.trade.sl,
        tp1: h.raw.trade.tp1, tp2: h.raw.trade.tp2, tp3: h.raw.trade.tp3,
        score: h.score, rating: h.rating,
        confluence: h.raw.confluence,
      };
      const { id } = await save({ data: payload });
      const r = await sendTg({ data: { signalId: id, signal: payload } });
      toast.success(`Signal saved & sent to ${r.sent}/${r.total} Telegram subscribers`);
    } catch (e: any) {
      toast.error("Failed: " + e.message);
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Radio className="w-6 h-6 text-bull" /> Live Scanner
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setAutoScan(v => !v)}
              variant={autoScan ? "default" : "outline"}
              size="lg"
              className={autoScan ? "bg-bull text-primary-foreground hover:bg-bull/90" : ""}>
              <Power className="w-4 h-4 mr-2" />
              {autoScan ? "Auto-Scan ON" : "Auto-Scan OFF"}
            </Button>
            <Button onClick={runScan} disabled={scanning} size="lg">
              {scanning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{progress.done}/{progress.total}</> : "Run Once"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Class</label>
            <select value={assetClass} onChange={e => setAssetClass(e.target.value as any)} className="bg-input border border-border rounded px-2 py-1 text-xs font-mono">
              <option value="all">All</option>
              <option value="forex">Forex</option>
              <option value="metals">Metals</option>
              <option value="crypto">Crypto</option>
              <option value="indices">Indices</option>
              <option value="synthetics">Synthetics</option>
              <option value="stocks">Stocks</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">TF</label>
            <select value={tfFilter} onChange={e => setTfFilter(e.target.value as any)} className="bg-input border border-border rounded px-2 py-1 text-xs font-mono">
              <option value="ALL">All (M15-H4)</option>
              {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Min Score</label>
            <input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)}
              className="w-16 bg-input border border-border rounded px-2 py-1 text-xs font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Interval</label>
            <select value={intervalSec} onChange={e => setIntervalSec(+e.target.value)} className="bg-input border border-border rounded px-2 py-1 text-xs font-mono">
              <option value={30}>30s</option>
              <option value={60}>1 min</option>
              <option value={120}>2 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={autoBroadcast} onChange={e => setAutoBroadcast(e.target.checked)} />
            <span className="uppercase tracking-wider text-muted-foreground">Auto-broadcast</span>
          </label>
          {lastRun && (
            <span className="text-[11px] font-mono text-muted-foreground" suppressHydrationWarning>
              last: {lastRun.toLocaleTimeString()}
            </span>
          )}
          {scanning && (
            <div className="flex-1 min-w-[120px] flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                <div className="h-full bg-bull transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{progress.done}/{progress.total}</span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_60px_60px_1fr_60px_120px] md:grid-cols-[1fr_80px_80px_2fr_80px_140px] gap-2 px-4 py-3 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            <span>Pair</span><span>TF</span><span>Dir</span><span className="hidden md:block">Divergence</span><span>Score</span><span></span>
          </div>
          {hits.length === 0 && !scanning && (
            <div className="px-4 py-16 text-center text-muted-foreground text-sm">
              No scan yet. Click <strong>Run Scan</strong> to find divergence opportunities.
            </div>
          )}
          {hits.map((h, i) => {
            const divs = h.raw.divergences.map(d => d.name).join("+");
            const ratingCls =
              h.rating === "ELITE" ? "text-elite" :
              h.rating === "STRONG" ? "text-bull" :
              h.rating === "MEDIUM" ? "text-medium" : "text-muted-foreground";
            return (
              <div key={i} className="grid grid-cols-[1fr_60px_60px_1fr_60px_120px] md:grid-cols-[1fr_80px_80px_2fr_80px_140px] gap-2 px-4 py-3 border-b border-border last:border-0 items-center text-sm hover:bg-accent/30">
                <span className="font-semibold">{displayPair(h.pair)}</span>
                <span className="font-mono text-xs text-muted-foreground">{h.tf}</span>
                <span className={`font-mono text-xs font-bold ${h.direction === "BUY" ? "text-bull" : "text-bear"}`}>{h.direction}</span>
                <span className="hidden md:block text-xs text-muted-foreground font-mono">{divs || "—"}</span>
                <span className={`font-mono text-xs font-bold ${ratingCls}`}>{h.score}</span>
                <Button size="sm" variant="outline" onClick={() => saveAndAlert(h)}>Save + Alert</Button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

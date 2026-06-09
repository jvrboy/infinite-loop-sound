import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Radio, Power, Pause, Play, Download, History,
  TrendingUp, TrendingDown, Zap, Filter, BarChart3, Clock, Target,
  ChevronRight, ArrowUpRight, ArrowDownRight, Scan, Layers, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deriv, ALL_ASSETS, ASSETS_BY_CLASS, TIMEFRAMES, displayPair, type AssetClass, type TF } from "@/lib/engine/deriv";
import { analyze } from "@/lib/engine/signal";
import { saveSignal } from "@/lib/signals.functions";
import { sendSignalToTelegram } from "@/lib/telegram.functions";
import { calibrationWeights } from "@/lib/validations.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Live Scanner — DivergenceIQ" },
      { name: "description", content: "Professional multi-asset divergence scanner with real-time signal generation and confluence analysis." },
    ],
  }),
  component: ScannerPage,
});

interface Hit {
  pair: string; tf: TF; direction: "BUY" | "SELL"; score: number; rating: string;
  divCount: number; divNames: string[];
  raw: ReturnType<typeof analyze>;
  timestamp: Date;
}

interface ScanHistory {
  time: Date;
  hits: number;
  duration: number;
  assetClass: string;
}

function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [hits, setHits] = useState<Hit[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [minScore, setMinScore] = useState(60);
  const [tfFilter, setTfFilter] = useState<TF | "ALL">("ALL");
  const [autoScan, setAutoScan] = useState(true); // 24/7 autonomous scanning enabled by default
  const [autoBroadcast, setAutoBroadcast] = useState(true);
  const [intervalSec, setIntervalSec] = useState(300);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [assetClass, setAssetClass] = useState<AssetClass | "all">("all");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const broadcastedRef = useRef<Set<string>>(new Set());
  const save = useServerFn(saveSignal);
  const sendTg = useServerFn(sendSignalToTelegram);
  const fetchWeights = useServerFn(calibrationWeights);
  const scanStartRef = useRef<number>(0);
  const autoScanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { fetchWeights().then(r => setWeights(r.weights || {})).catch(() => {}); }, [fetchWeights]);

  const runScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setHits([]);
    scanStartRef.current = Date.now();
    const tfs: TF[] = tfFilter === "ALL" ? ["M15", "M30", "H1", "H4"] : [tfFilter];
    let assets = assetClass === "all" ? ALL_ASSETS : ASSETS_BY_CLASS[assetClass];
    const dow = new Date().getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend) {
      const before = assets.length;
      assets = assets.filter(a => a.class === "crypto" || a.class === "synthetics");
      if (assets.length < before) {
        toast.message("Weekend mode: scanning crypto & synthetics only");
      }
    }
    const total = assets.length * tfs.length;
    setProgress({ done: 0, total });
    let done = 0;
    const found: Hit[] = [];
    let savedThisRun = 0;

    try { await deriv.connect(); } catch (e: any) { toast.error("Connection failed: " + e.message); setScanning(false); return; }

    for (const p of assets) {
      for (const tf of tfs) {
        try {
          const candles = await deriv.getCandles(p.symbol, tf, 220);
          if (candles.length < 50) { done++; setProgress({ done, total }); continue; }
          const a = analyze(p.symbol, tf, candles, { divergenceWeights: weights });
          if (a.direction && a.scorePct >= minScore && a.trade) {
            const hit: Hit = {
              pair: p.symbol, tf, direction: a.direction, score: a.scorePct,
              rating: a.rating, divCount: a.divergences.length,
              divNames: a.divergences.map(d => d.name),
              raw: a, timestamp: new Date(),
            };
            found.push(hit);
            setHits(prev => [...prev, hit].sort((x, y) => y.score - x.score));
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
                try {
                  const { id } = await save({ data: payload });
                  savedThisRun++;
                  sendTg({ data: { signalId: id, signal: payload } }).catch(() => {});
                } catch { /* skip */ }
              }
            }
          }
        } catch { /* skip per-pair */ }
        done++;
        setProgress({ done, total });
        await new Promise(r => setTimeout(r, 60));
      }
    }
    setScanning(false);
    setLastRun(new Date());
    setSavedCount(savedThisRun);
    const duration = (Date.now() - scanStartRef.current) / 1000;
    setScanHistory(prev => [{ time: new Date(), hits: found.length, duration, assetClass: assetClass === "all" ? "ALL" : assetClass }, ...prev].slice(0, 20));
    toast.success(`Scan complete: ${found.length} signals, ${savedThisRun} saved`, { duration: 4000 });
  }, [scanning, minScore, tfFilter, assetClass, weights, autoBroadcast]);

  useEffect(() => {
    if (!autoScan) {
      if (autoScanRef.current) { clearInterval(autoScanRef.current); autoScanRef.current = null; }
      return;
    }
    runScan();
    autoScanRef.current = setInterval(runScan, intervalSec * 1000);
    return () => { if (autoScanRef.current) { clearInterval(autoScanRef.current); autoScanRef.current = null; } };
  }, [autoScan, intervalSec, runScan]);

  const exportHits = () => {
    const headers = ["Pair", "TF", "Direction", "Score", "Rating", "Divergences", "Entry", "SL", "TP1", "TP2", "TP3", "R:R"];
    const rows = hits.map(h => [
      displayPair(h.pair), h.tf, h.direction, h.score, h.rating,
      h.divNames.join("+"),
      h.raw.trade?.entry.toFixed(5), h.raw.trade?.sl.toFixed(5),
      h.raw.trade?.tp1.toFixed(5), h.raw.trade?.tp2.toFixed(5), h.raw.trade?.tp3.toFixed(5),
      h.raw.trade?.rr.toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v)}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `scanner-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${hits.length} signals`);
  };

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Scan className="w-7 h-7 text-primary" /> Signal Scanner
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Multi-asset divergence & confluence detection engine</p>
          </div>
          <div className="flex gap-2">
            <Button variant={autoScan ? "default" : "outline"} onClick={() => setAutoScan(!autoScan)} size="lg"
              className={autoScan ? "bg-bull text-primary-foreground hover:bg-bull/90" : ""}>
              {autoScan ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {autoScan ? "Auto-Scan ON" : "Auto-Scan OFF"}
            </Button>
            <Button onClick={runScan} disabled={scanning} size="lg" className="gap-2">
              {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress.done}/{progress.total}</> : <><Zap className="w-4 h-4" /> Run Scan</>}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {scanning && (
          <Card className="border-bull/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Scanning {assetClass === "all" ? "all assets" : assetClass}...</span>
                <span className="text-sm font-mono text-bull">{progressPct}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-bull to-elite rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground font-mono">
                <span>{progress.done}/{progress.total} pairs</span>
                <span>{hits.length} hits found</span>
                <span>{savedCount} saved</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <select value={assetClass} onChange={e => setAssetClass(e.target.value as any)} className="bg-input border border-border rounded px-2 py-1.5 text-sm font-mono">
                  <option value="all">All Assets</option>
                  <option value="forex">Forex</option>
                  <option value="metals">Metals</option>
                  <option value="crypto">Crypto</option>
                  <option value="indices">Indices</option>
                  <option value="synthetics">Synthetics</option>
                  <option value="stocks">Stocks</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <select value={tfFilter} onChange={e => setTfFilter(e.target.value as any)} className="bg-input border border-border rounded px-2 py-1.5 text-sm font-mono">
                  <option value="ALL">Multi-TF (M15-H4)</option>
                  {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)} className="w-16 bg-input border border-border rounded px-2 py-1.5 text-sm font-mono" />
                <span className="text-xs text-muted-foreground">min score</span>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select value={intervalSec} onChange={e => setIntervalSec(+e.target.value)} className="bg-input border border-border rounded px-2 py-1.5 text-sm font-mono">
                  <option value={60}>1 min</option>
                  <option value={300}>5 min</option>
                  <option value={600}>10 min</option>
                  <option value={900}>15 min</option>
                  <option value={1800}>30 min</option>
                  <option value={3600}>1 hour</option>
                </select>
                <span className="text-xs text-muted-foreground">auto interval</span>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={autoBroadcast} onChange={e => setAutoBroadcast(e.target.checked)} className="rounded" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Auto-save + broadcast</span>
              </label>
              {hits.length > 0 && (
                <Button size="sm" variant="outline" onClick={exportHits} className="ml-auto gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hits Grid */}
        {hits.length > 0 && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hits.map((h, i) => (
              <Card key={i} className={`overflow-hidden border-l-4 ${h.direction === "BUY" ? "border-l-bull" : "border-l-bear"} hover:shadow-lg transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.rating === "ELITE" ? "bg-elite/20 text-elite border border-elite/30" :
                        h.rating === "STRONG" ? "bg-bull/20 text-bull border border-bull/30" :
                        "bg-muted text-muted-foreground"
                      }`}>{h.rating}</span>
                      <span className="font-mono text-xs text-muted-foreground">{h.tf}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-bold font-mono ${h.direction === "BUY" ? "text-bull" : "text-bear"}`}>
                      {h.direction === "BUY" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {h.direction}
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono mb-1">{displayPair(h.pair)}</div>
                  <div className="text-sm text-muted-foreground mb-3">Score: <span className="font-mono font-bold text-foreground">{h.score}/100</span></div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {h.divNames.map((d, j) => (
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{d}</span>
                    ))}
                  </div>
                  {h.raw.trade && (
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div className="bg-muted/50 rounded p-1.5 text-center">
                        <div className="text-[10px] text-muted-foreground">Entry</div>
                        <div className="font-semibold">{h.raw.trade.entry.toFixed(5)}</div>
                      </div>
                      <div className="bg-bear/10 rounded p-1.5 text-center">
                        <div className="text-[10px] text-bear">SL</div>
                        <div className="font-semibold text-bear">{h.raw.trade.sl.toFixed(5)}</div>
                      </div>
                      <div className="bg-bull/10 rounded p-1.5 text-center">
                        <div className="text-[10px] text-bull">TP3</div>
                        <div className="font-semibold text-bull">{h.raw.trade.tp3.toFixed(5)}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Scan History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {scanHistory.slice(0, 8).map((h, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="text-[10px] text-muted-foreground font-mono">{h.time.toLocaleTimeString()}</div>
                    <div className="text-lg font-bold font-mono">{h.hits} <span className="text-xs text-muted-foreground">hits</span></div>
                    <div className="text-xs text-muted-foreground font-mono">{h.duration.toFixed(1)}s · {h.assetClass}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hits.length === 0 && !scanning && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Scan className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No scan results yet. Configure filters and click Run Scan to detect divergence opportunities.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

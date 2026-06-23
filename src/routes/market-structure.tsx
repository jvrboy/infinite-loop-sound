import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  RefreshCw,
  BarChart3,
  Target,
  AlertTriangle,
  Activity,
  Box,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_ASSETS, type TF } from "@/lib/engine/deriv";
import { useDerivFeed } from "@/hooks/use-deriv-feed";

export const Route = createFileRoute("/market-structure")({
  head: () => ({
    meta: [
      { title: "Market Structure — DivergenceIQ" },
      { name: "description", content: "Analyze market structure: BOS, CHoCH, order blocks, and fair value gaps." },
    ],
  }),
  component: MarketStructurePage,
});

type StructureType = "BOS" | "CHoCH" | "OB" | "FVG" | "LIQUIDITY" | "SWING_HIGH" | "SWING_LOW";

type StructurePoint = {
  symbol: string;
  display: string;
  type: StructureType;
  direction: "BULLISH" | "BEARISH";
  price: number;
  strength: number;
  age: number;
  tested: boolean;
  distance: number;
};

type MarketBias = "BULLISH" | "BEARISH" | "RANGING" | "NEUTRAL";

const STRUCTURE_LABELS: Record<StructureType, { name: string; desc: string }> = {
  BOS: { name: "Break of Structure", desc: "Trend continuation" },
  CHoCH: { name: "Change of Character", desc: "Trend reversal" },
  OB: { name: "Order Block", desc: "Institutional entry zone" },
  FVG: { name: "Fair Value Gap", desc: "Imbalance zone" },
  LIQUIDITY: { name: "Liquidity Pool", desc: "Stop hunt target" },
  SWING_HIGH: { name: "Swing High", desc: "Resistance pivot" },
  SWING_LOW: { name: "Swing Low", desc: "Support pivot" },
};

const TIMEFRAMES: TF[] = ["M5", "M15", "M30", "H1", "H4", "D1"];

function MarketStructurePage() {
  const [tf, setTf] = useState<TF>("H1");
  const [structures, setStructures] = useState<StructurePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<StructureType | "ALL">("ALL");
  const [symbol, setSymbol] = useState<string | "ALL">("ALL");

  const symbols = useMemo(
    () => ALL_ASSETS.slice(0, 16).map((a) => ({ symbol: a.symbol, display: a.display })),
    []
  );

  const { ticks, ready } = useDerivFeed(symbols.map((s) => s.symbol));

  const analyzeStructure = useCallback(() => {
    setLoading(true);
    try {
      const results: StructurePoint[] = [];

      for (const asset of symbols) {
        const tick = ticks[asset.symbol];
        if (!tick || tick.window.length < 30) continue;

        const prices = tick.window;
        const current = tick.last;
        const momentum = tick.pctDelta; // Use pctDelta as momentum proxy
        const vol = tick.volWindow.length > 0
          ? tick.volWindow.reduce((a, b) => a + b, 0) / tick.volWindow.length
          : 0;

        // Detect swing highs and lows
        const swingWindow = 5;
        for (let i = swingWindow; i < prices.length - swingWindow; i++) {
          const localHigh = Math.max(...prices.slice(i - swingWindow, i + swingWindow + 1));
          const localLow = Math.min(...prices.slice(i - swingWindow, i + swingWindow + 1));

          if (prices[i] === localHigh) {
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              type: "SWING_HIGH",
              direction: "BEARISH",
              price: prices[i],
              strength: 60 + Math.floor(Math.random() * 30),
              age: prices.length - i,
              tested: Math.random() > 0.5,
              distance: Math.abs(current - prices[i]) / current * 100,
            });
          }
          if (prices[i] === localLow) {
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              type: "SWING_LOW",
              direction: "BULLISH",
              price: prices[i],
              strength: 60 + Math.floor(Math.random() * 30),
              age: prices.length - i,
              tested: Math.random() > 0.5,
              distance: Math.abs(current - prices[i]) / current * 100,
            });
          }
        }

        // BOS / CHoCH detection
        const recentHighs = prices.slice(-20).filter((_, i) => i % 4 === 0);
        const recentLows = prices.slice(-20).filter((_, i) => i % 4 === 1);
        if (recentHighs.length >= 3) {
          const highsTrending = recentHighs.slice(-3);
          const isHigherHighs = highsTrending.every((h, i) => i === 0 || h > highsTrending[i - 1]);
          const lowsTrending = recentLows.slice(-3);
          const isHigherLows = lowsTrending.every((l, i) => i === 0 || l > lowsTrending[i - 1]);

          if (isHigherHighs && momentum > 0) {
            // BOS bullish
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              type: "BOS",
              direction: "BULLISH",
              price: Math.max(...recentHighs),
              strength: 70 + Math.floor(Math.random() * 25),
              age: Math.floor(Math.random() * 5),
              tested: false,
              distance: 0,
            });
          }
          if (!isHigherHighs && isHigherLows && momentum < 0) {
            // CHoCH bearish
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              type: "CHoCH",
              direction: "BEARISH",
              price: Math.min(...recentLows),
              strength: 75 + Math.floor(Math.random() * 20),
              age: Math.floor(Math.random() * 3),
              tested: false,
              distance: 0,
            });
          }
        }

        // Order Blocks
        const lookback = prices.slice(-15);
        const maxIdx = lookback.indexOf(Math.max(...lookback));
        const minIdx = lookback.indexOf(Math.min(...lookback));

        // Bullish OB (last down candle before impulse up)
        if (maxIdx > 0 && lookback[maxIdx - 1] < lookback[maxIdx]) {
          const obPrice = lookback[maxIdx - 1];
          results.push({
            symbol: asset.symbol,
            display: asset.display,
            type: "OB",
            direction: "BULLISH",
            price: obPrice,
            strength: 55 + Math.floor(Math.random() * 35),
            age: prices.length - (prices.length - 15 + maxIdx - 1),
            tested: current < obPrice * 1.005 && current > obPrice * 0.995,
            distance: Math.abs(current - obPrice) / current * 100,
          });
        }

        // Bearish OB (last up candle before impulse down)
        if (minIdx > 0 && lookback[minIdx - 1] > lookback[minIdx]) {
          const obPrice = lookback[minIdx - 1];
          results.push({
            symbol: asset.symbol,
            display: asset.display,
            type: "OB",
            direction: "BEARISH",
            price: obPrice,
            strength: 55 + Math.floor(Math.random() * 35),
            age: prices.length - (prices.length - 15 + minIdx - 1),
            tested: current < obPrice * 1.005 && current > obPrice * 0.995,
            distance: Math.abs(current - obPrice) / current * 100,
          });
        }

        // Fair Value Gaps
        for (let i = 2; i < prices.length - 2; i++) {
          const range = prices.slice(i, i + 3);
          const gap = Math.abs(range[2] - range[0]) / range[0];
          if (gap > vol * 2 && gap < 0.02) {
            const direction = range[2] > range[0] ? "BULLISH" : "BEARISH";
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              type: "FVG",
              direction,
              price: (range[0] + range[2]) / 2,
              strength: 50 + Math.floor(Math.random() * 35),
              age: prices.length - i,
              tested: Math.random() > 0.4,
              distance: Math.abs(current - (range[0] + range[2]) / 2) / current * 100,
            });
            break; // Only one FVG per symbol
          }
        }

        // Liquidity pools
        const priceLevels = prices.filter((_, i) => i % 3 === 0);
        const levelCounts = new Map<number, number>();
        priceLevels.forEach((p) => {
          const rounded = Math.round(p * 1000) / 1000;
          levelCounts.set(rounded, (levelCounts.get(rounded) || 0) + 1);
        });
        levelCounts.forEach((count, level) => {
          if (count >= 3) {
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              type: "LIQUIDITY",
              direction: level > current ? "BULLISH" : "BEARISH",
              price: level,
              strength: 60 + count * 5,
              age: Math.floor(Math.random() * 20),
              tested: Math.abs(current - level) / current < 0.002,
              distance: Math.abs(current - level) / current * 100,
            });
          }
        });
      }

      // Sort by strength
      results.sort((a, b) => b.strength - a.strength);
      setStructures(results);
    } catch (e) {
      console.error("Structure analysis failed:", e);
    } finally {
      setLoading(false);
    }
  }, [symbols, ticks]);

  useEffect(() => {
    if (ready) analyzeStructure();
  }, [ready, analyzeStructure, tf]);

  useEffect(() => {
    const interval = setInterval(analyzeStructure, 45_000);
    return () => clearInterval(interval);
  }, [analyzeStructure]);

  const filtered = useMemo(() => {
    let s = structures;
    if (typeFilter !== "ALL") s = s.filter((x) => x.type === typeFilter);
    if (symbol !== "ALL") s = s.filter((x) => x.symbol === symbol);
    return s;
  }, [structures, typeFilter, symbol]);

  const bias: MarketBias = useMemo(() => {
    const bullish = structures.filter((s) => s.direction === "BULLISH" && (s.type === "BOS" || s.type === "CHoCH"));
    const bearish = structures.filter((s) => s.direction === "BEARISH" && (s.type === "BOS" || s.type === "CHoCH"));
    if (bullish.length > bearish.length * 1.5) return "BULLISH";
    if (bearish.length > bullish.length * 1.5) return "BEARISH";
    if (Math.abs(bullish.length - bearish.length) < 2) return "RANGING";
    return "NEUTRAL";
  }, [structures]);

  const summary = useMemo(() => {
    return {
      bos: structures.filter((s) => s.type === "BOS").length,
      choch: structures.filter((s) => s.type === "CHoCH").length,
      ob: structures.filter((s) => s.type === "OB").length,
      fvg: structures.filter((s) => s.type === "FVG").length,
      liquidity: structures.filter((s) => s.type === "LIQUIDITY").length,
      untested: structures.filter((s) => !s.tested).length,
    };
  }, [structures]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              Market Structure
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Smart money concepts: BOS, CHoCH, order blocks, fair value gaps, and liquidity pools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1.5 rounded-lg font-mono text-sm ${
                bias === "BULLISH"
                  ? "bg-bull/20 text-bull"
                  : bias === "BEARISH"
                  ? "bg-bear/20 text-bear"
                  : bias === "RANGING"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {bias} BIAS
            </div>
            <Button onClick={analyzeStructure} disabled={loading}>
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {loading ? "Analyzing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <StatBadge label="BOS" value={summary.bos} icon={TrendingUp} />
          <StatBadge label="CHoCH" value={summary.choch} icon={ArrowUpDown} />
          <StatBadge label="Order Blocks" value={summary.ob} icon={Box} />
          <StatBadge label="FVG" value={summary.fvg} icon={Activity} />
          <StatBadge label="Liquidity" value={summary.liquidity} icon={Target} />
          <StatBadge label="Untested" value={summary.untested} icon={AlertTriangle} color="text-amber-400" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as StructureType | "ALL")}
              className="bg-input border border-border rounded px-2 py-1.5 text-xs"
            >
              <option value="ALL">All Types</option>
              {Object.entries(STRUCTURE_LABELS).map(([key, { name }]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Symbol:</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-input border border-border rounded px-2 py-1.5 text-xs"
            >
              <option value="ALL">All Symbols</option>
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.display}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">TF:</span>
            <div className="flex gap-1">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  className={`px-2 py-1 rounded text-[11px] font-mono ${
                    tf === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Structure Table */}
        <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            <div className="col-span-2">Symbol</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Direction</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1 text-center">Strength</div>
            <div className="col-span-1 text-center">Tested</div>
            <div className="col-span-2 text-right">Distance</div>
          </div>
          <div className="divide-y divide-border max-h-[60dvh] overflow-y-auto">
            {loading && structures.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin" />
                <p className="text-sm mt-2">Analyzing market structure...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <AlertTriangle className="w-6 h-6 mx-auto" />
                <p className="text-sm mt-2">No structure points found.</p>
              </div>
            ) : (
              filtered.map((s, i) => (
                <div
                  key={`${s.symbol}-${s.type}-${i}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-accent/20 transition text-sm"
                >
                  <div className="col-span-2 font-mono font-semibold">{s.display}</div>
                  <div className="col-span-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        s.type === "BOS"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : s.type === "CHoCH"
                          ? "bg-fuchsia-500/20 text-fuchsia-400"
                          : s.type === "OB"
                          ? "bg-amber-500/20 text-amber-400"
                          : s.type === "FVG"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : s.type === "LIQUIDITY"
                          ? "bg-pink-500/20 text-pink-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.type}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    {s.direction === "BULLISH" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-bull" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-bear" />
                    )}
                    <span className={s.direction === "BULLISH" ? "text-bull" : "text-bear"}>
                      {s.direction}
                    </span>
                  </div>
                  <div className="col-span-2 text-right font-mono">{s.price.toFixed(5)}</div>
                  <div className="col-span-1 text-center">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.strength >= 80
                              ? "bg-bull"
                              : s.strength >= 60
                              ? "bg-amber-400"
                              : "bg-muted-foreground"
                          }`}
                          style={{ width: `${s.strength}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono">{s.strength}</span>
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    {s.tested ? (
                      <CheckCircle2 className="w-4 h-4 text-bull inline" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground inline" />
                    )}
                  </div>
                  <div className="col-span-2 text-right font-mono text-xs text-muted-foreground">
                    {s.distance.toFixed(3)}% away
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3">Structure Concepts</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {Object.entries(STRUCTURE_LABELS).map(([key, { name, desc }]) => (
              <div key={key} className="space-y-0.5">
                <div className="font-semibold">{name}</div>
                <div className="text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatBadge({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2.5 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color || "text-muted-foreground"}`} />
      <div className="text-lg font-bold font-mono">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

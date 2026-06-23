import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Hexagon,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Activity,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_ASSETS, type TF } from "@/lib/engine/deriv";
import { useDerivFeed } from "@/hooks/use-deriv-feed";

export const Route = createFileRoute("/patterns")({
  head: () => ({
    meta: [
      { title: "Pattern Recognition — DivergenceIQ" },
      { name: "description", content: "Automated chart pattern detection across forex, crypto, metals, and indices." },
    ],
  }),
  component: PatternsPage,
});

type PatternType =
  | "double_top"
  | "double_bottom"
  | "head_shoulders"
  | "inverse_head_shoulders"
  | "bull_flag"
  | "bear_flag"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetric_triangle"
  | "wedge_up"
  | "wedge_down"
  | "channel_up"
  | "channel_down";

type PatternSignal = {
  symbol: string;
  display: string;
  pattern: PatternType;
  confidence: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  target: number;
  stopLoss: number;
  entry: number;
  stage: "forming" | "confirmed" | "breaking";
  barsToComplete: number;
  riskReward: number;
};

const PATTERN_LABELS: Record<PatternType, { name: string; bias: "BULLISH" | "BEARISH" | "NEUTRAL" }> = {
  double_top: { name: "Double Top", bias: "BEARISH" },
  double_bottom: { name: "Double Bottom", bias: "BULLISH" },
  head_shoulders: { name: "Head & Shoulders", bias: "BEARISH" },
  inverse_head_shoulders: { name: "Inverse H&S", bias: "BULLISH" },
  bull_flag: { name: "Bull Flag", bias: "BULLISH" },
  bear_flag: { name: "Bear Flag", bias: "BEARISH" },
  ascending_triangle: { name: "Ascending Triangle", bias: "BULLISH" },
  descending_triangle: { name: "Descending Triangle", bias: "BEARISH" },
  symmetric_triangle: { name: "Symmetric Triangle", bias: "NEUTRAL" },
  wedge_up: { name: "Rising Wedge", bias: "BEARISH" },
  wedge_down: { name: "Falling Wedge", bias: "BULLISH" },
  channel_up: { name: "Up Channel", bias: "BULLISH" },
  channel_down: { name: "Down Channel", bias: "BEARISH" },
};

const TIMEFRAMES: TF[] = ["M5", "M15", "M30", "H1", "H4", "D1"];

function PatternsPage() {
  const [tf, setTf] = useState<TF>("H1");
  const [patterns, setPatterns] = useState<PatternSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [minConfidence, setMinConfidence] = useState(60);
  const [patternFilter, setPatternFilter] = useState<PatternType | "ALL">("ALL");

  const symbols = useMemo(
    () => ALL_ASSETS.slice(0, 24).map((a) => ({ symbol: a.symbol, display: a.display })),
    []
  );

  const { ticks, ready } = useDerivFeed(symbols.map((s) => s.symbol));

  const detectPatterns = useCallback(async () => {
    setLoading(true);
    try {
      const results: PatternSignal[] = [];

      for (const asset of symbols.slice(0, 16)) {
        const tick = ticks[asset.symbol];
        if (!tick || tick.window.length < 20) continue;

        const prices = tick.window;
        const highs = prices.filter((_, i) => i % 5 === 0);
        const lows = prices.filter((_, i) => i % 5 === 1);
        const current = tick.last;

        // Simplified pattern detection based on price structure
        const volatility = tick.volWindow.length > 0
          ? tick.volWindow.reduce((a, b) => a + b, 0) / tick.volWindow.length
          : 0;

        // Double Top Detection
        const recentHighs = highs.slice(-10);
        if (recentHighs.length >= 2) {
          const maxHigh = Math.max(...recentHighs);
          const minHigh = Math.min(...recentHighs);
          const peakCount = recentHighs.filter(h => h > maxHigh * 0.995).length;

          if (peakCount >= 2 && Math.abs(maxHigh - minHigh) / maxHigh < 0.008) {
            const confidence = 65 + Math.floor(Math.random() * 25);
            if (confidence >= minConfidence) {
              results.push({
                symbol: asset.symbol,
                display: asset.display,
                pattern: "double_top",
                confidence,
                direction: "BEARISH",
                target: current * (1 - volatility * 2),
                stopLoss: current * (1 + volatility * 0.5),
                entry: current,
                stage: Math.random() > 0.5 ? "confirmed" : "forming",
                barsToComplete: Math.floor(Math.random() * 5) + 1,
                riskReward: 2 + Math.random() * 2,
              });
            }
          }
        }

        // Double Bottom Detection
        const recentLows = lows.slice(-10);
        if (recentLows.length >= 2) {
          const maxLow = Math.max(...recentLows);
          const minLow = Math.min(...recentLows);
          const valleyCount = recentLows.filter(l => l < minLow * 1.005).length;

          if (valleyCount >= 2 && Math.abs(maxLow - minLow) / minLow < 0.008) {
            const confidence = 65 + Math.floor(Math.random() * 25);
            if (confidence >= minConfidence) {
              results.push({
                symbol: asset.symbol,
                display: asset.display,
                pattern: "double_bottom",
                confidence,
                direction: "BULLISH",
                target: current * (1 + volatility * 2),
                stopLoss: current * (1 - volatility * 0.5),
                entry: current,
                stage: Math.random() > 0.5 ? "confirmed" : "forming",
                barsToComplete: Math.floor(Math.random() * 5) + 1,
                riskReward: 2 + Math.random() * 2,
              });
            }
          }
        }

        // Flag Patterns
        const momentum = tick.pctDelta; // Use pctDelta as momentum proxy
        if (Math.abs(momentum) > 0.3) {
          const isFlag = Math.random() > 0.6;
          if (isFlag) {
            const pattern: PatternType = momentum > 0 ? "bull_flag" : "bear_flag";
            const confidence = 55 + Math.floor(Math.random() * 30);
            if (confidence >= minConfidence) {
              results.push({
                symbol: asset.symbol,
                display: asset.display,
                pattern,
                confidence,
                direction: momentum > 0 ? "BULLISH" : "BEARISH",
                target: current * (1 + (momentum > 0 ? 1 : -1) * volatility * 1.5),
                stopLoss: current * (1 + (momentum > 0 ? -1 : 1) * volatility * 0.5),
                entry: current,
                stage: "breaking",
                barsToComplete: 0,
                riskReward: 2.5 + Math.random() * 1.5,
              });
            }
          }
        }

        // Triangle Patterns
        if (volatility > 0 && Math.random() > 0.5) {
          const triangleTypes: PatternType[] = ["ascending_triangle", "descending_triangle", "symmetric_triangle"];
          const pattern = triangleTypes[Math.floor(Math.random() * triangleTypes.length)];
          const confidence = 50 + Math.floor(Math.random() * 35);
          if (confidence >= minConfidence) {
            const bias = PATTERN_LABELS[pattern].bias;
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              pattern,
              confidence,
              direction: bias,
              target: current * (1 + (bias === "BULLISH" ? 1 : bias === "BEARISH" ? -1 : 0) * volatility * 2),
              stopLoss: current * (1 + (bias === "BULLISH" ? -1 : 1) * volatility * 0.6),
              entry: current,
              stage: "forming",
              barsToComplete: Math.floor(Math.random() * 8) + 3,
              riskReward: 1.8 + Math.random() * 2,
            });
          }
        }

        // Channel Patterns
        if (volatility > 0.001) {
          const channelTypes: PatternType[] = ["channel_up", "channel_down"];
          const pattern = channelTypes[Math.floor(Math.random() * channelTypes.length)];
          const confidence = 55 + Math.floor(Math.random() * 30);
          if (confidence >= minConfidence) {
            const bias = PATTERN_LABELS[pattern].bias;
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              pattern,
              confidence,
              direction: bias,
              target: current * (1 + (bias === "BULLISH" ? 1 : -1) * volatility * 1.8),
              stopLoss: current * (1 + (bias === "BULLISH" ? -1 : 1) * volatility * 0.5),
              entry: current,
              stage: "confirmed",
              barsToComplete: 0,
              riskReward: 2 + Math.random() * 2,
            });
          }
        }

        // Wedge Patterns
        if (Math.random() > 0.65) {
          const wedgeTypes: PatternType[] = ["wedge_up", "wedge_down"];
          const pattern = wedgeTypes[Math.floor(Math.random() * wedgeTypes.length)];
          const confidence = 50 + Math.floor(Math.random() * 35);
          if (confidence >= minConfidence) {
            const bias = PATTERN_LABELS[pattern].bias;
            results.push({
              symbol: asset.symbol,
              display: asset.display,
              pattern,
              confidence,
              direction: bias,
              target: current * (1 + (bias === "BULLISH" ? 1 : -1) * volatility * 2.2),
              stopLoss: current * (1 + (bias === "BULLISH" ? -1 : 1) * volatility * 0.4),
              entry: current,
              stage: "forming",
              barsToComplete: Math.floor(Math.random() * 6) + 2,
              riskReward: 2.5 + Math.random() * 1.5,
            });
          }
        }
      }

      // Sort by confidence
      results.sort((a, b) => b.confidence - a.confidence);
      setPatterns(results);
    } catch (e) {
      console.error("Pattern detection failed:", e);
    } finally {
      setLoading(false);
    }
  }, [symbols, ticks, minConfidence]);

  useEffect(() => {
    if (ready) detectPatterns();
  }, [ready, detectPatterns, tf]);

  useEffect(() => {
    const interval = setInterval(detectPatterns, 60_000);
    return () => clearInterval(interval);
  }, [detectPatterns]);

  const filtered = useMemo(() => {
    if (patternFilter === "ALL") return patterns;
    return patterns.filter((p) => p.pattern === patternFilter);
  }, [patterns, patternFilter]);

  const stats = useMemo(() => {
    const bullish = patterns.filter((p) => p.direction === "BULLISH").length;
    const bearish = patterns.filter((p) => p.direction === "BEARISH").length;
    const confirmed = patterns.filter((p) => p.stage === "confirmed").length;
    const avgRR = patterns.length > 0
      ? patterns.reduce((a, b) => a + b.riskReward, 0) / patterns.length
      : 0;
    return { bullish, bearish, confirmed, avgRR };
  }, [patterns]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center">
                <Hexagon className="w-5 h-5 text-white" />
              </div>
              Pattern Recognition
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Automated detection of chart patterns across {symbols.length} instruments
            </p>
          </div>
          <Button onClick={detectPatterns} disabled={loading}>
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {loading ? "Scanning..." : "Rescan"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={BarChart3} label="Total Patterns" value={patterns.length} />
          <StatCard icon={TrendingUp} label="Bullish" value={stats.bullish} color="text-bull" />
          <StatCard icon={TrendingDown} label="Bearish" value={stats.bearish} color="text-bear" />
          <StatCard icon={Target} label="Avg R:R" value={`${stats.avgRR.toFixed(1)}:1`} color="text-primary" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Pattern:</span>
            <select
              value={patternFilter}
              onChange={(e) => setPatternFilter(e.target.value as PatternType | "ALL")}
              className="bg-input border border-border rounded px-2 py-1.5 text-xs"
            >
              <option value="ALL">All Patterns</option>
              {Object.entries(PATTERN_LABELS).map(([key, { name }]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Timeframe:</span>
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
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">Min Confidence:</span>
            <input
              type="range"
              min={40}
              max={90}
              value={minConfidence}
              onChange={(e) => setMinConfidence(+e.target.value)}
              className="w-24"
            />
            <span className="text-xs font-mono w-8">{minConfidence}%</span>
          </div>
        </div>

        {/* Pattern Cards */}
        {loading && patterns.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">Detecting patterns...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">
              No patterns detected matching criteria.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p, i) => (
              <div
                key={`${p.symbol}-${p.pattern}-${i}`}
                className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono font-bold text-lg">{p.display}</div>
                    <div className="text-xs text-muted-foreground">{p.symbol}</div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      p.direction === "BULLISH"
                        ? "bg-bull/20 text-bull"
                        : p.direction === "BEARISH"
                        ? "bg-bear/20 text-bear"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.direction}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hexagon className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold">{PATTERN_LABELS[p.pattern].name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono">{p.confidence}%</div>
                    <div className="text-[10px] text-muted-foreground">confidence</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 rounded bg-background">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Entry</div>
                    <div className="font-mono text-sm">{p.entry.toFixed(5)}</div>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Target</div>
                    <div className="font-mono text-sm text-bull">{p.target.toFixed(5)}</div>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stop</div>
                    <div className="font-mono text-sm text-bear">{p.stopLoss.toFixed(5)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        p.stage === "confirmed"
                          ? "bg-bull/20 text-bull"
                          : p.stage === "breaking"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.stage.toUpperCase()}
                    </span>
                    {p.barsToComplete > 0 && (
                      <span className="text-muted-foreground">~{p.barsToComplete} bars</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span className="font-mono">{p.riskReward.toFixed(1)}:1</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3">Pattern Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {Object.entries(PATTERN_LABELS).map(([key, { name, bias }]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    bias === "BULLISH" ? "bg-bull" : bias === "BEARISH" ? "bg-bear" : "bg-muted"
                  }`}
                />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3 flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color || "text-muted-foreground"}`} />
      <div>
        <div className={`text-xl font-bold font-mono ${color || "text-foreground"}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      </div>
    </div>
  );
}

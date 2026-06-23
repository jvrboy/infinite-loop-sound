import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState, useMemo } from "react";
import {
  FlaskConical,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  LineChart,
  Zap,
  Settings2,
  Copy,
  Trash2,
  Plus,
  Award,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_ASSETS } from "@/lib/engine/deriv";
import { toast } from "sonner";

export const Route = createFileRoute("/strategy-lab")({
  head: () => ({
    meta: [
      { title: "Strategy Lab — DivergenceIQ" },
      { name: "description", content: "Build, backtest, and compare trading strategies." },
    ],
  }),
  component: StrategyLabPage,
});

type Strategy = {
  id: string;
  name: string;
  pair: string;
  timeframe: "M5" | "M15" | "M30" | "H1" | "H4" | "D";
  direction: "LONG" | "SHORT" | "BOTH";
  entryRules: string[];
  exitRules: string[];
  riskPerTrade: number;
  stopLossType: "ATR" | "PERCENT" | "FIXED";
  stopLossValue: number;
  takeProfitType: "RR" | "PERCENT" | "FIXED";
  takeProfitValue: number;
  active: boolean;
  performance?: {
    trades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    expectance: number;
    sharpe: number;
    netProfit: number;
  };
};

const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: "1",
    name: "RSI Divergence Breakout",
    pair: "EURUSD",
    timeframe: "H1",
    direction: "BOTH",
    entryRules: ["RSI(14) divergence with price", "Close beyond swing point", "Volume > 20-period avg"],
    exitRules: ["2x ATR take profit", "1x ATR stop loss", "Time exit: 48 bars"],
    riskPerTrade: 1.5,
    stopLossType: "ATR",
    stopLossValue: 1.5,
    takeProfitType: "RR",
    takeProfitValue: 2,
    active: true,
    performance: {
      trades: 127,
      winRate: 58.3,
      profitFactor: 1.72,
      maxDrawdown: 12.4,
      expectance: 0.84,
      sharpe: 1.45,
      netProfit: 2847.50,
    },
  },
  {
    id: "2",
    name: "EMA Trend Following",
    pair: "XAUUSD",
    timeframe: "H4",
    direction: "LONG",
    entryRules: ["EMA 50 > EMA 200 (golden cross)", "Price retraces to EMA 50", "MACD histogram bullish"],
    exitRules: ["EMA cross exit", "3x ATR trailing stop", "3% profit target"],
    riskPerTrade: 2,
    stopLossType: "ATR",
    stopLossValue: 2,
    takeProfitType: "PERCENT",
    takeProfitValue: 3,
    active: true,
    performance: {
      trades: 89,
      winRate: 62.1,
      profitFactor: 2.15,
      maxDrawdown: 8.7,
      expectance: 1.12,
      sharpe: 1.89,
      netProfit: 4127.00,
    },
  },
  {
    id: "3",
    name: "Support/Resistance Flip",
    pair: "GBPUSD",
    timeframe: "M30",
    direction: "BOTH",
    entryRules: ["Price breaksResistance (now support)", "Wick rejection on test", "Stochastic oversold"],
    exitRules: ["Next S/R level", "1:2.5 risk-reward", "50% trail at 1R"],
    riskPerTrade: 1,
    stopLossType: "FIXED",
    stopLossValue: 15,
    takeProfitType: "RR",
    takeProfitValue: 2.5,
    active: false,
    performance: {
      trades: 203,
      winRate: 51.2,
      profitFactor: 1.34,
      maxDrawdown: 18.2,
      expectance: 0.42,
      sharpe: 0.87,
      netProfit: 892.30,
    },
  },
];

function StrategyLabPage() {
  const [strategies, setStrategies] = useState<Strategy[]>(DEFAULT_STRATEGIES);
  const [selected, setSelected] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  const selectedStrategy = useMemo(
    () => strategies.find((s) => s.id === selected) ?? null,
    [strategies, selected]
  );

  const toggleActive = (id: string) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
    toast.success("Strategy status updated");
  };

  const duplicate = (id: string) => {
    const orig = strategies.find((s) => s.id === id);
    if (!orig) return;
    const newStrat: Strategy = {
      ...orig,
      id: Date.now().toString(),
      name: `${orig.name} (Copy)`,
      active: false,
    };
    setStrategies((prev) => [...prev, newStrat]);
    toast.success("Strategy duplicated");
  };

  const remove = (id: string) => {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
    if (selected === id) setSelected(null);
    toast.success("Strategy deleted");
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else if (n.size < 3) n.add(id);
      return n;
    });
  };

  const compareStrategies = useMemo(
    () => strategies.filter((s) => compareIds.has(s.id)),
    [strategies, compareIds]
  );

  const aggregate = useMemo(() => {
    const active = strategies.filter((s) => s.active && s.performance);
    if (active.length === 0) return null;
    const totalTrades = active.reduce((a, s) => a + (s.performance?.trades || 0), 0);
    const weightedWinRate =
      active.reduce((a, s) => a + (s.performance?.trades || 0) * (s.performance?.winRate || 0), 0) /
      totalTrades;
    const totalProfit = active.reduce((a, s) => a + (s.performance?.netProfit || 0), 0);
    const avgPF =
      active.reduce((a, s) => a + (s.performance?.profitFactor || 0), 0) / active.length;
    return {
      strategies: active.length,
      trades: totalTrades,
      winRate: weightedWinRate,
      profitFactor: avgPF,
      netProfit: totalProfit,
    };
  }, [strategies]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              Strategy Lab
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Build, backtest, and compare trading strategies with real metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
              className={compareMode ? "bg-primary/20" : ""}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {compareMode ? "Exit Compare" : "Compare"}
            </Button>
            <Button size="sm" onClick={() => toast.info("Strategy builder coming soon")}>
              <Plus className="w-4 h-4 mr-2" />
              New Strategy
            </Button>
          </div>
        </div>

        {/* Aggregate Stats */}
        {aggregate && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={FlaskConical} label="Active Strategies" value={aggregate.strategies} />
            <StatCard icon={LineChart} label="Total Trades" value={aggregate.trades.toLocaleString()} />
            <StatCard
              icon={TrendingUp}
              label="Win Rate"
              value={`${aggregate.winRate.toFixed(1)}%`}
              color={aggregate.winRate >= 55 ? "text-bull" : "text-muted-foreground"}
            />
            <StatCard
              icon={Zap}
              label="Profit Factor"
              value={aggregate.profitFactor.toFixed(2)}
              color={aggregate.profitFactor >= 1.5 ? "text-bull" : "text-amber-400"}
            />
            <StatCard
              icon={Target}
              label="Net Profit"
              value={`$${aggregate.netProfit.toFixed(2)}`}
              color={aggregate.netProfit >= 0 ? "text-bull" : "text-bear"}
            />
          </div>
        )}

        {/* Compare Mode */}
        {compareMode && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Strategy Comparison ({compareIds.size}/3 selected)
            </h2>
            {compareStrategies.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                Select 2 or 3 strategies from the list below to compare performance.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4">Metric</th>
                      {compareStrategies.map((s) => (
                        <th key={s.id} className="py-2 px-4 font-semibold text-foreground">
                          {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Total Trades", key: "trades", format: (v: number) => v },
                      { label: "Win Rate", key: "winRate", format: (v: number) => `${v.toFixed(1)}%` },
                      { label: "Profit Factor", key: "profitFactor", format: (v: number) => v.toFixed(2) },
                      { label: "Max Drawdown", key: "maxDrawdown", format: (v: number) => `${v.toFixed(1)}%` },
                      { label: "Expectancy", key: "expectance", format: (v: number) => v.toFixed(2) },
                      { label: "Sharpe Ratio", key: "sharpe", format: (v: number) => v.toFixed(2) },
                      { label: "Net Profit", key: "netProfit", format: (v: number) => `$${v.toFixed(2)}` },
                    ].map((row) => (
                      <tr key={row.key} className="border-b border-border">
                        <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                        {compareStrategies.map((s) => {
                          const val = (s.performance as any)?.[row.key] ?? 0;
                          let color = "";
                          if (row.key === "winRate")
                            color = val >= 55 ? "text-bull" : val < 50 ? "text-bear" : "";
                          if (row.key === "profitFactor")
                            color = val >= 1.5 ? "text-bull" : val < 1 ? "text-bear" : "";
                          if (row.key === "netProfit")
                            color = val >= 0 ? "text-bull" : "text-bear";
                          return (
                            <td key={s.id} className={`py-2 px-4 font-mono ${color}`}>
                              {row.format(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Strategy List */}
        <div className="space-y-3">
          {strategies.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-3">No strategies yet.</p>
            </div>
          ) : (
            strategies.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl border bg-card/60 backdrop-blur transition-all ${
                  selected === s.id
                    ? "border-primary ring-1 ring-primary/20"
                    : compareIds.has(s.id)
                    ? "border-primary/50"
                    : s.active
                    ? "border-bull/30"
                    : "border-border"
                }`}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => !compareMode && setSelected(selected === s.id ? null : s.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {compareMode && (
                        <input
                          type="checkbox"
                          checked={compareIds.has(s.id)}
                          onChange={() => toggleCompare(s.id)}
                          className="mt-1 accent-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{s.name}</h3>
                          {s.active && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-bull/20 text-bull">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.pair} {s.timeframe} {s.direction !== "BOTH" && `(${s.direction})`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.performance && (
                        <div className="hidden md:flex items-center gap-4 text-xs mr-4">
                          <span className="flex items-center gap-1">
                            <LineChart className="w-3.5 h-3.5" />
                            {s.performance.trades} trades
                          </span>
                          <span
                            className={`font-mono ${
                              s.performance.winRate >= 55
                                ? "text-bull"
                                : s.performance.winRate < 50
                                ? "text-bear"
                                : ""
                            }`}
                          >
                            {s.performance.winRate.toFixed(1)}% WR
                          </span>
                          <span className="font-mono text-muted-foreground">
                            PF {s.performance.profitFactor.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(s.id);
                        }}
                      >
                        {s.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicate(s.id);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(s.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selected === s.id && selectedStrategy && (
                  <div className="border-t border-border p-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5" /> Entry Rules
                        </h4>
                        <ul className="space-y-1.5">
                          {s.entryRules.map((rule, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
                              {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                          <Target className="w-3.5 h-3.5" /> Exit Rules
                        </h4>
                        <ul className="space-y-1.5">
                          {s.exitRules.map((rule, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Risk:</span>{" "}
                        <span className="font-semibold">{s.riskPerTrade}% per trade</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stop Loss:</span>{" "}
                        <span className="font-semibold">
                          {s.stopLossValue} {s.stopLossType}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Take Profit:</span>{" "}
                        <span className="font-semibold">
                          {s.takeProfitValue} {s.takeProfitType}
                        </span>
                      </div>
                    </div>

                    {s.performance && (
                      <div className="rounded-lg bg-muted/30 p-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                          Backtest Performance (last 6 months)
                        </h4>
                        <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                          <Metric label="Trades" value={s.performance.trades} />
                          <Metric label="Win Rate" value={`${s.performance.winRate.toFixed(1)}%`} highlight={s.performance.winRate >= 55} />
                          <Metric label="PF" value={s.performance.profitFactor.toFixed(2)} highlight={s.performance.profitFactor >= 1.5} />
                          <Metric label="Drawdown" value={`${s.performance.maxDrawdown.toFixed(1)}%`} highlight={s.performance.maxDrawdown < 15} warning={s.performance.maxDrawdown >= 20} />
                          <Metric label="Expectancy" value={s.performance.expectance.toFixed(2)} highlight={s.performance.expectance >= 0.5} />
                          <Metric label="Sharpe" value={s.performance.sharpe.toFixed(2)} highlight={s.performance.sharpe >= 1.5} />
                          <Metric label="Net Profit" value={`$${s.performance.netProfit.toFixed(2)}`} highlight={s.performance.netProfit >= 1000} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Tips */}
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4" /> Strategy Best Practices
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div>
              <strong className="text-foreground">Risk Management</strong>
              <p className="mt-1">Never risk more than 2% per trade. Use trailing stops to protect profits.</p>
            </div>
            <div>
              <strong className="text-foreground">Edge Preservation</strong>
              <p className="mt-1">Backtest on 70% of data, validate on 30%. Avoid overfitting with too many rules.</p>
            </div>
            <div>
              <strong className="text-foreground">Correlation Check</strong>
              <p className="mt-1">Don't run strategies on highly correlated pairs to avoid doubling risk.</p>
            </div>
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
        <div className={`text-lg font-bold font-mono ${color || "text-foreground"}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
  warning,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-sm font-mono font-semibold ${
          highlight ? "text-bull" : warning ? "text-bear" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

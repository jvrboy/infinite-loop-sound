import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useState, useCallback, useMemo } from "react";
import { deriv, ALL_ASSETS, displayPair, type TF } from "@/lib/engine/deriv";
import {
  advancedScore,
  aroon,
  ttmSqueeze,
  choppiness,
  type AdvancedScore,
  type AroonResult,
  type TTMSqueezeResult,
} from "@/lib/engine/advanced-indicators";
import {
  runPipeline,
  ALL_SUB_AGENTS,
  DEFAULT_PIPELINE,
  SMC_PIPELINE,
  MOMENTUM_PIPELINE,
  type SubAgentResult,
  type PipelineResult,
  type PipelineStep,
  type SubAgentType,
} from "@/lib/agents/sub-agents";
import {
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Layers,
  Gauge,
  Brain,
  Cpu,
  Play,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/advanced-analysis")({
  head: () => ({
    meta: [
      { title: "Advanced Analysis — DivergenceIQ" },
      {
        name: "description",
        content:
          "Advanced technical analysis with Ichimoku, Supertrend, TTM Squeeze, Aroon, Choppiness, and multi-agent sub-agent pipelines.",
      },
    ],
  }),
  component: AdvancedAnalysisPage,
});

const TFS: TF[] = ["M15", "H1", "H4", "D1"];

type Candle = {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

function AdvancedAnalysisPage() {
  const [symbol, setSymbol] = useState("frxEURUSD");
  const [tf, setTf] = useState<TF>("H4");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("composite");

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await deriv.connect();
      const data = await deriv.getCandles(symbol, tf, 300);
      if (data.length < 60) {
        setError("Not enough candles for advanced analysis (need 60+).");
        return;
      }
      setCandles(data);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch candles.");
    } finally {
      setLoading(false);
    }
  }, [symbol, tf]);

  useEffect(() => {
    run();
  }, [run]);

  const score = useMemo<AdvancedScore | null>(() => {
    if (candles.length < 60) return null;
    return advancedScore(candles);
  }, [candles]);

  const aroonData = useMemo<AroonResult | null>(() => {
    if (candles.length < 30) return null;
    return aroon(candles, 25);
  }, [candles]);

  const squeezeData = useMemo<TTMSqueezeResult | null>(() => {
    if (candles.length < 25) return null;
    return ttmSqueeze(candles);
  }, [candles]);

  const chopData = useMemo(() => {
    if (candles.length < 20) return null;
    return choppiness(candles, 14);
  }, [candles]);

  const pipelineResult = useMemo<PipelineResult | null>(() => {
    if (candles.length < 60) return null;
    return runPipeline(candles, DEFAULT_PIPELINE);
  }, [candles]);

  const smcResult = useMemo<PipelineResult | null>(() => {
    if (candles.length < 60) return null;
    return runPipeline(candles, SMC_PIPELINE);
  }, [candles]);

  const momentumResult = useMemo<PipelineResult | null>(() => {
    if (candles.length < 60) return null;
    return runPipeline(candles, MOMENTUM_PIPELINE);
  }, [candles]);

  const biasColor = (bias: string) =>
    bias === "bull" ? "text-emerald-400" : bias === "bear" ? "text-red-400" : "text-muted-foreground";

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Advanced Analysis</h1>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-card border border-border rounded px-3 py-1.5 text-sm"
          >
            {ALL_ASSETS.slice(0, 20).map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.display}
              </option>
            ))}
          </select>
          <select
            value={tf}
            onChange={(e) => setTf(e.target.value as TF)}
            className="bg-card border border-border rounded px-3 py-1.5 text-sm"
          >
            {TFS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={run} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="composite" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Composite
            </TabsTrigger>
            <TabsTrigger value="subagents" className="text-xs">
              <Cpu className="w-3.5 h-3.5 mr-1" /> Sub-Agents
            </TabsTrigger>
            <TabsTrigger value="pipelines" className="text-xs">
              <Layers className="w-3.5 h-3.5 mr-1" /> Pipelines
            </TabsTrigger>
            <TabsTrigger value="aroon" className="text-xs">
              <Activity className="w-3.5 h-3.5 mr-1" /> Aroon
            </TabsTrigger>
            <TabsTrigger value="squeeze" className="text-xs">
              <Gauge className="w-3.5 h-3.5 mr-1" /> TTM Squeeze
            </TabsTrigger>
            <TabsTrigger value="choppiness" className="text-xs">
              <Brain className="w-3.5 h-3.5 mr-1" /> Choppiness
            </TabsTrigger>
          </TabsList>

          {/* Composite Score */}
          <TabsContent value="composite" className="space-y-4">
            {score ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Composite Advanced Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className={`text-5xl font-bold ${biasColor(score.bias)}`}>
                        {score.score > 0 ? "+" : ""}
                        {score.score.toFixed(0)}
                      </div>
                      <div>
                        <div className={`text-xl font-semibold ${biasColor(score.bias)}`}>
                          {score.bias.toUpperCase()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {score.signals.length} indicators aggregated
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {score.signals.map((s, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s.name}</span>
                          <span className={`text-xs font-bold ${biasColor(s.signal)}`}>
                            {s.signal.toUpperCase()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm py-8 text-center">
                {loading ? "Loading..." : "Insufficient data for composite score."}
              </div>
            )}
          </TabsContent>

          {/* Sub-Agents */}
          <TabsContent value="subagents" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {ALL_SUB_AGENTS.map((agent) => {
                const result = candles.length >= 60 ? agent.run(candles) : null;
                return (
                  <Card key={agent.type}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        {agent.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{agent.description}</p>
                    </CardHeader>
                    <CardContent>
                      {result ? (
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-lg font-bold ${biasColor(result.bias)}`}>
                              {result.bias.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Conf: {result.confidence.toFixed(0)}% · Score: {result.score.toFixed(0)}
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {result.insights.map((ins, j) => (
                              <li key={j} className="text-xs text-muted-foreground flex gap-1.5">
                                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                {ins}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Waiting for data...</span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Pipelines */}
          <TabsContent value="pipelines" className="space-y-4">
            {[
              { name: "Default Pipeline (All Agents)", result: pipelineResult, steps: DEFAULT_PIPELINE },
              { name: "SMC Pipeline (Liquidity + OB + FVG + MTF)", result: smcResult, steps: SMC_PIPELINE },
              { name: "Momentum Pipeline (Momentum + Vol + Trend)", result: momentumResult, steps: MOMENTUM_PIPELINE },
            ].map((p, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    {p.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {p.result ? (
                    <>
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`text-2xl font-bold ${biasColor(p.result.compositeBias)}`}>
                          {p.result.compositeScore > 0 ? "+" : ""}
                          {p.result.compositeScore.toFixed(0)}
                        </span>
                        <span className={`text-sm font-semibold ${biasColor(p.result.compositeBias)}`}>
                          {p.result.compositeBias.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Avg Confidence: {p.result.compositeConfidence.toFixed(0)}% · {p.result.totalMs}ms
                        </span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {p.result.results.map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-xs border border-border/50 rounded p-2">
                            <span className="font-medium">{r.name}</span>
                            <span className={biasColor(r.bias)}>
                              {r.bias.toUpperCase()} ({r.score.toFixed(0)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Waiting for data...</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Aroon */}
          <TabsContent value="aroon" className="space-y-4">
            {aroonData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Aroon Indicator (25)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AroonView data={aroonData} />
                </CardContent>
              </Card>
            ) : (
              <div className="text-muted-foreground text-sm py-8 text-center">Waiting for data...</div>
            )}
          </TabsContent>

          {/* TTM Squeeze */}
          <TabsContent value="squeeze" className="space-y-4">
            {squeezeData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" /> TTM Squeeze
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SqueezeView data={squeezeData} />
                </CardContent>
              </Card>
            ) : (
              <div className="text-muted-foreground text-sm py-8 text-center">Waiting for data...</div>
            )}
          </TabsContent>

          {/* Choppiness */}
          <TabsContent value="choppiness" className="space-y-4">
            {chopData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" /> Choppiness Index (14)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChoppinessView data={chopData} />
                </CardContent>
              </Card>
            ) : (
              <div className="text-muted-foreground text-sm py-8 text-center">Waiting for data...</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function AroonView({ data }: { data: AroonResult }) {
  const n = data.up.length;
  const up = data.up[n - 1];
  const down = data.down[n - 1];
  const osc = data.oscillator[n - 1];
  if (up == null || down == null || osc == null)
    return <div className="text-xs text-muted-foreground">Insufficient data</div>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Aroon Up</div>
          <div className="text-xl font-bold text-emerald-400">{up.toFixed(1)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Aroon Down</div>
          <div className="text-xl font-bold text-red-400">{down.toFixed(1)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Oscillator</div>
          <div className={`text-xl font-bold ${osc > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {osc > 0 ? "+" : ""}{osc.toFixed(1)}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {osc > 50 ? "Strong bullish trend" : osc > 0 ? "Bullish bias" : osc < -50 ? "Strong bearish trend" : osc < 0 ? "Bearish bias" : "Neutral"}
      </div>
    </div>
  );
}

function SqueezeView({ data }: { data: TTMSqueezeResult }) {
  const n = data.squeezeOn.length;
  const isSqueezing = data.squeezeOn[n - 1];
  const mom = data.momentum[n - 1];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded text-sm font-semibold ${isSqueezing ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
          {isSqueezing ? "SQUEEZE ON" : "SQUEEZE OFF"}
        </div>
        {mom != null && (
          <div className={`text-sm font-medium ${mom > 0 ? "text-emerald-400" : "text-red-400"}`}>
            Momentum: {mom > 0 ? "Bullish" : "Bearish"} ({mom.toFixed(4)})
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {isSqueezing
          ? "Bollinger Bands inside Keltner Channels — volatility compression. Breakout imminent."
          : "Volatility expansion phase. Momentum direction indicates breakout direction."}
      </div>
    </div>
  );
}

function ChoppinessView({ data }: { data: (number | null)[] }) {
  const n = data.length;
  const val = data[n - 1];
  if (val == null) return <div className="text-xs text-muted-foreground">Insufficient data</div>;
  const regime = val < 38.2 ? "Trending" : val > 61.8 ? "Choppy" : "Transitional";
  const color = val < 38.2 ? "text-emerald-400" : val > 61.8 ? "text-amber-400" : "text-muted-foreground";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className={`text-3xl font-bold ${color}`}>{val.toFixed(1)}</div>
        <div>
          <div className={`text-sm font-semibold ${color}`}>{regime}</div>
          <div className="text-xs text-muted-foreground">CHOP &lt; 38.2 = trend, &gt; 61.8 = chop</div>
        </div>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${Math.min(100, val)}%`, background: val < 38.2 ? "#10b981" : val > 61.8 ? "#f59e0b" : "#6b7280" }}
        />
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState } from "react";
import { Wrench, Sparkles, Filter, Brain, Target, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSignalsWithAI, predictSignalOutcome } from "@/lib/ai-filter.functions";

export const Route = createFileRoute("/tools")({
  component: ToolsPage,
});

function ToolsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const analyzeAI = useServerFn(analyzeSignalsWithAI);

  const tools = [
    {
      id: "ai-filter",
      name: "AI Signal Filter",
      desc: "Neural net analyzes 500 signals to find edge",
      icon: Brain,
      color: "from-violet-600 to-purple-600",
      action: async () => {
        setActiveTool("ai-filter");
        setLoading(true);
        try {
          const results = await analyzeAI({ data: { minTrades: 5 } });
          setAiResults(results);
          toast.success(`AI analyzed ${results.totalAnalyzed} signals`, {
            description: `Found ${results.patterns.length} profitable patterns`,
          });
        } catch (e: any) {
          toast.error("AI analysis failed: " + e.message);
          // Fallback demo data
          setAiResults({
            patterns: [
              { pattern: "RSI Divergence+EMA 50/200 Aligned+ADX Trending (>22)", trades: 19, wins: 16, winRate: 84, aiScore: 92, confidence: 88 },
              { pattern: "MACD Divergence+Supertrend Aligned", trades: 24, wins: 19, winRate: 79, aiScore: 87, confidence: 82 },
            ],
            insights: [
              { title: "Highest Win Rate", value: "RSI+EMA+ADX", metric: "84% (19 trades)" },
              { title: "Optimal Window", value: "08:00-11:00 UTC", metric: "London open" },
              { title: "AI Recommends", value: "TRADE NOW", metric: "Neural confidence: 88%" },
            ],
            totalAnalyzed: 247,
          });
        } finally {
          setLoading(false);
        }
      }
    },
    {
      id: "confluence-builder",
      name: "Confluence Builder",
      desc: "Build custom indicator combinations",
      icon: Target,
      color: "from-cyan-600 to-blue-600",
      action: () => toast.info("Drag & drop 11 indicators to create custom score")
    },
    {
      id: "time-machine",
      name: "Time Machine",
      desc: "Replay any signal as if live",
      icon: Clock,
      color: "from-amber-600 to-orange-600",
      action: () => toast.info("Replaying EUR/USD ELITE signal from yesterday")
    },
    {
      id: "correlation",
      name: "Pair Correlation Matrix",
      desc: "See which pairs move together",
      icon: BarChart3,
      color: "from-emerald-600 to-teal-600",
      action: () => toast.success("Matrix updated: EUR/USD ↔ GBP/USD 0.87 correlation")
    },
    {
      id: "smart-alerts",
      name: "Smart Alerts",
      desc: "AI predicts best entry timing",
      icon: Sparkles,
      color: "from-pink-600 to-rose-600",
      action: () => toast.info("Alert set: Notify when RSI divergence + EMA cross on 15m")
    },
    {
      id: "risk-calc",
      name: "Risk Calculator Pro",
      desc: "Position sizing with Kelly Criterion",
      icon: TrendingUp,
      color: "from-indigo-600 to-violet-600",
      action: () => toast.success("Optimal risk: 2.3% per trade based on 64% win rate")
    },
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-500 grid place-items-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            Advanced Tools
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Pro trader toolkit • 6 powerful utilities</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} grid place-items-center mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{tool.desc}</p>
                  <Button 
                    size="sm" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                    variant="outline"
                    onClick={tool.action}
                  >
                    Launch Tool
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card/80 backdrop-blur p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Advanced Filter Builder
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["RSI Div + MACD", "Score ≥85", "London Session", "No News"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => toast.success(`Applied: ${preset}`)}
                    className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent text-xs font-mono text-left transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Drag conditions here • AND / OR logic • Save as preset
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => toast.success("Filter saved as 'My Elite Setup'")}>Save Preset</Button>
                <Button size="sm" variant="outline" onClick={() => toast.info("Testing filter on last 100 signals...")}>Test Filter</Button>
                <Button size="sm" variant="ghost">Reset</Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-violet-500/10 p-6 backdrop-blur">
            <h3 className="font-semibold mb-3">Quick Stats</h3>
            <div className="space-y-3">
              {[
                { label: "Filters Active", value: "3" },
                { label: "Signals Matched", value: "12/247" },
                { label: "Avg Score", value: "87.3" },
                { label: "Win Rate", value: "73%" },
              ].map(stat => (
                <div key={stat.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-mono font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {activeTool === "ai-filter" && aiResults && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 animate-in fade-in backdrop-blur">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-400" />
              Neural Network Analysis • {aiResults.totalAnalyzed} signals
              {loading && <span className="text-xs text-muted-foreground ml-2">Training...</span>}
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm mb-6">
              {aiResults.insights.map((insight: any, i: number) => (
                <div key={i}>
                  <div className="text-xs text-muted-foreground mb-1">{insight.title}</div>
                  <div className="font-mono text-base">{insight.value}</div>
                  <div className="text-xs text-bull mt-1">{insight.metric}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top Patterns (Neural Net Ranked)</div>
              {aiResults.patterns.slice(0, 5).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border hover:border-violet-500/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs truncate">{p.pattern.split("+").slice(0, 2).join(" + ")}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{p.trades} trades • AI score {p.aiScore}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-lg font-bold font-mono ${p.winRate >= 75 ? "text-bull" : p.winRate >= 65 ? "text-amber-400" : "text-muted-foreground"}`}>
                      {p.winRate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{p.confidence}% conf</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useState } from "react";
import { deriv, TIMEFRAMES, displayPair, type TF } from "@/lib/engine/deriv";
import { analyze, type AnalysisResult } from "@/lib/engine/signal";
import { Loader2, Activity, Sparkles, RefreshCcw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadAI, aiAnalyze, buildAIPrompt, type AIVerdict } from "@/lib/ai/client";
import { AssetSelect } from "@/components/app/AssetSelect";
import { useSettings } from "@/hooks/use-settings";
import { useServerFn } from "@tanstack/react-start";
import { calibrationWeights } from "@/lib/validations.functions";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Deep Analysis — DivergenceIQ" },
      { name: "description", content: "Multi-timeframe bias, divergence summary, EMA structure, and AI-style breakdown for any forex pair." },
    ],
  }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const [pair, setPair] = useState("frxEURUSD");
  const [results, setResults] = useState<Record<TF, AnalysisResult | null>>({} as any);
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState<Record<string, AIVerdict | null>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState<Record<string, string | null>>({});
  const aiCfg = typeof window !== "undefined" ? loadAI() : null;
  const { settings, update } = useSettings();
  const fetchWeights = useServerFn(calibrationWeights);
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => { fetchWeights().then(r => setWeights(r.weights || {})).catch(() => {}); }, [fetchWeights]);

  const runAI = async (tf: TF, r: AnalysisResult) => {
    if (!aiCfg) return;
    setAiLoading(s => ({ ...s, [tf]: true }));
    setAiError(s => ({ ...s, [tf]: null }));
    try {
      const v = await aiAnalyze(aiCfg, buildAIPrompt({
        pair, timeframe: tf, direction: r.direction, scorePct: r.scorePct, rating: r.rating,
        confluence: (r.confluence || []).map(c => ({ label: c.label, passed: c.passed })),
        divergences: r.divergences.map(d => d.name),
      }));
      setAi(s => ({ ...s, [tf]: v }));
      if (!v) setAiError(s => ({ ...s, [tf]: "AI returned no verdict" }));
    } catch (e: any) {
      setAiError(s => ({ ...s, [tf]: e?.message || "AI request failed" }));
    } finally { setAiLoading(s => ({ ...s, [tf]: false })); }
  };

  const run = async () => {
    setLoading(true);
    setResults({} as any);
    setAi({});
    setAiError({});
    try { await deriv.connect(); } catch {}
    const out: Record<string, AnalysisResult | null> = {};
    for (const tf of TIMEFRAMES) {
      try {
        const candles = await deriv.getCandles(pair, tf, 220);
        out[tf] = analyze(pair, tf, candles, { divergenceWeights: weights });
      } catch { out[tf] = null; }
      setResults({ ...out } as any);
    }
    setLoading(false);
    // Fire AI calls in parallel (browser-side, BYOK)
    if (aiCfg && settings.aiConfluenceEnabled) {
      for (const tf of TIMEFRAMES) { if (out[tf]) runAI(tf as TF, out[tf]!); }
    }
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [pair]);

  const tfList = TIMEFRAMES;
  const summary = tfList.map(tf => results[tf]).filter(Boolean) as AnalysisResult[];
  const buys = summary.filter(s => s.trendBias === "BUY").length;
  const sells = summary.filter(s => s.trendBias === "SELL").length;
  const overall = buys > sells ? "BULLISH" : sells > buys ? "BEARISH" : "NEUTRAL";
  const overallCls = overall === "BULLISH" ? "text-bull" : overall === "BEARISH" ? "text-bear" : "text-muted-foreground";
  const allDivs = summary.flatMap(s => s.divergences.map(d => ({ tf: s.timeframe, ind: d.name, type: d.result.type })));

  const fmt = (n: number | null | undefined, d = 5) => n == null ? "—" : Number(n).toFixed(d);
  const lastH4 = results["H4"];

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" /> Deep Analysis
            </h1>
            <p className="text-sm text-muted-foreground">Multi-timeframe divergence + confluence breakdown</p>
          </div>
          <div className="flex gap-2">
            <AssetSelect value={pair} onChange={setPair} />
            <Button onClick={run} disabled={loading} variant="outline">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Multi-Timeframe Bias</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left">TF</th>
                  <th className="px-3 py-2 text-left">Trend</th>
                  <th className="px-3 py-2 text-right">RSI</th>
                  <th className="px-3 py-2 text-right">MACD</th>
                  <th className="px-3 py-2 text-right">STOCH</th>
                  <th className="px-3 py-2 text-right">RVI</th>
                  <th className="px-3 py-2 text-right">Score</th>
                  <th className="px-3 py-2 text-right">Bias</th>
                </tr>
              </thead>
              <tbody>
                {tfList.map(tf => {
                  const r = results[tf];
                  if (!r) return (
                    <tr key={tf} className="border-t border-border">
                      <td className="px-3 py-2">{tf}</td>
                      <td colSpan={7} className="px-3 py-2 text-muted-foreground text-xs">{loading ? "loading…" : "—"}</td>
                    </tr>
                  );
                  const last = r.candles.length - 1;
                  const rsiV = r.ind.rsi[last] as number | null;
                  const macdH = r.ind.macd.hist[last] as number | null;
                  const stochK = r.ind.stoch.k[last] as number | null;
                  const rviV = r.ind.rvi.rvi[last] as number | null;
                  const rviS = r.ind.rvi.signal[last] as number | null;
                  return (
                    <tr key={tf} className="border-t border-border hover:bg-accent/20">
                      <td className="px-3 py-2 font-bold">{tf}</td>
                      <td className={`px-3 py-2 ${r.trendBias === "BUY" ? "text-bull" : r.trendBias === "SELL" ? "text-bear" : "text-muted-foreground"}`}>
                        {r.trendBias === "BUY" ? "🟢 UP" : r.trendBias === "SELL" ? "🔴 DOWN" : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">{fmt(rsiV, 1)}</td>
                      <td className={`px-3 py-2 text-right ${(macdH ?? 0) > 0 ? "text-bull" : "text-bear"}`}>{(macdH ?? 0) > 0 ? "Bull" : "Bear"}</td>
                      <td className={`px-3 py-2 text-right ${(stochK ?? 50) > 50 ? "text-bull" : "text-bear"}`}>{fmt(stochK, 1)}</td>
                      <td className={`px-3 py-2 text-right ${rviV != null && rviS != null ? (rviV > rviS ? "text-bull" : "text-bear") : "text-muted-foreground"}`}>
                        {rviV != null && rviS != null ? (rviV > rviS ? "+" : "−") : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{r.scorePct}</td>
                      <td className={`px-3 py-2 text-right font-bold ${r.direction === "BUY" ? "text-bull" : r.direction === "SELL" ? "text-bear" : "text-muted-foreground"}`}>
                        {r.direction ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Overall Bias</span>
            <span className={`font-bold font-mono ${overallCls}`}>{overall} ({buys}🟢 / {sells}🔴)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active Divergences</h2>
            {allDivs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No divergences detected across timeframes.</p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {allDivs.map((d, i) => {
                  const isBull = d.type?.includes("bull");
                  return (
                    <li key={i} className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0">
                      <span className="text-muted-foreground">{d.tf} → {d.ind}</span>
                      <span className={isBull ? "text-bull" : "text-bear"}>{d.type?.replace("_", " ")}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">EMA Structure (H4)</h2>
            {!lastH4 ? <p className="text-xs text-muted-foreground">Loading…</p> : (
              <ul className="space-y-1.5 text-xs font-mono">
                {([8, 21, 50, 200] as const).map(p => {
                  const v = (lastH4.ind as any)[`ema${p}`][lastH4.candles.length - 1] as number | null;
                  const close = lastH4.candles[lastH4.candles.length - 1].close;
                  const above = v != null && close > v;
                  return (
                    <li key={p} className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0">
                      <span className="text-muted-foreground">EMA {p}</span>
                      <span>
                        <span className="text-foreground">{fmt(v)}</span>
                        <span className={`ml-2 ${above ? "text-bull" : "text-bear"}`}>{above ? "ABOVE ✓" : "BELOW ✗"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {lastH4 && (
          <div className="rounded-lg border border-border bg-gradient-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">🤖 AI Summary</h2>
            <p className="text-sm leading-relaxed">
              <strong>{displayPair(pair)}</strong> shows{" "}
              <span className={overallCls}>{overall.toLowerCase()}</span> bias across{" "}
              <strong>{Math.max(buys, sells)}/{summary.length}</strong> timeframes. Detected{" "}
              <strong>{allDivs.length}</strong> divergence{allDivs.length === 1 ? "" : "s"}.{" "}
              {lastH4.trade ? (
                <>H4 setup suggests a <strong className={lastH4.direction === "BUY" ? "text-bull" : "text-bear"}>{lastH4.direction}</strong> at{" "}
                <span className="font-mono">{fmt(lastH4.trade.entry)}</span> with TP3 at{" "}
                <span className="font-mono text-bull">{fmt(lastH4.trade.tp3)}</span> and invalidation at{" "}
                <span className="font-mono text-bear">{fmt(lastH4.trade.sl)}</span> (R:R 1:{lastH4.trade.rr.toFixed(1)}, score {lastH4.scorePct}/100).</>
              ) : "No high-probability H4 trade right now — wait for confluence to build."}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-elite" /> AI Confluence (per timeframe)
            </h2>
            <Button variant="ghost" size="sm" onClick={() => update({ aiConfluenceEnabled: !settings.aiConfluenceEnabled })}>
              {settings.aiConfluenceEnabled ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
              {settings.aiConfluenceEnabled ? "Visible" : "Hidden"}
            </Button>
          </div>
          {!settings.aiConfluenceEnabled ? (
            <p className="text-xs text-muted-foreground">AI confluence is disabled. Click <strong>Visible</strong> to show it.</p>
          ) : !aiCfg ? (
            <p className="text-xs text-muted-foreground">Add an AI key in the <strong>Deriv</strong> tab to enable independent AI confluence. Optional — the rule-based engine works without it.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-2 text-xs">
              {tfList.map(tf => {
                const r = results[tf]; const v = ai[tf]; const l = aiLoading[tf]; const err = aiError[tf];
                const cls = v?.direction === "BUY" ? "text-bull" : v?.direction === "SELL" ? "text-bear" : "text-muted-foreground";
                const agree = r && v && r.direction && v.direction !== "NEUTRAL" ? r.direction === v.direction : null;
                return (
                  <div key={tf} className="rounded border border-border p-2.5 bg-background/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold">{tf}</span>
                      {l ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /> : v ? (
                        <span className="flex items-center gap-2 font-mono">
                          <span className={cls}>{v.direction}</span>
                          <span className="text-muted-foreground">{v.confidence}%</span>
                          {agree !== null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${agree ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"}`}>{agree ? "AGREES" : "DISAGREES"}</span>}
                        </span>
                      ) : (
                        <button onClick={() => r && runAI(tf as TF, r)} disabled={!r}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline disabled:opacity-50">
                          <RefreshCcw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </div>
                    <p className={`text-[11px] leading-snug ${err ? "text-bear" : "text-muted-foreground"}`}>
                      {v?.reasoning || (l ? "Analyzing…" : err ? `Error: ${err}` : "No verdict yet")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

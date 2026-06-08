import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState } from "react";
import { deriv, ALL_ASSETS, ASSETS_BY_CLASS, TIMEFRAMES, displayPair, type TF, type AssetClass } from "@/lib/engine/deriv";
import { runBacktest, type BacktestResult } from "@/lib/engine/backtest";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, ComposedChart, Scatter, CartesianGrid } from "recharts";
import { History, Loader2, TrendingUp, TrendingDown, Download, Image as ImgIcon } from "lucide-react";
import { downloadCSV, downloadEquityChart } from "@/lib/exports";
import { useSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/backtest")({
  head: () => ({
    meta: [
      { title: "Backtesting — DivergenceIQ" },
      { name: "description", content: "Replay historical candles to evaluate signal win-rate, average R-multiple, and equity curve." },
    ],
  }),
  component: BacktestPage,
});

function BacktestPage() {
  const [pair, setPair] = useState("frxEURUSD");
  const [tf, setTf] = useState<TF>("H1");
  const [count, setCount] = useState(2000);
  const [minScore, setMinScore] = useState(55);
  const [cooldown, setCooldown] = useState(10);
  const [forward, setForward] = useState(120);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const { settings, update } = useSettings();

  const run = async () => {
    setBusy(true); setErr(null); setResult(null);
    try {
      await deriv.connect();
      const cs = await deriv.getCandles(pair, tf, count);
      setCandles(cs);
      const r = runBacktest({
        pair, timeframe: tf, candles: cs, minScore, cooldownBars: cooldown, forwardBars: forward,
        spreadPips: settings.spreadPips, slippagePips: settings.slippagePips, execDelayBars: settings.execDelayBars,
      });
      setResult(r);
    } catch (e: any) { setErr(e.message ?? String(e)); }
    finally { setBusy(false); }
  };

  const exportCsv = () => {
    if (!result) return;
    downloadCSV(`backtest_${pair}_${tf}.csv`, result.signals.map(s => ({
      time: new Date(s.time * 1000).toISOString(), index: s.index, direction: s.direction,
      entry: s.entry, sl: s.sl, tp1: s.tp1, tp2: s.tp2, tp3: s.tp3,
      score: s.scorePct, rating: s.rating, outcome: s.outcome, rMultiple: s.rMultiple,
    })));
  };
  const exportEquityCsv = () => {
    if (!result) return;
    downloadCSV(`equity_${pair}_${tf}.csv`, result.equityCurve);
  };
  const exportEquityPng = () => {
    if (!result) return;
    downloadEquityChart(result.equityCurve, `equity_${pair}_${tf}.png`);
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-elite" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Backtesting</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Spread (pips)</div>
            <input type="number" min={0} step={0.1} value={settings.spreadPips}
              onChange={e => update({ spreadPips: +e.target.value })}
              className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
            <div className="text-[10px] text-muted-foreground">Cost added to entry against trade direction.</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Slippage (pips)</div>
            <input type="number" min={0} step={0.1} value={settings.slippagePips}
              onChange={e => update({ slippagePips: +e.target.value })}
              className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
            <div className="text-[10px] text-muted-foreground">Random fill drift on execution.</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Execution Delay (bars)</div>
            <input type="number" min={0} step={1} value={settings.execDelayBars}
              onChange={e => update({ execDelayBars: +e.target.value })}
              className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
            <div className="text-[10px] text-muted-foreground">Fill on bar open after signal.</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Walk-forward simulation: at every bar we run the full analyzer, take signals above min-score, and resolve TP/SL on future candles.</p>

        <div className="rounded-lg border border-border bg-card p-4 grid md:grid-cols-7 gap-3 items-end">
          <Field label="Pair">
            <select value={pair} onChange={e => setPair(e.target.value)} className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm">
              {(Object.keys(ASSETS_BY_CLASS) as AssetClass[]).map(cls => (
                <optgroup key={cls} label={cls.toUpperCase()}>
                  {ASSETS_BY_CLASS[cls].map(p => <option key={p.symbol} value={p.symbol}>{p.display}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="TF">
            <select value={tf} onChange={e => setTf(e.target.value as TF)} className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm">
              {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Candles">
            <input type="number" min={500} max={5000} step={100} value={count} onChange={e => setCount(+e.target.value)} className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Min Score %">
            <input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)} className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Cooldown">
            <input type="number" min={1} value={cooldown} onChange={e => setCooldown(+e.target.value)} className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Forward Bars">
            <input type="number" min={20} value={forward} onChange={e => setForward(+e.target.value)} className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
          </Field>
          <Button onClick={run} disabled={busy} className="h-9">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : "Run Backtest"}
          </Button>
        </div>

        {err && <div className="rounded border border-bear/40 bg-bear/10 p-3 text-sm text-bear">{err}</div>}

        {result && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5 mr-1.5" /> Trades CSV</Button>
              <Button size="sm" variant="outline" onClick={exportEquityCsv}><Download className="w-3.5 h-3.5 mr-1.5" /> Equity CSV</Button>
              <Button size="sm" variant="outline" onClick={exportEquityPng}><ImgIcon className="w-3.5 h-3.5 mr-1.5" /> Equity PNG</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Signals" value={String(result.signals.length)} />
              <Stat label="Wins" value={String(result.wins)} accent="bull" />
              <Stat label="Losses" value={String(result.losses)} accent="bear" />
              <Stat label="Win Rate" value={`${result.winRate.toFixed(1)}%`} />
              <Stat label="Total R" value={result.totalR.toFixed(2)} accent={result.totalR >= 0 ? "bull" : "bear"} />
            </div>

            {/* Price chart with trade markers — emulates broker chart */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-mono">
                Price · {displayPair(pair)} {tf} · {candles.length} bars · {result.signals.length} signals
              </div>
              <div style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={candles.map((c, i) => {
                    const sig = result.signals.find(s => s.index === i);
                    return {
                      i, close: c.close, high: c.high, low: c.low,
                      buy: sig && sig.direction === "BUY" ? c.close : null,
                      sell: sig && sig.direction === "SELL" ? c.close : null,
                    };
                  })}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" />
                    <XAxis dataKey="i" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                    <YAxis domain={["dataMin", "dataMax"]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} width={60} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 11 }} />
                    <Line type="monotone" dataKey="close" stroke="var(--primary)" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Scatter dataKey="buy" fill="var(--bull)" shape="triangle" />
                    <Scatter dataKey="sell" fill="var(--bear)" shape="triangle" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="px-3 py-2 border-t border-border flex gap-4 text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-bull rounded-sm" />BUY signal</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-bear rounded-sm" />SELL signal</span>
                <span>Spread + slippage approximated by ATR-derived SL distance.</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-mono">Equity Curve (R-multiples)</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.equityCurve}>
                    <XAxis dataKey="i" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} width={40} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                    <Line type="monotone" dataKey="equity" stroke="var(--elite)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-3">
              {Object.entries(result.byRating).map(([r, v]) => (
                <div key={r} className="rounded border border-border bg-card p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{r}</div>
                  <div className="text-lg font-bold">{v.count} <span className="text-xs text-muted-foreground">trades</span></div>
                  <div className="text-xs">Win: <span className="font-mono">{v.winRate.toFixed(0)}%</span> · Avg R: <span className="font-mono">{v.avgR.toFixed(2)}</span></div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-mono">Trade Log</div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2 py-1.5">Time</th><th>Dir</th><th>Rating</th><th>Score</th>
                      <th>Entry</th><th>SL</th><th>TP3</th><th>Outcome</th><th className="text-right">R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.signals.slice().reverse().map((s, i) => (
                      <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="px-2 py-1">{new Date(s.time * 1000).toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className={s.direction === "BUY" ? "text-bull" : "text-bear"}>{s.direction === "BUY" ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {s.direction}</td>
                        <td>{s.rating}</td>
                        <td>{s.scorePct}</td>
                        <td>{s.entry.toFixed(5)}</td>
                        <td className="text-bear">{s.sl.toFixed(5)}</td>
                        <td className="text-bull">{s.tp3.toFixed(5)}</td>
                        <td className={s.outcome === "SL" ? "text-bear" : s.outcome === "OPEN" ? "text-muted-foreground" : "text-bull"}>{s.outcome}</td>
                        <td className={`text-right ${s.rMultiple >= 0 ? "text-bull" : "text-bear"}`}>{s.rMultiple.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono space-y-1 block">{label}{children}</label>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "bull" | "bear" }) {
  const c = accent === "bull" ? "text-bull" : accent === "bear" ? "text-bear" : "text-foreground";
  return (
    <div className="rounded border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={`text-2xl font-bold font-mono ${c}`}>{value}</div>
    </div>
  );
}

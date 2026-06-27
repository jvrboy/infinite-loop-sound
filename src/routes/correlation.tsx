import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { GitCompare, Activity } from "lucide-react";
import { useMemo } from "react";
import { useDerivFeed } from "@/hooks/use-deriv-feed";

export const Route = createFileRoute("/correlation")({
  head: () => ({ meta: [{ title: "Correlation Matrix — DivergenceIQ" }] }),
  component: CorrelationPage,
});

// 8 instruments — keeps the matrix readable on small screens (8x8 = 64 cells).
const WATCH = [
  { symbol: "frxEURUSD", display: "EUR/USD" },
  { symbol: "frxGBPUSD", display: "GBP/USD" },
  { symbol: "frxUSDJPY", display: "USD/JPY" },
  { symbol: "frxAUDUSD", display: "AUD/USD" },
  { symbol: "frxUSDCAD", display: "USD/CAD" },
  { symbol: "frxXAUUSD", display: "XAU/USD" },
  { symbol: "frxXAGUSD", display: "XAG/USD" },
  { symbol: "cryBTCUSD", display: "BTC/USD" },
];

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 10) return null;
  const xs = a.slice(-n);
  const ys = b.slice(-n);
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return 0;
  return num / denom;
}

function CorrelationPage() {
  const symbols = useMemo(() => WATCH.map((w) => w.symbol), []);
  const { ticks, ready } = useDerivFeed(symbols);

  // build rolling return series per symbol
  const returns = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const w of WATCH) {
      const t = ticks[w.symbol];
      if (!t || t.window.length < 2) continue;
      const r: number[] = [];
      for (let i = 1; i < t.window.length; i++) {
        const prev = t.window[i - 1];
        const cur = t.window[i];
        if (prev > 0) r.push((cur - prev) / prev);
      }
      out[w.symbol] = r;
    }
    return out;
  }, [ticks]);

  const matrix = useMemo(() => {
    return WATCH.map((row) => ({
      row,
      cells: WATCH.map((col) => {
        if (row.symbol === col.symbol) return 1;
        const a = returns[row.symbol] || [];
        const b = returns[col.symbol] || [];
        return pearson(a, b);
      }),
    }));
  }, [returns]);

  const liveCount = Object.keys(returns).length;

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-primary" /> Correlation Matrix
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live Pearson correlation of tick-level returns · {liveCount}/{WATCH.length} streaming
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card">
            <Activity className={`w-3.5 h-3.5 text-primary ${ready ? "animate-pulse" : "opacity-30"}`} />
            <span className="text-xs font-mono text-primary">{ready ? "LIVE" : "CONNECTING…"}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2"></th>
                {WATCH.map((w) => (
                  <th key={w.symbol} className="p-2 font-mono text-muted-foreground">
                    {w.display.split("/")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ row, cells }) => (
                <tr key={row.symbol}>
                  <td className="p-2 font-mono text-muted-foreground text-right">
                    {row.display}
                  </td>
                  {cells.map((c, i) => {
                    const color =
                      c === null
                        ? "bg-muted/30 text-muted-foreground"
                        : c > 0.7
                          ? "bg-bull/40 text-foreground"
                          : c > 0.3
                            ? "bg-emerald-500/25 text-foreground"
                            : c > -0.3
                              ? "bg-muted/40 text-muted-foreground"
                              : c > -0.7
                                ? "bg-amber-500/30 text-foreground"
                                : "bg-bear/40 text-foreground";
                    return (
                      <td
                        key={i}
                        className={`p-2 text-center font-mono text-[11px] ${color} diq-press`}
                        title={`${row.display} vs ${WATCH[i].display}`}
                      >
                        {c === null ? "—" : c.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Strong positive", color: "bg-bull/40", desc: "r > 0.7 · move together" },
            { label: "Mild", color: "bg-emerald-500/25", desc: "0.3 < r ≤ 0.7" },
            { label: "Strong negative", color: "bg-bear/40", desc: "r < -0.7 · opposite" },
          ].map((l) => (
            <div key={l.label} className="glass-row p-2.5 flex items-center gap-3">
              <div className={`w-4 h-4 rounded ${l.color}`} />
              <div>
                <div className="text-xs font-medium">{l.label}</div>
                <div className="text-[10px] text-muted-foreground">{l.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Pearson r over the rolling 200-tick window per symbol · public Deriv WS.
        </p>
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalIcon,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Target,
  History as HistoryIcon,
} from "lucide-react";
import {
  forecastImpact,
  realisedImpact,
  loadHistory,
  recordHistory,
  accuracyStats,
  type CalendarEvent,
  type EventForecast,
  type ForecastHistoryEntry,
} from "@/lib/calendar/forecast";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Economic Calendar — DivergenceIQ" }] }),
  component: CalendarPage,
});

// Event source is still a static seed list (no public free macro feed). The
// rest of the page — forecast bands, realised impact, accuracy history — is
// computed live from the Deriv pair the currency primarily moves.
//
// Wire FMP/Finnhub/TradingEconomics here to replace this with live releases.
const TODAY_EVENTS: CalendarEvent[] = [
  { id: 1, time: "14:30", currency: "USD", impact: "High",   event: "Core CPI m/m",                forecast: "0.3%",  previous: "0.2%"  },
  { id: 2, time: "14:30", currency: "USD", impact: "High",   event: "CPI y/y",                     forecast: "3.4%",  previous: "3.2%"  },
  { id: 3, time: "15:00", currency: "EUR", impact: "Medium", event: "ECB President Lagarde Speaks", forecast: "-",     previous: "-"      },
  { id: 4, time: "16:00", currency: "USD", impact: "Medium", event: "CB Leading Index m/m",        forecast: "-0.1%", previous: "-0.3%" },
  { id: 5, time: "20:00", currency: "USD", impact: "High",   event: "FOMC Economic Projections",    forecast: "-",     previous: "-"      },
  { id: 6, time: "20:00", currency: "USD", impact: "High",   event: "FOMC Statement",               forecast: "-",     previous: "-"      },
  { id: 7, time: "20:00", currency: "USD", impact: "High",   event: "Federal Funds Rate",           forecast: "5.50%", previous: "5.50%" },
  { id: 8, time: "20:30", currency: "USD", impact: "High",   event: "FOMC Press Conference",        forecast: "-",     previous: "-"      },
];

type Row = {
  ev: CalendarEvent;
  forecast: EventForecast | null;
  realised: { pair: string; pct: number } | null;
};

function CalendarPage() {
  const [rows, setRows] = useState<Row[]>(() =>
    TODAY_EVENTS.map((ev) => ({ ev, forecast: null, realised: null })),
  );
  const [history, setHistory] = useState<ForecastHistoryEntry[]>([]);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const computed: Row[] = [];
      for (const ev of TODAY_EVENTS) {
        const [f, r] = await Promise.all([forecastImpact(ev), realisedImpact(ev)]);
        computed.push({ ev, forecast: f, realised: r });
        if (f && r) {
          const acc =
            1 -
            Math.abs(Math.abs(f.expectedMovePct) - Math.abs(r.pct)) /
              Math.max(Math.abs(f.expectedMovePct), Math.abs(r.pct), 1e-9);
          recordHistory({
            eventId: String(ev.id),
            currency: ev.currency,
            event: ev.event,
            ts: Date.now(),
            forecastPct: f.expectedMovePct,
            realisedPct: r.pct,
            accuracy: Math.max(0, Math.min(1, acc)),
          });
        }
      }
      if (!cancelled) setRows(computed);
      setHistory(loadHistory());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => accuracyStats(history), [history]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalIcon className="w-6 h-6 text-primary" />
              Economic Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              High-impact macros with live forecasted impact bands (Deriv-derived).
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
            <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-xs font-mono text-primary">LIVE FORECASTS</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Target className="w-3 h-3" /> Mean forecast accuracy
            </div>
            <div className="text-xl font-bold font-mono mt-1">
              {stats.count > 0 ? `${(stats.mean * 100).toFixed(1)}%` : "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">{stats.count} samples</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Clock className="w-3 h-3" /> Today
            </div>
            <div className="text-xl font-bold font-mono mt-1">{today}</div>
            <div className="text-[11px] text-muted-foreground">{TODAY_EVENTS.length} events</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <HistoryIcon className="w-3 h-3" /> Tracked
            </div>
            <div className="text-xl font-bold font-mono mt-1">{history.length}</div>
            <div className="text-[11px] text-muted-foreground">forecast/realised pairs</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-3 border-b border-border bg-muted/50 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
            <div className="col-span-2 md:col-span-1">Time</div>
            <div className="col-span-2 md:col-span-1">Cur</div>
            <div className="col-span-1 hidden md:block">Impact</div>
            <div className="col-span-8 md:col-span-4">Event</div>
            <div className="col-span-12 md:col-span-2 text-right">Forecast band</div>
            <div className="col-span-12 md:col-span-2 text-right">Realised</div>
            <div className="col-span-12 md:col-span-1 text-right">Accuracy</div>
          </div>
          <div className="divide-y divide-border">
            {rows.map(({ ev, forecast, realised }) => {
              const acc =
                forecast && realised
                  ? Math.max(
                      0,
                      Math.min(
                        1,
                        1 -
                          Math.abs(Math.abs(forecast.expectedMovePct) - Math.abs(realised.pct)) /
                            Math.max(Math.abs(forecast.expectedMovePct), Math.abs(realised.pct), 1e-9),
                      ),
                    )
                  : null;
              return (
                <div
                  key={ev.id}
                  className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-accent/40 transition text-sm"
                >
                  <div className="col-span-2 md:col-span-1 font-mono">{ev.time}</div>
                  <div className="col-span-2 md:col-span-1 font-bold">{ev.currency}</div>
                  <div className="col-span-1 hidden md:flex justify-center">
                    {ev.impact === "High" ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="col-span-8 md:col-span-4 font-medium">
                    {ev.event}
                    <div className="text-[10px] text-muted-foreground font-mono">
                      f: {ev.forecast} · p: {ev.previous}
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-2 text-right font-mono text-xs">
                    {forecast ? (
                      <>
                        ±{forecast.expectedMovePct.toFixed(3)}%
                        <div className="text-[10px] text-muted-foreground">{forecast.pair}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-2 text-right font-mono text-xs">
                    {realised ? (
                      <span className={realised.pct >= 0 ? "text-bull" : "text-bear"}>
                        {realised.pct >= 0 ? "+" : ""}
                        {realised.pct.toFixed(3)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-1 text-right font-mono text-xs">
                    {acc !== null ? `${(acc * 100).toFixed(0)}%` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-currency accuracy */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Accuracy by currency
          </h3>
          {Object.keys(stats.byCurrency).length === 0 && (
            <p className="text-xs text-muted-foreground italic">No history yet.</p>
          )}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(stats.byCurrency).map(([cur, acc]) => (
              <div key={cur} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="font-mono text-sm font-bold">{cur}</span>
                <span className="font-mono text-xs">{(acc * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Event list is a static seed (no free macro feed). Forecast bands & realised impact are derived live from the primary Deriv pair for each currency. History stored in localStorage.
        </p>
      </div>
    </AppShell>
  );
}

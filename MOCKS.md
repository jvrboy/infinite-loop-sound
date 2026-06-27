# MOCKS — Remaining hardcoded fixtures

Audit produced during Phase 3. Every entry below is data that is still
hardcoded in the UI and needs a real source. Tabs already rewritten in
Phase 3 (`sentiment`, `dark-pool`, `options-flow`, `neural`) are removed
from this list.

## Tabs verified clean (Phase 3)
- `src/routes/sentiment.tsx` — live Deriv tick-derived sentiment.
- `src/routes/dark-pool.tsx` — live anomaly-detection on Deriv ticks.
- `src/routes/options-flow.tsx` — live realised-vol / IV proxy on Deriv.
- `src/routes/neural.tsx` — live `analyze()` predictions on Deriv candles.

## Tabs still containing mock data (Phase 8 cleanup pass)

Each entry: route file → what's mocked → real source to wire.

| Route | Mocked data | Proposed source |
|---|---|---|
| `routes/index.tsx` | Hero stats, screenshots, testimonials | Static (intentional marketing copy) |
| `routes/alerts.tsx` | Sample alert rules + trigger history | Supabase `alerts` table (already exists) — wire reader |
| `routes/analysis.tsx` | Some pre-computed scenarios | Run live `analyze()` on selected pair |
| `routes/api-keys.tsx` | Demo provider list | Static (intentional) |
| `routes/backtest.tsx` | Sample equity curves | Run live backtest on Deriv candles via `lib/engine/backtest.ts` |
| `routes/boom-crash.tsx` | Some labelled examples | Already partially live (use-realtime-training) |
| `routes/calendar.tsx` | Static event list + impact placeholders | **Phase 7** — economic-calendar API + `lib/calendar/forecast.ts` |
| `routes/chart.tsx` | OK — uses live candles |  — |
| `routes/chat.tsx` | Sidebar / artifacts / usage panels | **Phase 4** — Supabase `chats`, `usage_events` |
| `routes/compound.tsx` | Calculator (intentional) | — |
| `routes/correlation.tsx` | Correlation matrix | Compute on rolling Deriv windows (small TODO) |
| `routes/currency-strength.tsx` | Bar chart values | Compute on Deriv ticks (small TODO) |
| `routes/deriv.tsx` | Already live | — |
| `routes/dlq.tsx` | Dead-letter queue table | Supabase reader (table exists) |
| `routes/docs.tsx` | Static MDX | — |
| `routes/fibonacci.tsx` | Calculator (intentional) | — |
| `routes/heatmap.tsx` | Heatmap values | Already partial — wire to `lib/engine/heatmap-analytics.ts` on live candles |
| `routes/journal.tsx` | Sample journal entries | Supabase `journal` table |
| `routes/local-ai.tsx` | Already live (Phase 2) | — |
| `routes/margin.tsx` | Calculator (intentional) | — |
| `routes/market-profile.tsx` | TPO chart values | Compute on Deriv candles |
| `routes/optimizer.tsx` | Sample strategy results | Run optimisation on backtest engine |
| `routes/options-calc.tsx` | Calculator (intentional) | — |
| `routes/persistence.tsx` | Sample positions | Supabase `positions` table |
| `routes/pip-value.tsx` | Calculator (intentional) | — |
| `routes/pivot.tsx` | Sample pivots | Compute from Deriv D1 candle |
| `routes/plan.tsx` | Sample trading plan | Supabase `plans` table |
| `routes/pnl.tsx` | Sample P&L history | Supabase `trades` table |
| `routes/recovery.tsx` | Calculator (intentional) | — |
| `routes/risk-calculator.tsx` | Calculator (intentional) | — |
| `routes/scaling.tsx` | Calculator (intentional) | — |
| `routes/scanner.tsx` | Sample scan results | Run `analyze()` across all symbols |
| `routes/screener.tsx` | Sample filters | Same as scanner |
| `routes/sessions.tsx` | Session times (intentional) | — |
| `routes/signals.tsx` | Already mostly live | Audit for remaining stubs |
| `routes/simulator.tsx` | Sample trades | Live tick replay via `deriv.subscribeTicks` |
| `routes/system.tsx` | Health metrics | Wire to `health-monitor.ts` |
| `routes/telegram.tsx` | Sample webhook log | Supabase `webhook_events` table |
| `routes/tools.tsx` | Tool grid (intentional) | — |
| `routes/ultra.tsx` | Sample ULTRA signals | Run ULTRA engine live |
| `routes/uptime.tsx` | Uptime chart | Wire to `health-monitor.ts` |
| `routes/webhook-events.tsx` | Sample events | Supabase reader (table exists) |
| `routes/zo.tsx` | Sample ZO data | Wire to `zo-config.ts` |

## Legend
- **Calculator (intentional)** — pages that are pure user-input calculators (margin, pip value, etc.) have no upstream data. Marking these as "mock" would be misleading; they're not mocks, they're stateless utilities.
- **Static (intentional)** — marketing/docs/static layouts. No data source needed.
- **Phase N** — tracked in ROADMAP.md.

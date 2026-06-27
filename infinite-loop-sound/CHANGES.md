# Changes — DivergenceIQ multi-phase upgrade

Every commit below landed identically in **jvrboy/confluence-divergence-engine**
and **jvrboy/infinite-loop-sound**. All real-time data is sourced from the
public Deriv WebSocket API (`wss://ws.derivws.com/websockets/v3?app_id=1089`).

## Phase 1 — `/welcome` showcase landing
- New route `src/routes/welcome.tsx`.
- New components: `EntropyBackground` (canvas particle field), `DottedBackground`
  (CSS dotted grid), `FileTree` (collapsible source-tree viewer).
- `ROADMAP.md` checked in.
- `routeTree.gen.ts` regenerated automatically by the TanStack Router Vite plugin.

## Phase 2 — Local AI bugfixes
- **HF 401** fixed via new Supabase Edge Function `supabase/functions/hf-proxy/index.ts`
  — Range-aware proxy with browser-shaped User-Agent and optional `HF_TOKEN`.
- **`"default" is missing from pathConfig`** fixed by upgrading the wllama 3.x
  pathConfig with Vite `?url`-resolved WASM URLs and the required `default` key.
- Better error reporting: 401/403 surfaced as actionable, non-retryable errors.

  Deploy step (one-time):  `supabase functions deploy hf-proxy --no-verify-jwt`

## Phase 3 — Mock → real-time (Deriv)
- New hook `src/hooks/use-deriv-feed.ts` (multi-symbol tick subscription with
  rolling 200-quote and rolling-vol windows).
- New `src/lib/derived/microstructure.ts` with `sentimentProxy`, `detectBlocks`,
  and `volMetrics`.
- Tab rewrites:
  - `sentiment.tsx` — live bull/bear ratio from rolling tick momentum.
  - `dark-pool.tsx` — anomaly detection on tick deltas (z ≥ 2.5).
  - `options-flow.tsx` — realised vol + IV proxy from tick variance.
  - `neural.tsx` — predictions panel calls live `analyze()` on Deriv candles.
- `MOCKS.md` enumerates every remaining hardcoded fixture across all 50 routes.

## Phase 4 — Chat sidebar redesign
- New 3-pane chat layout with sidebar tabs:
  **Chats** · **Artifacts** · **Customize** · **Usage**.
- Per-chat **Rename / Pin / Archive / Delete** via kebab menu.
- New hooks: `useThreads`, `useArtifacts`, `useUsage`.
- New components: `ChatList`, `ArtifactsPanel`, `CustomizePanel`, `UsagePanel`.
- Supabase migration `chats / chat_messages / chat_artifacts / usage_events`
  with RLS so accounts can mirror local state.

## Phase 5 — Multi-language executor + auto-correct
- `src/lib/executor/index.ts` — `runWithAutoCorrect()` loop (max 3 attempts).
- `runtimes.ts` — browser-native: html, css, json, csv, ts, js, python (Pyodide
  on first use). Backend-only: csharp, cpp, java, swift (throw
  `RuntimeNotConfiguredError` until `VITE_EXECUTOR_URL` is set). DSL: indicators.
- `auto-correct.ts` — sends (language, code, error) to `aiChat()` with a
  "code only" system prompt; degrades safely without API keys.
- `generators.ts` — natural-language → starter snippet per language, with
  built-in fallbacks for offline use.

## Phase 6 — Skills registry (66 skills)
- `src/lib/skills/list.ts` defines:
  - 5 first-class executable skills (live-quote, confluence-analyze, scan-watchlist,
    list-timeframes, list-assets) wired to the live Deriv/analyze/executor stack;
  - 16 codegen/exec skills (gen-* and run-* per executor language);
  - 45 declarative skills across 9 categories: Market Data, Trading Research,
    Signal Engine, File Generation, Code Tooling, Documentation, Debugging,
    Content, Automation, Self-Improvement.
- `registry.ts`: `getSkill`, `enabledSkills`, `matchByKeyword`, `runSkill`.
- Skills toggle UI is the Customize panel from Phase 4.

## Phase 7 — Calendar forecast & history
- `src/lib/calendar/forecast.ts` — per-event forecast band derived from the
  rolling realised vol of the currency's primary Deriv pair (USD→EURUSD,
  JPY→USDJPY, XAU→XAUUSD, …) × impact multiplier.
- `realisedImpact()` measures actual price move 1h before vs 1h after the event.
- `loadHistory / recordHistory / accuracyStats` provide a localStorage-backed
  forecast-vs-realised ledger with per-currency accuracy aggregates.
- `routes/calendar.tsx` rewritten to show forecast bands, realised %, accuracy,
  plus a mean-accuracy tile and per-currency breakdown.

## Phase 8 — Audit & cleanup
- New `src/components/app/LoadState.tsx` — shared loading/error/empty trio.
  Drop in across remaining routes for visual consistency.
- `CHANGES.md` (this file) — comprehensive sign-off.
- `MOCKS.md` (from Phase 3) is the rolling backlog of remaining mock data.
- `ROADMAP.md` marks all 8 phases complete.

## What still needs you

1. **Deploy the HF proxy** (one-time, manual):
   `supabase functions deploy hf-proxy --no-verify-jwt`
   Optionally: `supabase secrets set HF_TOKEN=hf_xxx` for gated repos.

2. **Apply the new Supabase migration**:
   `supabase db push` (or run the SQL from
   `supabase/migrations/20260617140000_chats_artifacts_usage.sql` manually).

3. **Set `VITE_EXECUTOR_URL`** (optional, for C#/C++/Java/Swift):
   Point at a Judge0 or Piston-compatible service to enable compiled-language runs.

4. **First `npm run dev`** will regenerate `src/routeTree.gen.ts` to include the
   new `/welcome` route.

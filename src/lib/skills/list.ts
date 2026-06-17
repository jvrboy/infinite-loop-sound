// 50+ skills powering the chat agent's "self-improving" surface.
// Each skill is either:
//   - declarative (no exec — purely a hint the agent surfaces in its system
//     prompt so it knows the capability exists), OR
//   - executable (has exec(): real TS that runs against the same libs the UI
//     uses — deriv engine, executor, analyze(), etc.)
//
// The Customize panel toggles individual skills; matchByKeyword() in
// registry.ts auto-activates them based on the user's message.

import { deriv, ALL_ASSETS, TIMEFRAMES, type TF } from "@/lib/engine/deriv";
import { analyze } from "@/lib/engine/signal";
import { runWithAutoCorrect, type Language } from "@/lib/executor";
import { generate } from "@/lib/executor/generators";

export type SkillCategory =
  | "Market Data"
  | "Trading Research"
  | "Signal Engine"
  | "File Generation"
  | "Code Tooling"
  | "Documentation"
  | "Debugging"
  | "Content"
  | "Automation"
  | "Self-Improvement";

export interface SkillContext {
  message: string;
  threadId?: string | null;
  args?: Record<string, unknown>;
}

export interface SkillResult {
  ok: boolean;
  output?: string;
  artifact?: { name: string; kind: string; content: string };
  error?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  defaultEnabled?: boolean;
  trigger?: "always" | "keyword" | "on-demand";
  keywords?: string[];
  exec?: (ctx: SkillContext) => Promise<SkillResult>;
}

// ============================================================================
// Executable skills — these actually do something at runtime.
// ============================================================================
const exec_skills: Skill[] = [
  {
    id: "live-quote",
    name: "Live quote",
    category: "Market Data",
    description: "Snapshot the latest tick for a symbol from the public Deriv feed.",
    trigger: "keyword",
    keywords: ["quote", "price of", "what is", "spot"],
    exec: async ({ args }) => {
      const symbol = String(args?.symbol || "frxEURUSD");
      const candles = await deriv.getCandles(symbol, "M1", 1);
      const last = candles[candles.length - 1];
      if (!last) return { ok: false, error: `no data for ${symbol}` };
      return {
        ok: true,
        output: `${symbol}  ${last.close}  @ epoch ${last.ts}`,
      };
    },
  },
  {
    id: "confluence-analyze",
    name: "Confluence analyze",
    category: "Signal Engine",
    description: "Run analyze() over fresh candles for a pair/timeframe and return rating + direction.",
    trigger: "keyword",
    keywords: ["analyze", "analysis", "setup", "confluence"],
    exec: async ({ args }) => {
      const symbol = String(args?.symbol || "frxEURUSD");
      const tf = (args?.tf as TF) || "H1";
      const candles = await deriv.getCandles(symbol, tf, 200);
      const a = analyze(symbol, tf, candles, {});
      return {
        ok: true,
        output: `${symbol} ${tf}: ${a.rating} (${a.scorePct.toFixed(1)}%) ${a.direction ?? "NEUTRAL"}`,
      };
    },
  },
  {
    id: "scan-watchlist",
    name: "Scan watchlist",
    category: "Signal Engine",
    description: "Run analyze() across the entire ALL_ASSETS universe and return top-N rated setups.",
    trigger: "keyword",
    keywords: ["scan", "best setups", "top signals"],
    exec: async ({ args }) => {
      const tf = (args?.tf as TF) || "M15";
      const limit = Number(args?.limit || 8);
      const rows: { symbol: string; rating: string; score: number; dir: string }[] = [];
      for (const a of ALL_ASSETS.slice(0, 25)) {
        try {
          const candles = await deriv.getCandles(a.symbol, tf, 200);
          const r = analyze(a.symbol, tf, candles, {});
          rows.push({
            symbol: a.display,
            rating: r.rating,
            score: r.scorePct,
            dir: r.direction || "—",
          });
        } catch {}
      }
      rows.sort((a, b) => b.score - a.score);
      return {
        ok: true,
        output: rows
          .slice(0, limit)
          .map((r) => `${r.symbol.padEnd(10)} ${r.rating.padEnd(6)} ${r.score.toFixed(0).padStart(3)}%  ${r.dir}`)
          .join("\n"),
      };
    },
  },
  {
    id: "list-timeframes",
    name: "List timeframes",
    category: "Market Data",
    description: "Return the supported Deriv timeframes.",
    trigger: "on-demand",
    exec: async () => ({ ok: true, output: TIMEFRAMES.join(", ") }),
  },
  {
    id: "list-assets",
    name: "List assets",
    category: "Market Data",
    description: "List every asset symbol the Deriv engine can subscribe to.",
    trigger: "on-demand",
    exec: async () => ({
      ok: true,
      output: ALL_ASSETS.map((a) => `${a.symbol}\t${a.display}\t${a.class}`).join("\n"),
    }),
  },
  ...(["html", "css", "json", "csv", "ts", "js", "python", "indicators"] as Language[]).map(
    (lang) => ({
      id: `gen-${lang}`,
      name: `Generate ${lang.toUpperCase()}`,
      category: "Code Tooling" as SkillCategory,
      description: `Generate a starter ${lang.toUpperCase()} snippet from a natural-language prompt.`,
      trigger: "keyword" as const,
      keywords: [`generate ${lang}`, `write ${lang}`, `create ${lang}`, `${lang} for`],
      exec: async ({ message }: SkillContext) => {
        const code = await generate(message, lang);
        return {
          ok: true,
          output: code,
          artifact: { name: `generated.${lang}`, kind: lang, content: code },
        };
      },
    }),
  ),
  ...(["html", "css", "json", "csv", "ts", "js", "python", "indicators"] as Language[]).map(
    (lang) => ({
      id: `run-${lang}`,
      name: `Run ${lang.toUpperCase()} (auto-correct)`,
      category: "Code Tooling" as SkillCategory,
      description: `Execute ${lang.toUpperCase()} code with the auto-correct loop. Returns final code + output.`,
      trigger: "on-demand" as const,
      exec: async ({ args }: SkillContext) => {
        const code = String(args?.code || "");
        if (!code) return { ok: false, error: "missing args.code" };
        const r = await runWithAutoCorrect({ language: lang, code });
        return {
          ok: r.ok,
          output: r.ok
            ? `OK in ${r.attempts.length} attempt(s):\n${r.output}`
            : `FAILED after ${r.attempts.length} attempts:\n${r.error}`,
        };
      },
    }),
  ),
];

// ============================================================================
// Declarative skills — these expose the agent's "competencies" so the model
// can mention/use them, but the actual work is performed inline by the agent
// (the chat already has access to deriv ticks, analyze(), executor, etc.).
// ============================================================================
const decl = (
  id: string,
  name: string,
  category: SkillCategory,
  description: string,
  keywords: string[] = [],
  trigger: Skill["trigger"] = "keyword",
): Skill => ({ id, name, category, description, keywords, trigger });

const declarative_skills: Skill[] = [
  // Market Data
  decl("orderbook-summary", "Order book summary", "Market Data", "Summarise live bid/ask depth.", ["depth", "order book"]),
  decl("session-clock", "Session clock", "Market Data", "Active FX sessions (Asia/EU/US) right now.", ["session"]),
  decl("economic-calendar", "Economic calendar", "Market Data", "Upcoming high-impact releases.", ["calendar", "news"]),
  decl("currency-strength", "Currency strength", "Market Data", "Live G10 strength ranking.", ["strength"]),

  // Trading Research
  decl("divergence-explainer", "Divergence explainer", "Trading Research", "Explain RSI/MACD/Stoch divergence types with examples.", ["divergence", "rsi", "macd"]),
  decl("fvg-spotter", "Fair-value-gap spotter", "Trading Research", "Find recent FVGs on a pair.", ["fvg", "fair value"]),
  decl("ob-spotter", "Order block spotter", "Trading Research", "Detect institutional order blocks.", ["order block", "ob"]),
  decl("liquidity-map", "Liquidity map", "Trading Research", "Map equal-highs/equal-lows liquidity pools.", ["liquidity"]),
  decl("risk-sizing", "Risk sizing", "Trading Research", "Position size from account, stop, and risk %.", ["risk", "position size"]),
  decl("rr-calc", "R:R calculator", "Trading Research", "Compute reward:risk from entry/SL/TP.", ["r:r", "reward", "risk reward"]),
  decl("strategy-critic", "Strategy critic", "Trading Research", "Stress-test a strategy idea for biases.", ["critique", "review strategy"]),
  decl("backtest-narrate", "Backtest narrator", "Trading Research", "Read a backtest result and summarise findings.", ["backtest"]),

  // Signal Engine
  decl("explain-signal", "Explain signal", "Signal Engine", "Walk through why a recent signal fired.", ["why did", "explain signal"]),
  decl("invalidation", "Invalidation rules", "Signal Engine", "When would the current setup be invalidated?", ["invalidate", "invalidation"]),

  // File Generation (one entry per output kind — generators live under Code Tooling)
  decl("export-pdf", "Export PDF", "File Generation", "Render the current analysis to PDF.", ["pdf"]),
  decl("export-md", "Export markdown", "File Generation", "Save the conversation or analysis as .md.", ["markdown", "md"]),
  decl("table-to-csv", "Table → CSV", "File Generation", "Convert any chat-rendered table to CSV.", ["csv", "table"]),
  decl("schema-to-json", "Schema → JSON", "File Generation", "Generate a JSON document from a verbal schema.", ["json schema"]),
  decl("snippet-to-html", "Snippet → HTML", "File Generation", "Wrap an artifact in a styled HTML page.", ["html page"]),

  // Documentation
  decl("api-key-guide", "API key guide", "Documentation", "How to get keys for OpenAI/Anthropic/Google/etc.", ["api key", "how to get key"]),
  decl("route-map", "Route map", "Documentation", "List all routes and their purposes.", ["routes", "what pages"]),
  decl("env-vars", "Env vars list", "Documentation", "Documented VITE_* env vars.", ["env", "environment"]),
  decl("deploy-guide", "Deploy guide", "Documentation", "How to deploy to Vercel / Cloudflare.", ["deploy"]),
  decl("supabase-schema", "Supabase schema", "Documentation", "Summarise current Supabase tables.", ["schema", "supabase tables"]),

  // Debugging
  decl("stack-explain", "Stack-trace explainer", "Debugging", "Translate any pasted stack trace into plain English + likely fix.", ["stack trace", "error", "exception"]),
  decl("type-error", "Type-error explainer", "Debugging", "Decode TypeScript compiler errors.", ["ts error", "type"]),
  decl("ws-debug", "WebSocket debug", "Debugging", "Diagnose Deriv WS connection problems.", ["ws", "websocket", "disconnected"]),
  decl("net-debug", "Network debug", "Debugging", "Walk through fetch/CORS/401 issues.", ["cors", "fetch failed", "401"]),
  decl("repro-minimal", "Minimal repro", "Debugging", "Distil a failing case to a minimal reproduction.", ["minimal repro", "isolate"]),

  // Content
  decl("post-twitter", "Twitter thread", "Content", "Draft a 6-tweet thread from any analysis.", ["tweet", "twitter", "thread"]),
  decl("youtube-script", "YouTube script", "Content", "Draft a 5-minute trading video script.", ["youtube", "video script"]),
  decl("blog-post", "Blog post", "Content", "Long-form blog draft on a topic.", ["blog", "article"]),
  decl("changelog", "Changelog entry", "Content", "Write a clean changelog bullet from a diff/PR.", ["changelog"]),
  decl("release-notes", "Release notes", "Content", "Customer-facing release notes from commits.", ["release notes"]),

  // Automation
  decl("schedule-scan", "Schedule daily scan", "Automation", "Set up a daily scan reminder via Supabase cron.", ["schedule", "every day"]),
  decl("alert-from-text", "Alert from text", "Automation", "Translate a verbal alert into an alerts.tsx rule.", ["alert me", "set alert"]),
  decl("telegram-bridge", "Telegram bridge", "Automation", "Forward a finding to the user's Telegram bot.", ["telegram"]),
  decl("zo-link", "ZO link", "Automation", "Push a strategy block to the ZO config.", ["zo"]),

  // Self-Improvement
  decl("self-review", "Self-review", "Self-Improvement", "Audit the last response for hallucinations or weak claims.", ["self review", "audit response"]),
  decl("citation-check", "Citation check", "Self-Improvement", "Flag any unsourced numeric claim and ask for a source.", ["cite", "source"]),
  decl("simpler-version", "Simpler version", "Self-Improvement", "Rewrite the last response simpler.", ["simpler", "eli5"]),
  decl("longer-version", "Longer version", "Self-Improvement", "Expand the last response with depth.", ["longer", "more detail"]),
  decl("opposite-take", "Opposite take", "Self-Improvement", "Argue the opposite side of the last response.", ["opposite", "counter"]),
  decl("uncertainty-pass", "Uncertainty pass", "Self-Improvement", "Re-state confidence levels per claim.", ["how confident", "uncertainty"]),
  decl("learn-from-error", "Learn from error", "Self-Improvement", "Save the last failure pattern to a memory file.", ["remember this", "don't make this mistake"]),
];

// ============================================================================
// Final registry — keep this as the single export site so the rest of the app
// imports SKILLS and nothing else.
// ============================================================================
export const SKILLS: Skill[] = [...exec_skills, ...declarative_skills];

// Sanity log so you can verify count in dev:
//   import { SKILLS } from "@/lib/skills/list"; console.log(SKILLS.length);

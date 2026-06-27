// Auto-trader bot settings persisted in localStorage (client-only).

export type BotMode = "off" | "signal" | "scalper";
export type PositionSizing = "fixed" | "martingale";
export type TpSource = "fixed" | "system";

export interface BotSettings {
  // ── Core mode ────────────────────────────────────────────────
  // off      → fully inactive, no trades, no monitoring.
  // signal   → trades each new signal from the engine (1 per signal).
  // scalper  → perpetual scalper: opens/closes trades in rapid succession 24/7.
  mode: BotMode;

  accountType: "demo" | "real";
  token: string; // Deriv API token (real or demo)
  instruments: string[]; // e.g. ["R_100", "frxEURUSD"]

  // ── Position sizing ──────────────────────────────────────────
  positionSizing: PositionSizing;
  lotSize: number; // FIXED LOT: exact lot per trade (min 0.01)
  martingaleBase: number; // MARTINGALE: starting lot
  martingaleMultiplier: number; // MARTINGALE: lot multiplier applied after a loss
  martingaleMaxLot: number; // MARTINGALE: hard cap to stop explosive growth

  // ── Risk / position management ───────────────────────────────
  maxOpen: number; // max concurrently open trades (1-500)
  cooldownSec: number; // min seconds between consecutive trade openings
  durationSec: number; // max trade lifetime before forced close (scalper target)
  dailyLossCap: number; // halt bot if cumulative session loss reaches this

  // ── Take profit / stop loss ──────────────────────────────────
  tpSource: TpSource; // fixed → use fixedTpPips ; system → use signal/engine TP
  fixedTpPips: number; // FIXED TP (pips) applied to every trade
  scalperTpPips: number; // scalper take profit (pips)
  scalperSlPips: number; // scalper stop loss (pips)

  // ── Signal-mode self-scan (generates signals when no external producer) ─
  minScore: number; // signals at/above this score auto-trade
  scanIntervalSec: number;
  scanTimeframe: "M1" | "M5" | "M15" | "M30" | "H1";

  // ── Guardrails ───────────────────────────────────────────────
  allowWeekends: boolean; // when false, block opening trades on Sat/Sun (synthetics exempt)

  // legacy flag kept for migration (no longer surfaced in UI)
  enabled?: boolean;
  selfScan?: boolean;
}

const KEY = "div-iq/bot-settings/v3";
const LEGACY_KEYS = ["div-iq/bot-settings/v2", "div-iq/bot-settings/v1"];

export const MAX_CONCURRENT_TRADES = 500;

export const DEFAULT_BOT: BotSettings = {
  mode: "off",
  accountType: "demo",
  token: "",
  // Mix of synthetics + a major FX pair — gives the bot real volume on
  // any day of the week (R_100/R_75 are 24/7).
  instruments: ["R_100", "R_75", "frxEURUSD"],

  positionSizing: "fixed",
  lotSize: 0.01,
  martingaleBase: 0.01,
  martingaleMultiplier: 2.0,
  martingaleMaxLot: 0.1, // ~10× base by default

  maxOpen: 3,
  cooldownSec: 5,
  durationSec: 180,
  dailyLossCap: 50,

  tpSource: "fixed",
  fixedTpPips: 50,
  scalperTpPips: 30,
  scalperSlPips: 30,

  minScore: 70,
  scanIntervalSec: 30,
  scanTimeframe: "M5",

  allowWeekends: false,
};

function migrate(raw: Partial<BotSettings> & Record<string, unknown>): BotSettings {
  const merged = { ...DEFAULT_BOT, ...raw };
  // Map legacy `enabled` + `selfScan` to the new `mode` if `mode` is absent.
  if (!raw.mode) {
    merged.mode = raw.enabled ? "signal" : "off";
  }
  // Clamp max open to the hard limit.
  merged.maxOpen = Math.min(MAX_CONCURRENT_TRADES, Math.max(1, Math.round(merged.maxOpen)));
  return merged;
}

export function loadBot(): BotSettings {
  if (typeof window === "undefined") return DEFAULT_BOT;
  try {
    const cur = localStorage.getItem(KEY);
    if (cur) return migrate(JSON.parse(cur));
    for (const lk of LEGACY_KEYS) {
      const legacy = localStorage.getItem(lk);
      if (legacy) {
        const migrated = migrate(JSON.parse(legacy));
        localStorage.setItem(KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_BOT;
}

export function saveBot(s: BotSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

// ── Validation ─────────────────────────────────────────────────
export function validateSettings(s: BotSettings): string[] {
  const errors: string[] = [];
  if (s.instruments.length === 0) errors.push("Pick at least one instrument.");

  if (s.positionSizing === "fixed") {
    if (!Number.isFinite(s.lotSize) || s.lotSize < 0.01) errors.push("Fixed lot size must be at least 0.01.");
  } else {
    if (!Number.isFinite(s.martingaleBase) || s.martingaleBase < 0.01) errors.push("Martingale base lot must be at least 0.01.");
    if (!Number.isFinite(s.martingaleMultiplier) || s.martingaleMultiplier <= 1) errors.push("Martingale multiplier must be greater than 1.");
    if (!Number.isFinite(s.martingaleMaxLot) || s.martingaleMaxLot < s.martingaleBase) errors.push("Martingale max lot must be ≥ base lot.");
  }

  if (!Number.isFinite(s.maxOpen) || s.maxOpen < 1 || s.maxOpen > MAX_CONCURRENT_TRADES) {
    errors.push(`Max concurrent trades must be between 1 and ${MAX_CONCURRENT_TRADES}.`);
  }

  if (s.tpSource === "fixed" && (!Number.isFinite(s.fixedTpPips) || s.fixedTpPips <= 0)) {
    errors.push("Fixed TP (pips) must be greater than 0.");
  }
  if (s.mode === "scalper") {
    if (!Number.isFinite(s.scalperTpPips) || s.scalperTpPips <= 0) errors.push("Scalper TP (pips) must be greater than 0.");
    if (!Number.isFinite(s.scalperSlPips) || s.scalperSlPips <= 0) errors.push("Scalper SL (pips) must be greater than 0.");
  }
  if (!Number.isFinite(s.dailyLossCap) || s.dailyLossCap <= 0) errors.push("Daily loss cap must be greater than 0.");
  if (!Number.isFinite(s.cooldownSec) || s.cooldownSec < 0) errors.push("Cooldown must be 0 or greater.");
  return errors;
}

// ── Pip helpers ────────────────────────────────────────────────
// Returns the pip size for a given Deriv symbol so TP/SL in "pips" can be
// converted to absolute price distances.
export function pipSize(symbol: string): number {
  if (/JPY$/i.test(symbol)) return 0.01; // JPY forex pairs
  if (/^frx/i.test(symbol)) return 0.0001; // standard forex
  if (/^cry/i.test(symbol)) return 1; // crypto — 1 unit ≈ 1 "pip"
  if (/^R_|HZ|BOOM|CRASH|JD/i.test(symbol)) return 0.1; // synthetics
  return 0.1; // indices / stocks fallback
}

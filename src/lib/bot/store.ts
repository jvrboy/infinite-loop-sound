// Auto-trader bot settings persisted in localStorage (client-only).
export interface BotSettings {
  enabled: boolean;
  accountType: "demo" | "real";
  token: string;          // Deriv API token (real or demo)
  instruments: string[];  // e.g. ["R_100", "frxEURUSD"]
  minScore: number;       // signals at/above this score auto-trade
  lotSize: number;        // fixed lot per trade (min 0.01)
  maxOpen: number;        // max concurrently open trades
  cooldownSec: number;    // min seconds between trades per instrument
  durationSec: number;    // perpetual scalper duration per ticket
  dailyLossCap: number;   // stop bot if cumulative loss reaches this
  selfScan: boolean;      // when true, bot scans instruments itself instead of
                          // only relying on Supabase `signals` INSERTs
  scanIntervalSec: number;
  scanTimeframe: "M1" | "M5" | "M15" | "M30" | "H1";
}

const KEY = "div-iq/bot-settings/v2";
const LEGACY_KEY = "div-iq/bot-settings/v1";

export const DEFAULT_BOT: BotSettings = {
  enabled: false,
  accountType: "demo",
  token: "",
  // Mix of synthetics + a major FX pair — gives the self-scanner real volume on
  // any day of the week (R_100/R_75 are 24/7).
  instruments: ["R_100", "R_75", "frxEURUSD"],
  minScore: 70,
  // Fixed: 0.01 is the Deriv minimum for forex stake. Previous default was 1
  // which blocked small-account testing.
  lotSize: 0.01,
  maxOpen: 2,
  cooldownSec: 60,
  durationSec: 60,
  dailyLossCap: 50,
  // Fixed: bot was inert because it only listened for Supabase `signals`
  // INSERTs, which depend on a separate producer. Self-scan now defaults on
  // so the bot actually generates trades.
  selfScan: true,
  scanIntervalSec: 30,
  scanTimeframe: "M5",
};

export function loadBot(): BotSettings {
  if (typeof window === "undefined") return DEFAULT_BOT;
  try {
    // migrate v1 -> v2 if present
    const cur = localStorage.getItem(KEY);
    if (cur) return { ...DEFAULT_BOT, ...JSON.parse(cur) };
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const merged = { ...DEFAULT_BOT, ...JSON.parse(legacy) };
      localStorage.setItem(KEY, JSON.stringify(merged));
      return merged;
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

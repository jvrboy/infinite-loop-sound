// Auto-trader bot settings persisted in localStorage (client-only).
export interface BotSettings {
  enabled: boolean;
  accountType: "demo" | "real";
  token: string;          // Deriv API token (real or demo)
  instruments: string[];  // e.g. ["R_100", "frxEURUSD"]
  minScore: number;       // signals at/above this score auto-trade
  lotSize: number;        // fixed lot per trade
  maxOpen: number;        // max concurrently open trades
  cooldownSec: number;    // min seconds between trades per instrument
  durationSec: number;    // perpetual scalper duration per ticket (e.g. 60s)
  dailyLossCap: number;   // stop bot if cumulative loss reaches this (account currency)
}

const KEY = "div-iq/bot-settings/v1";
export const DEFAULT_BOT: BotSettings = {
  enabled: false, accountType: "demo", token: "",
  instruments: ["R_100"], minScore: 80, lotSize: 1,
  maxOpen: 2, cooldownSec: 60, durationSec: 60, dailyLossCap: 50,
};

export function loadBot(): BotSettings {
  if (typeof window === "undefined") return DEFAULT_BOT;
  try { return { ...DEFAULT_BOT, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return DEFAULT_BOT; }
}
export function saveBot(s: BotSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}
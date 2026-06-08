// Walk-forward backtest: scan historical candles, generate signals at each bar,
// then look forward to see whether SL or TP1/TP2/TP3 was hit first.

import { analyze, type AnalysisResult } from "./signal";
import type { Candle } from "./indicators";

export interface BacktestSignal {
  time: number;
  index: number;
  direction: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp1: number; tp2: number; tp3: number;
  scorePct: number;
  rating: string;
  outcome: "TP1" | "TP2" | "TP3" | "SL" | "OPEN";
  exitIndex: number | null;
  rMultiple: number; // realized R
}

export interface BacktestResult {
  signals: BacktestSignal[];
  wins: number; losses: number; openTrades: number;
  winRate: number;
  avgR: number;
  totalR: number;
  equityCurve: { i: number; equity: number }[];
  byRating: Record<string, { count: number; winRate: number; avgR: number }>;
}

export interface BacktestOptions {
  pair: string;
  timeframe: string;
  candles: Candle[];
  minScore?: number;       // 0–100
  cooldownBars?: number;   // bars between signals
  warmup?: number;         // initial bars to skip
  forwardBars?: number;    // bars to look forward for outcome
  spreadPips?: number;     // round-turn spread cost added to entry against you
  slippagePips?: number;   // random execution slippage against you
  execDelayBars?: number;  // bars between signal generation and fill
  pipSize?: number;        // override pip size; defaults heuristically
}

export const runBacktest = (opts: BacktestOptions): BacktestResult => {
  const { pair, timeframe, candles, minScore = 55, cooldownBars = 10, warmup = 220, forwardBars = 120,
    spreadPips = 0, slippagePips = 0, execDelayBars = 0, pipSize } = opts;
  // Heuristic pip size: 0.01 for JPY pairs, 0.0001 for others, 0.1 for gold/indices
  const psize = pipSize ?? (pair.includes("JPY") ? 0.01 : pair.startsWith("frx") ? 0.0001 : 0.1);
  const costPerSide = (spreadPips / 2 + slippagePips) * psize;
  const signals: BacktestSignal[] = [];
  let lastIdx = -Infinity;

  for (let i = warmup; i < candles.length - 1; i++) {
    if (i - lastIdx < cooldownBars) continue;
    const slice = candles.slice(0, i + 1);
    let a: AnalysisResult;
    try { a = analyze(pair, timeframe, slice); } catch { continue; }
    if (!a.direction || !a.trade || a.scorePct < minScore) continue;

    const dir = a.direction;
    let { entry, sl, tp1, tp2, tp3 } = a.trade;
    // Apply realistic execution: fill at delayed bar's open shifted by spread+slippage against the trade
    const fillIdx = Math.min(candles.length - 1, i + Math.max(0, execDelayBars));
    const fillBar = candles[fillIdx];
    if (fillBar) {
      const ref = fillBar.open;
      entry = dir === "BUY" ? ref + costPerSide : ref - costPerSide;
    }
    let outcome: BacktestSignal["outcome"] = "OPEN";
    let exitIndex: number | null = null;
    let rMul = 0;
    const risk = Math.abs(entry - sl);

    const startJ = Math.max(i + 1, fillIdx + 1);
    const end = Math.min(candles.length, startJ + forwardBars);
    for (let j = startJ; j < end; j++) {
      const c = candles[j];
      const hitSL = dir === "BUY" ? c.low <= sl : c.high >= sl;
      const hitTP3 = dir === "BUY" ? c.high >= tp3 : c.low <= tp3;
      const hitTP2 = dir === "BUY" ? c.high >= tp2 : c.low <= tp2;
      const hitTP1 = dir === "BUY" ? c.high >= tp1 : c.low <= tp1;
      if (hitSL && hitTP1) { outcome = "SL"; exitIndex = j; rMul = -1; break; }
      if (hitTP3) { outcome = "TP3"; exitIndex = j; rMul = Math.abs(tp3 - entry) / risk; break; }
      if (hitTP2) { outcome = "TP2"; exitIndex = j; rMul = Math.abs(tp2 - entry) / risk; break; }
      if (hitTP1) { outcome = "TP1"; exitIndex = j; rMul = Math.abs(tp1 - entry) / risk; break; }
      if (hitSL) { outcome = "SL"; exitIndex = j; rMul = -1; break; }
    }

    signals.push({
      time: candles[i].epoch, index: i, direction: dir, entry, sl, tp1, tp2, tp3,
      scorePct: a.scorePct, rating: a.rating, outcome, exitIndex, rMultiple: rMul,
    });
    lastIdx = i;
  }

  const wins = signals.filter(s => s.outcome === "TP1" || s.outcome === "TP2" || s.outcome === "TP3").length;
  const losses = signals.filter(s => s.outcome === "SL").length;
  const openTrades = signals.filter(s => s.outcome === "OPEN").length;
  const closed = wins + losses;
  const winRate = closed === 0 ? 0 : (wins / closed) * 100;
  const totalR = signals.reduce((a, s) => a + s.rMultiple, 0);
  const avgR = signals.length === 0 ? 0 : totalR / signals.length;

  let eq = 0;
  const equityCurve = signals.map(s => { eq += s.rMultiple; return { i: s.index, equity: eq }; });

  const byRating: BacktestResult["byRating"] = {};
  ["ELITE", "STRONG", "MEDIUM", "WEAK"].forEach(r => {
    const subs = signals.filter(s => s.rating === r);
    const w = subs.filter(s => s.outcome.startsWith("TP")).length;
    const l = subs.filter(s => s.outcome === "SL").length;
    const c = w + l;
    const total = subs.reduce((a, s) => a + s.rMultiple, 0);
    byRating[r] = { count: subs.length, winRate: c === 0 ? 0 : (w / c) * 100, avgR: subs.length === 0 ? 0 : total / subs.length };
  });

  return { signals, wins, losses, openTrades, winRate, avgR, totalR, equityCurve, byRating };
};

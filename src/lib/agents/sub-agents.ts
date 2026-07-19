// Sub-Agents — specialized analysis agents that run in pipelines.
// Each sub-agent focuses on one narrow aspect of market structure.
// They can run independently or be composed into pipelines by the
// SubAgentPipeline orchestrator.

import type { Candle } from "../engine/indicators";
import { ema, sma, atr, supertrend, adx, rsi } from "../engine/indicators";
import { aroon, ttmSqueeze, choppiness } from "../engine/advanced-indicators";

export type SubAgentType =
  | "liquidity"
  | "order-block"
  | "fvg"
  | "session"
  | "mtf"
  | "momentum"
  | "volatility"
  | "trend";

export interface SubAgentResult {
  type: SubAgentType;
  name: string;
  bias: "bull" | "bear" | "neutral";
  confidence: number; // 0..100
  score: number; // -100..100
  insights: string[];
  data?: Record<string, unknown>;
}

export interface SubAgent {
  type: SubAgentType;
  name: string;
  description: string;
  run: (candles: Candle[], ctx?: SubAgentContext) => SubAgentResult;
}

export interface SubAgentContext {
  higherTfCandles?: Candle[];
  lowerTfCandles?: Candle[];
  session?: "asia" | "london" | "newyork" | "off";
  currentPrice?: number;
}

// ---------- Liquidity Agent ----------
// Detects liquidity pools (equal highs/lows, stop clusters, sweep zones)
export const liquidityAgent: SubAgent = {
  type: "liquidity",
  name: "Liquidity Agent",
  description: "Detects liquidity pools, equal highs/lows, and sweep zones",
  run: (candles) => {
    const n = candles.length;
    const insights: string[] = [];
    let score = 0;
    const lookback = Math.min(20, n);
    const recent = candles.slice(n - lookback);
    const highs = recent.map((c) => c.high);
    const lows = recent.map((c) => c.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const equalHighs = highs.filter((h) => Math.abs(h - maxHigh) < (maxHigh - minLow) * 0.001).length;
    const equalLows = lows.filter((l) => Math.abs(l - minLow) < (maxHigh - minLow) * 0.001).length;
    if (equalHighs >= 2) {
      insights.push(`Equal highs detected (${equalHighs}x) — sell-side liquidity pool above ${maxHigh}`);
      score -= 15;
    }
    if (equalLows >= 2) {
      insights.push(`Equal lows detected (${equalLows}x) — buy-side liquidity pool below ${minLow}`);
      score += 15;
    }
    const lastCandle = candles[n - 1];
    if (lastCandle.close > maxHigh * 0.999 && lastCandle.close < maxHigh * 1.001) {
      insights.push("Price is testing sell-side liquidity — potential sweep reversal");
      score += 10;
    }
    if (lastCandle.close < minLow * 1.001 && lastCandle.close > minLow * 0.999) {
      insights.push("Price is testing buy-side liquidity — potential sweep reversal");
      score -= 10;
    }
    const bias: SubAgentResult["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
    return {
      type: "liquidity",
      name: "Liquidity Agent",
      bias,
      confidence: Math.min(100, Math.abs(score) * 2 + 30),
      score,
      insights,
    };
  },
};

// ---------- Order Block Agent ----------
// Identifies bullish/bearish order blocks (last opposite candle before impulse move)
export const orderBlockAgent: SubAgent = {
  type: "order-block",
  name: "Order Block Agent",
  description: "Identifies bullish/bearish order blocks and mitigation zones",
  run: (candles) => {
    const n = candles.length;
    const insights: string[] = [];
    let score = 0;
    if (n < 10) return { type: "order-block", name: "Order Block Agent", bias: "neutral", confidence: 0, score: 0, insights: ["Not enough data"] };
    const lookback = Math.min(30, n);
    const recent = candles.slice(n - lookback);
    // Find impulse moves (3 consecutive candles in same direction)
    let bullOB: { high: number; low: number; index: number } | null = null;
    let bearOB: { high: number; low: number; index: number } | null = null;
    for (let i = 2; i < recent.length; i++) {
      const imp1 = recent[i - 2].close > recent[i - 2].open;
      const imp2 = recent[i - 1].close > recent[i - 1].open;
      const imp3 = recent[i].close > recent[i].open;
      if (imp1 && imp2 && imp3 && !bullOB) {
        bullOB = { high: recent[i - 3]?.high ?? recent[i - 2].high, low: recent[i - 2].low, index: i - 2 };
      }
      if (!imp1 && !imp2 && !imp3 && !bearOB) {
        bearOB = { high: recent[i - 2].high, low: recent[i - 3]?.low ?? recent[i - 2].low, index: i - 2 };
      }
    }
    const lastPrice = recent[recent.length - 1].close;
    if (bullOB) {
      const dist = Math.abs(lastPrice - (bullOB.high + bullOB.low) / 2);
      const range = bullOB.high - bullOB.low || 1;
      if (dist < range * 3) {
        insights.push(`Bullish order block at ${bullOB.low.toFixed(5)}–${bullOB.high.toFixed(5)} — price near mitigation`);
        score += 20;
      } else {
        insights.push(`Bullish order block at ${bullOB.low.toFixed(5)}–${bullOB.high.toFixed(5)} — unmitigated`);
        score += 5;
      }
    }
    if (bearOB) {
      const dist = Math.abs(lastPrice - (bearOB.high + bearOB.low) / 2);
      const range = bearOB.high - bearOB.low || 1;
      if (dist < range * 3) {
        insights.push(`Bearish order block at ${bearOB.low.toFixed(5)}–${bearOB.high.toFixed(5)} — price near mitigation`);
        score -= 20;
      } else {
        insights.push(`Bearish order block at ${bearOB.low.toFixed(5)}–${bearOB.high.toFixed(5)} — unmitigated`);
        score -= 5;
      }
    }
    if (!bullOB && !bearOB) insights.push("No clear order blocks detected in recent price action");
    const bias: SubAgentResult["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
    return { type: "order-block", name: "Order Block Agent", bias, confidence: Math.min(100, Math.abs(score) * 2 + 25), score, insights };
  },
};

// ---------- Fair Value Gap (FVG) Agent ----------
// Detects imbalances/gaps where price is likely to return
export const fvgAgent: SubAgent = {
  type: "fvg",
  name: "FVG Agent",
  description: "Detects Fair Value Gaps (imbalances) and fill probabilities",
  run: (candles) => {
    const n = candles.length;
    const insights: string[] = [];
    let score = 0;
    if (n < 5) return { type: "fvg", name: "FVG Agent", bias: "neutral", confidence: 0, score: 0, insights: ["Not enough data"] };
    const lookback = Math.min(20, n);
    const recent = candles.slice(n - lookback);
    const fvgs: { type: "bull" | "bear"; top: number; bottom: number; filled: boolean }[] = [];
    for (let i = 2; i < recent.length; i++) {
      const c1 = recent[i - 2];
      const c3 = recent[i];
      // Bullish FVG: gap between c1.high and c3.low
      if (c3.low > c1.high) {
        const filled = recent.slice(i + 1).some((c) => c.low <= c1.high);
        fvgs.push({ type: "bull", top: c3.low, bottom: c1.high, filled });
      }
      // Bearish FVG: gap between c1.low and c3.high
      if (c3.high < c1.low) {
        const filled = recent.slice(i + 1).some((c) => c.high >= c1.low);
        fvgs.push({ type: "bear", top: c1.low, bottom: c3.high, filled });
      }
    }
    const unfilled = fvgs.filter((f) => !f.filled);
    const bullFVGs = unfilled.filter((f) => f.type === "bull");
    const bearFVGs = unfilled.filter((f) => f.type === "bear");
    if (bullFVGs.length) {
      insights.push(`${bullFVGs.length} unfilled bullish FVG(s) — price likely to return and fill`);
      score += bullFVGs.length * 10;
    }
    if (bearFVGs.length) {
      insights.push(`${bearFVGs.length} unfilled bearish FVG(s) — price likely to return and fill`);
      score -= bearFVGs.length * 10;
    }
    if (unfilled.length === 0) insights.push("All recent FVGs have been filled — balanced price action");
    const bias: SubAgentResult["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
    return { type: "fvg", name: "FVG Agent", bias, confidence: Math.min(100, Math.abs(score) * 2 + 20), score, insights, data: { fvgs: unfilled } };
  },
};

// ---------- Session Agent ----------
// Analyzes session-based behavior patterns
export const sessionAgent: SubAgent = {
  type: "session",
  name: "Session Agent",
  description: "Analyzes trading session behavior and optimal timing",
  run: (candles, ctx) => {
    const n = candles.length;
    const insights: string[] = [];
    let score = 0;
    const session = ctx?.session ?? "london";
    const sessionInfo: Record<string, { name: string; vol: number; bias: number }> = {
      asia: { name: "Asian Session", vol: 0.4, bias: -5 },
      london: { name: "London Session", vol: 0.8, bias: 10 },
      newyork: { name: "New York Session", vol: 0.9, bias: 15 },
      off: { name: "Off-Session", vol: 0.2, bias: -10 },
    };
    const info = sessionInfo[session] ?? sessionInfo.london;
    insights.push(`Current session: ${info.name} (relative volatility: ${info.vol.toFixed(1)})`);
    score += info.bias;
    if (session === "london" || session === "newyork") {
      insights.push("High-liquidity session — trend setups more reliable");
      const atrArr = atr(candles, 14);
      const lastAtr = atrArr[n - 1];
      if (lastAtr != null) insights.push(`Current ATR(14): ${lastAtr.toFixed(5)}`);
    } else if (session === "asia") {
      insights.push("Asian session — range-bound strategies preferred, watch for breakouts");
    }
    const bias: SubAgentResult["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
    return { type: "session", name: "Session Agent", bias, confidence: Math.min(100, Math.abs(score) * 3 + 30), score, insights };
  },
};

// ---------- Multi-Timeframe Agent ----------
// Aggregates bias across multiple timeframes
export const mtfAgent: SubAgent = {
  type: "mtf",
  name: "MTF Agent",
  description: "Multi-timeframe trend alignment analysis",
  run: (candles, ctx) => {
    const insights: string[] = [];
    let score = 0;
    const higherTF = ctx?.higherTfCandles;
    const lowerTF = ctx?.lowerTfCandles;
    const st = supertrend(candles);
    const baseTrend = st.trend[candles.length - 1];
    score += baseTrend * 30;
    insights.push(`Base TF Supertrend: ${baseTrend > 0 ? "Bullish" : "Bearish"}`);
    if (higherTF && higherTF.length > 10) {
      const hst = supertrend(higherTF);
      const hTrend = hst.trend[higherTF.length - 1];
      score += hTrend * 25;
      insights.push(`Higher TF Supertrend: ${hTrend > 0 ? "Bullish" : "Bearish"}`);
      if (baseTrend === hTrend) {
        insights.push("Timeframes aligned — high-confidence setup");
        score += baseTrend * 15;
      } else {
        insights.push("Timeframe misalignment — exercise caution");
        score -= 10;
      }
    }
    if (lowerTF && lowerTF.length > 10) {
      const lst = supertrend(lowerTF);
      const lTrend = lst.trend[lowerTF.length - 1];
      score += lTrend * 10;
      insights.push(`Lower TF Supertrend: ${lTrend > 0 ? "Bullish" : "Bearish"}`);
    }
    const bias: SubAgentResult["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
    return { type: "mtf", name: "MTF Agent", bias, confidence: Math.min(100, Math.abs(score) + 30), score, insights };
  },
};

// ---------- Momentum Agent ----------
// RSI + ADX + Aroon momentum composite
export const momentumAgent: SubAgent = {
  type: "momentum",
  name: "Momentum Agent",
  description: "RSI + ADX + Aroon momentum composite analysis",
  run: (candles) => {
    const n = candles.length;
    const insights: string[] = [];
    let score = 0;
    const rsiArr = rsi(candles.map((c) => c.close), 14);
    const rsiVal = rsiArr[n - 1];
    if (rsiVal != null) {
      if (rsiVal < 30) {
        score += 25;
        insights.push(`RSI(14) = ${rsiVal.toFixed(1)} — oversold, potential bounce`);
      } else if (rsiVal > 70) {
        score -= 25;
        insights.push(`RSI(14) = ${rsiVal.toFixed(1)} — overbought, potential reversal`);
      } else {
        insights.push(`RSI(14) = ${rsiVal.toFixed(1)} — neutral zone`);
      }
    }
    const adxRes = adx(candles);
    const adxVal = adxRes.adx[n - 1];
    const pdi = adxRes.plusDI[n - 1];
    const mdi = adxRes.minusDI[n - 1];
    if (adxVal != null) {
      if (adxVal > 25) {
        insights.push(`ADX = ${adxVal.toFixed(1)} — strong trend`);
        if (pdi != null && mdi != null) score += (pdi > mdi ? 20 : -20);
      } else {
        insights.push(`ADX = ${adxVal.toFixed(1)} — weak/no trend`);
      }
    }
    const ar = aroon(candles);
    const arOsc = ar.oscillator[n - 1];
    if (arOsc != null) {
      score += arOsc > 50 ? 15 : arOsc < -50 ? -15 : 0;
      insights.push(`Aroon Osc = ${arOsc.toFixed(0)}`);
    }
    const bias: SubAgentResult["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
    return { type: "momentum", name: "Momentum Agent", bias, confidence: Math.min(100, Math.abs(score) * 1.5 + 20), score, insights };
  },
};

// ---------- Volatility Agent ----------
// TTM Squeeze + Choppiness + ATR
export const volatilityAgent: SubAgent = {
  type: "volatility",
  name: "Volatility Agent",
  description: "TTM Squeeze, Choppiness Index, and ATR-based volatility regime",
  run: (candles) => {
    const n = candles.length;
    const insights: string[] = [];
    let score = 0;
    const sq = ttmSqueeze(candles);
    const isSqueezing = sq.squeezeOn[n - 1];
    const mom = sq.momentum[n - 1];
    if (isSqueezing) {
      insights.push("TTM Squeeze ON — volatility compression, breakout imminent");
      if (mom != null) {
        score += mom > 0 ? 20 : mom < 0 ? -20 : 0;
        insights.push(`Squeeze momentum: ${mom > 0 ? "bullish" : "bearish"}`);
      }
    } else {
      insights.push("TTM Squeeze OFF — volatility expansion in progress");
      if (mom != null) score += mom > 0 ? 10 : mom < 0 ? -10 : 0;
    }
    const ch = choppiness(candles);
    const chVal = ch[n - 1];
    if (chVal != null) {
      if (chVal < 38.2) {
        insights.push(`Choppiness = ${chVal.toFixed(1)} — trending market`);
        score += 10;
      } else if (chVal > 61.8) {
        insights.push(`Choppiness = ${chVal.toFixed(1)} — choppy/range-bound market`);
        score -= 5;
      } else {
        insights.push(`Choppiness = ${chVal.toFixed(1)} — transitional`);
      }
    }
    const atrArr = atr(candles, 14);
    const atrVal = atrArr[n - 1];
    const close = candles.map((c) => c.close);
    const smaClose = sma(close, 50);
    const smaVal = smaClose[n - 1];
    if (atrVal != null && smaVal != null) {
      const atrPct = (atrVal / smaVal) * 100;
      insights.push(`ATR as % of price: ${atrPct.toFixed(2)}%`);
    }
    const bias: SubAgentResult["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
    return { type: "volatility", name: "Volatility Agent", bias, confidence: Math.min(100, Math.abs(score) * 2 + 25), score, insights };
  },
};

// ---------- Trend Agent ----------
// EMA stack + Supertrend composite
export const trendAgent: SubAgent = {
  type: "trend",
  name: "Trend Agent",
  description: "EMA stack (8/21/50/200) + Supertrend trend analysis",
  run: (candles) => {
    const n = candles.length;
    const insights: string[] = [];
    let score = 0;
    const close = candles.map((c) => c.close);
    const e8 = ema(close, 8);
    const e21 = ema(close, 21);
    const e50 = ema(close, 50);
    const e200 = ema(close, 200);
    const last = candles[n - 1].close;
    const e8v = e8[n - 1];
    const e21v = e21[n - 1];
    const e50v = e50[n - 1];
    const e200v = e200[n - 1];
    if (e8v != null && e21v != null) {
      if (e8v > e21v) { score += 15; insights.push("EMA 8 > 21 — short-term bullish"); }
      else { score -= 15; insights.push("EMA 8 < 21 — short-term bearish"); }
    }
    if (e21v != null && e50v != null) {
      if (e21v > e50v) { score += 15; insights.push("EMA 21 > 50 — medium-term bullish"); }
      else { score -= 15; insights.push("EMA 21 < 50 — medium-term bearish"); }
    }
    if (e50v != null && e200v != null) {
      if (e50v > e200v) { score += 20; insights.push("EMA 50 > 200 — long-term bullish (Golden cross zone)"); }
      else { score -= 20; insights.push("EMA 50 < 200 — long-term bearish (Death cross zone)"); }
    }
    if (e200v != null) {
      if (last > e200v) { score += 10; insights.push("Price above EMA 200 — bullish bias"); }
      else { score -= 10; insights.push("Price below EMA 200 — bearish bias"); }
    }
    const st = supertrend(candles);
    const stTrend = st.trend[n - 1];
    score += stTrend * 15;
    insights.push(`Supertrend: ${stTrend > 0 ? "Bullish" : "Bearish"}`);
    const bias: SubAgentResult["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
    return { type: "trend", name: "Trend Agent", bias, confidence: Math.min(100, Math.abs(score) + 25), score, insights };
  },
};

// ---------- Registry ----------
export const ALL_SUB_AGENTS: SubAgent[] = [
  liquidityAgent,
  orderBlockAgent,
  fvgAgent,
  sessionAgent,
  mtfAgent,
  momentumAgent,
  volatilityAgent,
  trendAgent,
];

export function getSubAgent(type: SubAgentType): SubAgent | undefined {
  return ALL_SUB_AGENTS.find((a) => a.type === type);
}

// ---------- Pipeline System ----------
export type PipelineStage = "parallel" | "sequential" | "fan-out" | "fan-out-synthesize";

export interface PipelineStep {
  agents: SubAgentType[];
  stage: PipelineStage;
}

export interface PipelineResult {
  results: SubAgentResult[];
  compositeScore: number;
  compositeBias: "bull" | "bear" | "neutral";
  compositeConfidence: number;
  allInsights: string[];
  totalMs: number;
}

export function runPipeline(
  candles: Candle[],
  steps: PipelineStep[],
  ctx?: SubAgentContext,
): PipelineResult {
  const start = Date.now();
  const results: SubAgentResult[] = [];
  for (const step of steps) {
    const stepResults = step.agents
      .map((t) => getSubAgent(t))
      .filter((a): a is SubAgent => a != null)
      .map((a) => a.run(candles, ctx));
    results.push(...stepResults);
  }
  const compositeScore = results.length > 0 ? results.reduce((a, r) => a + r.score, 0) / results.length : 0;
  const compositeBias: PipelineResult["compositeBias"] =
    compositeScore > 10 ? "bull" : compositeScore < -10 ? "bear" : "neutral";
  const compositeConfidence =
    results.length > 0 ? results.reduce((a, r) => a + r.confidence, 0) / results.length : 0;
  const allInsights = results.flatMap((r) => r.insights);
  return {
    results,
    compositeScore,
    compositeBias,
    compositeConfidence,
    allInsights,
    totalMs: Date.now() - start,
  };
}

// Default pipeline: all agents in parallel
export const DEFAULT_PIPELINE: PipelineStep[] = [
  {
    agents: ["liquidity", "order-block", "fvg", "session", "mtf", "momentum", "volatility", "trend"],
    stage: "parallel",
  },
];

// SMC pipeline: liquidity + order blocks + FVG + MTF
export const SMC_PIPELINE: PipelineStep[] = [
  { agents: ["liquidity", "order-block", "fvg", "mtf"], stage: "fan-out" },
];

// Momentum pipeline: momentum + volatility + trend
export const MOMENTUM_PIPELINE: PipelineStep[] = [
  { agents: ["momentum", "volatility", "trend"], stage: "parallel" },
];

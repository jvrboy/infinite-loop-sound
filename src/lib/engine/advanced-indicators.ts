// Advanced technical indicators — pure math, no I/O.
// Extends the base indicators.ts with less common but powerful tools.
// All inputs are Candle[] or number[] aligned to candle index.

import type { Candle } from "./indicators";
import { ema, sma, atr, trueRange } from "./indicators";

// ---------- Ichimoku Kinko Hyo ----------
export interface IchimokuResult {
  tenkan: (number | null)[];
  kijun: (number | null)[];
  senkouA: (number | null)[];
  senkouB: (number | null)[];
  chikou: (number | null)[];
}

export function ichimoku(
  candles: Candle[],
  tenkanLen = 9,
  kijunLen = 26,
  senkouBLen = 52,
  displacement = 26,
): IchimokuResult {
  const n = candles.length;
  const tenkan: (number | null)[] = new Array(n).fill(null);
  const kijun: (number | null)[] = new Array(n).fill(null);
  const senkouA: (number | null)[] = new Array(n).fill(null);
  const senkouB: (number | null)[] = new Array(n).fill(null);
  const chikou: (number | null)[] = new Array(n).fill(null);

  const donchian = (len: number, i: number): { high: number; low: number } | null => {
    if (i < len - 1) return null;
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - len + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    return { high: hi, low: lo };
  };

  for (let i = 0; i < n; i++) {
    const t = donchian(tenkanLen, i);
    if (t) tenkan[i] = (t.high + t.low) / 2;
    const k = donchian(kijunLen, i);
    if (k) kijun[i] = (k.high + k.low) / 2;
    if (t && k) senkouA[i] = (tenkan[i]! + kijun[i]!) / 2;
    const sb = donchian(senkouBLen, i);
    if (sb) senkouB[i] = (sb.high + sb.low) / 2;
    if (i + displacement < n) chikou[i + displacement] = candles[i].close;
  }

  // Shift senkou lines forward by displacement for display alignment
  const shiftedA: (number | null)[] = new Array(n).fill(null);
  const shiftedB: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i - displacement >= 0) {
      shiftedA[i] = senkouA[i - displacement];
      shiftedB[i] = senkouB[i - displacement];
    }
  }

  return { tenkan, kijun, senkouA: shiftedA, senkouB: shiftedB, chikou };
}

// ---------- Supertrend ----------
export interface SupertrendResult {
  upper: (number | null)[];
  lower: (number | null)[];
  trend: number[]; // 1 = up, -1 = down
  supertrend: (number | null)[];
}

export function supertrend(candles: Candle[], period = 10, multiplier = 3): SupertrendResult {
  const n = candles.length;
  const atrArr = atr(candles.map((c) => c.high), candles.map((c) => c.low), candles.map((c) => c.close), period);
  const upper: (number | null)[] = new Array(n).fill(null);
  const lower: (number | null)[] = new Array(n).fill(null);
  const trend: number[] = new Array(n).fill(1);
  const st: (number | null)[] = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const a = atrArr[i];
    if (a == null) continue;
    const basicUpper = hl2 + multiplier * a;
    const basicLower = hl2 - multiplier * a;
    if (i === 0 || upper[i - 1] == null) {
      upper[i] = basicUpper;
      lower[i] = basicLower;
    } else {
      upper[i] = basicUpper < upper[i - 1]! || candles[i - 1].close > upper[i - 1]! ? basicUpper : upper[i - 1];
      lower[i] = basicLower > lower[i - 1]! || candles[i - 1].close < lower[i - 1]! ? basicLower : lower[i - 1];
    }
    if (i === 0) {
      trend[i] = 1;
      st[i] = lower[i];
    } else {
      if (st[i - 1] === upper[i - 1]) {
        trend[i] = candles[i].close > upper[i]! ? 1 : -1;
      } else {
        trend[i] = candles[i].close < lower[i]! ? -1 : 1;
      }
      st[i] = trend[i] === 1 ? lower[i] : upper[i];
    }
  }
  return { upper, lower, trend, supertrend: st };
}

// ---------- Williams %R ----------
export function williamsR(candles: Candle[], len = 14): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = len - 1; i < n; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - len + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low < ll) ll = candles[j].low;
    }
    const range = hh - ll || 1e-10;
    out[i] = ((hh - candles[i].close) / range) * -100;
  }
  return out;
}

// ---------- Commodity Channel Index (CCI) ----------
export function cci(candles: Candle[], len = 20): (number | null)[] {
  const n = candles.length;
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const smaTp = sma(tp, len);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = len - 1; i < n; i++) {
    if (smaTp[i] == null) continue;
    let dev = 0;
    for (let j = i - len + 1; j <= i; j++) dev += Math.abs(tp[j] - (smaTp[i] as number));
    dev /= len;
    out[i] = dev === 0 ? 0 : (tp[i] - (smaTp[i] as number)) / (0.015 * dev);
  }
  return out;
}

// ---------- ADX / +DI / -DI ----------
export interface ADXResult {
  adx: (number | null)[];
  plusDI: (number | null)[];
  minusDI: (number | null)[];
}

export function adx(candles: Candle[], len = 14): ADXResult {
  const n = candles.length;
  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);
  const tr: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
    tr[i] = trueRange(candles[i], candles[i - 1]);
  }
  // Wilder's smoothing
  const smooth = (arr: number[]): (number | null)[] => {
    const out: (number | null)[] = new Array(n).fill(null);
    if (n < len) return out;
    let sum = 0;
    for (let i = 1; i <= len; i++) sum += arr[i];
    out[len] = sum;
    for (let i = len + 1; i < n; i++) out[i] = (out[i - 1] as number) - (out[i - 1] as number) / len + arr[i];
    return out;
  };
  const trS = smooth(tr);
  const pdmS = smooth(plusDM);
  const mdmS = smooth(minusDM);
  const plusDI: (number | null)[] = new Array(n).fill(null);
  const minusDI: (number | null)[] = new Array(n).fill(null);
  const dx: (number | null)[] = new Array(n).fill(null);
  for (let i = len; i < n; i++) {
    if (trS[i] == null || (trS[i] as number) === 0) continue;
    plusDI[i] = ((pdmS[i] as number) / (trS[i] as number)) * 100;
    minusDI[i] = ((mdmS[i] as number) / (trS[i] as number)) * 100;
    const sum = plusDI[i]! + minusDI[i]!;
    dx[i] = sum === 0 ? 0 : (Math.abs(plusDI[i]! - minusDI[i]!) / sum) * 100;
  }
  const adxArr: (number | null)[] = new Array(n).fill(null);
  if (n >= len * 2) {
    let sum = 0;
    let count = 0;
    for (let i = len; i < len * 2 && i < n; i++) {
      if (dx[i] != null) {
        sum += dx[i] as number;
        count++;
      }
    }
    if (count > 0) adxArr[len * 2 - 1] = sum / count;
    for (let i = len * 2; i < n; i++) {
      if (adxArr[i - 1] == null || dx[i] == null) continue;
      adxArr[i] = ((adxArr[i - 1] as number) * (len - 1) + (dx[i] as number)) / len;
    }
  }
  return { adx: adxArr, plusDI, minusDI };
}

// ---------- On-Balance Volume (OBV) ----------
export function obv(candles: Candle[]): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n === 0) return out;
  out[0] = candles[0].volume ?? 0;
  for (let i = 1; i < n; i++) {
    const v = candles[i].volume ?? 0;
    if (candles[i].close > candles[i - 1].close) out[i] = (out[i - 1] as number) + v;
    else if (candles[i].close < candles[i - 1].close) out[i] = (out[i - 1] as number) - v;
    else out[i] = out[i - 1];
  }
  return out;
}

// ---------- Aroon Up/Down ----------
export interface AroonResult {
  up: (number | null)[];
  down: (number | null)[];
  oscillator: (number | null)[];
}

export function aroon(candles: Candle[], len = 25): AroonResult {
  const n = candles.length;
  const up: (number | null)[] = new Array(n).fill(null);
  const down: (number | null)[] = new Array(n).fill(null);
  const osc: (number | null)[] = new Array(n).fill(null);
  for (let i = len; i < n; i++) {
    let hiIdx = i;
    let loIdx = i;
    for (let j = i - len; j <= i; j++) {
      if (candles[j].high > candles[hiIdx].high) hiIdx = j;
      if (candles[j].low < candles[loIdx].low) loIdx = j;
    }
    up[i] = ((len - (i - hiIdx)) / len) * 100;
    down[i] = ((len - (i - loIdx)) / len) * 100;
    osc[i] = up[i]! - down[i]!;
  }
  return { up, down, oscillator: osc };
}

// ---------- Vortex Indicator ----------
export interface VortexResult {
  viPlus: (number | null)[];
  viMinus: (number | null)[];
}

export function vortex(candles: Candle[], len = 14): VortexResult {
  const n = candles.length;
  const vmPlus: number[] = new Array(n).fill(0);
  const vmMinus: number[] = new Array(n).fill(0);
  const tr: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    vmPlus[i] = Math.abs(candles[i].high - candles[i - 1].low);
    vmMinus[i] = Math.abs(candles[i].low - candles[i - 1].high);
    tr[i] = trueRange(candles[i], candles[i - 1]);
  }
  const viPlus: (number | null)[] = new Array(n).fill(null);
  const viMinus: (number | null)[] = new Array(n).fill(null);
  for (let i = len; i < n; i++) {
    let sumP = 0;
    let sumM = 0;
    let sumTr = 0;
    for (let j = i - len + 1; j <= i; j++) {
      sumP += vmPlus[j];
      sumM += vmMinus[j];
      sumTr += tr[j];
    }
    if (sumTr === 0) continue;
    viPlus[i] = sumP / sumTr;
    viMinus[i] = sumM / sumTr;
  }
  return { viPlus, viMinus };
}

// ---------- TTM Squeeze ----------
export interface TTMSqueezeResult {
  squeezeOn: boolean[];
  bollingerMid: (number | null)[];
  bollingerUpper: (number | null)[];
  bollingerLower: (number | null)[];
  keltnerMid: (number | null)[];
  keltnerUpper: (number | null)[];
  keltnerLower: (number | null)[];
  momentum: (number | null)[];
}

export function ttmSqueeze(
  candles: Candle[],
  bbLen = 20,
  bbMult = 2,
  kcLen = 20,
  kcMult = 1.5,
): TTMSqueezeResult {
  const n = candles.length;
  const close = candles.map((c) => c.close);
  const mid = sma(close, bbLen);
  const dev = (src: number[], m: number, i: number): number => {
    if (i < m - 1) return 0;
    let s = 0;
    for (let j = i - m + 1; j <= i; j++) s += (src[j] - (mid[i] as number)) ** 2;
    return Math.sqrt(s / m);
  };
  const bbUpper: (number | null)[] = new Array(n).fill(null);
  const bbLower: (number | null)[] = new Array(n).fill(null);
  for (let i = bbLen - 1; i < n; i++) {
    const d = dev(close, bbLen, i) * bbMult;
    bbUpper[i] = (mid[i] as number) + d;
    bbLower[i] = (mid[i] as number) - d;
  }
  const atrArr = atr(candles.map((c) => c.high), candles.map((c) => c.low), close, kcLen);
  const kcMid = ema(close, kcLen);
  const kcUpper: (number | null)[] = new Array(n).fill(null);
  const kcLower: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (atrArr[i] == null || kcMid[i] == null) continue;
    kcUpper[i] = (kcMid[i] as number) + kcMult * (atrArr[i] as number);
    kcLower[i] = (kcMid[i] as number) - kcMult * (atrArr[i] as number);
  }
  const squeezeOn: boolean[] = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (bbUpper[i] == null || kcUpper[i] == null) continue;
    squeezeOn[i] = (bbLower[i] as number) > (kcLower[i] as number) && (bbUpper[i] as number) < (kcUpper[i] as number);
  }
  // Linear regression momentum (LR)
  const momentum: (number | null)[] = new Array(n).fill(null);
  for (let i = bbLen - 1; i < n; i++) {
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    for (let j = 0; j < bbLen; j++) {
      const x = j;
      const y = close[i - bbLen + 1 + j];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    const denom = bbLen * sumX2 - sumX * sumX || 1;
    momentum[i] = (bbLen * sumXY - sumX * sumY) / denom;
  }
  return {
    squeezeOn,
    bollingerMid: mid,
    bollingerUpper: bbUpper,
    bollingerLower: bbLower,
    keltnerMid: kcMid,
    keltnerUpper: kcUpper,
    keltnerLower: kcLower,
    momentum,
  };
}

// ---------- Money Flow Index (MFI) ----------
export function mfi(candles: Candle[], len = 14): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n <= len) return out;
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const mf = tp.map((v, i) => v * (candles[i].volume ?? 0));
  for (let i = len; i < n; i++) {
    let pos = 0;
    let neg = 0;
    for (let j = i - len + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) pos += mf[j];
      else if (tp[j] < tp[j - 1]) neg += mf[j];
    }
    const mr = neg === 0 ? 100 : pos / neg;
    out[i] = 100 - 100 / (1 + mr);
  }
  return out;
}

// ---------- Awesome Oscillator ----------
export function awesomeOscillator(candles: Candle[]): (number | null)[] {
  const midprice = candles.map((c) => (c.high + c.low) / 2);
  const fast = sma(midprice, 5);
  const slow = sma(midprice, 34);
  return midprice.map((_, i) => {
    if (fast[i] == null || slow[i] == null) return null;
    return (fast[i] as number) - (slow[i] as number);
  });
}

// ---------- Heikin-Ashi ----------
export function heikinAshi(candles: Candle[]): Candle[] {
  const n = candles.length;
  if (n === 0) return [];
  const out: Candle[] = [];
  let prevOpen = candles[0].open;
  let prevClose = (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;
  out.push({ ...candles[0], open: prevOpen, close: prevClose });
  for (let i = 1; i < n; i++) {
    const haOpen = (prevOpen + prevClose) / 2;
    const haClose = (candles[i].open + candles[i].high + candles[i].low + candles[i].close) / 4;
    const haHigh = Math.max(candles[i].high, haOpen, haClose);
    const haLow = Math.min(candles[i].low, haOpen, haClose);
    out.push({ ...candles[i], open: haOpen, high: haHigh, low: haLow, close: haClose });
    prevOpen = haOpen;
    prevClose = haClose;
  }
  return out;
}

// ---------- Choppiness Index ----------
export function choppiness(candles: Candle[], len = 14): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  const atrArr = atr(candles.map((c) => c.high), candles.map((c) => c.low), candles.map((c) => c.close), 1);
  for (let i = len; i < n; i++) {
    let sumAtr = 0;
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - len + 1; j <= i; j++) {
      if (atrArr[j] != null) sumAtr += atrArr[j] as number;
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low < ll) ll = candles[j].low;
    }
    const range = hh - ll || 1e-10;
    out[i] = (100 * Math.log10(sumAtr / range)) / Math.log10(len);
  }
  return out;
}

// ---------- Keltner Channels ----------
export interface KeltnerResult {
  mid: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

export function keltner(candles: Candle[], len = 20, mult = 2): KeltnerResult {
  const close = candles.map((c) => c.close);
  const mid = ema(close, len);
  const atrArr = atr(candles.map((c) => c.high), candles.map((c) => c.low), close, len);
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (mid[i] == null || atrArr[i] == null) continue;
    upper[i] = (mid[i] as number) + mult * (atrArr[i] as number);
    lower[i] = (mid[i] as number) - mult * (atrArr[i] as number);
  }
  return { mid, upper, lower };
}

// ---------- Donchian Channels ----------
export interface DonchianResult {
  upper: (number | null)[];
  lower: (number | null)[];
  mid: (number | null)[];
}

export function donchian(candles: Candle[], len = 20): DonchianResult {
  const n = candles.length;
  const upper: (number | null)[] = new Array(n).fill(null);
  const lower: (number | null)[] = new Array(n).fill(null);
  const mid: (number | null)[] = new Array(n).fill(null);
  for (let i = len - 1; i < n; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - len + 1; j <= i; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    upper[i] = hi;
    lower[i] = lo;
    mid[i] = (hi + lo) / 2;
  }
  return { upper, lower, mid };
}

// ---------- Parabolic SAR ----------
export function parabolicSAR(candles: Candle[], step = 0.02, maxStep = 0.2): (number | null)[] {
  const n = candles.length;
  if (n < 2) return new Array(n).fill(null);
  const out: (number | null)[] = new Array(n).fill(null);
  let bull = candles[1].close > candles[0].close;
  let sar = bull ? candles[0].low : candles[0].high;
  let ep = bull ? candles[1].high : candles[1].low;
  let af = step;
  out[0] = sar;
  for (let i = 1; i < n; i++) {
    sar = sar + af * (ep - sar);
    if (bull) {
      if (candles[i].low < sar) {
        bull = false;
        sar = ep;
        ep = candles[i].low;
        af = step;
      } else {
        if (candles[i].high > ep) {
          ep = candles[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      if (candles[i].high > sar) {
        bull = true;
        sar = ep;
        ep = candles[i].high;
        af = step;
      } else {
        if (candles[i].low < ep) {
          ep = candles[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }
    out[i] = sar;
  }
  return out;
}

// ---------- Composite Advanced Score ----------
export interface AdvancedScore {
  score: number; // -100..100
  bias: "bull" | "bear" | "neutral";
  signals: { name: string; value: number; signal: "bull" | "bear" | "neutral" }[];
}

export function advancedScore(candles: Candle[]): AdvancedScore {
  const signals: AdvancedScore["signals"] = [];
  const n = candles.length;
  if (n < 60) return { score: 0, bias: "neutral", signals: [] };

  // Ichimoku
  const ich = ichimoku(candles);
  const lastTenkan = ich.tenkan[n - 1];
  const lastKijun = ich.kijun[n - 1];
  if (lastTenkan != null && lastKijun != null) {
    const v = lastTenkan > lastKijun ? 1 : lastTenkan < lastKijun ? -1 : 0;
    signals.push({ name: "Ichimoku TK", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // Supertrend
  const st = supertrend(candles);
  const stTrend = st.trend[n - 1];
  signals.push({ name: "Supertrend", value: stTrend, signal: stTrend > 0 ? "bull" : "bear" });

  // Williams %R
  const wr = williamsR(candles);
  const wrVal = wr[n - 1];
  if (wrVal != null) {
    const v = wrVal < -80 ? 1 : wrVal > -20 ? -1 : 0;
    signals.push({ name: "Williams %R", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // CCI
  const cciArr = cci(candles);
  const cciVal = cciArr[n - 1];
  if (cciVal != null) {
    const v = cciVal < -100 ? 1 : cciVal > 100 ? -1 : 0;
    signals.push({ name: "CCI", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // ADX
  const adxRes = adx(candles);
  const pdi = adxRes.plusDI[n - 1];
  const mdi = adxRes.minusDI[n - 1];
  if (pdi != null && mdi != null) {
    const v = pdi > mdi ? 1 : pdi < mdi ? -1 : 0;
    signals.push({ name: "ADX DI", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // OBV trend
  const obvArr = obv(candles);
  const obvNow = obvArr[n - 1];
  const obvPrev = obvArr[n - 5];
  if (obvNow != null && obvPrev != null) {
    const v = obvNow > obvPrev ? 1 : obvNow < obvPrev ? -1 : 0;
    signals.push({ name: "OBV Trend", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // Aroon
  const ar = aroon(candles);
  const arOsc = ar.oscillator[n - 1];
  if (arOsc != null) {
    const v = arOsc > 0 ? 1 : arOsc < 0 ? -1 : 0;
    signals.push({ name: "Aroon Osc", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // Vortex
  const vt = vortex(candles);
  const vp = vt.viPlus[n - 1];
  const vm = vt.viMinus[n - 1];
  if (vp != null && vm != null) {
    const v = vp > vm ? 1 : vp < vm ? -1 : 0;
    signals.push({ name: "Vortex", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // TTM Squeeze momentum
  const sq = ttmSqueeze(candles);
  const mom = sq.momentum[n - 1];
  if (mom != null) {
    const v = mom > 0 ? 1 : mom < 0 ? -1 : 0;
    signals.push({ name: "TTM Momentum", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // MFI
  const mfiArr = mfi(candles);
  const mfiVal = mfiArr[n - 1];
  if (mfiVal != null) {
    const v = mfiVal < 20 ? 1 : mfiVal > 80 ? -1 : 0;
    signals.push({ name: "MFI", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // Awesome Oscillator
  const ao = awesomeOscillator(candles);
  const aoVal = ao[n - 1];
  if (aoVal != null) {
    const v = aoVal > 0 ? 1 : aoVal < 0 ? -1 : 0;
    signals.push({ name: "Awesome Osc", value: v, signal: v > 0 ? "bull" : v < 0 ? "bear" : "neutral" });
  }

  // Choppiness
  const ch = choppiness(candles);
  const chVal = ch[n - 1];
  if (chVal != null) {
    const v = chVal < 38.2 ? 1 : chVal > 61.8 ? 0 : 0;
    signals.push({ name: "Choppiness", value: v, signal: v > 0 ? "bull" : "neutral" });
  }

  const score = signals.reduce((a, s) => a + (s.value * 100) / signals.length, 0);
  const bias: AdvancedScore["bias"] = score > 10 ? "bull" : score < -10 ? "bear" : "neutral";
  return { score, bias, signals };
}

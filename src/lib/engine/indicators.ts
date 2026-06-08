// Pure indicator math. All inputs/outputs are number arrays aligned to candle index.

export interface Candle {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export const sma = (src: number[], len: number): (number | null)[] => {
  const out: (number | null)[] = new Array(src.length).fill(null);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i];
    if (i >= len) sum -= src[i - len];
    if (i >= len - 1) out[i] = sum / len;
  }
  return out;
};

export const ema = (src: number[], len: number): (number | null)[] => {
  const out: (number | null)[] = new Array(src.length).fill(null);
  if (src.length < len) return out;
  const k = 2 / (len + 1);
  let prev = src.slice(0, len).reduce((a, b) => a + b, 0) / len;
  out[len - 1] = prev;
  for (let i = len; i < src.length; i++) {
    prev = src[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
};

export const rsi = (close: number[], len = 14): (number | null)[] => {
  const out: (number | null)[] = new Array(close.length).fill(null);
  if (close.length <= len) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= len; i++) {
    const d = close[i] - close[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgG = gain / len, avgL = loss / len;
  out[len] = 100 - 100 / (1 + (avgL === 0 ? 100 : avgG / avgL));
  for (let i = len + 1; i < close.length; i++) {
    const d = close[i] - close[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgG = (avgG * (len - 1) + g) / len;
    avgL = (avgL * (len - 1) + l) / len;
    out[i] = 100 - 100 / (1 + (avgL === 0 ? 100 : avgG / avgL));
  }
  return out;
};

export const macd = (close: number[], fast = 12, slow = 26, sig = 9) => {
  const ef = ema(close, fast);
  const es = ema(close, slow);
  const line = close.map((_, i) => (ef[i] != null && es[i] != null ? (ef[i] as number) - (es[i] as number) : null));
  const valid = line.map(v => v ?? 0);
  const signal = ema(valid, sig).map((v, i) => (line[i] == null ? null : v));
  const hist = line.map((v, i) => (v != null && signal[i] != null ? v - (signal[i] as number) : null));
  return { line, signal, hist };
};

export const stoch = (candles: Candle[], kLen = 14, kSmooth = 3, dSmooth = 3) => {
  const k: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = kLen - 1; i < candles.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - kLen + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low < ll) ll = candles[j].low;
    }
    k[i] = hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100;
  }
  const kArr = k.map(v => v ?? 0);
  const kS = sma(kArr, kSmooth).map((v, i) => (k[i] == null ? null : v));
  const dS = sma(kS.map(v => v ?? 0), dSmooth).map((v, i) => (kS[i] == null ? null : v));
  return { k: kS, d: dS };
};

// Relative Vigor Index (Larry Williams)
export const rvi = (candles: Candle[], len = 10) => {
  const num: number[] = [], den: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < 3) { num.push(0); den.push(0); continue; }
    const a = candles[i].close - candles[i].open;
    const b = candles[i - 1].close - candles[i - 1].open;
    const c = candles[i - 2].close - candles[i - 2].open;
    const d = candles[i - 3].close - candles[i - 3].open;
    const e = candles[i].high - candles[i].low;
    const f = candles[i - 1].high - candles[i - 1].low;
    const g = candles[i - 2].high - candles[i - 2].low;
    const h = candles[i - 3].high - candles[i - 3].low;
    num.push((a + 2 * b + 2 * c + d) / 6);
    den.push((e + 2 * f + 2 * g + h) / 6);
  }
  const sN = sma(num, len);
  const sD = sma(den, len);
  const rviLine = sN.map((v, i) => (v != null && sD[i] != null && (sD[i] as number) !== 0 ? (v as number) / (sD[i] as number) : null));
  const valid = rviLine.map(v => v ?? 0);
  const signal: (number | null)[] = new Array(rviLine.length).fill(null);
  for (let i = 3; i < rviLine.length; i++) {
    if (rviLine[i] == null || rviLine[i - 1] == null || rviLine[i - 2] == null || rviLine[i - 3] == null) continue;
    signal[i] = (valid[i] + 2 * valid[i - 1] + 2 * valid[i - 2] + valid[i - 3]) / 6;
  }
  return { rvi: rviLine, signal };
};

export const atr = (candles: Candle[], len = 14): (number | null)[] => {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { tr.push(candles[i].high - candles[i].low); continue; }
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < len) return out;
  let prev = tr.slice(0, len).reduce((a, b) => a + b, 0) / len;
  out[len - 1] = prev;
  for (let i = len; i < candles.length; i++) {
    prev = (prev * (len - 1) + tr[i]) / len;
    out[i] = prev;
  }
  return out;
};

export const obv = (candles: Candle[]): number[] => {
  const out: number[] = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const v = candles[i].volume ?? 1;
    if (candles[i].close > candles[i - 1].close) out[i] = out[i - 1] + v;
    else if (candles[i].close < candles[i - 1].close) out[i] = out[i - 1] - v;
    else out[i] = out[i - 1];
  }
  return out;
};

// Bollinger Bands: returns mid (SMA), upper, lower, and bandwidth.
// Bandwidth squeeze = bandwidth at lowest 20-bar percentile → breakout setup.
export const bbands = (close: number[], len = 20, mult = 2) => {
  const mid = sma(close, len);
  const upper: (number | null)[] = new Array(close.length).fill(null);
  const lower: (number | null)[] = new Array(close.length).fill(null);
  const bandwidth: (number | null)[] = new Array(close.length).fill(null);
  for (let i = len - 1; i < close.length; i++) {
    const m = mid[i] as number;
    let s = 0;
    for (let j = i - len + 1; j <= i; j++) s += (close[j] - m) ** 2;
    const sd = Math.sqrt(s / len);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
    bandwidth[i] = (upper[i]! - lower[i]!) / m;
  }
  return { mid, upper, lower, bandwidth };
};

// Wilder's ADX with +DI / -DI. ADX > 25 = trending, > 40 = strong trend.
export const adx = (candles: Candle[], len = 14) => {
  const n = candles.length;
  const tr: number[] = new Array(n).fill(0);
  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const upMove = h - candles[i - 1].high;
    const downMove = candles[i - 1].low - l;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }
  const wilder = (src: number[]): (number | null)[] => {
    const out: (number | null)[] = new Array(n).fill(null);
    if (n <= len) return out;
    let s = 0;
    for (let i = 1; i <= len; i++) s += src[i];
    out[len] = s;
    for (let i = len + 1; i < n; i++) out[i] = (out[i - 1] as number) - (out[i - 1] as number) / len + src[i];
    return out;
  };
  const trS = wilder(tr), pdmS = wilder(plusDM), mdmS = wilder(minusDM);
  const plusDI: (number | null)[] = new Array(n).fill(null);
  const minusDI: (number | null)[] = new Array(n).fill(null);
  const dx: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (trS[i] == null || (trS[i] as number) === 0) continue;
    plusDI[i] = ((pdmS[i] as number) / (trS[i] as number)) * 100;
    minusDI[i] = ((mdmS[i] as number) / (trS[i] as number)) * 100;
    const sum = (plusDI[i] as number) + (minusDI[i] as number);
    if (sum > 0) dx[i] = (Math.abs((plusDI[i] as number) - (minusDI[i] as number)) / sum) * 100;
  }
  // Smooth DX with Wilder over `len`
  const adxOut: (number | null)[] = new Array(n).fill(null);
  let firstIdx = -1;
  for (let i = 0; i < n; i++) if (dx[i] != null) { firstIdx = i; break; }
  if (firstIdx >= 0 && n - firstIdx > len) {
    let s = 0;
    for (let i = firstIdx; i < firstIdx + len; i++) s += dx[i] as number;
    adxOut[firstIdx + len - 1] = s / len;
    for (let i = firstIdx + len; i < n; i++) {
      adxOut[i] = ((adxOut[i - 1] as number) * (len - 1) + (dx[i] as number)) / len;
    }
  }
  return { adx: adxOut, plusDI, minusDI };
};

// Bullish/bearish engulfing on the last closed candle vs the prior candle.
export const engulfing = (candles: Candle[]): "bull" | "bear" | null => {
  if (candles.length < 2) return null;
  const a = candles[candles.length - 2];
  const b = candles[candles.length - 1];
  const aBear = a.close < a.open, aBull = a.close > a.open;
  const bBull = b.close > b.open, bBear = b.close < b.open;
  if (aBear && bBull && b.close >= a.open && b.open <= a.close) return "bull";
  if (aBull && bBear && b.open >= a.close && b.close <= a.open) return "bear";
  return null;
};

// Pin bar (hammer / shooting star) on the last candle.
export const pinBar = (candles: Candle[]): "bull" | "bear" | null => {
  if (candles.length < 1) return null;
  const c = candles[candles.length - 1];
  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  if (range === 0) return null;
  const upperWick = c.high - Math.max(c.close, c.open);
  const lowerWick = Math.min(c.close, c.open) - c.low;
  if (body / range > 0.4) return null; // body must be small
  if (lowerWick > body * 2 && upperWick < body) return "bull";
  if (upperWick > body * 2 && lowerWick < body) return "bear";
  return null;
};

// ── Additional confluence tools ─────────────────────────────────────────

// Williams %R
export const williamsR = (candles: Candle[], len = 14): (number | null)[] => {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = len - 1; i < candles.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - len + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low < ll) ll = candles[j].low;
    }
    out[i] = hh === ll ? -50 : ((hh - candles[i].close) / (hh - ll)) * -100;
  }
  return out;
};

// Commodity Channel Index
export const cci = (candles: Candle[], len = 20): (number | null)[] => {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  for (let i = len - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - len + 1; j <= i; j++) sum += tp[j];
    const ma = sum / len;
    let md = 0;
    for (let j = i - len + 1; j <= i; j++) md += Math.abs(tp[j] - ma);
    md /= len;
    out[i] = md === 0 ? 0 : (tp[i] - ma) / (0.015 * md);
  }
  return out;
};

// Money Flow Index
export const mfi = (candles: Candle[], len = 14): (number | null)[] => {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  const flow = candles.map((c, i) => tp[i] * (c.volume ?? 1));
  for (let i = len; i < candles.length; i++) {
    let pos = 0, neg = 0;
    for (let j = i - len + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) pos += flow[j];
      else if (tp[j] < tp[j - 1]) neg += flow[j];
    }
    out[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
  }
  return out;
};

// VWAP (rolling, since session reset is unknown for forex)
export const vwap = (candles: Candle[], len = 20): (number | null)[] => {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = len - 1; i < candles.length; i++) {
    let pv = 0, vv = 0;
    for (let j = i - len + 1; j <= i; j++) {
      const v = candles[j].volume ?? 1;
      const tp = (candles[j].high + candles[j].low + candles[j].close) / 3;
      pv += tp * v; vv += v;
    }
    out[i] = vv === 0 ? null : pv / vv;
  }
  return out;
};

// Supertrend — returns trend (+1 / -1) and line value.
export const supertrend = (candles: Candle[], len = 10, mult = 3) => {
  const a = atr(candles, len);
  const trend: (1 | -1 | null)[] = new Array(candles.length).fill(null);
  const line: (number | null)[] = new Array(candles.length).fill(null);
  let prevUpper = 0, prevLower = 0, prevTrend: 1 | -1 = 1;
  for (let i = 0; i < candles.length; i++) {
    const _a = a[i];
    if (_a == null) continue;
    const hl2 = (candles[i].high + candles[i].low) / 2;
    let upper = hl2 + mult * _a;
    let lower = hl2 - mult * _a;
    if (i > 0 && a[i - 1] != null) {
      upper = candles[i - 1].close > prevUpper ? Math.min(upper, prevUpper) : upper;
      lower = candles[i - 1].close < prevLower ? Math.max(lower, prevLower) : lower;
    }
    let t: 1 | -1 = prevTrend;
    if (candles[i].close > prevUpper) t = 1;
    else if (candles[i].close < prevLower) t = -1;
    trend[i] = t;
    line[i] = t === 1 ? lower : upper;
    prevUpper = upper; prevLower = lower; prevTrend = t;
  }
  return { trend, line };
};

// Parabolic SAR (simplified)
export const psar = (candles: Candle[], step = 0.02, max = 0.2): (number | null)[] => {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < 2) return out;
  let bull = candles[1].close > candles[0].close;
  let af = step;
  let ep = bull ? candles[0].high : candles[0].low;
  let sar = bull ? candles[0].low : candles[0].high;
  out[0] = sar;
  for (let i = 1; i < candles.length; i++) {
    sar = sar + af * (ep - sar);
    if (bull) {
      if (candles[i].low < sar) { bull = false; sar = ep; ep = candles[i].low; af = step; }
      else { if (candles[i].high > ep) { ep = candles[i].high; af = Math.min(af + step, max); } }
    } else {
      if (candles[i].high > sar) { bull = true; sar = ep; ep = candles[i].high; af = step; }
      else { if (candles[i].low < ep) { ep = candles[i].low; af = Math.min(af + step, max); } }
    }
    out[i] = sar;
  }
  return out;
};

// Ichimoku conversion + base lines (kijun/tenkan only — most useful for confluence)
export const ichimoku = (candles: Candle[], conv = 9, base = 26) => {
  const hh = (i: number, n: number) => { let v = -Infinity; for (let j = i - n + 1; j <= i; j++) if (candles[j].high > v) v = candles[j].high; return v; };
  const ll = (i: number, n: number) => { let v = Infinity; for (let j = i - n + 1; j <= i; j++) if (candles[j].low < v) v = candles[j].low; return v; };
  const tenkan: (number | null)[] = new Array(candles.length).fill(null);
  const kijun: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (i >= conv - 1) tenkan[i] = (hh(i, conv) + ll(i, conv)) / 2;
    if (i >= base - 1) kijun[i] = (hh(i, base) + ll(i, base)) / 2;
  }
  return { tenkan, kijun };
};

// Doji + Three-Soldiers / Black-Crows quick classifiers.
export const doji = (candles: Candle[]): boolean => {
  if (!candles.length) return false;
  const c = candles[candles.length - 1];
  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  return range > 0 && body / range < 0.1;
};

export const threeBars = (candles: Candle[]): "bull" | "bear" | null => {
  if (candles.length < 3) return null;
  const [a, b, c] = candles.slice(-3);
  const allUp = a.close > a.open && b.close > b.open && c.close > c.open && c.close > b.close && b.close > a.close;
  const allDn = a.close < a.open && b.close < b.open && c.close < c.open && c.close < b.close && b.close < a.close;
  return allUp ? "bull" : allDn ? "bear" : null;
};

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { deriv, ASSETS_BY_CLASS, TIMEFRAMES, displayPair, type AssetClass, type TF } from "@/lib/engine/deriv";
import { analyze } from "@/lib/engine/signal";
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { LineChart as IconChart, Loader2, Pencil, X, Check, Radio } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveValidation, validationStats } from "@/lib/validations.functions";
import { toast } from "sonner";
import { useSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/chart")({
  head: () => ({
    meta: [
      { title: "Chart View — DivergenceIQ" },
      { name: "description", content: "Real candlestick chart with EMA overlays, oscillator panels, and a manual divergence drawing tool." },
    ],
  }),
  component: ChartPage,
});

type Pivot = { time: UTCTimestamp; price: number };
type DivOsc = "rsi" | "macd" | "stoch";

function ChartPage() {
  const [pair, setPair] = useState("frxEURUSD");
  const [tf, setTf] = useState<TF>("H1");
  const [candles, setCandles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const saveVal = useServerFn(saveValidation);
  const getStats = useServerFn(validationStats);
  const [stats, setStats] = useState<any>(null);
  const { settings, update } = useSettings();

  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);
  const stochRef = useRef<HTMLDivElement>(null);

  const chartsRef = useRef<{
    price?: IChartApi; rsi?: IChartApi; macd?: IChartApi; stoch?: IChartApi;
    candle?: ISeriesApi<"Candlestick">; ema21?: ISeriesApi<"Line">; ema50?: ISeriesApi<"Line">; ema200?: ISeriesApi<"Line">;
    rsiLine?: ISeriesApi<"Line">; macdHist?: ISeriesApi<"Histogram">; stochLine?: ISeriesApi<"Line">;
    drawSeries?: ISeriesApi<"Line">; oscDrawSeries?: ISeriesApi<"Line">;
  }>({});

  // manual divergence drawing
  const [drawMode, setDrawMode] = useState(false);
  const [drawOsc, setDrawOsc] = useState<DivOsc>("rsi");
  const [pricePivots, setPricePivots] = useState<Pivot[]>([]);
  const [oscPivots, setOscPivots] = useState<Pivot[]>([]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    setLoading(true);
    deriv.connect().then(async () => {
      try {
        const c = await deriv.getCandles(pair, tf, 400);
        setCandles(c);
        setLivePrice(c[c.length - 1]?.close ?? null);
        setPricePivots([]); setOscPivots([]);
      } finally { setLoading(false); }
      unsub = deriv.subscribeTicks(pair, t => {
        setLivePrice(t.quote);
        if (!settings.liveTickRescan) return;
        // Update the last candle's OHLC in-place to drive realtime re-analysis
        setCandles(prev => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];
          const updated = {
            ...last,
            close: t.quote,
            high: Math.max(last.high, t.quote),
            low: Math.min(last.low, t.quote),
          };
          return [...prev.slice(0, -1), updated];
        });
      });
    });
    return () => { if (unsub) unsub(); };
  }, [pair, tf, settings.liveTickRescan]);

  useEffect(() => { getStats().then(setStats).catch(() => {}); }, []);

  const submitValidation = async (isValid: boolean) => {
    if (!drawVerdict || pricePivots.length < 2 || oscPivots.length < 2) return;
    try {
      await saveVal({ data: {
        pair, timeframe: tf, oscillator: drawOsc,
        divType: drawVerdict.type, isValid,
        pricePivots: pricePivots.map(p => ({ time: Number(p.time), price: p.price })),
        oscPivots: oscPivots.map(p => ({ time: Number(p.time), price: p.price })),
      }});
      toast.success(`Marked ${isValid ? "VALID" : "INVALID"} — recorded`);
      const s = await getStats(); setStats(s);
      setPricePivots([]); setOscPivots([]);
    } catch (e: any) { toast.error(e.message); }
  };

  const a = useMemo(() => candles.length > 50 ? analyze(pair, tf, candles) : null, [candles, pair, tf]);

  // create charts once
  useEffect(() => {
    if (!priceRef.current || !rsiRef.current || !macdRef.current || !stochRef.current) return;
    const opts = {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8", fontSize: 10 },
      grid: { vertLines: { color: "rgba(148,163,184,0.05)" }, horzLines: { color: "rgba(148,163,184,0.06)" } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(148,163,184,0.15)" },
      rightPriceScale: { borderColor: "rgba(148,163,184,0.15)" },
      crosshair: { mode: 0 },
    } as const;

    const price = createChart(priceRef.current, { ...opts, height: 380 });
    const candle = price.addSeries(CandlestickSeries, { upColor: "#10b981", downColor: "#ef4444", borderUpColor: "#10b981", borderDownColor: "#ef4444", wickUpColor: "#10b981", wickDownColor: "#ef4444" });
    const ema21 = price.addSeries(LineSeries, { color: "#10b981", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ema50 = price.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ema200 = price.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const drawSeries = price.addSeries(LineSeries, { color: "#a855f7", lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });

    const rsi = createChart(rsiRef.current, { ...opts, height: 110 });
    const rsiLine = rsi.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, priceLineVisible: false });
    const macd = createChart(macdRef.current, { ...opts, height: 110 });
    const macdHist = macd.addSeries(HistogramSeries, { color: "#f59e0b", priceLineVisible: false });
    const stoch = createChart(stochRef.current, { ...opts, height: 110 });
    const stochLine = stoch.addSeries(LineSeries, { color: "#10b981", lineWidth: 1, priceLineVisible: false });

    chartsRef.current = { price, rsi, macd, stoch, candle, ema21, ema50, ema200, rsiLine, macdHist, stochLine, drawSeries };

    const ro = new ResizeObserver(() => {
      price.applyOptions({ width: priceRef.current!.clientWidth });
      rsi.applyOptions({ width: rsiRef.current!.clientWidth });
      macd.applyOptions({ width: macdRef.current!.clientWidth });
      stoch.applyOptions({ width: stochRef.current!.clientWidth });
    });
    ro.observe(priceRef.current);

    return () => { ro.disconnect(); price.remove(); rsi.remove(); macd.remove(); stoch.remove(); };
  }, []);

  // feed data
  useEffect(() => {
    const cr = chartsRef.current;
    if (!a || !cr.candle) return;
    const cd = a.candles.map(c => ({ time: c.epoch as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }));
    cr.candle.setData(cd);
    const lineFrom = (arr: (number | null)[]) => a.candles.map((c, i) => arr[i] != null ? { time: c.epoch as UTCTimestamp, value: arr[i] as number } : null).filter(Boolean) as { time: UTCTimestamp; value: number }[];
    cr.ema21!.setData(lineFrom(a.ind.ema21));
    cr.ema50!.setData(lineFrom(a.ind.ema50));
    cr.ema200!.setData(lineFrom(a.ind.ema200));
    cr.rsiLine!.setData(lineFrom(a.ind.rsi));
    cr.macdHist!.setData(a.candles.map((c, i) => a.ind.macd.hist[i] != null ? { time: c.epoch as UTCTimestamp, value: a.ind.macd.hist[i] as number, color: (a.ind.macd.hist[i] as number) >= 0 ? "#10b981" : "#ef4444" } : null).filter(Boolean) as any);
    cr.stochLine!.setData(lineFrom(a.ind.stoch.k));

    if (a.trade) {
      cr.candle!.createPriceLine({ price: a.trade.entry, color: "#94a3b8", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "Entry" });
      cr.candle!.createPriceLine({ price: a.trade.sl, color: "#ef4444", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "SL" });
      cr.candle!.createPriceLine({ price: a.trade.tp1, color: "#10b981", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "TP1" });
      cr.candle!.createPriceLine({ price: a.trade.tp2, color: "#10b981", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "TP2" });
      cr.candle!.createPriceLine({ price: a.trade.tp3, color: "#10b981", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "TP3" });
    }
    cr.price!.timeScale().fitContent();
  }, [a]);

  // attach click handlers for drawing
  useEffect(() => {
    const cr = chartsRef.current;
    if (!cr.price || !a) return;
    const oscChart = drawOsc === "rsi" ? cr.rsi : drawOsc === "macd" ? cr.macd : cr.stoch;
    const oscSeries = drawOsc === "rsi" ? cr.rsiLine : drawOsc === "macd" ? cr.macdHist : cr.stochLine;
    if (!oscChart || !oscSeries) return;

    const onPrice = (param: any) => {
      if (!drawMode || !param.point || !param.time) return;
      const price = cr.candle!.coordinateToPrice(param.point.y);
      if (price == null) return;
      setPricePivots(p => [...p, { time: param.time as UTCTimestamp, price: price as number }].slice(-2));
    };
    const onOsc = (param: any) => {
      if (!drawMode || !param.point || !param.time) return;
      const v = oscSeries.coordinateToPrice(param.point.y);
      if (v == null) return;
      setOscPivots(p => [...p, { time: param.time as UTCTimestamp, price: v as number }].slice(-2));
    };
    cr.price.subscribeClick(onPrice);
    oscChart.subscribeClick(onOsc);
    return () => { cr.price?.unsubscribeClick(onPrice); oscChart.unsubscribeClick(onOsc); };
  }, [drawMode, drawOsc, a]);

  // render drawn divergence line on price
  useEffect(() => {
    const cr = chartsRef.current;
    if (!cr.drawSeries) return;
    if (pricePivots.length < 2) cr.drawSeries.setData([]);
    else cr.drawSeries.setData(pricePivots.map(p => ({ time: p.time, value: p.price })).sort((a, b) => (a.time as number) - (b.time as number)));
  }, [pricePivots]);

  // verdict from drawn pivots
  const drawVerdict = useMemo(() => {
    if (pricePivots.length < 2 || oscPivots.length < 2) return null;
    const [pA, pB] = pricePivots[0].time < pricePivots[1].time ? pricePivots : [pricePivots[1], pricePivots[0]];
    const [oA, oB] = oscPivots[0].time < oscPivots[1].time ? oscPivots : [oscPivots[1], oscPivots[0]];
    const priceUp = pB.price > pA.price;
    const oscUp = oB.price > oA.price;
    if (priceUp && !oscUp) return { type: "Regular Bearish Divergence", dir: "SELL" };
    if (!priceUp && oscUp) return { type: "Regular Bullish Divergence", dir: "BUY" };
    if (priceUp && oscUp && oB.price < oA.price * 1.05) return { type: "Hidden Bearish Divergence", dir: "SELL" };
    if (!priceUp && !oscUp) return { type: "Hidden Bullish Divergence", dir: "BUY" };
    return { type: "No clear divergence", dir: null };
  }, [pricePivots, oscPivots]);

  const last = a?.candles[a.candles.length - 1];
  const prev = a?.candles[a.candles.length - 2];
  const change = last && prev ? last.close - prev.close : 0;
  const changePct = last && prev ? (change / prev.close) * 100 : 0;

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <IconChart className="w-6 h-6 text-primary" />
            <select value={pair} onChange={e => setPair(e.target.value)} className="bg-input border border-border rounded px-2 py-1 text-lg font-bold font-mono">
              {(Object.keys(ASSETS_BY_CLASS) as AssetClass[]).map(c => (
                <optgroup key={c} label={c.toUpperCase()}>
                  {ASSETS_BY_CLASS[c].map(p => <option key={p.symbol} value={p.symbol}>{p.display}</option>)}
                </optgroup>
              ))}
            </select>
            <span className="text-2xl font-mono font-bold">{livePrice?.toFixed(5) ?? "—"}</span>
            <span className={`text-sm font-mono ${change >= 0 ? "text-bull" : "text-bear"}`}>
              {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(5)} ({changePct.toFixed(2)}%)
            </span>
          </div>
          <div className="flex gap-1 bg-card border border-border rounded p-1">
            {TIMEFRAMES.map(t => (
              <button key={t} onClick={() => setTf(t)}
                className={`px-2.5 py-1 rounded text-xs font-mono ${tf === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="rounded border border-border bg-card p-3 flex flex-wrap items-center gap-3 text-xs">
          <Button size="sm" variant={drawMode ? "default" : "outline"} onClick={() => setDrawMode(d => !d)} className="h-8">
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> {drawMode ? "Drawing ON" : "Manual Divergence"}
          </Button>
          <span className="text-muted-foreground">Oscillator:</span>
          <div className="flex gap-1">
            {(["rsi","macd","stoch"] as DivOsc[]).map(o => (
              <button key={o} onClick={() => setDrawOsc(o)} className={`px-2 py-1 rounded font-mono uppercase ${drawOsc === o ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{o}</button>
            ))}
          </div>
          <span className="text-muted-foreground">Click 2 pivots on <b>price</b> + 2 on <b>{drawOsc.toUpperCase()}</b>.</span>
          <span className="font-mono">Price: {pricePivots.length}/2 · Osc: {oscPivots.length}/2</span>
          <Button size="sm" variant="ghost" onClick={() => { setPricePivots([]); setOscPivots([]); }} className="h-7 ml-auto">
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        </div>

        {drawVerdict && (
          <div className={`rounded border px-3 py-2 text-sm flex flex-wrap items-center gap-2 ${drawVerdict.dir === "BUY" ? "border-bull/40 bg-bull/10 text-bull" : drawVerdict.dir === "SELL" ? "border-bear/40 bg-bear/10 text-bear" : "border-border bg-card text-muted-foreground"}`}>
            <span>✏️ Detected: <b>{drawVerdict.type}</b>{drawVerdict.dir && <> → suggests <b>{drawVerdict.dir}</b></>}</span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 border-bull/40 text-bull hover:bg-bull/10" onClick={() => submitValidation(true)}>
                <Check className="w-3.5 h-3.5 mr-1" /> Valid
              </Button>
              <Button size="sm" variant="outline" className="h-7 border-bear/40 text-bear hover:bg-bear/10" onClick={() => submitValidation(false)}>
                <X className="w-3.5 h-3.5 mr-1" /> Invalid
              </Button>
            </div>
          </div>
        )}

        <div className="rounded border border-border bg-card px-3 py-2 text-xs flex flex-wrap items-center gap-3">
          <button onClick={() => update({ liveTickRescan: !settings.liveTickRescan })}
            className={`flex items-center gap-1.5 px-2 py-1 rounded font-mono ${settings.liveTickRescan ? "bg-bull/15 text-bull" : "bg-muted text-muted-foreground"}`}>
            <Radio className={`w-3 h-3 ${settings.liveTickRescan ? "animate-pulse" : ""}`} /> Live Rescan: {settings.liveTickRescan ? "ON" : "OFF"}
          </button>
          {stats && (
            <span className="font-mono text-muted-foreground">
              Validation accuracy: <span className="text-foreground font-bold">{stats.accuracy}%</span> · {stats.valid}/{stats.total} valid
              {stats.byOsc && Object.keys(stats.byOsc).length > 0 && (
                <> · {Object.entries(stats.byOsc).map(([k, v]: any) => `${k}:${v.valid}/${v.valid + v.invalid}`).join(" ")}</>
              )}
            </span>
          )}
        </div>

        {loading && <div className="text-muted-foreground text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading candles…</div>}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{displayPair(pair)} · {tf} · Candles + EMA21/50/200</div>
          <div ref={priceRef} />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Panel title="RSI (14)"><div ref={rsiRef} /></Panel>
          <Panel title="MACD Histogram"><div ref={macdRef} /></Panel>
          <Panel title="Stochastic %K"><div ref={stochRef} /></Panel>
        </div>

        {a && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs">
              <span className="text-muted-foreground">Score: <span className="text-foreground font-bold">{a.scorePct}/100</span></span>
              <span className="text-muted-foreground">Direction: <span className={a.direction === "BUY" ? "text-bull" : "text-bear"}>{a.direction ?? "—"}</span></span>
              <span className="text-muted-foreground">Auto Divergences: <span className="text-foreground">{a.divergences.map(d => d.name).join(", ") || "none"}</span></span>
              <span className="text-muted-foreground">HTF Bias: <span className={a.trendBias === "BUY" ? "text-bull" : "text-bear"}>{a.trendBias}</span></span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{title}</div>
      {children}
    </div>
  );
}

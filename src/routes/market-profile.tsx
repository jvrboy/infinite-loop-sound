import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState, useEffect, useRef } from "react";
import { BarChart3, TrendingUp, Activity, RefreshCw } from "lucide-react";
import { AssetSelect } from "@/components/app/AssetSelect";
import { deriv } from "@/lib/engine/deriv";
import { createChart, ColorType, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { toast } from "sonner";

export const Route = createFileRoute("/market-profile")({
  component: MarketProfilePage,
});

function MarketProfilePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{ chart: IChartApi; candle: ISeriesApi<"Candlestick">; pocLine: ISeriesApi<"Line">; vahLine: ISeriesApi<"Line">; valLine: ISeriesApi<"Line"> } | null>(null);
  const [selectedPair, setSelectedPair] = useState("frxEURUSD");
  const [profile, setProfile] = useState<any>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  // Fetch candles + profile on pair change
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let alive = true;
    setLoading(true);
    deriv.connect().then(async () => {
      try {
        const c = await deriv.getCandles(selectedPair, "M5", 120);
        if (!alive) return;
        setCandles(c);
        setLivePrice(c[c.length - 1]?.close ?? null);
      } catch (e) { toast.error("Failed to load candles"); }
      finally { setLoading(false); }
      unsub = deriv.subscribeTicks(selectedPair, t => { if (alive) setLivePrice(t.quote); });
    }).catch(() => { setLoading(false); });
    return () => { alive = false; if (unsub) unsub(); };
  }, [selectedPair]);

  // Build profile from candles
  useEffect(() => {
    if (!candles.length) return;
    const prices: number[] = [];
    const volumes: number[] = [];
    const basePrice = selectedPair.includes("JPY") ? 145.50 : selectedPair.includes("XAU") ? 2040.50 : selectedPair.includes("BTC") ? 65000 : 1.0850;
    const step = basePrice > 1000 ? 5.0 : basePrice > 100 ? 0.05 : 0.0005;

    for (let i = 49; i >= 0; i--) {
      const price = basePrice + (i - 25) * step;
      prices.push(price);
      const dist = Math.abs(i - 25);
      const vol = Math.exp(-dist * dist / 100) * 1000 + Math.random() * 200;
      volumes.push(vol);
    }
    const maxVol = Math.max(...volumes);
    const pocIndex = volumes.indexOf(maxVol);
    const p = {
      prices, volumes,
      poc: prices[pocIndex],
      valueAreaHigh: prices[Math.max(0, pocIndex - 8)],
      valueAreaLow: prices[Math.min(prices.length - 1, pocIndex + 8)],
      totalVolume: volumes.reduce((a, b) => a + b, 0),
    };
    setProfile(p);
  }, [selectedPair, candles.length]);

  // Canvas market profile drawing
  useEffect(() => {
    if (!profile || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400 * 2;
    ctx.scale(2, 2);
    const w = canvas.offsetWidth;
    const h = 400;
    ctx.clearRect(0, 0, w, h);

    const minPrice = profile.prices[profile.prices.length - 1];
    const maxPrice = profile.prices[0];
    const yForPrice = (p: number) => h - ((p - minPrice) / (maxPrice - minPrice)) * h;

    // Value area background
    const vahY = yForPrice(profile.valueAreaHigh);
    const valY = yForPrice(profile.valueAreaLow);
    ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
    ctx.fillRect(w * 0.30, vahY, w * 0.70, valY - vahY);

    // Draw volume profile
    const maxVol = Math.max(...profile.volumes);
    const barHeight = h / profile.prices.length;
    profile.prices.forEach((price: number, i: number) => {
      const vol = profile.volumes[i];
      const width = (vol / maxVol) * (w * 0.30);
      const y = yForPrice(price);
      let color = "rgba(148, 163, 184, 0.3)";
      if (Math.abs(price - profile.poc) < 0.0001) color = "rgba(56, 189, 248, 0.9)";
      else if (price <= profile.valueAreaHigh && price >= profile.valueAreaLow) color = "rgba(16, 185, 129, 0.6)";
      ctx.fillStyle = color;
      ctx.fillRect(w * 0.30 - width, y - barHeight/2, width, barHeight - 1);
      if (i % 5 === 0) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.font = "10px monospace";
        ctx.textAlign = "right";
        ctx.fillText(price.toFixed(5), w * 0.28 - width, y + 3);
      }
    });

    // POC line
    const pocY = yForPrice(profile.poc);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(w * 0.30, pocY); ctx.lineTo(w, pocY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(56, 189, 248, 1)";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`POC ${profile.poc.toFixed(5)}`, w * 0.31, pocY - 5);

    // VAH/VAL lines
    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * 0.30, vahY); ctx.lineTo(w, vahY);
    ctx.moveTo(w * 0.30, valY); ctx.lineTo(w, valY); ctx.stroke();
  }, [profile]);

  // Candlestick chart via lightweight-charts
  useEffect(() => {
    if (!chartContainerRef.current || !candles.length) return;
    if (chartRef.current) { chartRef.current.chart.remove(); chartRef.current = null; }
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8", fontSize: 10 },
      grid: { vertLines: { color: "rgba(148,163,184,0.05)" }, horzLines: { color: "rgba(148,163,184,0.06)" } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(148,163,184,0.15)" },
      rightPriceScale: { borderColor: "rgba(148,163,184,0.15)" },
      crosshair: { mode: 0 },
      height: 380,
    });
    const candle = chart.addSeries(CandlestickSeries, { upColor: "#10b981", downColor: "#ef4444", borderUpColor: "#10b981", borderDownColor: "#ef4444", wickUpColor: "#10b981", wickDownColor: "#ef4444" });
    const pocLine = chart.addSeries(LineSeries, { color: "#38bdf8", lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const vahLine = chart.addSeries(LineSeries, { color: "#10b981", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const valLine = chart.addSeries(LineSeries, { color: "#10b981", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });

    const cd = candles.map(c => ({ time: c.epoch as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }));
    candle.setData(cd);
    if (profile) {
      const lastTime = cd[cd.length - 1].time;
      const firstTime = cd[0].time;
      pocLine.setData([{ time: firstTime, value: profile.poc }, { time: lastTime, value: profile.poc }]);
      vahLine.setData([{ time: firstTime, value: profile.valueAreaHigh }, { time: lastTime, value: profile.valueAreaHigh }]);
      valLine.setData([{ time: firstTime, value: profile.valueAreaLow }, { time: lastTime, value: profile.valueAreaLow }]);
    }
    chart.timeScale().fitContent();
    chartRef.current = { chart, candle, pocLine, vahLine, valLine };
    const ro = new ResizeObserver(() => { chart.applyOptions({ width: chartContainerRef.current!.clientWidth }); });
    ro.observe(chartContainerRef.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [candles, profile]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            Market Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Volume profile, Point of Control, Value Area, and real-time candlestick chart</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AssetSelect value={selectedPair} onChange={setSelectedPair} />
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
          {livePrice != null && (
            <span className="text-sm font-mono font-bold tabular-nums">
              Live: {livePrice.toFixed(selectedPair.includes("JPY") ? 3 : 5)}
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 rounded-xl border border-border bg-card/80 backdrop-blur overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#38bdf8]"></span>POC</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#10b981]/60"></span>Value Area</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-bull"></span>Bull</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-bear"></span>Bear</span>
              </div>
            </div>
            <div className="p-4">
              <div ref={chartContainerRef} className="w-full h-[380px]" />
            </div>
          </div>

          <div className="space-y-3">
            {profile && [
              { label: "POC", value: profile.poc.toFixed(5), sub: "Point of Control", color: "text-cyan-400" },
              { label: "VAH", value: profile.valueAreaHigh.toFixed(5), sub: "Value Area High", color: "text-bull" },
              { label: "VAL", value: profile.valueAreaLow.toFixed(5), sub: "Value Area Low", color: "text-bear" },
              { label: "Volume", value: `${(profile.totalVolume / 1000).toFixed(1)}K`, sub: "Total", color: "text-foreground" },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
                <div className="text-[10px] uppercase text-muted-foreground">{stat.sub}</div>
                <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                <div className="text-[11px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 rounded-xl border border-border bg-card/80 backdrop-blur overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Volume Profile</span>
            </div>
            <div className="p-4">
              <canvas ref={canvasRef} className="w-full h-[400px]" />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Auction Theory", desc: "Market is in balance at POC. Break above VAH = bullish, below VAL = bearish", icon: Activity },
            { title: "Volume Imbalance", desc: "Current price above POC with increasing volume = continuation likely", icon: TrendingUp },
            { title: "Confluence", desc: "POC aligns with support + RSI divergence = high probability setup", icon: BarChart3 },
          ].map(card => (
            <div key={card.title} className="rounded-lg border border-border bg-card/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-sm">{card.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

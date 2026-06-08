import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { AssetSelect } from "@/components/app/AssetSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import { deriv, TIMEFRAMES, type TF } from "@/lib/engine/deriv";
import type { Candle } from "@/lib/engine/indicators";
import {
  buildHeatmap, buildVolumeProfile, computeOrderFlow, detectSwing, fibLevels,
  findSRLevels, findSupplyDemand, scoreAccuracy, type Tick,
} from "@/lib/engine/heatmap-analytics";
import { evaluateStrategies } from "@/lib/engine/strategies";
import { Flame, Activity, Target, Gauge, ZoomIn, ZoomOut, Move } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { Sliders } from "lucide-react";

export const Route = createFileRoute("/heatmap")({
  head: () => ({ meta: [
    { title: "Heatmap — DivergenceIQ" },
    { name: "description", content: "Volume heatmap, auto Fibs, supply/demand zones and live accuracy score." },
  ]}),
  component: HeatmapPage,
});

const TICK_BUFFER = 600;

function HeatmapPage() {
  const [symbol, setSymbol] = useState("frxEURUSD");
  const [tf, setTf] = useState<TF>("M5");
  const [candles, setCandles] = useState<Candle[]>([]);
  const ticksRef = useRef<Tick[]>([]);
  const [, force] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { settings, update } = useSettings();
  const [showWeights, setShowWeights] = useState(false);
  const pendingTickRef = useRef<{ epoch: number; quote: number } | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  // Zoom / pan
  const [zoom, setZoom] = useState(1);              // 1 = show all, >1 = zoom in
  const [panCols, setPanCols] = useState(0);        // pan offset in columns from right
  const dragRef = useRef<{ x: number; pan: number } | null>(null);
  // Performance / health metrics
  const perfRef = useRef({ tickCount: 0, dropped: 0, lastTickAt: 0, rate: 0 });
  const [perf, setPerf] = useState({ tickRate: 0, drops: 0, buffer: 0, throttle: 150 });

  // Load history + subscribe ticks
  useEffect(() => {
    let alive = true;
    ticksRef.current = [];
    perfRef.current = { tickCount: 0, dropped: 0, lastTickAt: 0, rate: 0 };
    deriv.getCandles(symbol, tf, 240).then(c => { if (alive) setCandles(c); }).catch(() => {});
    // Throttled tick handler — only the latest tick is applied per interval
    // so the Heatmap stays smooth under high-frequency data.
    const flush = () => {
      flushTimerRef.current = null;
      const t = pendingTickRef.current;
      if (!t) return;
      pendingTickRef.current = null;
      setCandles(prev => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const updated: Candle = {
          ...last, close: t.quote,
          high: Math.max(last.high, t.quote),
          low: Math.min(last.low, t.quote),
          volume: (last.volume || 1) + 1,
        };
        return [...prev.slice(0, -1), updated];
      });
    };
    const unsub = deriv.subscribeTicks(symbol, (t) => {
      // Always record raw ticks (cheap) for order-flow analytics — bounded buffer = backpressure.
      const buf = ticksRef.current;
      buf.push({ epoch: t.epoch, quote: t.quote });
      if (buf.length > TICK_BUFFER) {
        const drop = buf.length - TICK_BUFFER;
        buf.splice(0, drop);
        perfRef.current.dropped += drop;
      }
      perfRef.current.tickCount++;
      perfRef.current.lastTickAt = Date.now();
      // Coalesce React updates: keep only the latest tick until the timer fires.
      pendingTickRef.current = { epoch: t.epoch, quote: t.quote };
      if (flushTimerRef.current == null) {
        flushTimerRef.current = window.setTimeout(flush, Math.max(30, settings.tickThrottleMs));
      }
    });
    const refresh = setInterval(() => {
      // Compute tick rate (ticks/sec) over the last second
      const c = perfRef.current.tickCount;
      const rate = c;
      perfRef.current.tickCount = 0;
      setPerf({
        tickRate: rate,
        drops: perfRef.current.dropped,
        buffer: ticksRef.current.length,
        throttle: settings.tickThrottleMs,
      });
      force(n => n + 1);
    }, 1000);
    return () => {
      alive = false; unsub(); clearInterval(refresh);
      if (flushTimerRef.current != null) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
    };
  }, [symbol, tf, settings.tickThrottleMs]);

  // Derived analytics
  const analytics = useMemo(() => {
    const vp = buildVolumeProfile(candles);
    const swing = detectSwing(candles);
    const fib = swing ? fibLevels(swing) : null;
    const sr = vp ? findSRLevels(vp) : [];
    const zones = findSupplyDemand(candles);
    const flow = computeOrderFlow(ticksRef.current);
    // Apply zoom + pan to the candles fed to the heatmap
    const total = candles.length;
    const visibleCount = Math.max(20, Math.min(total, Math.round(total / zoom)));
    const endIdx = Math.max(visibleCount, total - panCols);
    const startIdx = Math.max(0, endIdx - visibleCount);
    const visible = candles.slice(startIdx, endIdx);
    const heat = buildHeatmap(visible);
    const price = candles.length ? candles[candles.length - 1].close : 0;
    const strategies = evaluateStrategies(candles, ticksRef.current);
    const acc = price ? scoreAccuracy(
      { price, vp, fib, sr, zones, flow, strategies },
      { fib: settings.weightFib, sd: settings.weightSD, orderFlow: settings.weightOrderFlow, volumeProfile: settings.weightVolumeProfile },
    ) : null;
    return { vp, fib, sr, zones, flow, heat, price, acc, strategies, visible };
  }, [candles, zoom, panCols, settings.weightFib, settings.weightSD, settings.weightOrderFlow, settings.weightVolumeProfile]);

  // Render heatmap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const { heat, zones, fib, sr, price } = analytics;
    if (!heat.cols || !heat.rows || heat.priceMax === heat.priceMin) return;
    const cw = W / heat.cols;
    const ch = H / heat.rows;
    const priceToY = (p: number) => H - ((p - heat.priceMin) / (heat.priceMax - heat.priceMin)) * H;

    // Heat cells
    for (const cell of heat.cells) {
      if (!cell.v) continue;
      const t = Math.pow(cell.v / heat.max, 0.6);
      // Blue → magenta → red ramp
      const r = Math.round(20 + 235 * t);
      const g = Math.round(20 + 30 * (1 - t));
      const b = Math.round(180 * (1 - t) + 60 * t);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + 0.7 * t})`;
      ctx.fillRect(cell.x * cw, H - (cell.y + 1) * ch, cw + 0.5, ch + 0.5);
    }

    // Supply / Demand zones
    for (const z of zones) {
      const y1 = priceToY(z.top), y2 = priceToY(z.bottom);
      ctx.fillStyle = z.kind === "demand"
        ? `rgba(34,197,94,${0.10 + 0.18 * z.strength})`
        : `rgba(239,68,68,${0.10 + 0.18 * z.strength})`;
      ctx.fillRect(0, Math.min(y1, y2), W, Math.abs(y2 - y1));
    }

    // S/R lines
    ctx.lineWidth = 1;
    for (const r of sr) {
      const y = priceToY(r.price);
      ctx.strokeStyle = `rgba(250,204,21,${0.3 + 0.6 * r.strength})`;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Fibonacci levels
    if (fib) {
      for (const lvl of fib.levels) {
        const y = priceToY(lvl.price);
        const golden = lvl.ratio === 0.618 || lvl.ratio === 0.5;
        ctx.strokeStyle = golden ? "rgba(168,85,247,0.85)" : "rgba(168,85,247,0.35)";
        ctx.lineWidth = golden ? 1.4 : 0.8;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = "rgba(216,180,254,0.9)";
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillText(`${lvl.ratio}  ${lvl.price.toFixed(5)}`, 6, y - 2);
      }
    }

    // Live price line — glowing neon polyline
    const slice = analytics.visible.slice(-heat.cols);
    if (slice.length > 1) {
      ctx.shadowColor = "rgba(125,211,252,0.9)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(240,253,255,0.95)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < slice.length; i++) {
        const x = i * cw + cw / 2;
        const y = priceToY(slice[i].close);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Live dot
      const lx = (slice.length - 1) * cw + cw / 2;
      const ly = priceToY(price);
      ctx.fillStyle = "rgba(125,211,252,1)";
      ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }, [analytics]);

  const acc = analytics.acc;
  const flow = analytics.flow;

  // Wheel zoom + drag pan
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    setZoom(z => Math.min(8, Math.max(1, +(z + dir * 0.25).toFixed(2))));
  };
  const onDown = (e: React.MouseEvent) => { dragRef.current = { x: e.clientX, pan: panCols }; };
  const onMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    setPanCols(Math.max(0, dragRef.current.pan + Math.round(dx / 6)));
  };
  const onUp = () => { dragRef.current = null; };

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-bear" /> Heatmap
          </h1>
          <div className="flex-1" />
          <AssetSelect value={symbol} onChange={setSymbol} />
          <select value={tf} onChange={e => setTf(e.target.value as TF)}
            className="bg-card border border-border rounded px-2 py-1.5 text-sm">
            {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => setShowWeights(v => !v)}
            className="bg-card border border-border rounded px-2 py-1.5 text-sm flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> Weights
          </button>
        </div>

        {/* Price + bias strip — sits above the chart so it never blocks data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Symbol</div>
            <div className="font-mono text-sm font-semibold">{symbol}</div>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Price</div>
            <div className="font-mono text-sm font-semibold tabular-nums">{analytics.price.toFixed(5)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Bias</div>
            <div className={`font-mono text-sm font-bold ${acc?.bias === "BUY" ? "text-bull" : acc?.bias === "SELL" ? "text-bear" : "text-muted-foreground"}`}>
              {acc?.bias ?? "—"} {acc ? `· ${acc.score}%` : ""}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Stream</div>
              <div className="font-mono text-[11px] tabular-nums">
                {perf.tickRate}/s · buf {perf.buffer}/{TICK_BUFFER} · drop {perf.drops} · {perf.throttle}ms
              </div>
            </div>
          </div>
        </div>

        {showWeights && (
          <div className="rounded-lg border border-border bg-card p-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <WeightSlider label="Fibonacci" value={settings.weightFib} onChange={v => update({ weightFib: v })} />
            <WeightSlider label="Supply/Demand" value={settings.weightSD} onChange={v => update({ weightSD: v })} />
            <WeightSlider label="Order Flow" value={settings.weightOrderFlow} onChange={v => update({ weightOrderFlow: v })} />
            <WeightSlider label="Volume Profile" value={settings.weightVolumeProfile} onChange={v => update({ weightVolumeProfile: v })} />
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tick throttle (ms)</div>
              <input type="number" min={30} max={1000} step={10} value={settings.tickThrottleMs}
                onChange={e => update({ tickThrottleMs: +e.target.value })}
                className="w-full bg-input border border-border rounded px-2 py-1 text-xs" />
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border text-[11px]">
            <span className="text-muted-foreground uppercase tracking-wider">Chart</span>
            <div className="flex-1" />
            <button onClick={() => setZoom(z => Math.min(8, +(z + 0.5).toFixed(2)))}
              className="p-1 rounded hover:bg-accent" title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
            <button onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(2)))}
              className="p-1 rounded hover:bg-accent" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">{zoom.toFixed(1)}x</span>
            <button onClick={() => { setZoom(1); setPanCols(0); }}
              className="p-1 rounded hover:bg-accent flex items-center gap-1 text-[10px]" title="Reset"><Move className="w-3.5 h-3.5" /> reset</button>
          </div>
          <canvas
            ref={canvasRef}
            onWheel={onWheel}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            className="w-full h-[480px] block cursor-grab active:cursor-grabbing"
          />
        </div>

        {/* Accuracy + strategies sit BELOW the chart so nothing blocks data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {acc && (
            <div className="rounded-lg border border-border bg-card p-3 md:col-span-1">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Target className="w-3 h-3" /> Accuracy Probability
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className={`text-3xl font-bold tabular-nums ${
                  acc.bias === "BUY" ? "text-bull" : acc.bias === "SELL" ? "text-bear" : "text-muted-foreground"
                }`}>{acc.score}%</div>
                <div className="text-xs font-mono">{acc.bias}</div>
              </div>
              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                <div className={`h-full ${acc.bias === "BUY" ? "bg-bull" : acc.bias === "SELL" ? "bg-bear" : "bg-muted-foreground"}`}
                  style={{ width: `${acc.score}%` }} />
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground max-h-40 overflow-auto">
                {acc.reasons.map((r, i) => <li key={i}>{r}</li>)}
                {!acc.reasons.length && <li>No active confluence — waiting for setup.</li>}
              </ul>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Strategy Confluence</div>
            <div className="mt-2 space-y-1 text-xs">
              {analytics.strategies.length ? analytics.strategies.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${s.side === "BUY" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear"}`}>{s.name}</span>
                  <span className="text-muted-foreground flex-1">{s.note}</span>
                  <span className="font-mono text-[10px]">{s.weight}</span>
                </div>
              )) : <div className="text-muted-foreground">No active strategy triggers.</div>}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground tracking-widest flex items-center gap-1"><Activity className="w-3 h-3" /> Order Flow</div>
            <div className="mt-2 text-sm">Buy {flow.buyVol} · Sell {flow.sellVol}</div>
            <div className="text-xs text-muted-foreground">Delta {flow.delta} · Imbalance {(flow.imbalance*100).toFixed(0)}%</div>
            <div className="h-2 mt-2 rounded bg-muted overflow-hidden flex">
              <div className="h-full bg-bull" style={{ width: `${(flow.buyVol/(flow.buyVol+flow.sellVol||1))*100}%` }} />
              <div className="h-full bg-bear" style={{ width: `${(flow.sellVol/(flow.buyVol+flow.sellVol||1))*100}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground tracking-widest">Volume Profile</div>
            {analytics.vp ? (
              <div className="mt-2 text-xs space-y-0.5 font-mono">
                <div>POC <span className="text-medium">{analytics.vp.poc.toFixed(5)}</span></div>
                <div>VAH <span className="text-bear">{analytics.vp.vah.toFixed(5)}</span></div>
                <div>VAL <span className="text-bull">{analytics.vp.val.toFixed(5)}</span></div>
              </div>
            ) : <div className="text-xs text-muted-foreground mt-2">Loading…</div>}
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground tracking-widest">Zones &amp; S/R</div>
            <div className="mt-2 text-xs space-y-0.5 font-mono max-h-32 overflow-auto">
              {analytics.zones.slice(0, 4).map((z, i) => (
                <div key={i} className={z.kind === "demand" ? "text-bull" : "text-bear"}>
                  {z.kind.toUpperCase()} {z.bottom.toFixed(5)} – {z.top.toFixed(5)}
                </div>
              ))}
              {analytics.sr.slice(0, 3).map((r, i) => (
                <div key={`sr${i}`} className="text-medium">S/R {r.price.toFixed(5)} ({r.touches}t)</div>
              ))}
              {!analytics.zones.length && !analytics.sr.length && <div className="text-muted-foreground">No structure yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-[10px] font-mono">{value.toFixed(2)}×</div>
      </div>
      <input type="range" min={0} max={2} step={0.05} value={value}
        onChange={e => onChange(+e.target.value)} className="w-full accent-primary" />
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Zap, Activity, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deriv, TIMEFRAMES, type TF } from "@/lib/engine/deriv";
import { analyze, type AnalysisResult } from "@/lib/engine/signal";

export const Route = createFileRoute("/neural")({
  component: NeuralPage,
});

const WATCH: Array<{ symbol: string; display: string }> = [
  { symbol: "frxEURUSD", display: "EUR/USD" },
  { symbol: "frxGBPUSD", display: "GBP/USD" },
  { symbol: "frxUSDJPY", display: "USD/JPY" },
  { symbol: "frxXAUUSD", display: "XAU/USD" },
];

const TF: TF = "M5";

function NeuralPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [training, setTraining] = useState(false);
  const [predictions, setPredictions] = useState<
    Array<{ pair: string; score: number; direction: "BUY" | "SELL" | null; rating: string; conf: number }>
  >([]);

  // Pull live candles + run the confluence engine per-pair.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const out: typeof predictions = [];
      for (const w of WATCH) {
        try {
          const candles = await deriv.getCandles(w.symbol, TF, 200);
          const a: AnalysisResult = analyze(w.symbol, TF, candles, {});
          out.push({
            pair: w.display,
            score: Math.round(a.scorePct),
            direction: a.direction,
            rating: a.rating,
            conf: Math.round(a.scorePct),
          });
        } catch (e) {
          out.push({ pair: w.display, score: 0, direction: null, rating: "—", conf: 0 });
        }
      }
      if (!cancelled) setPredictions(out);
    };
    tick();
    const id = setInterval(tick, 30_000); // refresh every 30s
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Network visualisation (decorative — driven by `training` toggle)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400 * 2;
    ctx.scale(2, 2);

    let raf = 0;
    let time = 0;
    const nodes: Array<{ x: number; y: number; layer: number; activation: number }> = [];
    const layers = [11, 8, 6, 1];
    const layerX = [80, 220, 360, 500];
    layers.forEach((count, layerIdx) => {
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: layerX[layerIdx],
          y: 60 + (i + 0.5) * (280 / count),
          layer: layerIdx,
          activation: Math.random(),
        });
      }
    });

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i],
            b = nodes[j];
          if (b.layer === a.layer + 1) {
            const weight = Math.sin(time + i * 0.3 + j * 0.2) * 0.5 + 0.5;
            const alpha = training ? weight * 0.8 : weight * 0.3;
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const r = 4 + Math.sin(time * 2 + n.activation * 10) * 1.5;
        ctx.fillStyle = `rgba(56, 189, 248, ${0.7 + n.activation * 0.3})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [training]);

  const meanConf = useMemo(
    () =>
      predictions.length > 0
        ? Math.round(predictions.reduce((a, p) => a + p.conf, 0) / predictions.length)
        : 0,
    [predictions],
  );

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Brain className="w-6 h-6 text-sky-400" />
              Neural Confluence Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live model predictions from <code className="px-1 rounded bg-muted/60">analyze()</code> on Deriv {TF} candles. Refreshes every 30s.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30">
            <Activity className={`w-3.5 h-3.5 text-sky-400 ${predictions.length ? "animate-pulse" : "opacity-30"}`} />
            <span className="text-xs font-mono text-sky-400">
              {predictions.length ? `${predictions.length} PAIRS LIVE` : "CONNECTING…"}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_320px] gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Network
              </h3>
              <Button size="sm" variant={training ? "default" : "outline"} onClick={() => setTraining((t) => !t)}>
                {training ? "Training…" : "Idle"}
              </Button>
            </div>
            <canvas ref={canvasRef} className="w-full h-[400px]" />
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Visualisation is decorative. Predictions below are real (engine/signal.ts).
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-bull" />
              Live Predictions
            </h3>
            <div className="space-y-2">
              {predictions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Fetching candles…</p>
              )}
              {predictions.map((p) => (
                <div
                  key={p.pair}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-background/50"
                >
                  <div>
                    <div className="font-mono font-medium">{p.pair}</div>
                    <div className="text-xs text-muted-foreground">
                      Score {p.score} · {p.rating}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-medium ${
                        p.direction === "BUY"
                          ? "text-bull"
                          : p.direction === "SELL"
                            ? "text-bear"
                            : "text-muted-foreground"
                      }`}
                    >
                      {p.direction ?? "NEUTRAL"}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.conf}% conf</div>
                  </div>
                </div>
              ))}
            </div>
            {predictions.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                Avg confidence: <span className="font-mono">{meanConf}%</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

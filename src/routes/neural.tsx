import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useRef, useState } from "react";
import { Brain, Zap, Activity, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/neural")({
  component: NeuralPage,
});

function NeuralPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [training, setTraining] = useState(false);
  const [accuracy, setAccuracy] = useState(84.3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400 * 2;
    ctx.scale(2, 2);

    let time = 0;
    const nodes: Array<{x: number, y: number, layer: number, activation: number}> = [];
    const layers = [11, 8, 6, 1];
    const layerX = [80, 220, 360, 500];

    // Create nodes
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
      
      // Draw connections
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          if (b.layer === a.layer + 1) {
            const weight = Math.sin(time + i * 0.3 + j * 0.2) * 0.5 + 0.5;
            const alpha = training ? weight * 0.8 : weight * 0.3;
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            const mx = (a.x + b.x) / 2;
            ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
            ctx.stroke();
            
            // Data flow
            if (training && Math.random() < 0.02) {
              const t = (Math.sin(time * 2 + i) + 1) / 2;
              const x = a.x + (b.x - a.x) * t;
              const y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * -20;
              ctx.fillStyle = `rgba(16, 185, 129, ${0.8 - t * 0.5})`;
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Draw nodes
      nodes.forEach((node, i) => {
        node.activation = 0.5 + 0.5 * Math.sin(time * (training ? 2 : 0.5) + i * 0.5);
        
        // Glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 20);
        const intensity = node.activation;
        if (node.layer === 0) {
          gradient.addColorStop(0, `rgba(148, 163, 184, ${intensity * 0.8})`);
          gradient.addColorStop(1, "rgba(148, 163, 184, 0)");
        } else if (node.layer === 3) {
          gradient.addColorStop(0, `rgba(16, 185, 129, ${intensity})`);
          gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
        } else {
          gradient.addColorStop(0, `rgba(56, 189, 248, ${intensity * 0.9})`);
          gradient.addColorStop(1, "rgba(56, 189, 248, 0)");
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = node.layer === 0 ? "#94a3b8" : node.layer === 3 ? "#10b981" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6 + intensity * 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Labels
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.font = "11px monospace";
      ctx.fillText("11 INDICATORS", 45, 35);
      ctx.fillText("HIDDEN LAYER 1", 175, 35);
      ctx.fillText("HIDDEN LAYER 2", 320, 35);
      ctx.fillText("OUTPUT", 480, 35);

      requestAnimationFrame(animate);
    };
    animate();
  }, [training]);

  const startTraining = () => {
    setTraining(true);
    let acc = accuracy;
    const interval = setInterval(() => {
      acc += Math.random() * 0.8;
      if (acc > 92) {
        clearInterval(interval);
        setTraining(false);
      }
      setAccuracy(Math.min(92, acc));
    }, 200);
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              Neural Confluence Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Deep learning model trained on 500+ signals</p>
          </div>
          <Button onClick={startTraining} disabled={training}>
            <Zap className="w-4 h-4 mr-2" />
            {training ? "Training..." : "Retrain Model"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          {[
            { label: "Accuracy", value: `${accuracy.toFixed(1)}%`, icon: Activity, color: "text-bull" },
            { label: "Parameters", value: "142", icon: Brain, color: "text-violet-400" },
            { label: "Training Data", value: "524", icon: TrendingUp, color: "text-cyan-400" },
            { label: "Inference", value: "2.3ms", icon: Zap, color: "text-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card/60 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card/80 backdrop-blur overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Network Architecture</h2>
            <p className="text-xs text-muted-foreground mt-1">11 inputs → 8 neurons → 6 neurons → 1 output (win probability)</p>
          </div>
          <div className="p-4 bg-[#020617]">
            <canvas ref={canvasRef} className="w-full h-[400px]" style={{ maxWidth: "600px", margin: "0 auto", display: "block" }} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-bull" />
              Top Learned Weights
            </h3>
            <div className="space-y-2.5 text-sm font-mono">
              {[
                { name: "RSI Divergence", weight: 0.82, impact: "HIGH" },
                { name: "EMA 50/200 Align", weight: 0.79, impact: "HIGH" },
                { name: "ADX >22", weight: 0.71, impact: "MED" },
                { name: "MACD Divergence", weight: 0.68, impact: "MED" },
                { name: "Supertrend", weight: 0.61, impact: "MED" },
              ].map((w) => (
                <div key={w.name} className="flex items-center gap-3">
                  <div className="w-32 truncate text-muted-foreground">{w.name}</div>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${w.weight * 100}%` }} />
                  </div>
                  <div className="w-12 text-right text-xs">{w.weight.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-5">
            <h3 className="font-semibold mb-3">Live Predictions</h3>
            <div className="space-y-3">
              {[
                { pair: "EUR/USD", score: 92, prediction: "WIN", conf: 88 },
                { pair: "GBP/USD", score: 76, prediction: "WIN", conf: 72 },
                { pair: "XAU/USD", score: 84, prediction: "WIN", conf: 81 },
              ].map((p) => (
                <div key={p.pair} className="flex items-center justify-between p-2.5 rounded-lg bg-background/50">
                  <div>
                    <div className="font-mono font-medium">{p.pair}</div>
                    <div className="text-xs text-muted-foreground">AI Score: {p.score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-bull">{p.prediction}</div>
                    <div className="text-xs text-muted-foreground">{p.conf}% conf</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
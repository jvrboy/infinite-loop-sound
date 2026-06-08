import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState, useEffect, useRef } from "react";
import { BarChart3, TrendingUp, Activity } from "lucide-react";

export const Route = createFileRoute("/market-profile")({
  component: MarketProfilePage,
});

function MarketProfilePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPair, setSelectedPair] = useState("frxEURUSD");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Generate mock market profile data
    const prices: number[] = [];
    const volumes: number[] = [];
    const basePrice = 1.0850;
    
    for (let i = 0; i < 50; i++) {
      const price = basePrice + (i - 25) * 0.0005;
      prices.push(price);
      // Volume profile - bell curve with POC
      const dist = Math.abs(i - 25);
      const vol = Math.exp(-dist * dist / 100) * 1000 + Math.random() * 200;
      volumes.push(vol);
    }
    
    const maxVol = Math.max(...volumes);
    const pocIndex = volumes.indexOf(maxVol);
    
    setProfile({
      prices,
      volumes,
      poc: prices[pocIndex],
      valueAreaHigh: prices[pocIndex + 8],
      valueAreaLow: prices[pocIndex - 8],
      totalVolume: volumes.reduce((a, b) => a + b, 0),
    });
  }, [selectedPair]);

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
    
    // Draw volume profile
    const maxVol = Math.max(...profile.volumes);
    const barHeight = h / profile.prices.length;
    
    profile.prices.forEach((price: number, i: number) => {
      const vol = profile.volumes[i];
      const width = (vol / maxVol) * (w * 0.6);
      const y = i * barHeight;
      
      // Determine color
      let color = "rgba(148, 163, 184, 0.3)";
      if (Math.abs(price - profile.poc) < 0.0001) {
        color = "rgba(56, 189, 248, 0.9)"; // POC
      } else if (price <= profile.valueAreaHigh && price >= profile.valueAreaLow) {
        color = "rgba(16, 185, 129, 0.6)"; // Value area
      }
      
      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(w * 0.35 - width, y + 1, width, barHeight - 2);
      
      // Price label
      if (i % 5 === 0) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.font = "10px monospace";
        ctx.textAlign = "right";
        ctx.fillText(price.toFixed(5), w * 0.33, y + barHeight / 2 + 3);
      }
    });
    
    // Draw POC line
    const pocY = profile.prices.indexOf(profile.poc) * barHeight + barHeight / 2;
    ctx.strokeStyle = "rgba(56, 189, 248, 1)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w * 0.35, pocY);
    ctx.lineTo(w, pocY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = "rgba(56, 189, 248, 1)";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`POC ${profile.poc.toFixed(5)}`, w * 0.36, pocY - 5);
    
    // Value area
    const vahY = profile.prices.indexOf(profile.valueAreaHigh) * barHeight;
    const valY = profile.prices.indexOf(profile.valueAreaLow) * barHeight + barHeight;
    ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
    ctx.fillRect(w * 0.35, vahY, w * 0.65, valY - vahY);
    
    ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, vahY);
    ctx.lineTo(w, vahY);
    ctx.moveTo(w * 0.35, valY);
    ctx.lineTo(w, valY);
    ctx.stroke();
    
  }, [profile]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            Market Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Volume profile • Point of Control • Value Area</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 rounded-xl border border-border bg-card/80 backdrop-blur overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <select 
                value={selectedPair} 
                onChange={e => setSelectedPair(e.target.value)}
                className="bg-background border border-border rounded px-3 py-1.5 text-sm font-mono"
              >
                <option value="frxEURUSD">EUR/USD</option>
                <option value="frxGBPUSD">GBP/USD</option>
                <option value="frxXAUUSD">XAU/USD</option>
              </select>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#38bdf8]"></span>POC</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#10b981]/60"></span>Value Area</span>
              </div>
            </div>
            <div className="p-4">
              <canvas ref={canvasRef} className="w-full h-[400px]" />
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

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Auction Theory", desc: "Market is in balance at POC. Break above VAH = bullish, below VAL = bearish", icon: Activity },
            { title: "Volume Imbalance", desc: "Current price above POC with increasing volume = continuation likely", icon: TrendingUp },
            { title: "Confluence", desc: "POC aligns with 1.0850 support + RSI divergence = high probability", icon: BarChart3 },
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
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Eye, Users, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/dark-pool")({
  component: DarkPoolPage,
});

function DarkPoolPage() {
  const pools = [
    { time: "09:45", pair: "EUR/USD", side: "BUY", size: "€47.2M", price: "1.0856", venue: "XTX", blocks: 3 },
    { time: "09:32", pair: "XAU/USD", side: "BUY", size: "$38.5M", price: "2678.40", venue: "JPM", blocks: 2 },
    { time: "09:18", pair: "GBP/USD", side: "SELL", size: "£29.3M", price: "1.2712", venue: "CITI", blocks: 4 },
    { time: "09:05", pair: "EUR/USD", side: "BUY", size: "€52.8M", price: "1.0852", venue: "UBS", blocks: 5 },
    { time: "08:52", pair: "USD/JPY", side: "BUY", size: "¥4.2B", price: "151.84", venue: "GS", blocks: 2 },
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Eye className="w-6 h-6 text-pink-400" />
            Dark Pool Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Institutional block trades • Hidden liquidity</p>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          {[
            { label: "Total Volume", value: "€847M", sub: "Today" },
            { label: "Buy Volume", value: "€612M", sub: "72%" },
            { label: "Sell Volume", value: "€235M", sub: "28%" },
            { label: "Avg Block", value: "€34.2M", sub: "23 trades" },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase">{stat.label}</div>
              <div className="text-xl font-bold font-mono mt-1">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Pair</th>
                  <th className="text-left p-3">Side</th>
                  <th className="text-right p-3">Size</th>
                  <th className="text-right p-3">Price</th>
                  <th className="text-left p-3">Venue</th>
                  <th className="text-right p-3">Blocks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {pools.map((pool, i) => (
                  <tr key={i} className="hover:bg-accent/20">
                    <td className="p-3 text-muted-foreground">{pool.time}</td>
                    <td className="p-3 font-medium">{pool.pair}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit ${
                        pool.side === "BUY" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear"
                      }`}>
                        <Users className="w-3 h-3" />
                        {pool.side}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-pink-400">{pool.size}</td>
                    <td className="p-3 text-right">{pool.price}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px]">{pool.venue}</span>
                    </td>
                    <td className="p-3 text-right">{pool.blocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { venue: "XTX Markets", volume: "€247M", trades: 7, bias: "Bullish" },
            { venue: "JPMorgan", volume: "$198M", trades: 5, bias: "Bullish" },
            { venue: "UBS", volume: "€156M", trades: 6, bias: "Neutral" },
          ].map(v => (
            <div key={v.venue} className="rounded-lg border border-border bg-card p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-sm">{v.venue}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{v.trades} trades</div>
                </div>
                <TrendingUp className="w-4 h-4 text-bull" />
              </div>
              <div className="text-xl font-bold font-mono">{v.volume}</div>
              <div className="text-xs text-bull mt-1">{v.bias}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
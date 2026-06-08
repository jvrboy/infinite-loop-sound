import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { TrendingUp, DollarSign, Activity, Zap } from "lucide-react";

export const Route = createFileRoute("/options-flow")({
  component: OptionsFlowPage,
});

function OptionsFlowPage() {
  const flows = [
    { time: "09:32", pair: "EUR/USD", type: "CALL", strike: "1.0900", premium: "$2.4M", iv: "12.4%", oi: "15.2K", sentiment: "BULLISH" },
    { time: "09:28", pair: "XAU/USD", type: "CALL", strike: "2680", premium: "$1.8M", iv: "18.7%", oi: "8.4K", sentiment: "BULLISH" },
    { time: "09:15", pair: "GBP/USD", type: "PUT", strike: "1.2700", premium: "$1.2M", iv: "14.2%", oi: "12.1K", sentiment: "BEARISH" },
    { time: "09:08", pair: "USD/JPY", type: "CALL", strike: "152.00", premium: "$980K", iv: "11.3%", oi: "6.7K", sentiment: "BULLISH" },
    { time: "08:55", pair: "EUR/USD", type: "PUT", strike: "1.0800", premium: "$750K", iv: "13.1%", oi: "9.3K", sentiment: "BEARISH" },
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-amber-400" />
              Options Flow
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Unusual options activity • $6.1M total premium today</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-mono text-amber-400">LIVE</span>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          {[
            { label: "Total Premium", value: "$6.13M", change: "+23%" },
            { label: "Calls", value: "$5.18M", change: "84%" },
            { label: "Puts", value: "$950K", change: "16%" },
            { label: "Put/Call", value: "0.18", change: "Bullish" },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase">{stat.label}</div>
              <div className="text-xl font-bold font-mono mt-1">{stat.value}</div>
              <div className="text-[11px] text-bull mt-0.5">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left p-3 font-medium">Time</th>
                  <th className="text-left p-3 font-medium">Pair</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-right p-3 font-medium">Strike</th>
                  <th className="text-right p-3 font-medium">Premium</th>
                  <th className="text-right p-3 font-medium">IV</th>
                  <th className="text-right p-3 font-medium">OI</th>
                  <th className="text-left p-3 font-medium">Sentiment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flows.map((flow, i) => (
                  <tr key={i} className="hover:bg-accent/30 transition-colors font-mono text-xs">
                    <td className="p-3 text-muted-foreground">{flow.time}</td>
                    <td className="p-3 font-medium">{flow.pair}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        flow.type === "CALL" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear"
                      }`}>
                        {flow.type}
                      </span>
                    </td>
                    <td className="p-3 text-right">{flow.strike}</td>
                    <td className="p-3 text-right font-medium text-amber-400">{flow.premium}</td>
                    <td className="p-3 text-right">{flow.iv}</td>
                    <td className="p-3 text-right text-muted-foreground">{flow.oi}</td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 ${flow.sentiment === "BULLISH" ? "text-bull" : "text-bear"}`}>
                        {flow.sentiment === "BULLISH" ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                        {flow.sentiment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Unusual Activity
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20">
                <div className="font-medium">EUR/USD 1.0900 CALLS</div>
                <div className="text-muted-foreground mt-1">15.2K OI • 340% volume spike • Expires today</div>
              </div>
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20">
                <div className="font-medium">XAU/USD 2680 CALLS</div>
                <div className="text-muted-foreground mt-1">8.4K OI • Sweep order • $1.8M premium</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Flow Analysis</h3>
            <div className="space-y-2.5 text-xs">
              {[
                { label: "Smart Money", value: "Bullish", desc: "78% calls, large blocks" },
                { label: "Retail", value: "Neutral", desc: "Mixed small orders" },
                { label: "Hedge Funds", value: "Bullish", desc: "Accumulating calls" },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <div className="text-right">
                    <div className="font-medium text-bull">{item.value}</div>
                    <div className="text-[10px] text-muted-foreground">{item.desc}</div>
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
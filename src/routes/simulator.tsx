import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Dices, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/simulator")({
  head: () => ({ meta: [{ title: "Monte Carlo Simulator — DivergenceIQ" }] }),
  component: SimulatorPage,
});

function SimulatorPage() {
  const [winRate, setWinRate] = useState<number>(55);
  const [riskReward, setRiskReward] = useState<number>(1.5);
  const [trades, setTrades] = useState<number>(100);
  const [riskPerTrade, setRiskPerTrade] = useState<number>(1);
  const [startingBalance, setStartingBalance] = useState<number>(10000);
  const [seed, setSeed] = useState(0);

  const { simulations, stats } = useMemo(() => {
    // We'll run 5 different equity curve simulations
    const sims = Array.from({ length: 5 }, () => {
      let balance = startingBalance;
      const curve = [{ trade: 0, balance }];
      let maxDrawdown = 0;
      let peak = balance;
      let wins = 0;

      // Pseudo-random deterministic enough for the seed
      for (let i = 1; i <= trades; i++) {
        const isWin = Math.random() * 100 <= winRate;
        const riskAmount = balance * (riskPerTrade / 100);
        
        if (isWin) {
          balance += riskAmount * riskReward;
          wins++;
        } else {
          balance -= riskAmount;
        }
        
        if (balance > peak) peak = balance;
        const drawdown = ((peak - balance) / peak) * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;

        curve.push({ trade: i, balance: Math.round(balance) });
      }
      return { curve, final: balance, maxDrawdown, winRate: (wins/trades)*100 };
    });

    // Merge into Recharts friendly format
    const chartData = [];
    for (let i = 0; i <= trades; i++) {
      chartData.push({
        trade: i,
        sim1: sims[0].curve[i].balance,
        sim2: sims[1].curve[i].balance,
        sim3: sims[2].curve[i].balance,
        sim4: sims[3].curve[i].balance,
        sim5: sims[4].curve[i].balance,
      });
    }

    const avgFinal = sims.reduce((a, b) => a + b.final, 0) / 5;
    const maxDd = Math.max(...sims.map(s => s.maxDrawdown));
    const isProfitable = avgFinal > startingBalance;

    return { 
      simulations: chartData, 
      stats: { avgFinal, maxDd, isProfitable }
    };
  }, [winRate, riskReward, trades, riskPerTrade, startingBalance, seed]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Dices className="w-6 h-6 text-primary" /> Monte Carlo Simulator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Visualize probability and sequence of returns over multiple trade samples.</p>
          </div>
          <button 
            onClick={() => setSeed(s => s + 1)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition"
          >
            <RefreshCw className="w-4 h-4 text-primary" /> Run Again
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-card border border-border p-5 rounded-lg space-y-4 h-fit">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Win Rate (%)</label>
              <input type="number" min="1" max="99" value={winRate} onChange={e => setWinRate(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Risk : Reward Ratio (1:X)</label>
              <input type="number" step="0.1" value={riskReward} onChange={e => setRiskReward(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Number of Trades</label>
              <input type="number" max="1000" value={trades} onChange={e => setTrades(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Risk %</label>
                <input type="number" step="0.5" value={riskPerTrade} onChange={e => setRiskPerTrade(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Balance</label>
                <input type="number" value={startingBalance} onChange={e => setStartingBalance(Number(e.target.value))} className="w-full p-2 border border-input rounded bg-background font-mono" />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-border space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Expected Edge (EV)</span>
                <span className={`font-mono font-bold ${((winRate/100)*riskReward - (1 - winRate/100)) > 0 ? "text-bull" : "text-bear"}`}>
                  {(((winRate/100)*riskReward - (1 - winRate/100))).toFixed(2)}R
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Est. Max Drawdown</span>
                <span className="font-mono text-bear">-{stats.maxDd.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Avg Final Balance</span>
                <span className={`font-mono font-bold text-lg ${stats.isProfitable ? "text-bull" : "text-bear"}`}>
                  ${Math.round(stats.avgFinal).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 bg-card border border-border p-5 rounded-lg h-[500px] flex flex-col">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">5 Parallel Equity Curves</h3>
            <div className="flex-1 min-h-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulations} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="trade" tick={{fill: "var(--muted-foreground)", fontSize: 11}} minTickGap={30} />
                  <YAxis tick={{fill: "var(--muted-foreground)", fontSize: 11}} tickFormatter={(v) => `$${v}`} width={60} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                  />
                  <Line type="monotone" dataKey="sim1" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="sim2" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="sim3" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="sim4" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="sim5" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Zap, Trophy, TrendingUp, ArrowRight, Target, BarChart3, Clock } from "lucide-react";
import { displayPair } from "@/lib/engine/deriv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DivergenceIQ — Forex Divergence & Auto Signals" },
      { name: "description", content: "AI-powered forex divergence scanner with multi-indicator confluence, live Deriv data, and Telegram signal alerts." },
      { property: "og:title", content: "DivergenceIQ — Forex Divergence & Auto Signals" },
      { property: "og:description", content: "Catch high-probability reversals with multi-indicator divergence + confluence scoring across all timeframes." },
    ],
  }),
  component: Dashboard,
});

interface Sig {
  id: string; pair: string; timeframe: string; direction: "BUY" | "SELL";
  score: number; rating: string; created_at: string;
  status?: string; result?: string | null;
}

function Dashboard() {
  const [signals, setSignals] = useState<Sig[]>([]);
  useEffect(() => {
    supabase.from("signals").select("id,pair,timeframe,direction,score,rating,created_at,status,result")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setSignals((data as Sig[]) ?? []));
    const ch = supabase.channel("signals-dash")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signals" },
        (p) => setSignals(prev => [p.new as Sig, ...prev].slice(0, 200)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "signals" },
        (p) => setSignals(prev => prev.map(s => s.id === (p.new as any).id ? { ...s, ...(p.new as any) } : s)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const today = signals.filter(s => Date.now() - new Date(s.created_at).getTime() < 86400000);
  const elite = today.filter(s => s.score >= 80);
  const buys = today.filter(s => s.direction === "BUY").length;
  const sells = today.length - buys;

  // Performance analytics
  const analytics = useMemo(() => {
    const closed = signals.filter(s => {
      const r = (s.result || "").toUpperCase();
      return r.startsWith("TP") || r === "WIN" || r === "SL" || r === "LOSS";
    });
    const wins = closed.filter(s => {
      const r = (s.result || "").toUpperCase();
      return r.startsWith("TP") || r === "WIN";
    }).length;
    const losses = closed.length - wins;
    const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
    
    // Best pair
    const pairStats = new Map<string, { wins: number; total: number }>();
    closed.forEach(s => {
      const stat = pairStats.get(s.pair) || { wins: 0, total: 0 };
      stat.total++;
      const r = (s.result || "").toUpperCase();
      if (r.startsWith("TP") || r === "WIN") stat.wins++;
      pairStats.set(s.pair, stat);
    });
    let bestPair = "-";
    let bestRate = 0;
    pairStats.forEach((stat, pair) => {
      if (stat.total >= 3) {
        const rate = stat.wins / stat.total;
        if (rate > bestRate) {
          bestRate = rate;
          bestPair = pair;
        }
      }
    });

    // Hourly distribution
    const hours = Array(24).fill(0);
    today.forEach(s => {
      const h = new Date(s.created_at).getUTCHours();
      hours[h]++;
    });
    const peakHour = hours.indexOf(Math.max(...hours));

    return { winRate, wins, losses, closed: closed.length, bestPair, bestRate: Math.round(bestRate * 100), peakHour };
  }, [signals, today]);

  // Only signals that haven't hit TP or SL yet
  const valid = signals.filter(s => {
    const r = (s.result || "").toUpperCase();
    if (r.startsWith("TP") || r === "SL" || r === "WIN" || r === "LOSS") return false;
    if (s.status && !["active", "open", "pending"].includes(s.status.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time confluence divergence signals • Updated live</p>
          </div>
          <Link to="/scanner" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition w-fit">
            Run Live Scan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Stat icon={Zap} label="Signals (24h)" value={today.length} sub={`${buys} BUY · ${sells} SELL`} accent="bull" />
          <Stat icon={Trophy} label="Elite Today" value={elite.length} sub="Score ≥ 80" accent="elite" />
          <Stat icon={Target} label="Win Rate" value={`${analytics.winRate}%`} sub={`${analytics.wins}W / ${analytics.losses}L`} accent={analytics.winRate >= 60 ? "bull" : undefined} />
          <Stat icon={TrendingUp} label="Active Now" value={valid.length} sub="Open positions" />
        </div>

        <div className="grid md:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-lg border border-border bg-gradient-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Best Pair (7d)</span>
              <BarChart3 className="w-4 h-4 text-bull" />
            </div>
            <div className="text-xl font-bold font-mono">{analytics.bestPair !== "-" ? displayPair(analytics.bestPair) : "-"}</div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">{analytics.bestPair !== "-" ? `${analytics.bestRate}% win rate` : "Need more data"}</div>
          </div>
          <div className="rounded-lg border border-border bg-gradient-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Peak Activity</span>
              <Clock className="w-4 h-4 text-elite" />
            </div>
            <div className="text-xl font-bold font-mono">{analytics.peakHour.toString().padStart(2, '0')}:00 UTC</div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">Most signals today</div>
          </div>
          <div className="rounded-lg border border-border bg-gradient-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Tracked</span>
              <Activity className="w-4 h-4 text-foreground" />
            </div>
            <div className="text-xl font-bold font-mono">{signals.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">{analytics.closed} closed • {signals.length - analytics.closed} open</div>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Opportunities</h2>
            <Link to="/signals" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {valid.slice(0, 6).map((s) => (
              <Link key={s.id} to="/signals" className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-accent/40 transition">
                <div className="flex items-center gap-3 font-mono text-sm">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.rating === "ELITE" ? "bg-elite/20 text-elite" : s.rating === "STRONG" ? "bg-bull/20 text-bull" : "bg-muted text-muted-foreground"}`}>
                    {s.rating}
                  </span>
                  <span className="font-semibold">{displayPair(s.pair)}</span>
                  <span className="text-muted-foreground">{s.timeframe}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className={s.direction === "BUY" ? "text-bull" : "text-bear"}>{s.direction}</span>
                  <span className="text-muted-foreground">{s.score}/100</span>
                </div>
              </Link>
            ))}
            {valid.length === 0 && (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                No signals yet. <Link to="/scanner" className="text-primary underline">Run a live scan</Link> to generate your first signals.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: number | string; sub?: string; accent?: "bull" | "elite" }) {
  const c = accent === "bull" ? "text-bull" : accent === "elite" ? "text-elite" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-gradient-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${c}`} />
      </div>
      <div className={`text-2xl md:text-3xl font-bold font-mono ${c}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1 font-mono">{sub}</div>}
    </div>
  );
}

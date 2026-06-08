import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Play, Square, AlertTriangle, Activity, Brain, Zap } from "lucide-react";
import { toast } from "sonner";
import { loadBot, saveBot, DEFAULT_BOT, type BotSettings } from "@/lib/bot/store";
import { botRunner } from "@/lib/bot/runner";
import { ALL_ASSETS } from "@/lib/engine/deriv";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTraining } from "@/hooks/use-realtime-training";

export const Route = createFileRoute("/bot")({
  head: () => ({ meta: [
    { title: "Auto-Trader Bot — DivergenceIQ" },
    { name: "description", content: "Perpetual scalper bot with risk controls, demo/real toggle, max open trades, cooldown, and fixed lot sizing." },
  ]}),
  component: BotPage,
});

function BotPage() {
  const [s, setS] = useState<BotSettings>(DEFAULT_BOT);
  const [logs, setLogs] = useState<string[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [status, setStatus] = useState(botRunner.getStatus());
  const [neuralEnabled, setNeuralEnabled] = useState(true);
  const { trainingStats, predict } = useRealtimeTraining();

  useEffect(() => { setS(loadBot()); }, []);
  useEffect(() => {
    const off = botRunner.on((l) => setLogs(prev => [`${new Date().toLocaleTimeString()} · ${l}`, ...prev].slice(0, 60)));
    const i = setInterval(() => setStatus(botRunner.getStatus()), 1000);
    return () => { off(); clearInterval(i); };
  }, []);
  useEffect(() => {
    supabase.from("bot_trades").select("*").order("created_at",{ascending:false}).limit(20)
      .then(({data}) => setTrades(data||[]));
    const ch = supabase.channel("bot_trades_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_trades" },
        () => supabase.from("bot_trades").select("*").order("created_at",{ascending:false}).limit(20).then(({data})=>setTrades(data||[])))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const update = <K extends keyof BotSettings>(k: K, v: BotSettings[K]) => {
    const next = { ...s, [k]: v }; setS(next); saveBot(next);
  };
  const toggleInstrument = (sym: string) => {
    const set = new Set(s.instruments);
    set.has(sym) ? set.delete(sym) : set.add(sym);
    update("instruments", Array.from(set));
  };
  const start = async () => {
    if (s.accountType === "real" && !confirm("Start REAL-money trading? Trades will execute on your live Deriv account.")) return;
    await botRunner.start(s);
    toast.success(`Bot running · ${s.accountType.toUpperCase()}`);
  };
  const stop = async () => { await botRunner.stop(); toast.message("Bot stopped"); };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Bot className="w-6 h-6 text-primary"/> Auto-Trader Bot</h1>
          <p className="text-sm text-muted-foreground">Perpetual scalper. Trades only when a fresh signal meets your risk thresholds.</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Status</div>
              <div className={`text-lg font-bold ${status==="running"?"text-bull":status==="halted"?"text-bear":"text-muted-foreground"}`}>{status.toUpperCase()}</div>
              <div className="text-[11px] text-muted-foreground">Open: {botRunner.getOpenCount()} · Daily PnL: {botRunner.getDailyPnl().toFixed(2)}</div>
            </div>
            <div className="flex gap-2">
              {status !== "running" ? (
                <Button onClick={start}><Play className="w-3.5 h-3.5 mr-1.5"/>Start</Button>
              ) : (
                <Button onClick={stop} variant="destructive"><Square className="w-3.5 h-3.5 mr-1.5"/>Stop</Button>
              )}
            </div>
          </div>

          {/* Neural Net Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg grid place-items-center ${neuralEnabled ? "bg-violet-500/20" : "bg-muted"}`}>
                <Brain className={`w-4 h-4 ${neuralEnabled ? "text-violet-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <div className="text-xs font-medium flex items-center gap-2">
                  Neural Network
                  {trainingStats.isTraining && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bull/20 text-bull animate-pulse">TRAINING</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {trainingStats.accuracy.toFixed(1)}% accuracy • {trainingStats.totalTrained} trades learned
                </div>
              </div>
            </div>
            <button
              onClick={() => setNeuralEnabled(!neuralEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${neuralEnabled ? "bg-violet-500" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${neuralEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-border">
            <div>
              <label className="text-xs text-muted-foreground">Account</label>
              <div className="flex gap-1 mt-1">
                {(["demo","real"] as const).map(t => (
                  <button key={t} onClick={()=>update("accountType",t)}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-bold ${s.accountType===t ? (t==="real"?"bg-bear text-white":"bg-bull text-white") : "bg-muted text-muted-foreground"}`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Deriv API token ({s.accountType})</label>
              <Input type="password" value={s.token} onChange={e=>update("token", e.target.value)} placeholder="paste token (leave empty for dry-run)" />
            </div>
            <div><label className="text-xs text-muted-foreground">Min score</label><Input type="number" value={s.minScore} onChange={e=>update("minScore", +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Lot / stake</label><Input type="number" step="0.1" value={s.lotSize} onChange={e=>update("lotSize", +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Max open</label><Input type="number" value={s.maxOpen} onChange={e=>update("maxOpen", +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Cooldown (s)</label><Input type="number" value={s.cooldownSec} onChange={e=>update("cooldownSec", +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Duration (s)</label><Input type="number" value={s.durationSec} onChange={e=>update("durationSec", +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Daily loss cap</label><Input type="number" value={s.dailyLossCap} onChange={e=>update("dailyLossCap", +e.target.value)} /></div>
          </div>

          {s.accountType === "real" && (
            <div className="flex items-start gap-2 p-3 rounded bg-bear/10 border border-bear/30 text-xs">
              <AlertTriangle className="w-4 h-4 text-bear shrink-0 mt-0.5"/>
              <div>REAL mode places real-money trades on Deriv. Always confirm lot size, max open, and daily cap before starting.</div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="text-sm font-bold uppercase tracking-wider">Instruments ({s.instruments.length})</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 max-h-48 overflow-auto">
            {ALL_ASSETS.map(a => (
              <button key={a.symbol} onClick={()=>toggleInstrument(a.symbol)}
                className={`px-2 py-1 rounded text-[11px] font-mono text-left ${s.instruments.includes(a.symbol) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {a.display}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> Live log</div>
            <div className="space-y-0.5 text-[11px] font-mono max-h-60 overflow-auto">
              {logs.length === 0 ? <div className="text-muted-foreground">no events yet</div> : logs.map((l,i)=><div key={i} className="text-muted-foreground">{l}</div>)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-bold uppercase tracking-wider mb-2">Recent trades</div>
            <div className="space-y-1 text-xs max-h-60 overflow-auto">
              {trades.length === 0 ? <div className="text-muted-foreground">no trades yet</div> : trades.map(t=>(
                <div key={t.id} className="flex items-center justify-between p-1.5 rounded border border-border">
                  <span className="font-mono">{t.pair} {t.direction} {t.lot}</span>
                  <span className={`text-[10px] uppercase ${t.status==="open"?"text-bull":t.status==="error"?"text-bear":"text-muted-foreground"}`}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Play, Square, AlertTriangle, Activity, Brain, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { loadBot, saveBot, DEFAULT_BOT, type BotSettings } from "@/lib/bot/store";
import { botRunner } from "@/lib/bot/runner";
import { ALL_ASSETS } from "@/lib/engine/deriv";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTraining } from "@/hooks/use-realtime-training";

export const Route = createFileRoute("/bot")({
  head: () => ({ meta: [
    { title: "Auto-Trader Bot — DivergenceIQ" },
    { name: "description", content: "Self-scanning Deriv bot with risk controls, dry-run, and real-money modes." },
  ]}),
  component: BotPage,
});

// ----------------------------------------------------------------------------
// NumberField — controlled but text-buffered. Fixes the bug where users could
// not type "0.01" because the legacy `value={n}` + `onChange={+e.target.value}`
// pattern re-renders intermediate strings as "0", clobbering the input.
//
// Behaviour:
//   - shows the user's *exact* typed string while focused (allows ".", trailing
//     zeros, empty),
//   - parses on blur (and after a 250ms idle debounce) into a number via the
//     onCommit callback,
//   - rejects characters that can't be part of a decimal number,
//   - respects optional min/max but never blocks intermediate typing.
// ----------------------------------------------------------------------------
function NumberField({
  value,
  onCommit,
  min,
  max,
  step = "0.01",
  placeholder,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
}) {
  const [buf, setBuf] = useState<string>(value === 0 ? "0" : String(value));
  const focused = useRef(false);

  useEffect(() => {
    // sync external value -> buffer only when not focused, so we don't
    // overwrite the user's in-progress typing.
    if (!focused.current) setBuf(value === 0 ? "0" : String(value));
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === ".") {
      // treat empty / partial as "no change"
      return;
    }
    let n = Number(trimmed);
    if (!Number.isFinite(n)) return;
    if (typeof min === "number") n = Math.max(min, n);
    if (typeof max === "number") n = Math.min(max, n);
    onCommit(n);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      step={step}
      placeholder={placeholder}
      value={buf}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const v = e.target.value;
        // allow only a decimal-number-ish string
        if (/^-?\d*\.?\d*$/.test(v)) setBuf(v);
      }}
      onBlur={(e) => {
        focused.current = false;
        commit(e.target.value);
        // normalise buffer after blur so display is clean
        const parsed = Number(e.target.value);
        if (Number.isFinite(parsed)) {
          setBuf(String(parsed));
        }
      }}
    />
  );
}

function BotPage() {
  const [s, setS] = useState<BotSettings>(DEFAULT_BOT);
  const [logs, setLogs] = useState<string[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [status, setStatus] = useState(botRunner.getStatus());
  const [lastScanAt, setLastScanAt] = useState<number>(0);
  const [neuralEnabled, setNeuralEnabled] = useState(true);
  const { trainingStats } = useRealtimeTraining();

  useEffect(() => { setS(loadBot()); }, []);
  useEffect(() => {
    const off = botRunner.on((l) => setLogs(prev => [`${new Date().toLocaleTimeString()} · ${l}`, ...prev].slice(0, 80)));
    const i = setInterval(() => {
      setStatus(botRunner.getStatus());
      setLastScanAt(botRunner.getLastScanAt?.() ?? 0);
    }, 1000);
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
    if (s.lotSize < 0.01) {
      toast.error("Lot size must be at least 0.01");
      return;
    }
    if (s.instruments.length === 0) {
      toast.error("Pick at least one instrument");
      return;
    }
    if (s.accountType === "real" && !confirm("Start REAL-money trading? Trades will execute on your live Deriv account.")) return;
    try {
      await botRunner.start(s);
      toast.success(`Bot running · ${s.accountType.toUpperCase()}${s.selfScan ? " · self-scan ON" : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "Bot failed to start");
    }
  };
  const stop = async () => { await botRunner.stop(); toast.message("Bot stopped"); };
  const scanAgo = lastScanAt ? Math.round((Date.now() - lastScanAt) / 1000) : null;

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Bot className="w-6 h-6 text-primary"/> Auto-Trader Bot</h1>
          <p className="text-sm text-muted-foreground">Self-scanning scalper. Reads live Deriv candles, calls analyze(), trades on score ≥ threshold.</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Status</div>
              <div className={`text-lg font-bold ${status==="running"?"text-bull":status==="halted"?"text-bear":"text-muted-foreground"}`}>{status.toUpperCase()}</div>
              <div className="text-[11px] text-muted-foreground">
                Open: {botRunner.getOpenCount()} · Daily PnL: {botRunner.getDailyPnl().toFixed(2)}
                {status === "running" && s.selfScan && (
                  <> · <Search className="inline w-3 h-3" /> {scanAgo !== null ? `${scanAgo}s ago` : "scanning…"}</>
                )}
              </div>
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

            <div>
              <label className="text-xs text-muted-foreground">Min score</label>
              <NumberField value={s.minScore} min={0} max={100} step="1" onCommit={(v) => update("minScore", v)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Lot / stake (min 0.01)</label>
              <NumberField value={s.lotSize} min={0.01} max={1000} step="0.01" onCommit={(v) => update("lotSize", v)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max open</label>
              <NumberField value={s.maxOpen} min={1} max={20} step="1" onCommit={(v) => update("maxOpen", Math.round(v))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cooldown (s)</label>
              <NumberField value={s.cooldownSec} min={5} max={3600} step="1" onCommit={(v) => update("cooldownSec", Math.round(v))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duration (s)</label>
              <NumberField value={s.durationSec} min={15} max={3600} step="5" onCommit={(v) => update("durationSec", Math.round(v))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Daily loss cap</label>
              <NumberField value={s.dailyLossCap} min={1} max={100000} step="1" onCommit={(v) => update("dailyLossCap", v)} />
            </div>
          </div>

          {/* Self-scan controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Self-scan
                </label>
                <button
                  type="button"
                  onClick={() => update("selfScan", !s.selfScan)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${s.selfScan ? "bg-primary" : "bg-muted"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${s.selfScan ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Bot polls analyze() on each instrument and triggers trades when score ≥ Min score.
                Required if you don't have an external signals producer.
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Scan interval (s)</label>
              <NumberField value={s.scanIntervalSec} min={5} max={600} step="5" onCommit={(v) => update("scanIntervalSec", Math.round(v))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Scan timeframe</label>
              <select
                value={s.scanTimeframe}
                onChange={(e) => update("scanTimeframe", e.target.value as BotSettings["scanTimeframe"])}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="M1">M1</option>
                <option value="M5">M5</option>
                <option value="M15">M15</option>
                <option value="M30">M30</option>
                <option value="H1">H1</option>
              </select>
            </div>
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

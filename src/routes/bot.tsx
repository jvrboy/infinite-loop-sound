import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Power,
  Radio,
  Zap,
  AlertTriangle,
  Activity,
  ShieldAlert,
  Layers,
  Target,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadBot,
  saveBot,
  validateSettings,
  DEFAULT_BOT,
  MAX_CONCURRENT_TRADES,
  type BotSettings,
  type BotMode,
} from "@/lib/bot/store";
import { botRunner, type ClosedTrade, type OpenPosition, type RunStatus, type TradeResult } from "@/lib/bot/runner";
import { ALL_ASSETS, displayPair } from "@/lib/engine/deriv";

export const Route = createFileRoute("/bot")({
  head: () => ({
    meta: [
      { title: "Auto-Trader Bot — DivergenceIQ" },
      { name: "description", content: "Automated Deriv trading bot with Signal and Perpetual Scalper modes, martingale sizing, and risk controls." },
    ],
  }),
  component: BotPage,
});

// ----------------------------------------------------------------------------
// NumberField — controlled but text-buffered so users can type "0.01" etc.
// ----------------------------------------------------------------------------
function NumberField({
  value,
  onCommit,
  min,
  max,
  step = "0.01",
  placeholder,
  disabled,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [buf, setBuf] = useState<string>(value === 0 ? "0" : String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setBuf(value === 0 ? "0" : String(value));
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === ".") return;
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
      disabled={disabled}
      value={buf}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (/^-?\d*\.?\d*$/.test(v)) setBuf(v);
      }}
      onBlur={(e) => {
        focused.current = false;
        commit(e.target.value);
        const parsed = Number(e.target.value);
        if (Number.isFinite(parsed)) setBuf(String(parsed));
      }}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const MODE_META: Record<BotMode, { label: string; icon: typeof Power; desc: string; accent: string }> = {
  off: { label: "OFF", icon: Power, desc: "Bot inactive. No trades or monitoring.", accent: "muted" },
  signal: { label: "SIGNAL", icon: Radio, desc: "Trades each new signal. One trade per signal.", accent: "primary" },
  scalper: { label: "SCALPER", icon: Zap, desc: "Perpetual scalper. Opens & closes trades 24/7.", accent: "bull" },
};

function BotPage() {
  const [s, setS] = useState<BotSettings>(DEFAULT_BOT);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<RunStatus>(botRunner.getStatus());
  // tick: forces re-render whenever the runner emits a change.
  const [, setTick] = useState(0);

  useEffect(() => {
    setS(loadBot());
  }, []);

  useEffect(() => {
    const offLog = botRunner.on((l) => setLogs((prev) => [`${new Date().toLocaleTimeString()} · ${l}`, ...prev].slice(0, 100)));
    const offChange = botRunner.onChange(() => {
      setStatus(botRunner.getStatus());
      setTick((t) => t + 1);
    });
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      offLog();
      offChange();
      clearInterval(i);
    };
  }, []);

  const update = <K extends keyof BotSettings>(k: K, v: BotSettings[K]) => {
    const next = { ...s, [k]: v };
    setS(next);
    saveBot(next);
  };

  const toggleInstrument = (sym: string) => {
    const set = new Set(s.instruments);
    set.has(sym) ? set.delete(sym) : set.add(sym);
    update("instruments", Array.from(set));
  };

  const applyMode = async (mode: BotMode) => {
    if (mode === s.mode && status === "running") return;
    const next = { ...s, mode };

    if (mode === "off") {
      setS(next);
      saveBot(next);
      await botRunner.stop();
      toast.message("Bot turned OFF");
      return;
    }

    const errors = validateSettings(next);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    if (next.accountType === "real" && !confirm(`Start REAL-money trading in ${mode.toUpperCase()} mode? Trades will execute on your live Deriv account.`)) {
      return;
    }

    setS(next);
    saveBot(next);
    try {
      await botRunner.start(next);
      toast.success(`Bot running · ${mode.toUpperCase()} · ${next.accountType.toUpperCase()}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bot failed to start");
      const off = { ...next, mode: "off" as BotMode };
      setS(off);
      saveBot(off);
    }
  };

  const emergency = async () => {
    if (!confirm("EMERGENCY STOP — close ALL open positions immediately and turn the bot OFF?")) return;
    await botRunner.emergencyStop();
    setS((prev) => ({ ...prev, mode: "off" }));
    saveBot({ ...s, mode: "off" });
    toast.error("Emergency stop executed — all positions closed");
  };

  const openCount = botRunner.getOpenCount();
  const queueLen = botRunner.getQueueLength();
  const sessionPnl = botRunner.getSessionPnl();
  const { wins, losses } = botRunner.getWinLoss();
  const lastResult: TradeResult = botRunner.getLastResult();
  const nextLot = botRunner.getNextLot();
  const openPositions: OpenPosition[] = botRunner.getOpenPositions();
  const closed: ClosedTrade[] = botRunner.getRecentClosed(40);
  const lastActionAt = botRunner.getLastActionAt();
  const actionAgo = lastActionAt ? Math.round((Date.now() - lastActionAt) / 1000) : null;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  const isRunning = status === "running";

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" /> Auto-Trader Bot
            </h1>
            <p className="text-sm text-muted-foreground">
              Automated Deriv trading with Signal and Perpetual Scalper modes, martingale sizing, and built-in risk controls.
            </p>
          </div>
          <Button onClick={emergency} variant="destructive" className="gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Emergency Stop
          </Button>
        </div>

        {/* ── Mode control panel ─────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="text-sm font-bold uppercase tracking-wider">Bot Mode</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(MODE_META) as BotMode[]).map((m) => {
              const meta = MODE_META[m];
              const Icon = meta.icon;
              const active = s.mode === m;
              const activeRunning = active && (m === "off" || isRunning);
              return (
                <button
                  key={m}
                  onClick={() => applyMode(m)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    activeRunning
                      ? m === "scalper"
                        ? "border-bull bg-bull/10"
                        : m === "signal"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold">
                      <Icon className={`w-4 h-4 ${activeRunning && m !== "off" ? (m === "scalper" ? "text-bull" : "text-primary") : "text-muted-foreground"}`} />
                      {meta.label}
                    </span>
                    {activeRunning && m !== "off" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bull/20 text-bull animate-pulse">LIVE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{meta.desc}</p>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                status === "running" ? "bg-bull animate-pulse" : status === "halted" ? "bg-bear" : "bg-muted-foreground"
              }`}
            />
            Status: <span className="font-bold uppercase text-foreground">{status}</span>
            {status === "running" && actionAgo !== null && <span>· last action {actionAgo}s ago</span>}
            {queueLen > 0 && <span>· {queueLen} queued</span>}
          </div>
        </div>

        {/* ── Live dashboard ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Open Trades
            </div>
            <div className="text-2xl font-bold mt-1">
              {openCount} <span className="text-sm text-muted-foreground">/ {s.maxOpen}</span>
            </div>
            {queueLen > 0 && <div className="text-[11px] text-muted-foreground">{queueLen} queued</div>}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" /> Session P&amp;L
            </div>
            <div className={`text-2xl font-bold mt-1 ${sessionPnl > 0 ? "text-bull" : sessionPnl < 0 ? "text-bear" : ""}`}>
              {sessionPnl >= 0 ? "+" : ""}
              {sessionPnl.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted-foreground">{wins}W / {losses}L · {winRate.toFixed(0)}%</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Last Result
            </div>
            <div
              className={`text-2xl font-bold mt-1 ${
                lastResult === "WIN" ? "text-bull" : lastResult === "LOSS" ? "text-bear" : "text-muted-foreground"
              }`}
            >
              {lastResult}
            </div>
            <div className="text-[11px] text-muted-foreground">{closed[0] ? displayPair(closed[0].pair) : "—"}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground uppercase flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Next Lot
            </div>
            <div className="text-2xl font-bold mt-1">{nextLot.toFixed(2)}</div>
            <div className="text-[11px] text-muted-foreground">
              {s.positionSizing === "martingale" ? `martingale ×${s.martingaleMultiplier}` : "fixed"}
            </div>
          </div>
        </div>

        {/* ── Settings ───────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="text-sm font-bold uppercase tracking-wider">Configuration</div>

          {/* Account + token */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Account">
              <div className="flex gap-1">
                {(["demo", "real"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => update("accountType", t)}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-bold ${
                      s.accountType === t ? (t === "real" ? "bg-bear text-white" : "bg-bull text-white") : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>
            <div className="md:col-span-2">
              <Field label={`Deriv API token (${s.accountType})`}>
                <Input type="password" value={s.token} onChange={(e) => update("token", e.target.value)} placeholder="paste token (leave empty for dry-run)" />
              </Field>
            </div>
          </div>

          {/* Position sizing */}
          <div className="pt-3 border-t border-border space-y-3">
            <div className="text-xs font-bold uppercase text-muted-foreground">Position Sizing</div>
            <div className="flex gap-2">
              {(["fixed", "martingale"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => update("positionSizing", m)}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${s.positionSizing === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {m === "fixed" ? "FIXED LOT" : "MARTINGALE"}
                </button>
              ))}
            </div>
            {s.positionSizing === "fixed" ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Lot size (min 0.01)">
                  <NumberField value={s.lotSize} min={0.01} max={1000} step="0.01" onCommit={(v) => update("lotSize", v)} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Base lot">
                  <NumberField value={s.martingaleBase} min={0.01} max={1000} step="0.01" onCommit={(v) => update("martingaleBase", v)} />
                </Field>
                <Field label="Multiplier (on loss)">
                  <NumberField value={s.martingaleMultiplier} min={1.1} max={10} step="0.1" onCommit={(v) => update("martingaleMultiplier", v)} />
                </Field>
                <Field label="Max lot (cap)">
                  <NumberField value={s.martingaleMaxLot} min={s.martingaleBase} max={1000} step="0.01" onCommit={(v) => update("martingaleMaxLot", v)} />
                </Field>
              </div>
            )}
          </div>

          {/* TP source */}
          <div className="pt-3 border-t border-border space-y-3">
            <div className="text-xs font-bold uppercase text-muted-foreground">Take Profit Source</div>
            <div className="flex gap-2">
              {(["fixed", "system"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => update("tpSource", m)}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${s.tpSource === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {m === "fixed" ? "FIXED TP" : "SYSTEM-BASED"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {s.tpSource === "fixed" && (
                <Field label="Fixed TP (pips)">
                  <NumberField value={s.fixedTpPips} min={1} max={5000} step="1" onCommit={(v) => update("fixedTpPips", Math.round(v))} />
                </Field>
              )}
              {s.mode === "scalper" && (
                <>
                  <Field label="Scalper TP (pips)">
                    <NumberField value={s.scalperTpPips} min={1} max={5000} step="1" onCommit={(v) => update("scalperTpPips", Math.round(v))} />
                  </Field>
                  <Field label="Scalper SL (pips)">
                    <NumberField value={s.scalperSlPips} min={1} max={5000} step="1" onCommit={(v) => update("scalperSlPips", Math.round(v))} />
                  </Field>
                </>
              )}
            </div>
            {s.tpSource === "system" && (
              <p className="text-[11px] text-muted-foreground">
                System-based: signal mode uses each signal&apos;s engine TP/SL; scalper uses the scalper TP/SL above.
              </p>
            )}
          </div>

          {/* Risk / management */}
          <div className="pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label={`Max concurrent (1-${MAX_CONCURRENT_TRADES})`}>
              <NumberField value={s.maxOpen} min={1} max={MAX_CONCURRENT_TRADES} step="1" onCommit={(v) => update("maxOpen", Math.round(v))} />
            </Field>
            <Field label="Cooldown (s)">
              <NumberField value={s.cooldownSec} min={0} max={3600} step="1" onCommit={(v) => update("cooldownSec", Math.round(v))} />
            </Field>
            <Field label="Max duration (s)">
              <NumberField value={s.durationSec} min={15} max={3600} step="5" onCommit={(v) => update("durationSec", Math.round(v))} />
            </Field>
            <Field label="Daily loss cap">
              <NumberField value={s.dailyLossCap} min={1} max={100000} step="1" onCommit={(v) => update("dailyLossCap", v)} />
            </Field>
          </div>

          {/* Signal-mode self-scan */}
          {s.mode !== "scalper" && (
            <div className="pt-3 border-t border-border grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Min signal score">
                <NumberField value={s.minScore} min={0} max={100} step="1" onCommit={(v) => update("minScore", Math.round(v))} />
              </Field>
              <Field label="Scan interval (s)">
                <NumberField value={s.scanIntervalSec} min={5} max={600} step="5" onCommit={(v) => update("scanIntervalSec", Math.round(v))} />
              </Field>
              <Field label="Scan timeframe">
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
              </Field>
            </div>
          )}

          {/* Guardrails */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div>
              <div className="text-xs font-medium">Allow weekend trading</div>
              <p className="text-[11px] text-muted-foreground">When off, forex/indices are blocked Sat–Sun. Synthetics always trade 24/7.</p>
            </div>
            <button
              type="button"
              onClick={() => update("allowWeekends", !s.allowWeekends)}
              className={`relative w-10 h-5 rounded-full transition-colors ${s.allowWeekends ? "bg-primary" : "bg-muted"}`}
              aria-label="Toggle weekend trading"
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${s.allowWeekends ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {s.accountType === "real" && (
            <div className="flex items-start gap-2 p-3 rounded bg-bear/10 border border-bear/30 text-xs">
              <AlertTriangle className="w-4 h-4 text-bear shrink-0 mt-0.5" />
              <div>REAL mode places real-money trades on Deriv. Always confirm sizing, max open, and daily cap before starting.</div>
            </div>
          )}
        </div>

        {/* ── Instruments ────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="text-sm font-bold uppercase tracking-wider">Instruments ({s.instruments.length})</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 max-h-48 overflow-auto">
            {ALL_ASSETS.map((a) => (
              <button
                key={a.symbol}
                onClick={() => toggleInstrument(a.symbol)}
                className={`px-2 py-1 rounded text-[11px] font-mono text-left ${
                  s.instruments.includes(a.symbol) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {a.display}
              </button>
            ))}
          </div>
        </div>

        {/* ── Live log + open positions ──────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Live log
            </div>
            <div className="space-y-0.5 text-[11px] font-mono max-h-60 overflow-auto">
              {logs.length === 0 ? <div className="text-muted-foreground">no events yet</div> : logs.map((l, i) => <div key={i} className="text-muted-foreground">{l}</div>)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-bold uppercase tracking-wider mb-2">Open positions ({openPositions.length})</div>
            <div className="space-y-1 text-xs max-h-60 overflow-auto">
              {openPositions.length === 0 ? (
                <div className="text-muted-foreground">no open positions</div>
              ) : (
                openPositions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-1.5 rounded border border-border">
                    <span className="font-mono">
                      {displayPair(p.pair)} <span className={p.direction === "BUY" ? "text-bull" : "text-bear"}>{p.direction}</span> {p.lot}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      TP {p.tpPips}p / SL {p.slPips}p
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Trade history ──────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold uppercase tracking-wider">Trade history (session)</div>
            <Button size="sm" variant="outline" onClick={() => botRunner.resetSession()}>
              Reset session
            </Button>
          </div>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground sticky top-0 bg-card">
                <tr className="text-left border-b border-border">
                  <th className="py-1.5 pr-2 font-medium">Time</th>
                  <th className="py-1.5 pr-2 font-medium">Symbol</th>
                  <th className="py-1.5 pr-2 font-medium">Dir</th>
                  <th className="py-1.5 pr-2 font-medium">Lot</th>
                  <th className="py-1.5 pr-2 font-medium">Entry</th>
                  <th className="py-1.5 pr-2 font-medium">Exit</th>
                  <th className="py-1.5 pr-2 font-medium">TP/SL</th>
                  <th className="py-1.5 pr-2 font-medium text-right">P&amp;L</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Result</th>
                </tr>
              </thead>
              <tbody>
                {closed.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-muted-foreground">
                      no closed trades yet
                    </td>
                  </tr>
                ) : (
                  closed.map((t) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-1.5 pr-2 font-mono text-muted-foreground">{new Date(t.openedAt).toLocaleTimeString()}</td>
                      <td className="py-1.5 pr-2 font-mono">{displayPair(t.pair)}</td>
                      <td className={`py-1.5 pr-2 font-bold ${t.direction === "BUY" ? "text-bull" : "text-bear"}`}>{t.direction}</td>
                      <td className="py-1.5 pr-2 font-mono">{t.lot}</td>
                      <td className="py-1.5 pr-2 font-mono">{t.entry.toFixed(5)}</td>
                      <td className="py-1.5 pr-2 font-mono">{t.exit.toFixed(5)}</td>
                      <td className="py-1.5 pr-2 font-mono text-muted-foreground">
                        {t.tpPips}/{t.slPips}p
                      </td>
                      <td className={`py-1.5 pr-2 font-mono text-right ${t.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                        {t.pnl >= 0 ? "+" : ""}
                        {t.pnl.toFixed(2)}
                      </td>
                      <td className={`py-1.5 pr-2 text-right font-bold ${t.result === "WIN" ? "text-bull" : "text-bear"}`}>{t.result}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

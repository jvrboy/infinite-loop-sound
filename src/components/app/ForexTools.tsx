import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calculator,
  Clock,
  DollarSign,
  Globe2,
  Percent,
  Radio,
  Scale,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deriv, FOREX_PAIRS } from "@/lib/engine/deriv";

type Tick = { quote: number; epoch: number };
type Pair = { symbol: string; label: string; code: string };

const PAIRS: Pair[] = FOREX_PAIRS.slice(0, 10).map((pair) => ({
  symbol: pair.symbol,
  label: pair.display,
  code: pair.symbol.replace(/^frx/, ""),
}));

const DEFAULT_SYMBOL = "frxEURUSD";

function pipSize(code: string) {
  return code.endsWith("JPY") ? 0.01 : 0.0001;
}

function decimals(code: string) {
  return code.endsWith("JPY") ? 3 : 5;
}

function useLiveForex() {
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const [history, setHistory] = useState<Record<string, Tick[]>>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribers: Array<() => void> = [];

    deriv
      .connect()
      .then(() => {
        if (!active) return;
        setConnected(true);
        setError(null);
        for (const pair of PAIRS) {
          unsubscribers.push(
            deriv.subscribeTicks(pair.symbol, (tick) => {
              if (!active) return;
              setTicks((current) => ({ ...current, [pair.symbol]: tick }));
              setHistory((current) => {
                const next = [...(current[pair.symbol] ?? []), tick].slice(-90);
                return { ...current, [pair.symbol]: next };
              });
            }),
          );
        }
      })
      .catch(() => {
        if (active) setError("Live market feed unavailable");
      });

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return { ticks, history, connected, error };
}

function pairBySymbol(symbol: string) {
  return PAIRS.find((pair) => pair.symbol === symbol) ?? PAIRS[0];
}

function PairSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring"
    >
      {PAIRS.map((pair) => (
        <option key={pair.symbol} value={pair.symbol}>{pair.label}</option>
      ))}
    </select>
  );
}

function LiveMarketStrip({ ticks, history, selected, onSelect }: {
  ticks: Record<string, Tick>;
  history: Record<string, Tick[]>;
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {PAIRS.slice(0, 10).map((pair) => {
        const tick = ticks[pair.symbol];
        const recent = history[pair.symbol] ?? [];
        const prev = recent.length > 1 ? recent[recent.length - 2].quote : tick?.quote;
        const change = tick && prev ? tick.quote - prev : 0;
        const up = change >= 0;
        return (
          <button
            key={pair.symbol}
            onClick={() => onSelect(pair.symbol)}
            className={`rounded-lg border p-3 text-left transition ${selected === pair.symbol ? "border-primary bg-primary/10" : "border-border bg-card/80 hover:border-primary/50"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{pair.label}</span>
              {tick ? (
                up ? <ArrowUp className="h-3.5 w-3.5 text-bull" /> : <ArrowDown className="h-3.5 w-3.5 text-bear" />
              ) : <Radio className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            <div className="mt-2 font-mono text-lg font-bold tabular">
              {tick ? tick.quote.toFixed(decimals(pair.code)) : "—"}
            </div>
            <div className={`mt-1 font-mono text-[11px] ${up ? "text-bull" : "text-bear"}`}>
              {tick ? `${up ? "+" : ""}${(change / pipSize(pair.code)).toFixed(1)} pips` : "waiting for tick"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PipCalc({ selected, livePrice }: { selected: Pair; livePrice?: number }) {
  const [lots, setLots] = useState(1);
  const [account, setAccount] = useState("USD");
  const pip = pipSize(selected.code);
  const rawValue = pip * 100_000 * lots;
  const value = selected.code.endsWith(account) ? rawValue : selected.code.startsWith(account) && livePrice ? rawValue / livePrice : rawValue;

  return (
    <ToolCard icon={Calculator} title="Pip Value" status={livePrice ? "Live price linked" : "Waiting for feed"}>
      <Row>
        <Field label="Pair"><div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-mono">{selected.label}</div></Field>
        <Field label="Lots"><Input type="number" step="0.01" value={lots} onChange={(event) => setLots(Number(event.target.value) || 0)} /></Field>
        <Field label="Account"><Input value={account} maxLength={3} onChange={(event) => setAccount(event.target.value.toUpperCase())} /></Field>
      </Row>
      <Result label="Value per pip" highlight>{value.toFixed(2)} {account}</Result>
    </ToolCard>
  );
}

function PositionSizeCalc({ selected }: { selected: Pair }) {
  const [balance, setBalance] = useState(10_000);
  const [risk, setRisk] = useState(1);
  const [stopPips, setStopPips] = useState(20);
  const pipValuePerLot = selected.code.endsWith("JPY") ? 9.2 : 10;
  const riskAmount = balance * (risk / 100);
  const lots = stopPips > 0 ? riskAmount / (stopPips * pipValuePerLot) : 0;

  return (
    <ToolCard icon={Scale} title="Position Size" status="Risk based sizing">
      <Row>
        <Field label="Balance"><Input type="number" value={balance} onChange={(event) => setBalance(Number(event.target.value) || 0)} /></Field>
        <Field label="Risk %"><Input type="number" step="0.1" value={risk} onChange={(event) => setRisk(Number(event.target.value) || 0)} /></Field>
        <Field label="Stop pips"><Input type="number" value={stopPips} onChange={(event) => setStopPips(Number(event.target.value) || 0)} /></Field>
      </Row>
      <Result label="Risk amount">${riskAmount.toFixed(2)}</Result>
      <Result label="Lot size" highlight>{lots.toFixed(2)} lots</Result>
    </ToolCard>
  );
}

function MarginCalc({ selected, livePrice }: { selected: Pair; livePrice?: number }) {
  const [lots, setLots] = useState(1);
  const [leverage, setLeverage] = useState(100);
  const price = livePrice ?? 0;
  const notional = price * 100_000 * lots;
  const margin = leverage > 0 ? notional / leverage : 0;

  return (
    <ToolCard icon={DollarSign} title="Margin Required" status={livePrice ? "Using live quote" : "Waiting for quote"}>
      <Row>
        <Field label="Pair"><div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-mono">{selected.label}</div></Field>
        <Field label="Lots"><Input type="number" step="0.01" value={lots} onChange={(event) => setLots(Number(event.target.value) || 0)} /></Field>
        <Field label="Leverage"><Input type="number" value={leverage} onChange={(event) => setLeverage(Number(event.target.value) || 1)} /></Field>
      </Row>
      <Result label="Notional">${notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Result>
      <Result label="Margin" highlight>${margin.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Result>
    </ToolCard>
  );
}

function RiskRewardCalc({ selected, livePrice }: { selected: Pair; livePrice?: number }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [stopPips, setStopPips] = useState(25);
  const [targetPips, setTargetPips] = useState(60);
  const pip = pipSize(selected.code);
  const entry = livePrice ?? 0;
  const stop = side === "BUY" ? entry - stopPips * pip : entry + stopPips * pip;
  const target = side === "BUY" ? entry + targetPips * pip : entry - targetPips * pip;
  const rr = stopPips > 0 ? targetPips / stopPips : 0;
  const breakEven = rr > 0 ? (1 / (1 + rr)) * 100 : 0;

  return (
    <ToolCard icon={Percent} title="Risk / Reward" status="Live entry assisted">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={side === "BUY" ? "default" : "outline"} onClick={() => setSide("BUY")}>BUY</Button>
        <Button type="button" variant={side === "SELL" ? "default" : "outline"} onClick={() => setSide("SELL")}>SELL</Button>
      </div>
      <Row>
        <Field label="Stop pips"><Input type="number" value={stopPips} onChange={(event) => setStopPips(Number(event.target.value) || 0)} /></Field>
        <Field label="Target pips"><Input type="number" value={targetPips} onChange={(event) => setTargetPips(Number(event.target.value) || 0)} /></Field>
      </Row>
      <Result label="Stop / target">{livePrice ? `${stop.toFixed(decimals(selected.code))} / ${target.toFixed(decimals(selected.code))}` : "—"}</Result>
      <Result label="R multiple" highlight>1 : {rr.toFixed(2)}</Result>
      <Result label="Breakeven win rate">{breakEven.toFixed(1)}%</Result>
    </ToolCard>
  );
}

function PnlCalc({ selected }: { selected: Pair }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [entry, setEntry] = useState(selected.code.endsWith("JPY") ? 156.5 : 1.085);
  const [exit, setExit] = useState(selected.code.endsWith("JPY") ? 157.1 : 1.091);
  const [lots, setLots] = useState(1);
  const pip = pipSize(selected.code);
  const pips = ((side === "BUY" ? exit - entry : entry - exit) / pip) || 0;
  const usd = pips * (selected.code.endsWith("JPY") ? 9.2 : 10) * lots;

  useEffect(() => {
    setEntry(selected.code.endsWith("JPY") ? 156.5 : 1.085);
    setExit(selected.code.endsWith("JPY") ? 157.1 : 1.091);
  }, [selected.code]);

  return (
    <ToolCard icon={TrendingUp} title="Profit / Loss" status="Manual trade planner">
      <Row>
        <Field label="Side">
          <select value={side} onChange={(event) => setSide(event.target.value as "BUY" | "SELL")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </Field>
        <Field label="Entry"><Input type="number" step={pip} value={entry} onChange={(event) => setEntry(Number(event.target.value) || 0)} /></Field>
        <Field label="Exit"><Input type="number" step={pip} value={exit} onChange={(event) => setExit(Number(event.target.value) || 0)} /></Field>
        <Field label="Lots"><Input type="number" step="0.01" value={lots} onChange={(event) => setLots(Number(event.target.value) || 0)} /></Field>
      </Row>
      <Result label="Move">{pips.toFixed(1)} pips</Result>
      <Result label="P/L" highlight><span className={usd >= 0 ? "text-bull" : "text-bear"}>{usd >= 0 ? "+" : ""}${usd.toFixed(2)}</span></Result>
    </ToolCard>
  );
}

function VolatilityMeter({ selected, history }: { selected: Pair; history: Tick[] }) {
  const moves = history.slice(1).map((tick, index) => Math.abs(tick.quote - history[index].quote) / pipSize(selected.code));
  const average = moves.length ? moves.reduce((sum, move) => sum + move, 0) / moves.length : 0;
  const latest = history.at(-1)?.quote;

  return (
    <ToolCard icon={Activity} title="Tick Volatility" status={`${history.length}/90 live samples`}>
      <Result label="Current quote">{latest ? latest.toFixed(decimals(selected.code)) : "—"}</Result>
      <Result label="Average tick move" highlight>{average.toFixed(2)} pips</Result>
      <div className="mt-2 flex h-14 items-end gap-1 rounded-lg border border-border bg-background/60 p-2">
        {history.length ? history.slice(-36).map((tick, index, visible) => {
          const values = visible.map((item) => item.quote);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const height = max > min ? ((tick.quote - min) / (max - min)) * 100 : 45;
          return <div key={`${tick.epoch}-${index}`} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${Math.max(8, height)}%` }} />;
        }) : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">waiting for live ticks</div>}
      </div>
    </ToolCard>
  );
}

function SessionClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const sessions = [
    { name: "Sydney", open: 22, close: 7 },
    { name: "Tokyo", open: 0, close: 9 },
    { name: "London", open: 8, close: 17 },
    { name: "New York", open: 13, close: 22 },
  ];
  const hour = now?.getUTCHours() ?? 0;
  const minute = now?.getUTCMinutes() ?? 0;
  const isOpen = (open: number, close: number) => open < close ? hour >= open && hour < close : hour >= open || hour < close;

  return (
    <ToolCard icon={Clock} title="Market Sessions" status="UTC session map">
      <div className="text-center font-mono text-2xl font-bold tabular" suppressHydrationWarning>
        {now ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} UTC` : "--:-- UTC"}
      </div>
      <div className="space-y-2">
        {sessions.map((session) => {
          const open = now ? isOpen(session.open, session.close) : false;
          return (
            <div key={session.name} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
              <span>{session.name}</span>
              <span className={`font-mono text-xs ${open ? "text-bull" : "text-muted-foreground"}`}>{open ? "OPEN" : "closed"} · {String(session.open).padStart(2, "0")}-{String(session.close).padStart(2, "0")}</span>
            </div>
          );
        })}
      </div>
    </ToolCard>
  );
}

function StrengthMeter({ ticks, history }: { ticks: Record<string, Tick>; history: Record<string, Tick[]> }) {
  const rows = PAIRS.map((pair) => {
    const values = history[pair.symbol] ?? [];
    const first = values[0]?.quote;
    const last = ticks[pair.symbol]?.quote;
    const move = first && last ? ((last - first) / pipSize(pair.code)) : 0;
    return { pair, move };
  }).sort((a, b) => b.move - a.move);

  return (
    <ToolCard icon={BarChart3} title="Pair Strength" status="Ranked from live ticks">
      <div className="space-y-2">
        {rows.slice(0, 6).map(({ pair, move }) => (
          <div key={pair.symbol} className="grid grid-cols-[5rem_1fr_4rem] items-center gap-2 text-sm">
            <span className="font-medium">{pair.label}</span>
            <div className="h-2 rounded-full bg-muted">
              <div className={`h-full rounded-full ${move >= 0 ? "bg-bull" : "bg-bear"}`} style={{ width: `${Math.min(100, Math.abs(move) * 4)}%` }} />
            </div>
            <span className={`text-right font-mono text-xs ${move >= 0 ? "text-bull" : "text-bear"}`}>{move >= 0 ? "+" : ""}{move.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </ToolCard>
  );
}

function Converter({ selected, livePrice }: { selected: Pair; livePrice?: number }) {
  const [amount, setAmount] = useState(1_000);
  const base = selected.code.slice(0, 3);
  const quote = selected.code.slice(3);
  const converted = livePrice ? amount * livePrice : 0;

  return (
    <ToolCard icon={Globe2} title="Live Converter" status={livePrice ? "Using Deriv quote" : "Waiting for quote"}>
      <Row>
        <Field label={`Amount ${base}`}><Input type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value) || 0)} /></Field>
        <Field label="Pair"><div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-mono">{selected.label}</div></Field>
      </Row>
      <Result label="Converted" highlight>{livePrice ? `${converted.toFixed(2)} ${quote}` : "—"}</Result>
    </ToolCard>
  );
}

function ToolCard({ icon: Icon, title, status, children }: { icon: LucideIcon; title: string; status: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card/90 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{status}</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Result({ label, children, highlight = false }: { label: string; children: ReactNode; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 ${highlight ? "border border-primary/30 bg-primary/10" : "bg-muted/30"}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right font-mono tabular ${highlight ? "text-base font-bold" : "text-sm"}`}>{children}</span>
    </div>
  );
}

export function ForexTools() {
  const { ticks, history, connected, error } = useLiveForex();
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL);
  const selected = pairBySymbol(selectedSymbol);
  const livePrice = ticks[selected.symbol]?.quote;
  const selectedHistory = history[selected.symbol] ?? [];
  const activeFeeds = Object.keys(ticks).length;

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-border bg-gradient-card p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-bull" : "bg-muted"}`} />
              {connected ? "Live Deriv feed connected" : error ?? "Connecting to live forex feed"}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Professional Forex Tools</h2>
            <p className="mt-1 text-sm text-muted-foreground">Live quotes, calculators, session timing, volatility and pair strength without demo data.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[13rem_9rem]">
            <div>
              <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Active pair</Label>
              <PairSelect value={selectedSymbol} onChange={setSelectedSymbol} />
            </div>
            <div className="rounded-md border border-border bg-background/70 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live feeds</div>
              <div className="font-mono text-xl font-bold">{activeFeeds}/{PAIRS.length}</div>
            </div>
          </div>
        </div>
      </header>

      <LiveMarketStrip ticks={ticks} history={history} selected={selectedSymbol} onSelect={setSelectedSymbol} />

      <div className="grid gap-4 xl:grid-cols-3">
        <PipCalc selected={selected} livePrice={livePrice} />
        <PositionSizeCalc selected={selected} />
        <MarginCalc selected={selected} livePrice={livePrice} />
        <RiskRewardCalc selected={selected} livePrice={livePrice} />
        <PnlCalc selected={selected} />
        <Converter selected={selected} livePrice={livePrice} />
        <VolatilityMeter selected={selected} history={selectedHistory} />
        <StrengthMeter ticks={ticks} history={history} />
        <SessionClock />
      </div>
    </div>
  );
}
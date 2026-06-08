import { useEffect, useMemo, useState } from "react";
import { Calculator, DollarSign, Percent, Clock, Globe, TrendingUp, Scale, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------- Pip Value Calculator ----------
function PipCalc() {
  const [pair, setPair] = useState("EURUSD");
  const [lots, setLots] = useState(1);
  const [quote, setQuote] = useState(1.0850);
  const isJpy = pair.endsWith("JPY");
  const pipSize = isJpy ? 0.01 : 0.0001;
  const contract = 100000;
  const pipValue = useMemo(() => {
    // value in quote currency
    const v = pipSize * contract * lots;
    // approximate USD value: if quote is USD pair, divide by quote for XXX/USD inverse handled separately
    if (pair.endsWith("USD")) return v; // value already in USD
    if (pair.startsWith("USD")) return v / quote;
    return v / quote; // cross pair approximation using quote price vs USD
  }, [pair, lots, quote, pipSize]);
  return (
    <ToolCard icon={Calculator} title="Pip Value Calculator" tint="from-cyan-600 to-blue-600">
      <Row>
        <Field label="Pair"><Input value={pair} onChange={e => setPair(e.target.value.toUpperCase())} /></Field>
        <Field label="Lots"><Input type="number" step="0.01" value={lots} onChange={e => setLots(+e.target.value || 0)} /></Field>
        <Field label="Price"><Input type="number" step="0.0001" value={quote} onChange={e => setQuote(+e.target.value || 1)} /></Field>
      </Row>
      <Result label="Per pip">${pipValue.toFixed(2)} USD</Result>
    </ToolCard>
  );
}

// ---------- Position Size Calculator ----------
function PositionSizeCalc() {
  const [balance, setBalance] = useState(10000);
  const [risk, setRisk] = useState(1);
  const [stopPips, setStopPips] = useState(20);
  const [pipValue, setPipValue] = useState(10);
  const riskAmt = balance * (risk / 100);
  const lots = stopPips > 0 && pipValue > 0 ? riskAmt / (stopPips * pipValue) : 0;
  return (
    <ToolCard icon={Scale} title="Position Size" tint="from-emerald-600 to-teal-600">
      <Row>
        <Field label="Balance ($)"><Input type="number" value={balance} onChange={e => setBalance(+e.target.value || 0)} /></Field>
        <Field label="Risk %"><Input type="number" step="0.1" value={risk} onChange={e => setRisk(+e.target.value || 0)} /></Field>
      </Row>
      <Row>
        <Field label="Stop (pips)"><Input type="number" value={stopPips} onChange={e => setStopPips(+e.target.value || 0)} /></Field>
        <Field label="Pip $/lot"><Input type="number" step="0.1" value={pipValue} onChange={e => setPipValue(+e.target.value || 0)} /></Field>
      </Row>
      <Result label="Risk amount">${riskAmt.toFixed(2)}</Result>
      <Result label="Lot size" highlight>{lots.toFixed(2)} lots</Result>
    </ToolCard>
  );
}

// ---------- Margin / Leverage ----------
function MarginCalc() {
  const [lots, setLots] = useState(1);
  const [price, setPrice] = useState(1.0850);
  const [leverage, setLeverage] = useState(100);
  const notional = 100000 * lots * price;
  const margin = notional / leverage;
  return (
    <ToolCard icon={DollarSign} title="Margin Required" tint="from-amber-600 to-orange-600">
      <Row>
        <Field label="Lots"><Input type="number" step="0.01" value={lots} onChange={e => setLots(+e.target.value || 0)} /></Field>
        <Field label="Price"><Input type="number" step="0.0001" value={price} onChange={e => setPrice(+e.target.value || 1)} /></Field>
        <Field label="Leverage 1:"><Input type="number" value={leverage} onChange={e => setLeverage(+e.target.value || 1)} /></Field>
      </Row>
      <Result label="Notional">${notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Result>
      <Result label="Margin" highlight>${margin.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Result>
    </ToolCard>
  );
}

// ---------- Risk:Reward ----------
function RiskRewardCalc() {
  const [entry, setEntry] = useState(1.0850);
  const [sl, setSl] = useState(1.0820);
  const [tp, setTp] = useState(1.0920);
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = risk > 0 ? reward / risk : 0;
  const breakeven = rr > 0 ? 1 / (1 + rr) * 100 : 0;
  return (
    <ToolCard icon={Percent} title="Risk : Reward" tint="from-pink-600 to-rose-600">
      <Row>
        <Field label="Entry"><Input type="number" step="0.0001" value={entry} onChange={e => setEntry(+e.target.value || 0)} /></Field>
        <Field label="Stop"><Input type="number" step="0.0001" value={sl} onChange={e => setSl(+e.target.value || 0)} /></Field>
        <Field label="Target"><Input type="number" step="0.0001" value={tp} onChange={e => setTp(+e.target.value || 0)} /></Field>
      </Row>
      <Result label="R:R" highlight>1 : {rr.toFixed(2)}</Result>
      <Result label="Breakeven win %">{breakeven.toFixed(1)}%</Result>
    </ToolCard>
  );
}

// ---------- Session Clock ----------
const SESSIONS = [
  { name: "Sydney", open: 22, close: 7, tint: "bg-blue-500" },
  { name: "Tokyo", open: 0, close: 9, tint: "bg-red-500" },
  { name: "London", open: 8, close: 17, tint: "bg-emerald-500" },
  { name: "New York", open: 13, close: 22, tint: "bg-amber-500" },
];
function SessionClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <ToolCard icon={Clock} title="Market Sessions (UTC)" tint="from-indigo-600 to-violet-600"><div className="h-32" /></ToolCard>;
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const isOpen = (o: number, c: number) => {
    if (o < c) return utcHour >= o && utcHour < c;
    return utcHour >= o || utcHour < c;
  };
  return (
    <ToolCard icon={Clock} title="Market Sessions (UTC)" tint="from-indigo-600 to-violet-600">
      <div className="font-mono text-2xl text-center mb-3">
        {String(utcHour).padStart(2, "0")}:{String(utcMin).padStart(2, "0")} UTC
      </div>
      <div className="space-y-2">
        {SESSIONS.map(s => {
          const open = isOpen(s.open, s.close);
          return (
            <div key={s.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${open ? s.tint : "bg-muted"}`} />
                <span>{s.name}</span>
              </div>
              <span className={`font-mono text-xs ${open ? "text-emerald-400" : "text-muted-foreground"}`}>
                {open ? "OPEN" : "closed"} · {String(s.open).padStart(2, "0")}–{String(s.close).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
    </ToolCard>
  );
}

// ---------- Currency Converter (live via exchangerate.host) ----------
function CurrencyConverter() {
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("USD");
  const [amount, setAmount] = useState(1000);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fetchRate = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`https://api.exchangerate.host/latest?base=${from}&symbols=${to}`);
      const j = await r.json();
      const v = j?.rates?.[to];
      if (typeof v === "number") setRate(v); else throw new Error("No rate");
    } catch (e: any) { setErr("Live rate unavailable"); setRate(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchRate(); /* eslint-disable-next-line */ }, [from, to]);
  const converted = rate ? amount * rate : 0;
  return (
    <ToolCard icon={Globe} title="Currency Converter" tint="from-sky-600 to-cyan-600">
      <Row>
        <Field label="From"><Input value={from} onChange={e => setFrom(e.target.value.toUpperCase())} maxLength={3} /></Field>
        <Field label="To"><Input value={to} onChange={e => setTo(e.target.value.toUpperCase())} maxLength={3} /></Field>
        <Field label="Amount"><Input type="number" value={amount} onChange={e => setAmount(+e.target.value || 0)} /></Field>
      </Row>
      {err ? <div className="text-xs text-rose-400">{err}</div> :
        <>
          <Result label="Rate">{rate ? rate.toFixed(5) : loading ? "..." : "—"}</Result>
          <Result label={`${amount} ${from} =`} highlight>{converted.toFixed(2)} {to}</Result>
        </>}
      <Button size="sm" variant="ghost" onClick={fetchRate} disabled={loading} className="mt-2 w-full">Refresh</Button>
    </ToolCard>
  );
}

// ---------- Profit / Loss ----------
function PnlCalc() {
  const [pair, setPair] = useState("EURUSD");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [entry, setEntry] = useState(1.0850);
  const [exit, setExit] = useState(1.0920);
  const [lots, setLots] = useState(1);
  const isJpy = pair.endsWith("JPY");
  const pipSize = isJpy ? 0.01 : 0.0001;
  const diff = (side === "BUY" ? exit - entry : entry - exit);
  const pips = diff / pipSize;
  const usd = pips * 10 * lots; // standard-lot USD-quoted approx
  return (
    <ToolCard icon={TrendingUp} title="Profit / Loss" tint="from-violet-600 to-fuchsia-600">
      <Row>
        <Field label="Pair"><Input value={pair} onChange={e => setPair(e.target.value.toUpperCase())} /></Field>
        <Field label="Side">
          <div className="flex gap-1">
            <Button size="sm" variant={side === "BUY" ? "default" : "outline"} onClick={() => setSide("BUY")} className="flex-1">BUY</Button>
            <Button size="sm" variant={side === "SELL" ? "default" : "outline"} onClick={() => setSide("SELL")} className="flex-1">SELL</Button>
          </div>
        </Field>
        <Field label="Lots"><Input type="number" step="0.01" value={lots} onChange={e => setLots(+e.target.value || 0)} /></Field>
      </Row>
      <Row>
        <Field label="Entry"><Input type="number" step="0.0001" value={entry} onChange={e => setEntry(+e.target.value || 0)} /></Field>
        <Field label="Exit"><Input type="number" step="0.0001" value={exit} onChange={e => setExit(+e.target.value || 0)} /></Field>
      </Row>
      <Result label="Pips">{pips.toFixed(1)}</Result>
      <Result label="P/L" highlight>
        <span className={usd >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {usd >= 0 ? "+" : ""}${usd.toFixed(2)}
        </span>
      </Result>
    </ToolCard>
  );
}

// ---------- Volatility (ATR-style synthetic from live price snapshots) ----------
function VolatilityMeter() {
  const [pair] = useState("EURUSD");
  const [series, setSeries] = useState<number[]>([]);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`https://api.exchangerate.host/latest?base=${pair.slice(0,3)}&symbols=${pair.slice(3)}`);
        const j = await r.json();
        const v = j?.rates?.[pair.slice(3)];
        if (alive && typeof v === "number") setSeries(s => [...s.slice(-29), v]);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [pair]);
  const diffs = series.slice(1).map((v, i) => Math.abs(v - series[i]));
  const atr = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
  const pips = atr / 0.0001;
  return (
    <ToolCard icon={Activity} title={`Live Volatility · ${pair}`} tint="from-rose-600 to-red-600">
      <Result label="Samples">{series.length}/30</Result>
      <Result label="Avg move per 15s" highlight>{pips.toFixed(2)} pips</Result>
      <div className="flex items-end gap-0.5 h-12 mt-2">
        {series.slice(-30).map((v, i, arr) => {
          const min = Math.min(...arr), max = Math.max(...arr);
          const h = max > min ? ((v - min) / (max - min)) * 100 : 50;
          return <div key={i} className="flex-1 bg-rose-500/60 rounded-sm" style={{ height: `${Math.max(4, h)}%` }} />;
        })}
      </div>
    </ToolCard>
  );
}

// ---------- Layout helpers ----------
function ToolCard({ icon: Icon, title, tint, children }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tint} grid place-items-center shadow-lg`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Row({ children }: any) { return <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{children}</div>; }
function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
function Result({ label, children, highlight }: any) {
  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded-lg ${highlight ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono ${highlight ? "text-base font-bold" : "text-sm"}`}>{children}</span>
    </div>
  );
}

export function ForexTools() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Forex Toolkit
        </h2>
        <span className="text-xs text-muted-foreground">8 live calculators</span>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PipCalc />
        <PositionSizeCalc />
        <MarginCalc />
        <RiskRewardCalc />
        <PnlCalc />
        <SessionClock />
        <CurrencyConverter />
        <VolatilityMeter />
      </div>
    </div>
  );
}
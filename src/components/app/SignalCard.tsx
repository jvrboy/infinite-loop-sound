import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, BarChart3 } from "lucide-react";
import { displayPair } from "@/lib/engine/deriv";

export interface SignalCardData {
  id?: string;
  pair: string;
  timeframe: string;
  direction: "BUY" | "SELL";
  entry: number; sl: number; tp1: number; tp2: number; tp3: number;
  score: number; rating: string;
  confluence: { label: string; passed: boolean; pts: number }[];
  created_at?: string;
  sent_telegram?: boolean;
}

const fmt = (n: number) => Number(n).toFixed(5);
const pips = (a: number, b: number, pair: string) => {
  const factor = pair.includes("JPY") ? 100 : 10000;
  return Math.abs(a - b) * factor;
};
const getTimeAgo = (date: Date) => {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

export function SignalCard({
  signal, onSendTelegram, onView,
}: { signal: SignalCardData; onSendTelegram?: () => void; onView?: () => void }) {
  const { direction, rating, pair, timeframe, entry, sl, tp1, tp2, tp3, score } = signal;
  const isBuy = direction === "BUY";
  const dirCls = isBuy ? "text-bull bg-bull/10 border-bull/30" : "text-bear bg-bear/10 border-bear/30";
  const ratingCls =
    rating === "ELITE" ? "bg-gradient-elite text-primary-foreground shadow-glow-elite" :
    rating === "STRONG" ? "bg-bull/20 text-bull border-bull/40" :
    rating === "MEDIUM" ? "bg-medium/20 text-medium border-medium/40" :
    "bg-muted text-muted-foreground";

  const rrPips = pips(entry, tp3, pair) / Math.max(1, pips(entry, sl, pair));
  const timeAgo = signal.created_at ? getTimeAgo(new Date(signal.created_at)) : "";

  return (
    <div className="rounded-lg border border-border bg-gradient-card p-4 md:p-5 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${ratingCls} font-mono uppercase tracking-wider text-[10px]`}>
            {rating === "ELITE" ? "💎 " : ""}{rating}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground">{timeframe}</span>
          {timeAgo && <span className="text-[10px] font-mono text-muted-foreground/70">{timeAgo}</span>}
          {signal.sent_telegram && <Badge variant="outline" className="text-[10px] border-bull/50 text-bull">SENT</Badge>}
        </div>
        <div className={`px-2.5 py-1 rounded border font-mono text-xs font-bold ${dirCls}`}>
          {isBuy ? "🟢 BUY" : "🔴 SELL"}
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{displayPair(pair)}</h3>
        <span className="text-xs text-muted-foreground font-mono">Score: {score}/100</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
        <Row label="Entry" value={fmt(entry)} />
        <Row label="SL"    value={fmt(sl)}    accent="bear" sub={`-${pips(entry, sl, pair).toFixed(0)}p`} />
        <Row label="TP1"   value={fmt(tp1)}   accent="bull" sub={`+${pips(entry, tp1, pair).toFixed(0)}p`} />
        <Row label="TP2"   value={fmt(tp2)}   accent="bull" sub={`+${pips(entry, tp2, pair).toFixed(0)}p`} />
        <Row label="TP3"   value={fmt(tp3)}   accent="bull" sub={`+${pips(entry, tp3, pair).toFixed(0)}p`} />
        <Row label="R:R"   value={`1:${rrPips.toFixed(1)}`} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-4">
        {signal.confluence.map((c, i) => (
          <div key={i} className={`flex items-center gap-1.5 text-[11px] ${c.passed ? "text-foreground" : "text-muted-foreground/60 line-through"}`}>
            <span className={c.passed ? "text-bull" : "text-muted-foreground/40"}>{c.passed ? "✓" : "·"}</span>
            <span className="truncate">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {onView && <Button size="sm" variant="outline" onClick={onView} className="flex-1"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Chart</Button>}
        {onSendTelegram && <Button size="sm" onClick={onSendTelegram} className="flex-1"><Send className="w-3.5 h-3.5 mr-1.5" />Telegram</Button>}
      </div>
    </div>
  );
}

function Row({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "bull" | "bear" }) {
  const c = accent === "bull" ? "text-bull" : accent === "bear" ? "text-bear" : "text-foreground";
  return (
    <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className={c}>{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground ml-1">{sub}</span>}
      </span>
    </div>
  );
}

// Auto-trader runner: subscribes to high-score signals via Supabase realtime
// and places Deriv contracts using the configured token + risk controls.
import { supabase } from "@/integrations/supabase/client";
import { deriv } from "@/lib/engine/deriv";
import type { BotSettings } from "./store";

type OpenTicket = { pair: string; ts: number };

class BotRunner {
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private settings: BotSettings | null = null;
  private open: OpenTicket[] = [];
  private lastTradeAt: Record<string, number> = {};
  private dailyPnl = 0;
  private day = new Date().toDateString();
  private listeners = new Set<(s: string) => void>();
  private status: "stopped" | "running" | "halted" = "stopped";

  on(cb: (s: string) => void) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private log(s: string) { console.log("[bot]", s); this.listeners.forEach(c => c(s)); }
  getStatus() { return this.status; }
  getOpenCount() { return this.open.length; }
  getDailyPnl() { return this.dailyPnl; }

  async start(s: BotSettings) {
    if (this.status === "running") await this.stop();
    this.settings = s;
    if (!s.token) {
      this.log("No token — bot stays in dry-run (will log only)");
    } else {
      try {
        await deriv.assertTradeScope(s.token);
        this.log("Trade scope verified ✓");
      } catch (e: any) {
        this.status = "stopped";
        this.log("HALT — " + e.message);
        // Fire-and-forget admin alert via server fn (no-op if route unavailable)
        try {
          const mod = await import("@/lib/alerts.functions");
          await mod.raiseAlertFn({ data: {
            severity: "error", kind: "deriv.scope_blocked",
            message: "Bot halted — Deriv token lacks trade scope",
            context: { error: e?.message },
          }});
        } catch { /* ignore */ }
        throw e;
      }
    }
    this.status = "running";
    this.log(`Bot started · ${s.accountType.toUpperCase()} · lot=${s.lotSize} · maxOpen=${s.maxOpen}`);
    this.channel = supabase.channel("bot-signals")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signals" },
        (p) => this.onSignal(p.new as any))
      .subscribe();
  }

  async stop() {
    if (this.channel) { await supabase.removeChannel(this.channel); this.channel = null; }
    this.status = "stopped";
    this.log("Bot stopped");
  }

  halt(reason: string) {
    this.status = "halted";
    this.log("HALT — " + reason);
    if (this.channel) supabase.removeChannel(this.channel).catch(() => {});
    this.channel = null;
  }

  private rollDay() {
    const today = new Date().toDateString();
    if (today !== this.day) { this.day = today; this.dailyPnl = 0; }
  }

  private async onSignal(sig: any) {
    if (!this.settings || this.status !== "running") return;
    this.rollDay();
    const s = this.settings;
    if (!s.instruments.includes(sig.pair)) return;
    if ((sig.score ?? 0) < s.minScore) return;
    if (this.open.length >= s.maxOpen) { this.log(`Skip ${sig.pair}: max open reached`); return; }
    const last = this.lastTradeAt[sig.pair] ?? 0;
    if (Date.now() - last < s.cooldownSec * 1000) { this.log(`Skip ${sig.pair}: cooldown`); return; }
    if (this.dailyPnl <= -Math.abs(s.dailyLossCap)) { this.halt(`Daily loss cap hit (${this.dailyPnl})`); return; }

    this.lastTradeAt[sig.pair] = Date.now();
    this.open.push({ pair: sig.pair, ts: Date.now() });
    setTimeout(() => { this.open = this.open.filter(o => o.pair !== sig.pair || o.ts !== this.open.find(x=>x.pair===sig.pair)?.ts); }, s.durationSec * 1000 + 5000);

    const direction = sig.direction === "BUY" ? "CALL" : "PUT";
    const row = {
      pair: sig.pair, direction: sig.direction, lot: s.lotSize,
      entry: sig.entry, account_type: s.accountType, status: "pending",
    };
    const { data: trade } = await supabase.from("bot_trades").insert(row).select().single();

    if (!s.token) {
      await supabase.from("bot_trades").update({ status: "dry-run" }).eq("id", trade!.id);
      this.log(`DRY ${sig.pair} ${sig.direction} @ ${sig.entry}`);
      return;
    }

    try {
      const r = await deriv.buyContract({
        token: s.token, symbol: sig.pair, direction,
        amount: s.lotSize, duration: s.durationSec,
      });
      await supabase.from("bot_trades").update({
        status: "open", contract_id: String(r.contract_id ?? ""),
      }).eq("id", trade!.id);
      this.log(`LIVE ${sig.pair} ${sig.direction} #${r.contract_id}`);
    } catch (e: any) {
      await supabase.from("bot_trades").update({ status: "error", error: e.message }).eq("id", trade!.id);
      this.log(`ERR ${sig.pair}: ${e.message}`);
    }
  }
}
export const botRunner = new BotRunner();
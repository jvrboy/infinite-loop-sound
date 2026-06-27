// Auto-trader runner.
//
// CHANGES vs v1:
//   - Self-scan mode (default ON): periodically calls analyze() on each
//     subscribed instrument and synthesises a TradeSignal whenever score
//     exceeds minScore. This makes the bot actually trade without an
//     external "signals" producer.
//   - Supabase realtime listener is OPTIONAL: still subscribed when token
//     present, but no longer the only trigger.
//   - Fixed: open-ticket tracking now uses unique ids so concurrent opens
//     on the same pair don't pop each other off the queue.

import { supabase } from "@/integrations/supabase/client";
import { deriv, type TF } from "@/lib/engine/deriv";
import { analyze } from "@/lib/engine/signal";
import type { BotSettings } from "./store";

type OpenTicket = { id: string; pair: string; ts: number };
type TradeSignal = {
  pair: string;
  direction: "BUY" | "SELL";
  entry: number;
  score: number;
  source: "scan" | "supabase" | "automation";
  confluenceCount?: number;
  neuralBoost?: number;
};

class BotRunner {
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private settings: BotSettings | null = null;
  private open: OpenTicket[] = [];
  private lastTradeAt: Record<string, number> = {};
  private dailyPnl = 0;
  private day = new Date().toDateString();
  private listeners = new Set<(s: string) => void>();
  private status: "stopped" | "running" | "halted" = "stopped";
  private scanTimer: number | null = null;
  private scanning = false;
  private lastScanAt = 0;

  on(cb: (s: string) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private log(s: string) {
    console.log("[bot]", s);
    this.listeners.forEach((c) => c(s));
  }
  getStatus() {
    return this.status;
  }
  getOpenCount() {
    return this.open.length;
  }
  getDailyPnl() {
    return this.dailyPnl;
  }
  getLastScanAt() {
    return this.lastScanAt;
  }

  async start(s: BotSettings) {
    if (this.status === "running") await this.stop();
    this.settings = s;

    // Validate lot up-front so we don't silently lose every trade later.
    if (!Number.isFinite(s.lotSize) || s.lotSize < 0.01) {
      this.log(`ERR lot size ${s.lotSize} is below the 0.01 minimum`);
      throw new Error("Lot size must be at least 0.01");
    }
    if (s.instruments.length === 0) {
      this.log(`ERR no instruments selected`);
      throw new Error("Pick at least one instrument");
    }

    if (!s.token) {
      this.log("No token — bot runs in DRY mode (logs only, no real trades)");
    } else {
      try {
        await (deriv as any).assertTradeScope?.(s.token);
        this.log("Trade scope verified");
      } catch (e: any) {
        this.status = "stopped";
        this.log("HALT — " + (e?.message || "scope check failed"));
        try {
          const mod = await import("@/lib/alerts.functions");
          await mod.raiseAlertFn({
            data: {
              severity: "error",
              kind: "deriv.scope_blocked",
              message: "Bot halted — Deriv token lacks trade scope",
              context: { error: e?.message },
            },
          });
        } catch {
          /* ignore */
        }
        throw e;
      }
    }

    this.status = "running";
    this.log(
      `Bot started · ${s.accountType.toUpperCase()} · lot=${s.lotSize} · maxOpen=${s.maxOpen} · scan=${
        s.selfScan ? "ON" : "OFF"
      } · pairs=${s.instruments.join(",")}`,
    );

    // Supabase realtime subscription (still useful if an upstream pipeline IS
    // producing signals; harmless if it isn't).
    try {
      this.channel = supabase
        .channel("bot-signals")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "signals" },
          (p) =>
            this.handleSignal({
              ...(p.new as any),
              source: "supabase" as const,
            }),
        )
        .subscribe();
    } catch (e: any) {
      this.log("supabase channel failed: " + (e?.message || e));
    }

    // Self-scan loop
    if (s.selfScan) {
      this.scheduleScan();
    }
  }

  async stop() {
    if (this.channel) {
      try {
        await supabase.removeChannel(this.channel);
      } catch {}
      this.channel = null;
    }
    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    this.status = "stopped";
    this.log("Bot stopped");
  }

  halt(reason: string) {
    this.status = "halted";
    this.log("HALT — " + reason);
    if (this.channel) supabase.removeChannel(this.channel).catch(() => {});
    this.channel = null;
    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
  }

  // ------------------------------------------------------------------
  // Self-scan loop
  // ------------------------------------------------------------------
  private scheduleScan() {
    if (!this.settings || this.status !== "running") return;
    const intervalMs = Math.max(5, this.settings.scanIntervalSec) * 1000;
    this.scanTimer = window.setTimeout(() => this.runScan(), intervalMs);
  }

  private async runScan() {
    if (!this.settings || this.status !== "running") return;
    if (this.scanning) {
      this.scheduleScan();
      return;
    }
    this.scanning = true;
    const s = this.settings;
    const tf: TF = (s.scanTimeframe || "M5") as TF;
    this.lastScanAt = Date.now();

    try {
      for (const pair of s.instruments) {
        if (this.status !== "running") break;
        try {
          const candles = await deriv.getCandles(pair, tf, 200);
          if (candles.length < 50) {
            this.log(`scan ${pair}: insufficient candles (${candles.length})`);
            continue;
          }
          const a = analyze(pair, tf, candles, {});
          if (!a.direction) {
            // no setup — keep moving
            continue;
          }
          this.log(
            `scan ${pair} ${tf}: ${a.rating} ${a.scorePct.toFixed(0)}% ${a.direction}`,
          );
          if (a.scorePct >= s.minScore) {
            const lastClose = candles[candles.length - 1].close;
            await this.handleSignal({
              pair,
              direction: a.direction,
              entry: lastClose,
              score: a.scorePct,
              source: "scan",
            });
          }
        } catch (e: any) {
          this.log(`scan ${pair} error: ${e?.message || e}`);
        }
      }
    } finally {
      this.scanning = false;
      this.scheduleScan();
    }
  }

  // ------------------------------------------------------------------
  // Trade entry
  // ------------------------------------------------------------------
  private rollDay() {
    const today = new Date().toDateString();
    if (today !== this.day) {
      this.day = today;
      this.dailyPnl = 0;
    }
  }

  private async handleSignal(sig: TradeSignal) {
    if (!this.settings || this.status !== "running") return;
    this.rollDay();
    const s = this.settings;
    if (!s.instruments.includes(sig.pair)) return;
    if ((sig.score ?? 0) < s.minScore) return;
    if (this.open.length >= s.maxOpen) {
      this.log(`Skip ${sig.pair}: max open reached`);
      return;
    }
    const last = this.lastTradeAt[sig.pair] ?? 0;
    if (Date.now() - last < s.cooldownSec * 1000) {
      this.log(`Skip ${sig.pair}: cooldown`);
      return;
    }
    if (this.dailyPnl <= -Math.abs(s.dailyLossCap)) {
      this.halt(`Daily loss cap hit (${this.dailyPnl})`);
      return;
    }

    this.lastTradeAt[sig.pair] = Date.now();
    const ticket: OpenTicket = {
      id: `${sig.pair}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      pair: sig.pair,
      ts: Date.now(),
    };
    this.open.push(ticket);
    window.setTimeout(
      () => {
        this.open = this.open.filter((o) => o.id !== ticket.id);
      },
      s.durationSec * 1000 + 5000,
    );

    const direction = sig.direction === "BUY" ? "CALL" : "PUT";
    const row = {
      pair: sig.pair,
      direction: sig.direction,
      lot: s.lotSize,
      entry: sig.entry,
      account_type: s.accountType,
      status: "pending",
      source: sig.source,
    };

    let trade: any = null;
    try {
      const ins = await supabase
        .from("bot_trades")
        .insert(row)
        .select()
        .single();
      trade = ins.data;
    } catch (e: any) {
      this.log(`db insert failed: ${e?.message || e}`);
    }

    if (!s.token) {
      if (trade?.id) {
        try {
          await supabase
            .from("bot_trades")
            .update({ status: "dry-run" })
            .eq("id", trade.id);
        } catch {}
      }
      this.log(`DRY ${sig.pair} ${sig.direction} @ ${sig.entry} (${sig.score.toFixed(0)}%)`);
      return;
    }

    try {
      const r = await (deriv as any).buyContract({
        token: s.token,
        symbol: sig.pair,
        direction,
        amount: s.lotSize,
        duration: s.durationSec,
      });
      if (trade?.id) {
        await supabase
          .from("bot_trades")
          .update({ status: "open", contract_id: String(r.contract_id ?? "") })
          .eq("id", trade.id);
      }
      this.log(`LIVE ${sig.pair} ${sig.direction} #${r.contract_id}`);
    } catch (e: any) {
      if (trade?.id) {
        await supabase
          .from("bot_trades")
          .update({ status: "error", error: e?.message })
          .eq("id", trade.id);
      }
      this.log(`ERR ${sig.pair}: ${e?.message || e}`);
    }
  }
}

export const botRunner = new BotRunner();

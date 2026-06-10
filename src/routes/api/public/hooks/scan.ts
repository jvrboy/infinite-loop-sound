import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { analyze } from "@/lib/engine/signal";
import { DERIV_WS_URL, TF_TO_GRAN, FOREX_PAIRS, METALS, CRYPTO, type TF } from "@/lib/engine/deriv";
import type { Candle } from "@/lib/engine/indicators";

// 24/7 server-side scanner. Pings Deriv's public WS (no token required),
// runs the analyze() pipeline, and persists qualifying signals.
// Designed to be called every 1-5 min by Zo Computer or any external cron.

const SCAN_TFS: TF[] = ["M15", "H1"];
const MIN_SCORE = 60;

async function openDerivWS(): Promise<WebSocket> {
  // Cloudflare workerd outbound WebSocket uses fetch(upgrade).
  const resp = await fetch(DERIV_WS_URL.replace(/^wss?:/, "https:"), {
    headers: { Upgrade: "websocket" },
  } as any);
  // @ts-ignore - workers runtime exposes resp.webSocket
  const ws: WebSocket | undefined = (resp as any).webSocket;
  if (!ws) {
    // Node/dev fallback: use global WebSocket
    const NodeWS: any = (globalThis as any).WebSocket;
    if (!NodeWS) throw new Error("WebSocket not available in this runtime");
    const sock = new NodeWS(DERIV_WS_URL);
    await new Promise<void>((res, rej) => {
      sock.onopen = () => res();
      sock.onerror = (e: any) => rej(e);
    });
    return sock;
  }
  // @ts-ignore
  ws.accept();
  return ws;
}

async function fetchCandles(ws: WebSocket, symbol: string, tf: TF, count = 220): Promise<Candle[]> {
  return new Promise((resolve, reject) => {
    const reqId = Math.floor(Math.random() * 1e9);
    const timer = setTimeout(() => reject(new Error("timeout")), 12000);
    const onMsg = (ev: MessageEvent) => {
      try {
        const m = JSON.parse(ev.data as string);
        if (m.req_id !== reqId) return;
        clearTimeout(timer);
        ws.removeEventListener("message", onMsg as any);
        if (m.error) return reject(new Error(m.error.message));
        const candles = (m.candles || []).map((c: any) => ({
          epoch: c.epoch, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: 1,
        }));
        resolve(candles);
      } catch (e) { reject(e as Error); }
    };
    ws.addEventListener("message", onMsg as any);
    ws.send(JSON.stringify({
      ticks_history: symbol, adjust_start_time: 1, count,
      end: "latest", granularity: TF_TO_GRAN[tf], style: "candles", req_id: reqId,
    }));
  });
}

export const Route = createFileRoute("/api/public/hooks/scan")({
  server: {
    handlers: {
      GET: async () => runScan(),
      POST: async () => runScan(),
    },
  },
});

async function runScan(): Promise<Response> {
  const startedAt = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ ok: false, error: "backend env not configured" }, { status: 200 });
  }
  const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Curated universe — keep small to fit within request budget.
  const universe = [
    ...FOREX_PAIRS.slice(0, 8).map(p => ({ symbol: p.symbol, cls: "forex" as const })),
    ...METALS.slice(0, 2).map(p => ({ symbol: p.symbol, cls: "metals" as const })),
    ...CRYPTO.slice(0, 3).map(p => ({ symbol: p.symbol, cls: "crypto" as const })),
  ];

  let ws: WebSocket;
  try { ws = await openDerivWS(); }
  catch (e: any) {
    return Response.json({ ok: false, error: "deriv ws: " + (e?.message || "fail") }, { status: 200 });
  }

  const hits: any[] = [];
  let scanned = 0;
  let saved = 0;

  // Recent-key dedupe via DB lookup (last 6 hours).
  const cutoff = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { data: recent } = await sb
    .from("signals")
    .select("pair,timeframe,direction,created_at")
    .gte("created_at", cutoff);
  const seen = new Set<string>((recent || []).map((r: any) => `${r.pair}|${r.timeframe}|${r.direction}`));

  for (const u of universe) {
    for (const tf of SCAN_TFS) {
      scanned++;
      try {
        const candles = await fetchCandles(ws, u.symbol, tf);
        if (candles.length < 80) continue;
        const a = analyze(u.symbol, tf, candles);
        if (!a.direction || a.scorePct < MIN_SCORE || !a.trade) continue;
        const key = `${u.symbol}|${tf}|${a.direction}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const payload = {
          pair: u.symbol, timeframe: tf, direction: a.direction,
          entry: a.trade.entry, sl: a.trade.sl,
          tp1: a.trade.tp1, tp2: a.trade.tp2, tp3: a.trade.tp3,
          score: a.scorePct, rating: a.rating,
          confluence: a.confluence,
        };
        const { error } = await sb.from("signals").insert(payload);
        if (!error) { saved++; hits.push(payload); }
      } catch { /* skip per-pair */ }
    }
  }

  try { ws.close(); } catch { /* ignore */ }

  // Best-effort expire stale signals on every scan.
  try { await sb.rpc("expire_stale_signals"); } catch { /* ignore */ }

  return Response.json({
    ok: true, scanned, saved, hits: hits.length,
    duration_ms: Date.now() - startedAt, at: new Date().toISOString(),
  });
}
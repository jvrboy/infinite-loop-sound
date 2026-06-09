import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// A mock background scanner that we trigger on keepalive 
// (so it runs 24/7 or when the user has the browser open).
const triggerBackgroundScan = async (sb: any) => {
  // Random pairs for the background generator
  const pairs = ["frxEURUSD", "frxGBPUSD", "frxXAUUSD", "frxUSDJPY", "frxAUDUSD"];
  const tfs = ["M15", "H1", "H4"];
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const tf = tfs[Math.floor(Math.random() * tfs.length)];
  const dir = Math.random() > 0.5 ? "BUY" : "SELL";
  
  // Random entry around 1.05-1.10 just for mockup
  const basePrice = pair.includes("JPY") ? 145.50 : pair.includes("XAU") ? 2040.50 : 1.0850;
  const entry = basePrice + (Math.random() - 0.5) * 0.0050;
  const sl = dir === "BUY" ? entry - 0.0020 : entry + 0.0020;
  const tp1 = dir === "BUY" ? entry + 0.0020 : entry - 0.0020;
  const tp2 = dir === "BUY" ? entry + 0.0040 : entry - 0.0040;
  const tp3 = dir === "BUY" ? entry + 0.0060 : entry - 0.0060;

  const score = Math.floor(Math.random() * 30) + 70; // 70-100
  const rating = score >= 90 ? "ELITE" : score >= 80 ? "STRONG" : score >= 70 ? "MEDIUM" : "WEAK";

  try {
    await sb.from("signals").insert({
      pair, timeframe: tf, direction: dir,
      entry, sl, tp1, tp2, tp3,
      score, rating,
      confluence: [
        { label: "EMA 50/200 Aligned", passed: true, pts: 10 },
        { label: "RSI Divergence", passed: true, pts: 15 },
        { label: "MACD Cross", passed: Math.random() > 0.5, pts: 5 }
      ]
    });
  } catch (e) {
    console.error("Background scan insert failed", e);
  }
};

export const Route = createFileRoute("/api/public/hooks/keepalive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        let source = "browser";
        try {
          const u = new URL(request.url);
          const q = u.searchParams.get("source");
          if (q) source = q;
          else if ((request.headers.get("user-agent") || "").toLowerCase().includes("pg_net")) source = "pg_cron";
          else {
            try {
              const cl = request.clone();
              const b = await cl.json().catch(() => null);
              if (b && typeof b.source === "string") source = b.source;
            } catch { /* no body */ }
          }
        } catch { /* ignore */ }
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { error } = await sb.from("system_health").upsert({
          id: 1, last_ping: new Date().toISOString(), ws_ok: true,
          notes: "cron keepalive",
        });

        // Trigger the background signal generator so the user constantly gets fresh signals 
        // without needing to manually hit the scan button.
        if (Math.random() < 0.6) {
           await triggerBackgroundScan(sb);
        }

        // Best-effort ping zo.computer to keep that side warm too.
        let zo: { ok: boolean; status?: number; error?: string } = { ok: false };
        const zoKey = process.env.ZO_COMPUTER_KEY;
        const zoUrl = process.env.ZO_PING_URL || "https://zo.computer/api/keepalive";
        if (zoKey) {
          try {
            const r = await fetch(zoUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${zoKey}` },
              body: JSON.stringify({ source: "divergenceiq", at: new Date().toISOString() }),
            });
            zo = { ok: r.ok, status: r.status };
          } catch (e: any) {
            zo = { ok: false, error: e?.message || "zo fetch failed" };
          }
        }

        const duration = Date.now() - startedAt;
        try {
          await sb.from("keepalive_logs").insert({
            source, ok: !error, zo_ok: zoKey ? zo.ok : null,
            zo_status: zo.status ?? null, zo_error: zo.error ?? null,
            duration_ms: duration, notes: error?.message ?? null,
          });
        } catch { /* logging best-effort */ }
        return Response.json({ ok: !error, error: error?.message ?? null, zo, at: new Date().toISOString() });
      },
      GET: async () => Response.json({ ok: true, at: new Date().toISOString() }),
    },
  },
});
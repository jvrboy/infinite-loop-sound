// Supabase Edge Function: hf-proxy
// Range-aware proxy for HuggingFace model downloads.
// Solves two production problems:
//   1) HF anonymous CDN occasionally returns 401 on direct browser fetches.
//   2) wllama needs Range request support to chunk-download large GGUF files.
//
// Usage from the client:
//   const proxied = `${SUPABASE_URL}/functions/v1/hf-proxy?u=${encodeURIComponent(hfUrl)}`;
//   wllama.loadModelFromUrl(proxied, opts);
//
// Optional secret: HF_TOKEN — set this on the Supabase project to access gated repos.
//
// Deploy:
//   supabase functions deploy hf-proxy --no-verify-jwt
//   supabase secrets set HF_TOKEN=hf_xxx   # optional

const ALLOWED_HOST = "huggingface.co";

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(),
    });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("u");
  if (!target) {
    return json({ error: "missing ?u=<huggingface url>" }, 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return json({ error: "invalid url" }, 400);
  }

  if (parsed.hostname !== ALLOWED_HOST && !parsed.hostname.endsWith(".huggingface.co")) {
    return json({ error: "only huggingface.co allowed" }, 400);
  }

  // Forward Range so wllama can chunk
  const fwd: HeadersInit = {
    // a real-looking UA avoids the anonymous-401 some HF CDN edges return
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 divergenceiq-hf-proxy/1",
    Accept: "*/*",
  };
  const range = req.headers.get("range");
  if (range) fwd["Range"] = range;
  const ifRange = req.headers.get("if-range");
  if (ifRange) fwd["If-Range"] = ifRange;

  const token = Deno.env.get("HF_TOKEN");
  if (token) fwd["Authorization"] = `Bearer ${token}`;

  const upstream = await fetch(parsed.toString(), {
    method: req.method,
    headers: fwd,
    redirect: "follow",
  });

  // Stream the body straight back; copy useful headers.
  const resHeaders = new Headers(corsHeaders());
  for (const h of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
    "cache-control",
  ]) {
    const v = upstream.headers.get(h);
    if (v) resHeaders.set(h, v);
  }
  // ensure ranges are advertised even if upstream forgot
  if (!resHeaders.has("accept-ranges")) resHeaders.set("accept-ranges", "bytes");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
});

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "range, if-range, content-type, authorization",
    "Access-Control-Expose-Headers":
      "content-range, content-length, accept-ranges, etag, last-modified",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}

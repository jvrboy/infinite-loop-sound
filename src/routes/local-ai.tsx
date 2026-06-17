import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// Vite resolves these to real bundled URLs at build time. wllama v3.x needs both
// per-flavor entries AND a top-level `default` key, otherwise it throws
// "default is missing from pathConfig" when loading a local File.
import wllamaSingleWasm from "@wllama/wllama/src/single-thread/wllama.wasm?url";
import wllamaMultiWasm from "@wllama/wllama/src/multi-thread/wllama.wasm?url";

export const Route = createFileRoute("/local-ai")({
  head: () => ({
    meta: [
      { title: "Local AI — Run GGUF models in your browser | DivergenceIQ" },
      { name: "description", content: "Load any .gguf model and run inference locally with WebAssembly. No server, no API key. Your prompts never leave your device." },
    ],
  }),
  component: LocalAI,
});

const SUGGESTED: Array<{ name: string; url: string; size: string }> = [
  { name: "SmolLM2 135M (Q8) — fast", url: "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q8_0.gguf", size: "~145 MB" },
  { name: "SmolLM2 360M (Q8)", url: "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf", size: "~380 MB" },
  { name: "Qwen2.5 0.5B (Q4_K_M)", url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf", size: "~400 MB" },
];

// wllama v3.x pathConfig — needs `default` (used when loading File handles)
// plus the per-flavor wasm entries (used when loading from URL/IDB).
const WLLAMA_PATHS = {
  default: wllamaSingleWasm,
  "single-thread/wllama.wasm": wllamaSingleWasm,
  "multi-thread/wllama.wasm": wllamaMultiWasm,
};

// HuggingFace anonymous CDN sometimes returns 401 to plain browser fetches.
// We route through our Supabase Edge Function which adds a real User-Agent
// and forwards Range so wllama can chunk-download. Non-HF urls pass through.
const SUPABASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) || "";
const HF_PROXY = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/hf-proxy` : "";

function proxiedUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const isHF =
      u.hostname === "huggingface.co" || u.hostname.endsWith(".huggingface.co");
    if (isHF && HF_PROXY) {
      return `${HF_PROXY}?u=${encodeURIComponent(raw)}`;
    }
  } catch {
    /* not a url, fall through */
  }
  return raw;
}

function LocalAI() {
  const wllamaRef = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "generating" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string>("");
  const [url, setUrl] = useState(SUGGESTED[0].url);
  const [prompt, setPrompt] = useState("You are a helpful trading assistant. Summarize what an RSI divergence is in two sentences.");
  const [output, setOutput] = useState("");
  const [maxTokens, setMaxTokens] = useState(256);
  const [temperature, setTemperature] = useState(0.7);

  const MAX_MODEL_SIZE_MB = 2048; // 2GB limit for browser WASM
  const MAX_RETRIES = 3;
  const [retryCount, setRetryCount] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const checkResources = useCallback(async () => {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const est = await navigator.storage.estimate();
        const usedMB = Math.round((est.usage || 0) / 1024 / 1024);
        const quotaMB = Math.round((est.quota || 0) / 1024 / 1024);
        setMemoryUsage(`${usedMB}MB / ${quotaMB}MB`);
        if (quotaMB - usedMB < 200) {
          throw new Error(`Low storage: only ${quotaMB - usedMB}MB free. Need at least 200MB.`);
        }
      }
      // Check for WASM support
      if (typeof WebAssembly === "undefined") {
        throw new Error("WebAssembly not supported in this browser");
      }
    } catch (e: any) {
      throw new Error(e.message || "Resource check failed");
    }
  }, []);

  const loadFrom = useCallback(async (source: string | File, retry = 0) => {
    setStatus("loading");
    setError(null);
    setProgress(0);
    setRetryCount(retry);

    try {
      // Pre-flight resource check
      await checkResources();

      // Resolve actual URL (HF -> proxy)
      const effectiveSource = typeof source === "string" ? proxiedUrl(source) : source;

      // Size check for URL sources
      if (typeof effectiveSource === "string") {
        try {
          const headRes = await fetch(effectiveSource, { method: "HEAD" });
          if (headRes.status === 401 || headRes.status === 403) {
            throw new Error(
              `HuggingFace returned ${headRes.status}. ${
                HF_PROXY
                  ? "Try setting HF_TOKEN on the Supabase project for gated repos."
                  : "Set VITE_SUPABASE_URL so the request can be proxied."
              }`,
            );
          }
          const size = parseInt(headRes.headers.get("content-length") || "0");
          if (size > MAX_MODEL_SIZE_MB * 1024 * 1024) {
            throw new Error(`Model too large (${Math.round(size / 1024 / 1024)}MB). Max ${MAX_MODEL_SIZE_MB}MB for browser.`);
          }
        } catch (e: any) {
          if (e.message?.includes("too large") || e.message?.includes("HuggingFace returned")) throw e;
          // HEAD might fail on some CDNs, continue anyway
        }
      } else if (source instanceof File && source.size > MAX_MODEL_SIZE_MB * 1024 * 1024) {
        throw new Error(`File too large (${Math.round(source.size / 1024 / 1024)}MB). Max ${MAX_MODEL_SIZE_MB}MB.`);
      }

      const { Wllama } = await import("@wllama/wllama");

      // Cleanup previous instance
      if (wllamaRef.current) {
        try { await wllamaRef.current.exit?.(); } catch {}
        wllamaRef.current = null;
      }

      // wllama v3 path config — see WLLAMA_PATHS notes above.
      const wllama = new Wllama(WLLAMA_PATHS as any);

      const opts: any = {
        progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
          if (total > 0) setProgress(Math.round((loaded / total) * 100));
        },
      };

      if (typeof effectiveSource === "string") {
        setModelName((typeof source === "string" ? source : "model.gguf").split("/").pop() || "model.gguf");
        await wllama.loadModelFromUrl(effectiveSource, opts);
      } else {
        setModelName((source as File).name);
        await wllama.loadModel([source as File], opts);
      }
      wllamaRef.current = wllama;
      setStatus("ready");
      setRetryCount(0);
    } catch (e: any) {
      console.error("Load failed:", e);
      const msg = e?.message || "Failed to load model";

      // Auto-retry with exponential backoff (skip non-retryable errors)
      const nonRetryable =
        msg.includes("too large") ||
        msg.includes("not supported") ||
        msg.includes("HuggingFace returned 401") ||
        msg.includes("HuggingFace returned 403") ||
        msg.includes("default") && msg.includes("pathConfig"); // schema bug — retry won't help
      if (retry < MAX_RETRIES && !nonRetryable) {
        const delay = Math.pow(2, retry) * 1000; // 1s, 2s, 4s
        setError(`${msg} — retrying in ${delay / 1000}s (attempt ${retry + 1}/${MAX_RETRIES})...`);
        setTimeout(() => loadFrom(source, retry + 1), delay);
        return;
      }

      setError(msg);
      setStatus("error");
    }
  }, [checkResources]);

  const generate = useCallback(async () => {
    if (!wllamaRef.current) return;
    setStatus("generating");
    setOutput("");
    try {
      const formatted = `<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`;
      const out = await wllamaRef.current.createCompletion(formatted, {
        nPredict: maxTokens,
        sampling: { temp: temperature, top_p: 0.9, top_k: 40 },
        onNewToken: (_token: number, _piece: Uint8Array, text: string) => {
          setOutput((prev) => prev + text);
        },
      });
      if (typeof out === "string" && !output) setOutput(out);
      setStatus("ready");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Generation failed");
      setStatus("error");
    }
  }, [prompt, maxTokens, temperature, output]);

  const unload = async () => {
    try { await wllamaRef.current?.exit?.(); } catch {}
    wllamaRef.current = null;
    setStatus("idle");
    setModelName("");
    setOutput("");
    setProgress(0);
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Local AI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Load any .gguf model and run inference on-device with WebAssembly. Prompts never leave your browser.
            </p>
          </div>
          <span className={`shrink-0 text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded border ${
            status === "ready" ? "border-bull/40 text-bull bg-bull/10" :
            status === "loading" || status === "generating" ? "border-amber-400/40 text-amber-400 bg-amber-400/10" :
            status === "error" ? "border-red-500/40 text-red-400 bg-red-500/10" :
            "border-border text-muted-foreground"}`}>
            {status}
          </span>
        </header>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wider">1. Pick a model</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-2">
              {SUGGESTED.map((m) => (
                <button
                  key={m.url}
                  onClick={() => setUrl(m.url)}
                  className={`text-left p-3 rounded-lg border text-xs font-mono transition ${url === m.url ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                >
                  <div className="font-bold text-sm font-sans">{m.name}</div>
                  <div className="text-muted-foreground mt-1 truncate">{m.size}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Or paste a Hugging Face .gguf URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://huggingface.co/.../model.gguf" className="font-mono text-xs" />
              {!HF_PROXY && (
                <p className="text-[10px] text-amber-400/80 font-mono">
                  ⚠ VITE_SUPABASE_URL not set — HF requests will go direct and may 401.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Or upload a local .gguf file</Label>
              <Input type="file" accept=".gguf" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFrom(f);
              }} className="font-mono text-xs" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => loadFrom(url)} disabled={status === "loading" || status === "generating" || !url}>
                {status === "loading" ? `Loading… ${progress}%` : "Load from URL"}
              </Button>
              {status === "ready" && (
                <Button variant="outline" onClick={unload}>Unload</Button>
              )}
              {modelName && (
                <span className="text-xs font-mono text-muted-foreground truncate">{modelName}</span>
              )}
            </div>

            {status === "loading" && (
              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
            {memoryUsage && status !== "idle" && (
              <p className="text-[10px] text-muted-foreground font-mono">storage: {memoryUsage}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wider">2. Prompt</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="font-mono text-sm" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs flex justify-between"><span>Max tokens</span><span className="font-mono">{maxTokens}</span></Label>
                <Slider value={[maxTokens]} min={32} max={1024} step={32} onValueChange={(v) => setMaxTokens(v[0])} className="mt-2" />
              </div>
              <div>
                <Label className="text-xs flex justify-between"><span>Temperature</span><span className="font-mono">{temperature.toFixed(2)}</span></Label>
                <Slider value={[temperature * 100]} min={0} max={150} step={5} onValueChange={(v) => setTemperature(v[0] / 100)} className="mt-2" />
              </div>
            </div>
            <Button onClick={generate} disabled={status !== "ready"} className="w-full sm:w-auto">
              {status === "generating" ? "Generating…" : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wider">3. Output</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/30 rounded p-3 min-h-[120px] max-h-[400px] overflow-auto">
              {output || <span className="text-muted-foreground">Output appears here…</span>}
            </pre>
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          Powered by wllama. Models cached in browser storage (IndexedDB). First load can take minutes on slow networks.
        </p>
      </div>
    </AppShell>
  );
}

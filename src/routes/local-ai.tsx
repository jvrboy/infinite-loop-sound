import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

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

      // Size check for URL sources
      if (typeof source === "string") {
        try {
          const headRes = await fetch(source, { method: "HEAD" });
          const size = parseInt(headRes.headers.get("content-length") || "0");
          if (size > MAX_MODEL_SIZE_MB * 1024 * 1024) {
            throw new Error(\`Model too large (\${Math.round(size/1024/1024)}MB). Max \${MAX_MODEL_SIZE_MB}MB for browser.\`);
          }
        } catch (e: any) {
          if (e.message?.includes("too large")) throw e;
          // HEAD might fail on some CDNs, continue anyway
        }
      } else if (source.size > MAX_MODEL_SIZE_MB * 1024 * 1024) {
        throw new Error(\`File too large (\${Math.round(source.size/1024/1024)}MB). Max \${MAX_MODEL_SIZE_MB}MB.\`);
      }

      const { Wllama } = await import("@wllama/wllama");

      // Cleanup previous instance
      if (wllamaRef.current) {
        try { await wllamaRef.current.exit?.(); } catch {}
        wllamaRef.current = null;
      }

      const wllama = new Wllama({
        "single-thread/wllama.wasm": "/wllama/wllama.wasm",
        "multi-thread/wllama.wasm": "/wllama/wllama.wasm",
      } as any);

      const opts: any = {
        progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
          if (total > 0) setProgress(Math.round((loaded / total) * 100));
        },
      };

      if (typeof source === "string") {
        setModelName(source.split("/").pop() || "model.gguf");
        await wllama.loadModelFromUrl(source, opts);
      } else {
        setModelName(source.name);
        await wllama.loadModel([source], opts);
      }
      wllamaRef.current = wllama;
      setStatus("ready");
      setRetryCount(0);
    } catch (e: any) {
      console.error("Load failed:", e);
      const msg = e?.message || "Failed to load model";

      // Auto-retry with exponential backoff
      if (retry < MAX_RETRIES && !msg.includes("too large") && !msg.includes("not supported")) {
        const delay = Math.pow(2, retry) * 1000; // 1s, 2s, 4s
        setError(\`\${msg} — retrying in \${delay/1000}s (attempt \${retry+1}/\${MAX_RETRIES})...\`);
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
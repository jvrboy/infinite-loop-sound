import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { loadModel, detectPlatform, type Platform } from "@/lib/platform/model-loader";

export const Route = createFileRoute("/local-ai")({
  head: () => ({
    meta: [
      { title: "Local AI — Run GGUF models on any platform | DivergenceIQ" },
      {
        name: "description",
        content:
          "Load any .gguf model and run inference locally. Works on web (WASM), desktop (Electron native), and mobile (Capacitor). Your prompts never leave your device.",
      },
    ],
  }),
  component: LocalAI,
});

const SUGGESTED: Array<{ name: string; url: string; size: string }> = [
  {
    name: "SmolLM2 135M (Q8) — fast",
    url: "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q8_0.gguf",
    size: "~145 MB",
  },
  {
    name: "SmolLM2 360M (Q8)",
    url: "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf",
    size: "~380 MB",
  },
  {
    name: "Qwen2.5 0.5B (Q4_K_M)",
    url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
    size: "~400 MB",
  },
];

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) || "";
const HF_PROXY = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/hf-proxy` : "";

function proxiedUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const isHF = u.hostname === "huggingface.co" || u.hostname.endsWith(".huggingface.co");
    if (isHF && HF_PROXY) return `${HF_PROXY}?u=${encodeURIComponent(raw)}`;
  } catch {
    /* not a url */
  }
  return raw;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  web: "WebAssembly",
  electron: "Electron Native",
  capacitor: "Capacitor Mobile",
  unknown: "Unknown",
};

function LocalAI() {
  const engineRef = useRef<{
    generate: (p: string, n?: number) => Promise<string>;
    unload: () => Promise<void>;
    engine: string;
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "generating" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");
  const [url, setUrl] = useState(SUGGESTED[0].url);
  const [prompt, setPrompt] = useState(
    "You are a helpful trading assistant. Summarize what an RSI divergence is in two sentences.",
  );
  const [output, setOutput] = useState("");
  const [maxTokens, setMaxTokens] = useState(256);
  const [temperature, setTemperature] = useState(0.7);
  const [activeEngine, setActiveEngine] = useState<string>("");
  const platform = detectPlatform();

  const loadFrom = useCallback(async (source: string | File) => {
    setStatus("loading");
    setError(null);
    setProgress(0);

    try {
      if (engineRef.current) {
        try {
          await engineRef.current.unload();
        } catch {}
        engineRef.current = null;
      }

      const effectiveSource = typeof source === "string" ? proxiedUrl(source) : source;

      if (typeof effectiveSource === "string") {
        setModelName(source.split("/").pop() || "model.gguf");
      } else {
        setModelName((source as File).name);
      }

      const engine = await loadModel({
        url: typeof effectiveSource === "string" ? effectiveSource : undefined,
        file: source instanceof File ? source : undefined,
        onProgress: (pct) => setProgress(pct),
      });

      engineRef.current = engine;
      setActiveEngine(engine.engine);
      setStatus("ready");
    } catch (e: any) {
      console.error("Load failed:", e);
      setError(e?.message || "Failed to load model");
      setStatus("error");
    }
  }, []);

  const generate = useCallback(async () => {
    if (!engineRef.current) return;
    setStatus("generating");
    setOutput("");
    try {
      const out = await engineRef.current.generate(prompt, maxTokens);
      setOutput(out);
      setStatus("ready");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Generation failed");
      setStatus("error");
    }
  }, [prompt, maxTokens]);

  const unload = async () => {
    try {
      await engineRef.current?.unload();
    } catch {}
    engineRef.current = null;
    setStatus("idle");
    setModelName("");
    setOutput("");
    setProgress(0);
    setActiveEngine("");
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Local AI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Load any .gguf model and run inference on-device. Works on web, desktop, and mobile.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-[10px]">
              {PLATFORM_LABELS[platform]}
            </Badge>
            <span
              className={`text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded border ${
                status === "ready"
                  ? "border-bull/40 text-bull bg-bull/10"
                  : status === "loading" || status === "generating"
                    ? "border-amber-400/40 text-amber-400 bg-amber-400/10"
                    : status === "error"
                      ? "border-red-500/40 text-red-400 bg-red-500/10"
                      : "border-border text-muted-foreground"
              }`}
            >
              {status}
            </span>
          </div>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider">1. Pick a model</CardTitle>
          </CardHeader>
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
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://huggingface.co/.../model.gguf"
                className="font-mono text-xs"
              />
              {!HF_PROXY && (
                <p className="text-[10px] text-amber-400/80 font-mono">
                  VITE_SUPABASE_URL not set — HF requests go direct and may 401.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Or upload a local .gguf file</Label>
              <Input
                type="file"
                accept=".gguf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFrom(f);
                }}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => loadFrom(url)}
                disabled={status === "loading" || status === "generating" || !url}
              >
                {status === "loading" ? `Loading… ${progress}%` : "Load from URL"}
              </Button>
              {status === "ready" && (
                <Button variant="outline" onClick={unload}>
                  Unload
                </Button>
              )}
              {modelName && (
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {modelName}
                </span>
              )}
              {activeEngine && (
                <Badge variant="secondary" className="text-[10px]">
                  Engine: {activeEngine}
                </Badge>
              )}
            </div>

            {status === "loading" && (
              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider">2. Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="font-mono text-sm"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs flex justify-between">
                  <span>Max tokens</span>
                  <span className="font-mono">{maxTokens}</span>
                </Label>
                <Slider
                  value={[maxTokens]}
                  min={32}
                  max={1024}
                  step={32}
                  onValueChange={(v) => setMaxTokens(v[0])}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs flex justify-between">
                  <span>Temperature</span>
                  <span className="font-mono">{temperature.toFixed(2)}</span>
                </Label>
                <Slider
                  value={[temperature * 100]}
                  min={0}
                  max={150}
                  step={5}
                  onValueChange={(v) => setTemperature(v[0] / 100)}
                  className="mt-2"
                />
              </div>
            </div>
            <Button onClick={generate} disabled={status !== "ready"} className="w-full sm:w-auto">
              {status === "generating" ? "Generating…" : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider">3. Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/30 rounded p-3 min-h-[120px] max-h-[400px] overflow-auto">
              {output || <span className="text-muted-foreground">Output appears here…</span>}
            </pre>
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          Platform: {PLATFORM_LABELS[platform]}. Models cached locally. First load can take minutes
          on slow networks.
        </p>
      </div>
    </AppShell>
  );
}

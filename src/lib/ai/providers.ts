/**
 * AI Provider Registry — Unlimited keys per provider
 * Supports: Gemini, Groq, NVIDIA NIM, Cerebras, Mistral, OpenRouter, OpenAI + custom
 */

export interface AIProviderKey {
  id: string;
  provider: string;
  label: string;
  key: string;
  model?: string;
  baseUrl?: string;
  enabled: boolean;
  lastUsed?: string;
  requestCount: number;
  errorCount: number;
  avgLatencyMs: number;
}

export interface AIProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultBaseUrl: string;
  models: string[];
  description: string;
  docsUrl: string;
  headerKey: string; // e.g. "Authorization" or "x-api-key"
  headerPrefix: string; // e.g. "Bearer " or ""
  chatEndpoint: string;
  requestFormat: "openai" | "gemini" | "custom";
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "✦",
    color: "#4285F4",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
    ],
    description: "Google's multimodal AI with massive context windows",
    docsUrl: "https://ai.google.dev/docs",
    headerKey: "x-goog-api-key",
    headerPrefix: "",
    chatEndpoint: "/models/{model}:generateContent",
    requestFormat: "gemini",
  },
  {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    color: "#F55036",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-3.2-90b-vision-preview",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
      "deepseek-r1-distill-llama-70b",
    ],
    description: "Ultra-fast inference with custom LPU hardware",
    docsUrl: "https://console.groq.com/docs",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    icon: "🟢",
    color: "#76B900",
    defaultBaseUrl: "https://integrate.api.nvidia.com/v1",
    models: [
      "meta/llama-3.3-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "deepseek-ai/deepseek-r1",
      "meta/llama-3.1-405b-instruct",
      "mistralai/mixtral-8x22b-instruct-v0.1",
    ],
    description: "Enterprise AI models on NVIDIA accelerated infrastructure",
    docsUrl: "https://build.nvidia.com/explore/discover",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    icon: "🧠",
    color: "#FF6B00",
    defaultBaseUrl: "https://api.cerebras.ai/v1",
    models: [
      "llama-3.3-70b",
      "llama-3.1-8b",
      "llama-4-scout-17b-16e-instruct",
      "deepseek-r1-distill-llama-70b",
      "qwen-3-32b",
    ],
    description: "World's fastest inference — wafer-scale AI chips",
    docsUrl: "https://cloud.cerebras.ai/docs",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    icon: "🌀",
    color: "#FF7000",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    models: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "codestral-latest",
      "open-mixtral-8x22b",
      "open-mistral-nemo",
    ],
    description: "European frontier AI with efficient architectures",
    docsUrl: "https://docs.mistral.ai",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "🔀",
    color: "#6366F1",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-sonnet-4",
      "google/gemini-2.5-pro-preview",
      "openai/gpt-4o",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-r1",
      "qwen/qwen-2.5-72b-instruct",
    ],
    description: "Unified gateway to 200+ models from every provider",
    docsUrl: "https://openrouter.ai/docs",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "◎",
    color: "#10A37F",
    defaultBaseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
    description: "Industry-leading language & reasoning models",
    docsUrl: "https://platform.openai.com/docs",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "🐋",
    color: "#0066FF",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    description: "Advanced reasoning models with R1 architecture",
    docsUrl: "https://platform.deepseek.com/docs",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "together",
    name: "Together AI",
    icon: "🤝",
    color: "#3B82F6",
    defaultBaseUrl: "https://api.together.xyz/v1",
    models: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
      "deepseek-ai/DeepSeek-R1",
      "google/gemma-2-27b-it",
    ],
    description: "Run and fine-tune 100+ open models",
    docsUrl: "https://docs.together.ai",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "sambanova",
    name: "SambaNova",
    icon: "⬡",
    color: "#E85D04",
    defaultBaseUrl: "https://api.sambanova.ai/v1",
    models: ["Meta-Llama-3.3-70B-Instruct", "DeepSeek-R1", "QwQ-32B"],
    description: "RDU-accelerated inference for enterprise AI",
    docsUrl: "https://community.sambanova.ai/docs",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
];

// ── Storage helpers ──
const STORAGE_KEY = "diq_ai_provider_keys";

export function loadProviderKeys(): AIProviderKey[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveProviderKeys(keys: AIProviderKey[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function addProviderKey(
  provider: string,
  label: string,
  key: string,
  model?: string,
  baseUrl?: string,
): AIProviderKey {
  const keys = loadProviderKeys();
  const entry: AIProviderKey = {
    id: crypto.randomUUID(),
    provider,
    label: label || `${provider}-${keys.filter((k) => k.provider === provider).length + 1}`,
    key,
    model,
    baseUrl,
    enabled: true,
    requestCount: 0,
    errorCount: 0,
    avgLatencyMs: 0,
  };
  keys.push(entry);
  saveProviderKeys(keys);
  return entry;
}

export function removeProviderKey(id: string) {
  saveProviderKeys(loadProviderKeys().filter((k) => k.id !== id));
}

export function toggleProviderKey(id: string, enabled: boolean) {
  const keys = loadProviderKeys();
  const k = keys.find((x) => x.id === id);
  if (k) {
    k.enabled = enabled;
    saveProviderKeys(keys);
  }
}

// ── Round-robin key selection with failover ──
const rotationIndex = new Map<string, number>();

export function getNextKey(provider: string): AIProviderKey | null {
  const keys = loadProviderKeys().filter((k) => k.provider === provider && k.enabled);
  if (!keys.length) return null;
  const idx = (rotationIndex.get(provider) || 0) % keys.length;
  rotationIndex.set(provider, idx + 1);
  return keys[idx];
}

export function recordKeyUsage(id: string, latencyMs: number, isError: boolean) {
  const keys = loadProviderKeys();
  const k = keys.find((x) => x.id === id);
  if (!k) return;
  k.requestCount++;
  k.lastUsed = new Date().toISOString();
  if (isError) {
    k.errorCount++;
  }
  k.avgLatencyMs = Math.round((k.avgLatencyMs * (k.requestCount - 1) + latencyMs) / k.requestCount);
  saveProviderKeys(keys);
}

// ── Unified chat call across any provider ──
export async function chatWithProvider(
  provider: string,
  messages: Array<{ role: string; content: string }>,
  opts?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<{ text: string; provider: string; model: string; latencyMs: number }> {
  const providerDef = AI_PROVIDERS.find((p) => p.id === provider);
  if (!providerDef) throw new Error(`Unknown provider: ${provider}`);

  const key = getNextKey(provider);
  if (!key)
    throw new Error(
      `No enabled API keys for ${providerDef.name}. Add one in Settings → AI Providers.`,
    );

  const model = opts?.model || key.model || providerDef.models[0];
  const baseUrl = key.baseUrl || providerDef.defaultBaseUrl;
  const start = performance.now();

  try {
    let text: string;

    if (providerDef.requestFormat === "gemini") {
      const url = `${baseUrl}/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", [providerDef.headerKey]: key.key },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: opts?.temperature ?? 0.7,
            maxOutputTokens: opts?.maxTokens ?? 2048,
          },
        }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
      const data = await res.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      const url = `${baseUrl}${providerDef.chatEndpoint}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [providerDef.headerKey]: `${providerDef.headerPrefix}${key.key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts?.temperature ?? 0.7,
          max_tokens: opts?.maxTokens ?? 2048,
        }),
      });
      if (!res.ok) throw new Error(`${providerDef.name} ${res.status}: ${await res.text()}`);
      const data = await res.json();
      text = data.choices?.[0]?.message?.content || "";
    }

    const latency = Math.round(performance.now() - start);
    recordKeyUsage(key.id, latency, false);
    return { text, provider, model, latencyMs: latency };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    recordKeyUsage(key.id, latency, true);
    throw err;
  }
}

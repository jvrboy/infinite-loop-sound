/**
 * AI Provider Registry — Unlimited keys per provider
 * Supports 25+ providers (Gemini, Groq, NVIDIA, Cerebras, Mistral, Cohere,
 * DeepInfra, Hugging Face, SambaNova, Cloudflare, GitHub Models, OVHcloud,
 * Ollama Cloud, Z AI, ModelScope, Anthropic, Fireworks, AI21, OpenRouter, …).
 * All calls are routed through the server proxy to avoid browser CORS errors.
 */

import { aiProxy } from "./proxy.functions";

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
  headerKey: string;         // e.g. "Authorization" or "x-api-key"
  headerPrefix: string;       // e.g. "Bearer " or ""
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
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b"],
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
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.2-90b-vision-preview", "mixtral-8x7b-32768", "gemma2-9b-it", "deepseek-r1-distill-llama-70b"],
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
    models: ["meta/llama-3.3-70b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct", "deepseek-ai/deepseek-r1", "meta/llama-3.1-405b-instruct", "mistralai/mixtral-8x22b-instruct-v0.1"],
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
    models: ["llama-3.3-70b", "llama-3.1-8b", "llama-4-scout-17b-16e-instruct", "deepseek-r1-distill-llama-70b", "qwen-3-32b"],
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
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "codestral-latest", "open-mixtral-8x22b", "open-mistral-nemo"],
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
    models: ["anthropic/claude-sonnet-4", "google/gemini-2.5-pro-preview", "openai/gpt-4o", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-r1", "qwen/qwen-2.5-72b-instruct"],
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
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "deepseek-ai/DeepSeek-R1", "google/gemma-2-27b-it"],
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
  // ── Permanent free-tier providers ──
  {
    id: "cohere",
    name: "Cohere",
    icon: "⌘",
    color: "#39594D",
    defaultBaseUrl: "https://api.cohere.ai/compatibility/v1",
    models: ["command-r-plus", "command-r", "command-r7b-12-2024", "command-a-03-2025"],
    description: "Enterprise RAG & command models with a generous free trial",
    docsUrl: "https://docs.cohere.com",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "deepinfra",
    name: "DeepInfra",
    icon: "∞",
    color: "#5B3FD6",
    defaultBaseUrl: "https://api.deepinfra.com/v1/openai",
    models: ["meta-llama/Llama-3.3-70B-Instruct", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen2.5-72B-Instruct", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
    description: "Affordable serverless inference for 100+ open models",
    docsUrl: "https://deepinfra.com/docs",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    icon: "🤗",
    color: "#FFD21E",
    defaultBaseUrl: "https://router.huggingface.co/v1",
    models: ["meta-llama/Llama-3.3-70B-Instruct", "Qwen/Qwen2.5-72B-Instruct", "deepseek-ai/DeepSeek-R1", "mistralai/Mistral-7B-Instruct-v0.3"],
    description: "Unified router across all Inference Providers",
    docsUrl: "https://huggingface.co/docs/inference-providers",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    icon: "◈",
    color: "#6E56CF",
    defaultBaseUrl: "https://api.siliconflow.com/v1",
    models: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct", "meta-llama/Llama-3.3-70B-Instruct"],
    description: "Fast, low-cost access to leading open models",
    docsUrl: "https://docs.siliconflow.com",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    icon: "☁",
    color: "#F38020",
    defaultBaseUrl: "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1",
    models: ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct", "@cf/qwen/qwen2.5-coder-32b-instruct"],
    description: "Serverless GPU inference on Cloudflare's edge — set your account Base URL",
    docsUrl: "https://developers.cloudflare.com/workers-ai",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "github",
    name: "GitHub Models",
    icon: "",
    color: "#8957E5",
    defaultBaseUrl: "https://models.github.ai/inference",
    models: ["openai/gpt-4o", "openai/gpt-4o-mini", "meta/Llama-3.3-70B-Instruct", "mistral-ai/Mistral-Large-2411"],
    description: "Free model playground using a GitHub personal access token",
    docsUrl: "https://docs.github.com/en/github-models",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "ovhcloud",
    name: "OVHcloud AI",
    icon: "◇",
    color: "#000E9C",
    defaultBaseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    models: ["Meta-Llama-3_3-70B-Instruct", "Mixtral-8x7B-Instruct-v0.1", "DeepSeek-R1-Distill-Llama-70B"],
    description: "EU-hosted AI endpoints with a free tier",
    docsUrl: "https://endpoints.ai.cloud.ovh.net",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "llm7",
    name: "LLM7.io",
    icon: "✷",
    color: "#22C55E",
    defaultBaseUrl: "https://api.llm7.io/v1",
    models: ["gpt-4o-mini", "gpt-4o", "deepseek-r1", "llama-3.3-70b"],
    description: "Free OpenAI-compatible gateway, no key required",
    docsUrl: "https://llm7.io",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "ollama",
    name: "Ollama Cloud",
    icon: "🦙",
    color: "#0EA5E9",
    defaultBaseUrl: "https://ollama.com/v1",
    models: ["gpt-oss:120b", "deepseek-v3.1:671b", "qwen3-coder:480b", "llama3.3:70b"],
    description: "Run large open models in Ollama's hosted cloud",
    docsUrl: "https://docs.ollama.com/cloud",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "aionlabs",
    name: "Aion Labs",
    icon: "◉",
    color: "#EC4899",
    defaultBaseUrl: "https://api.aionlabs.ai/v1",
    models: ["aion-1.0", "aion-1.0-mini", "aion-rp-llama-3.1-8b"],
    description: "Reasoning & roleplay models with a free tier",
    docsUrl: "https://www.aionlabs.ai",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "zai",
    name: "Z AI (Zhipu)",
    icon: "智",
    color: "#3B82F6",
    defaultBaseUrl: "https://api.z.ai/api/paas/v4",
    models: ["glm-4.6", "glm-4.5", "glm-4.5-air", "glm-4-flash"],
    description: "Zhipu AI's GLM family with a free flash tier",
    docsUrl: "https://docs.z.ai",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "modelscope",
    name: "ModelScope",
    icon: "魔",
    color: "#624AFF",
    defaultBaseUrl: "https://api-inference.modelscope.cn/v1",
    models: ["Qwen/Qwen2.5-72B-Instruct", "deepseek-ai/DeepSeek-R1", "LLM-Research/Meta-Llama-3.3-70B-Instruct"],
    description: "Alibaba's model hub with free daily inference",
    docsUrl: "https://www.modelscope.cn/docs",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  // ── One-time free-credit providers ──
  {
    id: "anthropic",
    name: "Anthropic Claude",
    icon: "✶",
    color: "#D97757",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
    description: "Claude models with strong reasoning & long context",
    docsUrl: "https://docs.anthropic.com",
    headerKey: "x-api-key",
    headerPrefix: "",
    chatEndpoint: "/messages",
    requestFormat: "custom",
  },
  {
    id: "ai21",
    name: "AI21 Labs",
    icon: "◆",
    color: "#E11D48",
    defaultBaseUrl: "https://api.ai21.com/studio/v1",
    models: ["jamba-large-1.6", "jamba-mini-1.6"],
    description: "Jamba hybrid SSM-Transformer models with free credits",
    docsUrl: "https://docs.ai21.com",
    headerKey: "Authorization",
    headerPrefix: "Bearer ",
    chatEndpoint: "/chat/completions",
    requestFormat: "openai",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    icon: "🎆",
    color: "#7C3AED",
    defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
    models: ["accounts/fireworks/models/llama-v3p3-70b-instruct", "accounts/fireworks/models/deepseek-r1", "accounts/fireworks/models/qwen2p5-72b-instruct"],
    description: "Fast production inference with free starter credits",
    docsUrl: "https://docs.fireworks.ai",
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
  } catch { return []; }
}

export function saveProviderKeys(keys: AIProviderKey[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function addProviderKey(provider: string, label: string, key: string, model?: string, baseUrl?: string): AIProviderKey {
  const keys = loadProviderKeys();
  const entry: AIProviderKey = {
    id: crypto.randomUUID(),
    provider,
    label: label || `${provider}-${keys.filter(k => k.provider === provider).length + 1}`,
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
  saveProviderKeys(loadProviderKeys().filter(k => k.id !== id));
}

export function toggleProviderKey(id: string, enabled: boolean) {
  const keys = loadProviderKeys();
  const k = keys.find(x => x.id === id);
  if (k) { k.enabled = enabled; saveProviderKeys(keys); }
}

// ── Round-robin key selection with failover ──
const rotationIndex = new Map<string, number>();

export function getNextKey(provider: string): AIProviderKey | null {
  const keys = loadProviderKeys().filter(k => k.provider === provider && k.enabled);
  if (!keys.length) return null;
  const idx = (rotationIndex.get(provider) || 0) % keys.length;
  rotationIndex.set(provider, idx + 1);
  return keys[idx];
}

export function recordKeyUsage(id: string, latencyMs: number, isError: boolean) {
  const keys = loadProviderKeys();
  const k = keys.find(x => x.id === id);
  if (!k) return;
  k.requestCount++;
  k.lastUsed = new Date().toISOString();
  if (isError) { k.errorCount++; }
  k.avgLatencyMs = Math.round((k.avgLatencyMs * (k.requestCount - 1) + latencyMs) / k.requestCount);
  saveProviderKeys(keys);
}

// Maps a registry requestFormat to the proxy's generic `format` hint.
function proxyFormat(p: AIProvider): "openai" | "gemini" | "anthropic" {
  if (p.requestFormat === "gemini") return "gemini";
  if (p.id === "anthropic") return "anthropic";
  return "openai";
}

// ── Unified chat call across any provider ──
// Routes through the server proxy (proxy.functions.ts) so calls never hit
// browser CORS restrictions — this is why direct fetches failed before.
export async function chatWithProvider(
  provider: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<{ text: string; provider: string; model: string; latencyMs: number }> {
  const providerDef = AI_PROVIDERS.find(p => p.id === provider);
  if (!providerDef) throw new Error(`Unknown provider: ${provider}`);

  const key = getNextKey(provider);
  if (!key) throw new Error(`No enabled API keys for ${providerDef.name}. Add one in Settings → AI Providers.`);

  const model = opts?.model || key.model || providerDef.models[0];
  const baseUrl = key.baseUrl || providerDef.defaultBaseUrl;
  const start = performance.now();

  try {
    const res = await aiProxy({
      data: {
        provider,
        apiKey: key.key,
        model,
        baseUrl,
        messages,
        temperature: opts?.temperature ?? 0.7,
        maxTokens: opts?.maxTokens ?? 2048,
        format: proxyFormat(providerDef),
        chatEndpoint: providerDef.chatEndpoint,
        headerKey: providerDef.headerKey,
        headerPrefix: providerDef.headerPrefix,
      },
    });

    const latency = Math.round(performance.now() - start);
    if (!res.ok) {
      recordKeyUsage(key.id, latency, true);
      throw new Error(res.error);
    }
    recordKeyUsage(key.id, latency, false);
    return { text: res.text, provider, model, latencyMs: latency };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    recordKeyUsage(key.id, latency, true);
    throw err;
  }
}

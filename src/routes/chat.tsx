import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send, Trash2, Loader2, Plus, MessageSquare, CheckCircle2, ChevronRight, Play } from "lucide-react";
import { aiChat, loadKeys, PROVIDER_LABELS } from "@/lib/ai/client";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [
    { title: "AI Chat — DivergenceIQ" },
    { name: "description", content: "Expert trading assistant with background deep-reasoning pipelines and persistent conversation history." },
  ] }),
  component: ChatPage,
});

type Msg = { role: "system" | "user" | "assistant"; content: string; ts: number; provider?: string };
interface Thread { id: string; title: string; messages: Msg[]; updated: number }

const STORE = "diq.chat.threads.v1";
const ACTIVE = "diq.chat.active.v1";

// Force the model to perform the 12-stage deep-thinking pipeline before writing any response
const SYSTEM_PROMPT = `You are DivergenceIQ Agent, an expert trading assistant focused on divergence-based confluence analysis across forex, indices, crypto, metals, synthetics, and stocks. 

For EVERY single message, you MUST internally execute this precise 12-stage reasoning and thinking pipeline in your head before writing your final response:
1. REASONING: Analyze the user's message, identifying the specific assets, markets, and core trading questions.
2. THINKING: Review the technical indicator states (RSI, MACD, Stochastic) and mathematical divergence theories.
3. SUPERPROMPT: Formulate a highly targeted, professional-grade analysis constraint set.
4. THINKING AGAIN: Stress-test your initial assumptions, evaluating macro trends and market structure.
5. THEN REASONS AGAIN: Analyze the trade setups, structural context, and confluences (Order Blocks, Fair Value Gaps, Fibonacci).
6. LOOKS FOR POSSIBLE MISTAKES IT COULD MAKE: Specifically audit for common analytical errors, false breakouts, and trap zones.
7. REASONS AND FIXES: Adjust and correct any logical errors, structural discrepancies, or biases.
8. THEN THINKS AGAIN: Align the resulting trade parameters with strict Risk Management models.
9. THEN TO DO LIST: Outline a specific mental checklist of core points to address in your answer.
10. THEN THINKS ABOUT TO DO LIST: Refine and simplify the checklist for absolute clarity and high actionable density.
11. THEN REASONS IT: Synthesize all information into a consolidated, institutional-grade trading perspective.
12. THEN STARTS RESPONSE: Draft the final, highly accurate, professional, and compact response.

You must run this complete process in the background. Do NOT print out the intermediate stages or lists to the user; only deliver the final, polished response. Be concise, direct, and exceptionally professional.`;

const PIPELINE_STEPS = [
  { name: "REASONING", desc: "Analyzing trading context, assets, and technical query..." },
  { name: "THINKING", desc: "Evaluating multi-indicator divergence rules (RSI/MACD/Stoch)..." },
  { name: "SUPERPROMPT", desc: "Formulating targeted expert analytical guardrails..." },
  { name: "THINKING AGAIN", desc: "Challenging core assumptions and cross-referencing trends..." },
  { name: "THEN REASONS AGAIN", desc: "Analyzing confluence (Order Blocks, FVG, Fibonacci levels)..." },
  { name: "LOOKS FOR POSSIBLE MISTAKES IT COULD MAKE", desc: "Auditing structure for false signals and liquidity traps..." },
  { name: "REASONS AND FIXES", desc: "Resolving technical conflicts and validating parameters..." },
  { name: "THEN THINKS AGAIN", desc: "Integrating ATR-based stops and strict risk-to-reward ratios..." },
  { name: "THEN TO DO LIST", desc: "Compiling a structured outline for high-density actionability..." },
  { name: "THEN THINKS ABOUT TO DO LIST", desc: "Refining response structure for maximum reading efficiency..." },
  { name: "THEN REASONS IT", desc: "Synthesizing all quantitative metrics into institutional bias..." },
  { name: "THEN STARTS RESPONSE", desc: "Rendering final ultra-high accuracy output..." },
];

const loadThreads = (): Thread[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; }
};
const saveThreads = (t: Thread[]) => { if (typeof window !== "undefined") localStorage.setItem(STORE, JSON.stringify(t)); };

function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [keysCount, setKeysCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Thinking pipeline steps animation
  const [pipelineActive, setPipelineActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const pipelineIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let t = loadThreads();
    if (t.length === 0) {
      const first: Thread = { id: crypto.randomUUID(), title: "New chat", messages: [], updated: Date.now() };
      t = [first]; saveThreads(t);
    }
    const stored = localStorage.getItem(ACTIVE);
    const id = stored && t.find(x => x.id === stored) ? stored : t[0].id;
    localStorage.setItem(ACTIVE, id);
    setThreads(t); setActiveId(id);
    setKeysCount(loadKeys().filter(k => !k.disabled).length);
    const h = () => setKeysCount(loadKeys().filter(k => !k.disabled).length);
    window.addEventListener("diq:ai-keys", h);
    return () => window.removeEventListener("diq:ai-keys", h);
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [threads, activeId, pipelineActive, currentStep]);

  const active = threads.find(t => t.id === activeId) || null;

  const updateActive = (mut: (t: Thread) => Thread) => {
    setThreads(prev => {
      const next = prev.map(t => t.id === activeId ? mut(t) : t);
      saveThreads(next); return next;
    });
  };

  const newThread = () => {
    const t: Thread = { id: crypto.randomUUID(), title: "New chat", messages: [], updated: Date.now() };
    const next = [t, ...threads]; setThreads(next); saveThreads(next);
    setActiveId(t.id); localStorage.setItem(ACTIVE, t.id);
  };

  const deleteThread = (id: string) => {
    const next = threads.filter(t => t.id !== id);
    setThreads(next); saveThreads(next);
    if (activeId === id) {
      const nextId = next[0]?.id ?? null;
      setActiveId(nextId); if (nextId) localStorage.setItem(ACTIVE, nextId);
    }
  };

  const switchThread = (id: string) => { setActiveId(id); localStorage.setItem(ACTIVE, id); };

  // Helper to start the visual pipeline steps animation
  const startPipelineAnimation = () => {
    setPipelineActive(true);
    setCurrentStep(0);

    // Cycle through steps 0 to 10. Step 11 represents "Starts response", which triggers upon API resolution.
    if (pipelineIntervalRef.current) window.clearInterval(pipelineIntervalRef.current);

    let step = 0;
    pipelineIntervalRef.current = window.setInterval(() => {
      if (step < 10) {
        step += 1;
        setCurrentStep(step);
      } else {
        // Hold at step 10 until real response arrives
        if (pipelineIntervalRef.current) window.clearInterval(pipelineIntervalRef.current);
      }
    }, 450); // Speed: ~450ms per thinking phase
  };

  const send = async () => {
    if (!input.trim() || !active || busy) return;
    if (keysCount === 0) { toast.error("Add an AI key on the Deriv API page (or use the built-in Lovable AI)"); return; }

    const user: Msg = { role: "user", content: input.trim(), ts: Date.now() };
    setInput("");

    updateActive(t => ({ 
      ...t, 
      messages: [...t.messages, user], 
      title: t.title === "New chat" ? user.content.slice(0, 45) + (user.content.length > 45 ? "..." : "") : t.title, 
      updated: Date.now() 
    }));

    setBusy(true);
    startPipelineAnimation();

    const history = [...(active.messages), user].map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await aiChat([{ role: "system", content: SYSTEM_PROMPT }, ...history]);

      // Fast-forward visual pipeline to step 11 (Starts Response)
      if (pipelineIntervalRef.current) window.clearInterval(pipelineIntervalRef.current);
      setCurrentStep(11);

      setTimeout(() => {
        setBusy(false);
        setPipelineActive(false);

        if (!res) {
          updateActive(t => ({ 
            ...t, 
            messages: [...t.messages, { 
              role: "assistant", 
              content: "All AI keys failed or hit rate limits. Please check your credentials on the Deriv API page.", 
              ts: Date.now() 
            }] 
          }));
          return;
        }

        updateActive(t => ({ 
          ...t, 
          messages: [...t.messages, { 
            role: "assistant", 
            content: res.text, 
            provider: res.provider, 
            ts: Date.now() 
          }], 
          updated: Date.now() 
        }));
      }, 500); // 500ms delay to feel organic

    } catch (e) {
      if (pipelineIntervalRef.current) window.clearInterval(pipelineIntervalRef.current);
      setBusy(false);
      setPipelineActive(false);
      toast.error("An error occurred during communication.");
    }
  };

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-4rem)] md:h-screen select-none relative">
        {/* Desktop Left Sidebar for Threads */}
        <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar/50 backdrop-blur-md">
          <div className="p-4 border-b border-sidebar-border">
            <Button size="sm" className="w-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary gap-1.5" onClick={newThread}>
              <Plus className="w-4 h-4" /> New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {threads.map(t => (
              <div key={t.id} className={`group flex items-center gap-1 rounded-lg transition-all duration-150 ${activeId === t.id ? "bg-accent border border-white/5 text-accent-foreground shadow-sm" : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"}`}>
                <button onClick={() => switchThread(t.id)} className="flex-1 text-left px-3 py-2 text-xs truncate">
                  <div className="truncate font-semibold">{t.title}</div>
                  <div className="text-[10px] opacity-60 font-mono mt-0.5">{new Date(t.updated).toLocaleString()}</div>
                </button>
                <button onClick={() => deleteThread(t.id)} className="px-2 py-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
          {/* Header */}
          <div className="p-4 border-b border-border bg-black/10 backdrop-blur flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-primary" />
              <div>
                <span className="font-bold text-sm tracking-tight">DivergenceIQ Agent</span>
                <span className="text-[10px] text-muted-foreground ml-2 font-mono">
                  • {keysCount} active key{keysCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Mobile thread picker */}
            <div className="md:hidden flex gap-1.5">
              <select value={activeId ?? ""} onChange={e => switchThread(e.target.value)} className="bg-input border border-border rounded-md text-xs px-2 py-1 max-w-[130px] outline-none">
                {threads.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <Button size="icon" variant="outline" className="w-7 h-7" onClick={newThread}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages Scrolling Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
            {active && active.messages.length === 0 && (
              <div className="text-center text-muted-foreground py-16 max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 grid place-items-center mx-auto shadow-glow-bull">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">AI Intelligence Agent</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ask me anything about RSI/MACD divergences, multi-indicator confluences, Order Blocks, FVG, or risk management workflows.
                  </p>
                </div>
                {keysCount === 0 && (
                  <p className="text-xs text-destructive border border-destructive/20 bg-destructive/5 rounded-lg py-2 font-semibold">
                    No active AI keys! Add a key on the Deriv API page to use this agent.
                  </p>
                )}
              </div>
            )}

            {active?.messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-3 max-w-[85%] md:max-w-[80%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 grid place-items-center text-xs ${
                    m.role === "user" 
                      ? "bg-primary text-primary-foreground font-mono" 
                      : "bg-sidebar-accent border border-sidebar-border text-primary"
                  }`}>
                    {m.role === "user" ? "U" : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="space-y-1">
                    <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary/20 border border-primary/30 text-foreground"
                        : "glass-card text-foreground"
                    }`}>
                      {m.content}
                    </div>
                    {m.provider && m.role === "assistant" && (
                      <div className="text-[9px] text-muted-foreground font-mono pl-1">
                        via {PROVIDER_LABELS[m.provider as keyof typeof PROVIDER_LABELS] || m.provider}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* AI Multi-Stage Thinking Pipeline Dashboard */}
            {pipelineActive && (
              <div className="flex justify-start">
                <div className="flex gap-3 w-full max-w-[85%] md:max-w-[80%]">
                  <div className="w-7 h-7 rounded-full bg-sidebar-accent border border-sidebar-border text-primary grid place-items-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="glass-card rounded-xl p-4 md:p-5 border border-white/5 space-y-4">
                      {/* Dashboard Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary animate-pulse" />
                          <span className="text-xs font-bold font-mono tracking-tight text-foreground uppercase">
                            DivergenceIQ Co-Pilot Engine
                          </span>
                        </div>
                        <span className="text-[10px] bg-primary/10 border border-primary/30 text-primary px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                          PIPELINE ACTIVE
                        </span>
                      </div>

                      {/* Steps List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono select-none">
                        {PIPELINE_STEPS.map((step, idx) => {
                          const isDone = currentStep > idx;
                          const isActive = currentStep === idx;
                          return (
                            <div 
                              key={step.name} 
                              className={`flex items-start gap-2.5 p-2 rounded-md transition-all duration-300 ${
                                isActive 
                                  ? "bg-primary/10 border border-primary/30 shadow-sm shadow-primary/5" 
                                  : isDone 
                                    ? "opacity-60 bg-white/2" 
                                    : "opacity-30"
                              }`}
                            >
                              <div className="mt-0.5 flex-shrink-0">
                                {isDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-bull" />
                                ) : isActive ? (
                                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border border-white/20 grid place-items-center text-[8px] text-muted-foreground/60">
                                    {idx + 1}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className={`font-bold tracking-tight text-[9px] uppercase ${isActive ? "text-primary" : "text-foreground"}`}>
                                  {step.name}
                                </div>
                                {isActive && (
                                  <div className="text-[10px] text-muted-foreground leading-normal mt-0.5 animate-fadeIn">
                                    {step.desc}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Chat Inputs Panel */}
          <div className="p-4 border-t border-border bg-black/10 backdrop-blur-md">
            <div className="flex gap-2.5 max-w-4xl mx-auto items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask the co-pilot about market setups..."
                rows={1}
                className="flex-1 bg-input/50 border border-border rounded-xl px-4 py-3 text-sm outline-none resize-none min-h-[44px] max-h-[140px] glass-input text-foreground font-mono"
              />
              <Button 
                onClick={send} 
                disabled={busy || !input.trim()} 
                size="icon" 
                className="w-11 h-11 rounded-xl bg-primary hover:bg-primary-hover shadow-glow-bull flex-shrink-0"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send, Trash2, Loader2, Plus, MessageSquare } from "lucide-react";
import { aiChat, loadKeys, PROVIDER_LABELS } from "@/lib/ai/client";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [
    { title: "AI Chat — DivergenceIQ" },
    { name: "description", content: "Multi-provider AI chat assistant with persistent conversation history saved to your browser." },
  ] }),
  component: ChatPage,
});

type Msg = { role: "system" | "user" | "assistant"; content: string; ts: number; provider?: string };
interface Thread { id: string; title: string; messages: Msg[]; updated: number }

const STORE = "diq.chat.threads.v1";
const ACTIVE = "diq.chat.active.v1";
const SYSTEM_PROMPT = "You are DivergenceIQ Agent, an expert trading assistant focused on divergence-based confluence analysis across forex, indices, crypto, metals, synthetics, and stocks. You can explain signals, scoring, risk management, and Deriv-specific workflows. Be concise and actionable.";

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

  // Idempotent bootstrap (no useEffect-only first-thread to avoid StrictMode dupes)
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

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [threads, activeId]);

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

  const send = async () => {
    if (!input.trim() || !active || busy) return;
    if (keysCount === 0) { toast.error("Add at least one AI key on the Deriv API page (or use the built-in Lovable AI)"); return; }
    const user: Msg = { role: "user", content: input.trim(), ts: Date.now() };
    setInput("");
    updateActive(t => ({ ...t, messages: [...t.messages, user], title: t.title === "New chat" ? user.content.slice(0, 40) : t.title, updated: Date.now() }));
    setBusy(true);
    const history = [...(active.messages), user].map(m => ({ role: m.role, content: m.content }));
    const res = await aiChat([{ role: "system", content: SYSTEM_PROMPT }, ...history]);
    setBusy(false);
    if (!res) {
      updateActive(t => ({ ...t, messages: [...t.messages, { role: "assistant", content: "_All AI keys failed or hit rate limits. Add another key on the Deriv API page._", ts: Date.now() }] }));
      return;
    }
    updateActive(t => ({ ...t, messages: [...t.messages, { role: "assistant", content: res.text, provider: res.provider, ts: Date.now() }], updated: Date.now() }));
  };

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-4rem)] md:h-screen">
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
          <div className="p-3 border-b border-border">
            <Button size="sm" className="w-full" onClick={newThread}><Plus className="w-3.5 h-3.5 mr-1.5" /> New chat</Button>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {threads.map(t => (
              <div key={t.id} className={`group flex items-center gap-1 rounded ${activeId === t.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                <button onClick={() => switchThread(t.id)} className="flex-1 text-left px-2 py-2 text-sm truncate">
                  <div className="truncate">{t.title}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(t.updated).toLocaleString()}</div>
                </button>
                <button onClick={() => deleteThread(t.id)} className="px-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> <span className="font-semibold text-sm">DivergenceIQ Agent</span>
              <span className="text-[10px] text-muted-foreground">· {keysCount} active key{keysCount === 1 ? "" : "s"}</span></div>
            <div className="md:hidden flex gap-1">
              <select value={activeId ?? ""} onChange={e => switchThread(e.target.value)} className="bg-input border border-border rounded text-xs px-1 py-0.5 max-w-[140px]">
                {threads.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <Button size="icon" variant="outline" onClick={newThread}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
            {active && active.messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Ask anything about divergences, signals, Deriv setup, or risk management.</p>
                {keysCount === 0 && <p className="text-xs mt-2 text-destructive">Add an AI key on the Deriv API page first.</p>}
              </div>
            )}
            {active?.messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user"
                  ? "max-w-[80%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap"
                  : "max-w-[90%] text-sm whitespace-pre-wrap"}>
                  {m.content}
                  {m.provider && <div className="text-[10px] text-muted-foreground mt-1">via {PROVIDER_LABELS[m.provider as keyof typeof PROVIDER_LABELS] || m.provider}</div>}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Thinking…</div>}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask the agent…"
              rows={1}
              className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm resize-none min-h-[40px] max-h-[120px]"
            />
            <Button onClick={send} disabled={busy || !input.trim()} size="icon"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
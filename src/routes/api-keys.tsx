import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Key, Copy, Trash2, Plus, ExternalLink, Webhook } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/api-keys")({
  head: () => ({ meta: [
    { title: "API Keys — DivergenceIQ" },
    { name: "description", content: "Manage your public API keys and webhook subscriptions." },
  ]}),
  component: ApiKeysPage,
});

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
function randomKey() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return "sk_live_" + Array.from(arr).map(b => b.toString(16).padStart(2,"0")).join("");
}

function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [hooks, setHooks] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [hookUrl, setHookUrl] = useState("");
  const [hookMin, setHookMin] = useState(70);
  const [expiry, setExpiry] = useState<"24h" | "30d" | "1y" | "never">("never");

  const refresh = async () => {
    const [k, w] = await Promise.all([
      supabase.from("api_keys").select("*").order("created_at",{ascending:false}),
      supabase.from("webhook_subscriptions").select("*").order("created_at",{ascending:false}),
    ]);
    let list = (k.data || []) as any[];
    // Auto-provision a default public key on first visit so the API is usable out-of-the-box.
    if (list.length === 0) {
      const key = randomKey();
      const hash = await sha256Hex(key);
      await supabase.from("api_keys").insert({ label: "default", key_hash: hash, last4: key.slice(-4) });
      setCreated(key);
      const { data } = await supabase.from("api_keys").select("*").order("created_at",{ascending:false});
      list = data || [];
    }
    setKeys(list); setHooks(w.data || []);
  };
  useEffect(() => { refresh(); }, []);

  const create = async () => {
    if (!label.trim()) { toast.error("Label required"); return; }
    const key = randomKey();
    const hash = await sha256Hex(key);
    const expires_at = expiry === "never" ? null
      : expiry === "24h" ? new Date(Date.now() + 24*3600*1000).toISOString()
      : expiry === "30d" ? new Date(Date.now() + 30*24*3600*1000).toISOString()
      : new Date(Date.now() + 365*24*3600*1000).toISOString();
    const { error } = await (supabase.from("api_keys") as any).insert({ label, key_hash: hash, last4: key.slice(-4), expires_at });
    if (error) { toast.error(error.message); return; }
    setCreated(key); setLabel(""); refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this key?")) return;
    await supabase.from("api_keys").delete().eq("id", id); refresh();
  };
  const addHook = async () => {
    if (!hookUrl.startsWith("http")) { toast.error("Need full https URL"); return; }
    const { error } = await supabase.from("webhook_subscriptions").insert({ url: hookUrl, min_score: hookMin });
    if (error) { toast.error(error.message); return; }
    setHookUrl(""); refresh();
  };
  const delHook = async (id: string) => { await supabase.from("webhook_subscriptions").delete().eq("id", id); refresh(); };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Key className="w-6 h-6 text-primary"/> API Keys</h1>
          <p className="text-sm text-muted-foreground">Generate keys to access the <a href="/docs" className="text-primary underline inline-flex items-center gap-1">public API <ExternalLink className="w-3 h-3"/></a>.</p>
        </div>

        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <Input value={label} onChange={e=>setLabel(e.target.value)} placeholder="key label (e.g. n8n production)"/>
            <select value={expiry} onChange={e=>setExpiry(e.target.value as any)} className="bg-input border border-border rounded px-2 text-sm">
              <option value="24h">24h</option>
              <option value="30d">30 days</option>
              <option value="1y">1 year</option>
              <option value="never">No expiry</option>
            </select>
            <Button onClick={create}><Plus className="w-3.5 h-3.5 mr-1.5"/>Create</Button>
          </div>
          {created && (
            <div className="p-3 rounded border border-bull/40 bg-bull/10 space-y-1">
              <div className="text-[11px] uppercase font-bold text-bull">Save this key now — it won't be shown again</div>
              <div className="flex gap-2 items-center">
                <code className="flex-1 font-mono text-xs break-all">{created}</code>
                <Button size="sm" variant="outline" onClick={()=>{navigator.clipboard.writeText(created); toast.success("Copied");}}><Copy className="w-3 h-3"/></Button>
              </div>
              <button className="text-[11px] text-muted-foreground underline" onClick={()=>setCreated(null)}>dismiss</button>
            </div>
          )}
          <div className="space-y-1">
            {keys.length === 0 ? <div className="text-xs text-muted-foreground">No keys yet.</div> : keys.map(k => (
              <div key={k.id} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                <div>
                  <div className="font-bold">{k.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    sk_live_…{k.last4} · last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                    {k.expires_at ? ` · expires ${new Date(k.expires_at).toLocaleDateString()}` : " · no expiry"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={()=>del(k.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Webhook className="w-4 h-4"/> Webhook subscriptions</h2>
          <div className="flex gap-2">
            <Input value={hookUrl} onChange={e=>setHookUrl(e.target.value)} placeholder="https://your.app/webhooks/diviq"/>
            <Input type="number" value={hookMin} onChange={e=>setHookMin(+e.target.value)} className="w-24" placeholder="min score"/>
            <Button onClick={addHook}><Plus className="w-3.5 h-3.5 mr-1.5"/>Add</Button>
          </div>
          <div className="space-y-1">
            {hooks.length === 0 ? <div className="text-xs text-muted-foreground">No webhooks yet.</div> : hooks.map(h => (
              <div key={h.id} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                <div>
                  <div className="font-mono text-xs break-all">{h.url}</div>
                  <div className="text-[10px] text-muted-foreground">min score {h.min_score} · {h.active?"active":"paused"}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={()=>delHook(h.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
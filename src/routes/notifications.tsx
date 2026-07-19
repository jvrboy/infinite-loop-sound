import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Bell, BellOff, Check, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { store } from "@/lib/store/offline";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
};

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DivergenceIQ" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await store.select<Notification>("notifications", {
        orderBy: "created_at",
        ascending: false,
        limit: 100,
      });
      setNotifs(data);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try { await store.update("notifications", id, { read: true }); } catch {}
    setNotifs(notifs.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    try { await store.updateWhere("notifications", { read: false }, { read: true }); } catch {}
    setNotifs(notifs.map((n) => ({ ...n, read: true })));
  };

  const clearAll = async () => {
    try { await store.deleteWhere("notifications", {}); } catch {}
    setNotifs([]);
  };

  const filtered = filter === "unread" ? notifs.filter((n) => !n.read) : notifs;
  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" /> Notifications
              {unreadCount > 0 && <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-mono">{unreadCount}</span>}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Unified notification center for signals, alerts, and system events.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={markAllRead} className="px-3 py-1.5 border border-border rounded text-xs font-medium hover:bg-accent transition flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Mark all read</button>
            <button onClick={clearAll} className="px-3 py-1.5 border border-border rounded text-xs font-medium hover:bg-accent transition text-bear flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setFilter("all")} className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>All ({notifs.length})</button>
          <button onClick={() => setFilter("unread")} className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${filter === "unread" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>Unread ({unreadCount})</button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">No notifications</p>
            </div>
          ) : (
            filtered.map((n) => (
              <div key={n.id} className={`bg-card border border-border rounded-lg p-4 flex items-start gap-3 ${!n.read ? "border-l-2 border-l-primary" : ""}`}>
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? "bg-muted" : "bg-primary pulse-dot"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                  <div className="mt-2"><span className="px-2 py-0.5 bg-muted rounded text-[10px] uppercase font-mono text-muted-foreground">{n.type}</span></div>
                </div>
                {!n.read && <button onClick={() => markRead(n.id)} className="text-muted-foreground hover:text-foreground transition shrink-0"><Check className="w-4 h-4" /></button>}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@components/app/AppShell";
import { Eye, Plus, Trash2, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — DivergenceIQ" }] }),
  component: WatchlistPage,
});

type WatchItem = {
  id: string;
  symbol: string;
  notes: string;
  alert_price: number | null;
  starred: boolean;
  created_at: string;
};

function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ symbol: "", notes: "", alert_price: "" });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("watchlist").select("*").order("starred", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addItem = async () => {
    if (!newItem.symbol) { toast.error("Symbol required"); return; }
    try {
      const { data, error } = await supabase.from("watchlist").insert({
        symbol: newItem.symbol.toUpperCase(),
        notes: newItem.notes,
        alert_price: newItem.alert_price ? Number(newItem.alert_price) : null,
        starred: false,
      }).select();
      if (error) throw error;
      setItems([data[0], ...items]);
      setNewItem({ symbol: "", notes: "", alert_price: "" });
      setShowForm(false);
      toast.success("Added to watchlist");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeItem = async (id: string) => {
    try { await supabase.from("watchlist").delete().eq("id", id); } catch (e) {}
    setItems(items.filter((i) => i.id !== id));
  };

  const toggleStar = async (item: WatchItem) => {
    try { await supabase.from("watchlist").update({ starred: !item.starred }).eq("id", item.id); } catch (e) {}
    setItems(items.map((i) => (i.id === item.id ? { ...i, starred: !i.starred } : i)));
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" /> Watchlist
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track instruments with price alerts and notes.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Add Symbol
          </button>
        </div>

        {showForm && (
          <div className="bg-card border border-border p-6 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div><label className="text-xs font-medium mb-1 block">Symbol</label><input value={newItem.symbol} onChange={(e) => setNewItem({ ...newItem, symbol: e.target.value })} placeholder="EURUSD" className="w-full p-2 border border-input rounded bg-background font-mono text-sm" /></div>
            <div><label className="text-xs font-medium mb-1 block">Alert Price</label><input type="number" step="0.0001" value={newItem.alert_price} onChange={(e) => setNewItem({ ...newItem, alert_price: e.target.value })} className="w-full p-2 border border-input rounded bg-background font-mono text-sm" /></div>
            <div><label className="text-xs font-medium mb-1 block">Notes</label><input value={newItem.notes} onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })} className="w-full p-2 border border-input rounded bg-background text-sm" /></div>
            <button onClick={addItem} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium">Add</button>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : items.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">Watchlist is empty. Add symbols to start tracking.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 hover:border-primary/40 transition-colors">
                <button onClick={() => toggleStar(item)} className="shrink-0">
                  <Star className={`w-5 h-5 ${item.starred ? "text-warning fill-warning" : "text-muted-foreground"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm">{item.symbol}</span>
                    {item.alert_price && <span className="text-xs text-muted-foreground">Alert @ {item.alert_price.toFixed(5)}</span>}
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{item.notes}</p>}
                </div>
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-bear transition shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

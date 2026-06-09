import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState } from "react";
import { BookOpen, Plus, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/journal")({
  head: () => ({ meta: [{ title: "Trading Journal — DivergenceIQ" }] }),
  component: JournalPage,
});

function JournalPage() {
  const [entries, setEntries] = useState([
    { id: 1, pair: "EUR/USD", note: "Missed entry due to CPI news spike.", date: new Date().toISOString().split('T')[0], tags: ["Missed", "News"] },
    { id: 2, pair: "GBP/JPY", note: "Took partials at 1R, let the rest run to TP2.", date: new Date(Date.now() - 86400000).toISOString().split('T')[0], tags: ["Win", "Management"] }
  ]);
  const [newNote, setNewNote] = useState("");
  const [newPair, setNewPair] = useState("");

  const addNote = () => {
    if (newNote) {
      setEntries([
        { id: Date.now(), pair: newPair || "General", note: newNote, date: new Date().toISOString().split('T')[0], tags: [] },
        ...entries
      ]);
      setNewNote("");
      setNewPair("");
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Trading Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Annotate trades, track mistakes, and improve your edge.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 bg-card p-4 rounded-lg border border-border">
          <input 
            className="w-full md:w-32 p-2 border border-input rounded bg-background text-sm font-mono" 
            placeholder="Pair (e.g. XAU/USD)" 
            value={newPair} 
            onChange={e=>setNewPair(e.target.value)} 
          />
          <input 
            className="flex-1 p-2 border border-input rounded bg-background text-sm" 
            placeholder="Add a note (e.g., closed early due to divergence invalidation...)" 
            value={newNote} 
            onChange={e=>setNewNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNote()}
          />
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded flex items-center justify-center gap-2 font-medium hover:opacity-90 transition" 
            onClick={addNote}
          >
            <Plus className="w-4 h-4"/> Add Note
          </button>
        </div>
        
        <div className="grid gap-4">
          {entries.map(e => (
            <div key={e.id} className="p-4 border border-border rounded-lg bg-card hover:bg-accent/40 transition relative group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded">{e.pair}</span>
                  <span className="text-xs text-muted-foreground">{e.date}</span>
                </div>
                <div className="flex gap-2">
                  {e.tags.map(t => (
                    <span key={t} className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                  <button className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition"><ImageIcon className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{e.note}</p>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
              No journal entries yet. Start tracking your trades!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

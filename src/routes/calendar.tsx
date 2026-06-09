import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Calendar as CalIcon, AlertTriangle, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Economic Calendar — DivergenceIQ" }] }),
  component: CalendarPage,
});

const mockEvents = [
  { id: 1, time: "14:30", currency: "USD", impact: "High", event: "Core CPI m/m", forecast: "0.3%", previous: "0.2%" },
  { id: 2, time: "14:30", currency: "USD", impact: "High", event: "CPI y/y", forecast: "3.4%", previous: "3.2%" },
  { id: 3, time: "15:00", currency: "EUR", impact: "Medium", event: "ECB President Lagarde Speaks", forecast: "-", previous: "-" },
  { id: 4, time: "16:00", currency: "USD", impact: "Medium", event: "CB Leading Index m/m", forecast: "-0.1%", previous: "-0.3%" },
  { id: 5, time: "20:00", currency: "USD", impact: "High", event: "FOMC Economic Projections", forecast: "-", previous: "-" },
  { id: 6, time: "20:00", currency: "USD", impact: "High", event: "FOMC Statement", forecast: "-", previous: "-" },
  { id: 7, time: "20:00", currency: "USD", impact: "High", event: "Federal Funds Rate", forecast: "5.50%", previous: "5.50%" },
  { id: 8, time: "20:30", currency: "USD", impact: "High", event: "FOMC Press Conference", forecast: "-", previous: "-" },
];

function CalendarPage() {
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalIcon className="w-6 h-6 text-primary" /> Economic Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track high-impact macroeconomic events to avoid trading during severe volatility.</p>
        </div>

        <div className="flex items-center justify-between bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{today} (SAST)</span>
          </div>
          <div className="flex gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500" /> High</span>
            <span className="flex items-center gap-1 text-yellow-500"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Medium</span>
            <span className="flex items-center gap-1 text-green-500"><div className="w-2 h-2 rounded-full bg-green-500" /> Low</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            <div className="col-span-2 md:col-span-1">Time</div>
            <div className="col-span-2 md:col-span-1">Cur</div>
            <div className="col-span-1 hidden md:block">Impact</div>
            <div className="col-span-8 md:col-span-5">Event</div>
            <div className="col-span-2 hidden md:block text-right">Forecast</div>
            <div className="col-span-2 hidden md:block text-right">Previous</div>
          </div>
          <div className="divide-y divide-border">
            {mockEvents.map(e => (
              <div key={e.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-accent/40 transition">
                <div className="col-span-2 md:col-span-1 font-mono text-sm">{e.time}</div>
                <div className="col-span-2 md:col-span-1 font-bold">{e.currency}</div>
                <div className="col-span-1 hidden md:flex justify-center">
                  {e.impact === "High" ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <TrendingUp className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="col-span-8 md:col-span-5 text-sm font-medium">{e.event}</div>
                <div className="col-span-2 hidden md:block text-right font-mono text-sm text-muted-foreground">{e.forecast}</div>
                <div className="col-span-2 hidden md:block text-right font-mono text-sm text-muted-foreground">{e.previous}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

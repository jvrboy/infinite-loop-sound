import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Search } from "lucide-react";

export const Route = createFileRoute("/screener")({
  component: ScreenerPage,
});

function ScreenerPage() {
  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Search className="w-6 h-6" />
          Advanced Screener
        </h1>
        <div className="grid md:grid-cols-3 gap-4">
          {["Most Active", "Top Gainers", "Top Losers", "High Volume", "Unusual Options", "Dark Pool"].map(tool => (
            <div key={tool} className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer">
              <h3 className="font-medium">{tool}</h3>
              <p className="text-xs text-muted-foreground mt-1">Real-time screening</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
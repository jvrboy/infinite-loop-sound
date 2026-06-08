import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ForexTools } from "@/components/app/ForexTools";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Forex Tools — DivergenceIQ" },
      { name: "description", content: "Professional live forex tools with real-time quotes, risk calculators, session timing, volatility and pair strength." },
      { property: "og:title", content: "Forex Tools — DivergenceIQ" },
      { property: "og:description", content: "Live forex quote tools, position sizing, risk/reward, margin, P/L, sessions and volatility." },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/12 text-primary">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Forex Tools</h1>
            <p className="mt-1 text-sm text-muted-foreground">Real-time market utilities for planning trades cleanly and precisely.</p>
          </div>
        </div>
        <ForexTools />
      </main>
    </AppShell>
  );
}
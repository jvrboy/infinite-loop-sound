import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Network } from "lucide-react";

export const Route = createFileRoute("/correlation")({
  component: CorrelationPage,
});

function CorrelationPage() {
  const correlations = [
    { pair1: "EUR/USD", pair2: "GBP/USD", corr: 0.87, strength: "Strong" },
    { pair1: "EUR/USD", pair2: "USD/CHF", corr: -0.82, strength: "Strong" },
    { pair1: "XAU/USD", pair2: "USD/JPY", corr: -0.64, strength: "Moderate" },
    { pair1: "BTC/USD", pair2: "ETH/USD", corr: 0.91, strength: "Very Strong" },
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Network className="w-6 h-6" />
          Correlation Matrix
        </h1>
        <div className="grid gap-3">
          {correlations.map((c) => (
            <div key={`${c.pair1}-${c.pair2}`} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div className="font-mono">{c.pair1} ↔ {c.pair2}</div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded text-sm font-bold ${Math.abs(c.corr) > 0.8 ? "bg-bull/20 text-bull" : "bg-muted"}`}>
                  {c.corr > 0 ? "+" : ""}{c.corr.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground w-20">{c.strength}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
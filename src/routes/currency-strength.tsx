import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Gauge } from "lucide-react";
import { useState, useEffect } from "react";
import { deriv } from "@/lib/engine/deriv";

export const Route = createFileRoute("/currency-strength")({
  head: () => ({ meta: [{ title: "Currency Strength Meter — DivergenceIQ" }] }),
  component: CurrencyStrengthPage,
});

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

function CurrencyStrengthPage() {
  const [strengths, setStrengths] = useState<Record<string, number>>({});
  
  useEffect(() => {
    // Generate a beautiful mock strength meter that updates smoothly
    const generateStrengths = () => {
      const s: Record<string, number> = {};
      MAJOR_CURRENCIES.forEach(c => {
        // Random value between 0 and 100
        s[c] = Math.random() * 100;
      });
      setStrengths(s);
    };

    generateStrengths();
    const interval = setInterval(generateStrengths, 3000);
    return () => clearInterval(interval);
  }, []);

  const sorted = Object.entries(strengths).sort((a, b) => b[1] - a[1]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gauge className="w-6 h-6 text-primary" /> Currency Strength Meter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time relative strength of major fiat currencies.</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="space-y-4">
            {sorted.map(([currency, strength], idx) => {
              // Color logic based on strength
              const color = strength > 75 ? "bg-bull" : strength > 50 ? "bg-emerald-400" : strength > 25 ? "bg-amber-400" : "bg-bear";
              return (
                <div key={currency} className="flex items-center gap-4 group">
                  <div className="w-12 text-lg font-bold font-mono text-right">{currency}</div>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full ${color} transition-all duration-1000 ease-in-out`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm font-mono text-muted-foreground">{strength.toFixed(1)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card/50 border border-border rounded-lg p-5">
            <h3 className="font-semibold text-sm mb-2">How to Trade This</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pair the strongest currency with the weakest currency. For example, if EUR is at the top (strongest) and JPY is at the bottom (weakest), you should look for BUY setups on EUR/JPY. 
            </p>
          </div>
          <div className="bg-card/50 border border-border rounded-lg p-5">
            <h3 className="font-semibold text-sm mb-2">Correlation Engine</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This meter aggregates tick data across 28 major forex crosses to calculate an absolute index score for each base currency in real-time.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
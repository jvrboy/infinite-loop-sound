import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Twitter, TrendingUp, MessageCircle, Heart } from "lucide-react";

export const Route = createFileRoute("/sentiment")({
  component: SentimentPage,
});

function SentimentPage() {
  const sentiments = [
    { pair: "EUR/USD", score: 76, tweets: 2847, bullish: 68, bearish: 32, change: "+12%", trending: true },
    { pair: "XAU/USD", score: 88, tweets: 1923, bullish: 81, bearish: 19, change: "+8%", trending: true },
    { pair: "GBP/USD", score: 71, tweets: 1534, bullish: 59, bearish: 41, change: "-3%", trending: false },
    { pair: "BTC/USD", score: 82, tweets: 5421, bullish: 74, bearish: 26, change: "+15%", trending: true },
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Twitter className="w-6 h-6 text-blue-400" />
            Sentiment Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Twitter • Reddit • News • Social media aggregated</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sentiments.map((s) => (
            <div key={s.pair} className="rounded-xl border border-border bg-card p-5 hover:border-blue-500/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono font-bold text-lg">{s.pair}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MessageCircle className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{s.tweets.toLocaleString()}</span>
                    {s.trending && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">TRENDING</span>}
                  </div>
                </div>
                <div className={`text-2xl font-bold ${s.score >= 75 ? "text-bull" : s.score >= 60 ? "text-amber-400" : "text-bear"}`}>
                  {s.score}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                  <div className="bg-bull" style={{ width: `${s.bullish}%` }} />
                  <div className="bg-bear" style={{ width: `${s.bearish}%` }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-bull">{s.bullish}% bull</span>
                  <span className={`font-medium ${s.change.startsWith("+") ? "text-bull" : "text-bear"}`}>{s.change}</span>
                  <span className="text-bear">{s.bearish}% bear</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              Top Mentions
            </h3>
            <div className="space-y-2.5 text-xs">
              {[
                { text: "EUR/USD breaking 1.09 resistance", likes: 234, user: "@forex_whale" },
                { text: "Gold to $2700 by EOW - loading calls", likes: 189, user: "@goldbug" },
                { text: "GBP looking weak ahead of BoE", likes: 156, user: "@macro_trader" },
              ].map((tweet, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/30">
                  <div className="text-foreground">{tweet.text}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>{tweet.user}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{tweet.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Sentiment Drivers</h3>
            <div className="space-y-2.5">
              {[
                { driver: "ECB Hawkish Comments", impact: "+15%", pairs: "EUR" },
                { driver: "US CPI Data", impact: "+8%", pairs: "USD" },
                { label: "Geopolitical Tensions", impact: "+12%", pairs: "GOLD" },
              ].map((d) => (
                <div key={d.driver} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/30">
                  <div>
                    <div className="text-xs font-medium">{d.driver}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Affects: {d.pairs}</div>
                  </div>
                  <div className="text-sm font-bold text-bull">{d.impact}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
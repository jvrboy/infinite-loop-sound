import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app/AppShell';
import { useState } from 'react';
import { Newspaper, TrendingUp, TrendingDown, Clock, Filter, RefreshCw, ExternalLink, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const Route = createFileRoute('/market-news')({ component: MarketNewsPage });

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  url: string;
}

const SEED: NewsItem[] = [
  { id: '1', title: 'Fed signals possible rate pause at next meeting', source: 'Reuters', time: '12m', sentiment: 'bullish', impact: 'high', url: '#' },
  { id: '2', title: 'EUR strengthens as inflation cools below expectations', source: 'Bloomberg', time: '34m', sentiment: 'bullish', impact: 'medium', url: '#' },
  { id: '3', title: 'Oil drops on rising inventory data', source: 'CNBC', time: '1h', sentiment: 'bearish', impact: 'medium', url: '#' },
  { id: '4', title: 'Gold hits record high amid geopolitical tensions', source: 'FXStreet', time: '2h', sentiment: 'bullish', impact: 'high', url: '#' },
  { id: '5', title: 'Yen weakens past 160 as BoJ holds steady', source: 'DailyFX', time: '3h', sentiment: 'bearish', impact: 'medium', url: '#' },
  { id: '6', title: 'Crypto markets steady after weekend volatility', source: 'CoinDesk', time: '4h', sentiment: 'neutral', impact: 'low', url: '#' },
];

function MarketNewsPage() {
  const [items] = useState<NewsItem[]>(SEED);
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');

  const filtered = filter === 'all' ? items : items.filter((i) => i.sentiment === filter);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Newspaper className="w-7 h-7 text-primary" /> Market News
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Curated headlines with sentiment and impact scoring.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => toast.success('Feed refreshed')}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'bullish', 'bearish', 'neutral'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize text-xs">
              {f}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.impact === 'high' && <Flame className="w-3.5 h-3.5 text-rose-400" />}
                      <Badge
                        variant="outline"
                        className={
                          item.sentiment === 'bullish'
                            ? 'text-emerald-400 border-emerald-500/30'
                            : item.sentiment === 'bearish'
                              ? 'text-rose-400 border-rose-500/30'
                              : 'text-muted-foreground'
                        }
                      >
                        {item.sentiment === 'bullish' ? <TrendingUp className="w-3 h-3 mr-1" /> : item.sentiment === 'bearish' ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                        {item.sentiment}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-sm leading-snug">{item.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{item.source}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.time} ago
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

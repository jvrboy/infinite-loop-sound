import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app/AppShell';
import { useState } from 'react';
import { FlaskConical, Play, Save, Trash2, Beaker, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export const Route = createFileRoute('/strategy-lab')({ component: StrategyLabPage });

interface Strategy {
  id: string;
  name: string;
  indicators: string[];
  params: { rsi: number; ema: number; atr: number };
  result?: { winRate: number; sharpe: number; trades: number };
}

const SEED: Strategy[] = [
  { id: '1', name: 'RSI Reversal', indicators: ['RSI', 'EMA'], params: { rsi: 30, ema: 50, atr: 1.5 } },
  { id: '2', name: 'Breakout Hunter', indicators: ['ATR', 'Donchian'], params: { rsi: 50, ema: 20, atr: 2 } },
];

function StrategyLabPage() {
  const [strategies, setStrategies] = useState<Strategy[]>(SEED);
  const [name, setName] = useState('');
  const [params, setParams] = useState({ rsi: 30, ema: 50, atr: 1.5 });
  const [backtesting, setBacktesting] = useState<string | null>(null);

  const addStrategy = () => {
    if (!name) {
      toast.error('Enter a strategy name');
      return;
    }
    setStrategies((prev) => [...prev, { id: crypto.randomUUID(), name, indicators: ['RSI', 'EMA', 'ATR'], params }]);
    setName('');
    toast.success('Strategy saved');
  };

  const backtest = async (id: string) => {
    setBacktesting(id);
    await new Promise((r) => setTimeout(r, 900));
    const result = {
      winRate: Number((45 + Math.random() * 25).toFixed(1)),
      sharpe: Number((0.8 + Math.random() * 1.5).toFixed(2)),
      trades: Math.floor(50 + Math.random() * 200),
    };
    setStrategies((prev) => prev.map((s) => (s.id === id ? { ...s, result } : s)));
    setBacktesting(null);
    toast.success('Backtest complete', { description: `Win rate ${result.winRate}%` });
  };

  const remove = (id: string) => {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
    toast.success('Strategy deleted');
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-primary" /> Strategy Lab
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Build, backtest, and iterate trading strategies.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Strategy name" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="space-y-3">
                <ParamSlider label="RSI Period" value={params.rsi} min={5} max={50} onChange={(v) => setParams({ ...params, rsi: v })} />
                <ParamSlider label="EMA Period" value={params.ema} min={5} max={200} onChange={(v) => setParams({ ...params, ema: v })} />
                <ParamSlider label="ATR Multiplier" value={params.atr} min={0.5} max={5} step={0.1} onChange={(v) => setParams({ ...params, atr: v })} />
              </div>
              <Button onClick={addStrategy} className="w-full gap-2">
                <Save className="w-4 h-4" /> Save Strategy
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-3">
            {strategies.map((s) => (
              <Card key={s.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Beaker className="w-4 h-4 text-sky-400" />
                        <h3 className="font-medium">{s.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {s.indicators.map((ind) => (
                          <Badge key={ind} variant="secondary" className="text-[10px]">
                            {ind}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                        <span>RSI {s.params.rsi}</span>
                        <span>EMA {s.params.ema}</span>
                        <span>ATR {s.params.atr}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => backtest(s.id)} disabled={backtesting === s.id} className="gap-1.5">
                          {backtesting === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Backtest
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="px-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {s.result && (
                        <div className="flex gap-3 text-xs mt-1">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {s.result.winRate}%
                          </span>
                          <span className="text-sky-400">Sharpe {s.result.sharpe}</span>
                          <span className="text-muted-foreground">{s.result.trades} trades</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

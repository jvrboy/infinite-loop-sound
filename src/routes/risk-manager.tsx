import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app/AppShell';
import { useState, useMemo } from 'react';
import { Shield, AlertTriangle, Gauge, Activity, Target, TrendingDown, CheckCircle2, AlertOctagon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const Route = createFileRoute('/risk-manager')({ component: RiskManagerPage });

function RiskManagerPage() {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [maxDrawdown, setMaxDrawdown] = useState(20);
  const [maxConcurrent, setMaxConcurrent] = useState(3);

  const risk = useMemo(() => {
    const riskAmount = (accountSize * riskPerTrade) / 100;
    const maxLoss = (accountSize * maxDrawdown) / 100;
    const dailyLimit = riskAmount * maxConcurrent;
    const riskScore = Math.min(100, riskPerTrade * 8 + maxConcurrent * 6 + (maxDrawdown > 25 ? 20 : 0));
    const level = riskScore < 30 ? 'low' : riskScore < 60 ? 'moderate' : riskScore < 85 ? 'elevated' : 'high';
    return { riskAmount, maxLoss, dailyLimit, riskScore, level };
  }, [accountSize, riskPerTrade, maxDrawdown, maxConcurrent]);

  const levelColor: Record<string, string> = {
    low: 'text-emerald-400',
    moderate: 'text-sky-400',
    elevated: 'text-amber-400',
    high: 'text-rose-400',
  };

  const rules = [
    { ok: riskPerTrade <= 2, label: 'Risk per trade ≤ 2%' },
    { ok: maxConcurrent <= 5, label: 'Max concurrent positions ≤ 5' },
    { ok: maxDrawdown <= 25, label: 'Max drawdown ≤ 25%' },
    { ok: risk.dailyLimit <= accountSize * 0.06, label: 'Daily risk ≤ 6% of account' },
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" /> Risk Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure position sizing and exposure limits.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Gauge} label="Risk / Trade" value={`$${risk.riskAmount.toFixed(2)}`} accent="text-amber-400" />
          <StatCard icon={Activity} label="Daily Limit" value={`$${risk.dailyLimit.toFixed(2)}`} accent="text-sky-400" />
          <StatCard icon={TrendingDown} label="Max Drawdown" value={`$${risk.maxLoss.toFixed(2)}`} accent="text-rose-400" />
          <StatCard icon={Target} label="Risk Level" value={risk.level.toUpperCase()} accent={levelColor[risk.level]} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Account Size ($)">
                <Input type="number" value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value))} />
              </Field>
              <Field label="Risk Per Trade (%)">
                <Input type="number" step="0.1" value={riskPerTrade} onChange={(e) => setRiskPerTrade(Number(e.target.value))} />
              </Field>
              <Field label="Max Drawdown (%)">
                <Input type="number" value={maxDrawdown} onChange={(e) => setMaxDrawdown(Number(e.target.value))} />
              </Field>
              <Field label="Max Concurrent Positions">
                <Input type="number" value={maxConcurrent} onChange={(e) => setMaxConcurrent(Number(e.target.value))} />
              </Field>
              <Button onClick={() => toast.success('Risk settings saved')} className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={risk.riskScore} className="h-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall exposure</span>
                  <Badge variant="outline" className={levelColor[risk.level]}>
                    {risk.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Score {risk.riskScore.toFixed(0)}/100 — {risk.level === 'low' ? 'conservative' : risk.level === 'high' ? 'aggressive' : 'balanced'} profile.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rule Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rules.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {r.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertOctagon className="w-4 h-4 text-rose-400" />}
                    <span className={r.ok ? 'text-foreground' : 'text-rose-400'}>{r.label}</span>
                  </div>
                ))}
                {rules.some((r) => !r.ok) && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded bg-rose-500/10 text-rose-400 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    Some rules violated. Consider reducing risk parameters.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accent}`} />
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg md:text-xl font-bold mt-1 font-mono">{value}</p>
      </CardContent>
    </Card>
  );
}

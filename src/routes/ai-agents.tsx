import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app/AppShell';
import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Activity,
  TrendingUp,
  AlertCircle,
  Play,
  Sparkles,
  Cpu,
  Gauge,
  Bot,
  Train,
  Zap,
  CheckCircle2,
  Loader2,
  Trash2,
  ChevronRight,
  Target,
  Shield,
  MessageSquare,
  Workflow,
  Layers,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  runAgent,
  getAllAgents,
  trainAgent,
  enableAgent,
  disableAgent,
  getAgentMetrics,
  type AIAgent,
  type AgentAnalysis,
} from '@/lib/ai/agents';
import { botRunner } from '@/lib/bot/runner';

export const Route = createFileRoute('/ai-agents')({ component: AIAgentsPage });

const TYPE_ICON: Record<string, any> = {
  analyzer: TrendingUp,
  optimizer: Cpu,
  predictor: Brain,
  risk_manager: Shield,
  sentiment: MessageSquare,
  execution: Zap,
  regime: Layers,
  portfolio: PieChart,
};

const TYPE_COLOR: Record<string, string> = {
  analyzer: 'text-emerald-400',
  optimizer: 'text-sky-400',
  predictor: 'text-violet-400',
  risk_manager: 'text-amber-400',
  sentiment: 'text-pink-400',
  execution: 'text-cyan-400',
  regime: 'text-indigo-400',
  portfolio: 'text-teal-400',
};

function AIAgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>(getAllAgents());
  const [agentAnalyses, setAgentAnalyses] = useState<AgentAnalysis[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [training, setTraining] = useState<string | null>(null);
  const [metrics, setMetrics] = useState(getAgentMetrics());

  const refresh = useCallback(() => {
    setAgents(getAllAgents());
    setMetrics(getAgentMetrics());
  }, []);

  const handleRunAgent = async (agentId: string) => {
    setRunning(agentId);
    try {
      const trades = botRunner.getRecentClosed(100);
      const analysis = await runAgent(agentId, trades);
      setAgentAnalyses((prev) => [analysis, ...prev].slice(0, 50));
      toast.success(`${agents.find((a) => a.id === agentId)?.name} complete`, {
        description: `Confidence ${(analysis.confidence * 100).toFixed(0)}%`,
      });
    } catch (e: any) {
      toast.error('Agent run failed', { description: e.message });
    } finally {
      setRunning(null);
      refresh();
    }
  };

  const handleRunAllAgents = async () => {
    setRunning('all');
    try {
      const trades = botRunner.getRecentClosed(100);
      const all: AgentAnalysis[] = [];
      for (const agent of agents) {
        if (!agent.enabled) continue;
        const analysis = await runAgent(agent.id, trades);
        all.push(analysis);
      }
      setAgentAnalyses((prev) => [...all, ...prev].slice(0, 100));
      toast.success('All agents executed', {
        description: `${all.length} analyses generated`,
      });
    } finally {
      setRunning(null);
      refresh();
    }
  };

  const handleTrain = async (agentId: string) => {
    setTraining(agentId);
    try {
      const result = await trainAgent(agentId);
      toast.success('Training complete', {
        description: `New accuracy: ${(result.accuracy * 100).toFixed(1)}%`,
      });
    } finally {
      setTraining(null);
      refresh();
    }
  };

  const handleToggle = (agentId: string, enabled: boolean) => {
    if (enabled) enableAgent(agentId);
    else disableAgent(agentId);
    refresh();
    toast.success(enabled ? 'Agent activated' : 'Agent paused');
  };

  const handleClear = () => {
    setAgentAnalyses([]);
    toast.success('Analyses cleared');
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Brain className="w-7 h-7 text-primary" /> AI Multi-Agent System
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {metrics.active} of {metrics.total} agents active · avg accuracy{' '}
              {(metrics.avgAccuracy * 100).toFixed(1)}%
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRunAllAgents} disabled={running !== null} className="gap-2">
              {running === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              Run All Agents
            </Button>
            <Button onClick={handleClear} variant="outline" className="gap-2">
              <Trash2 className="w-4 h-4" /> Clear
            </Button>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={Bot} label="Total Agents" value={metrics.total} accent="text-sky-400" />
          <MetricCard icon={CheckCircle2} label="Active" value={metrics.active} accent="text-emerald-400" />
          <MetricCard icon={Train} label="Trained" value={metrics.trained} accent="text-violet-400" />
          <MetricCard icon={Target} label="Avg Accuracy" value={`${(metrics.avgAccuracy * 100).toFixed(1)}%`} accent="text-amber-400" />
        </div>

        <Tabs defaultValue="agents">
          <TabsList>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="analyses">Analyses ({agentAnalyses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => {
                const Icon = TYPE_ICON[agent.type] ?? Bot;
                const color = TYPE_COLOR[agent.type] ?? 'text-primary';
                const isRunning = running === agent.id || running === 'all';
                const isTraining = training === agent.id;
                return (
                  <Card key={agent.id} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg bg-muted ${color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{agent.name}</CardTitle>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{agent.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <Badge variant={agent.enabled ? 'default' : 'secondary'} className="text-[10px]">
                          {agent.enabled ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>v{agent.version}</span>
                        <span className="capitalize">{agent.modelType}</span>
                        <span>acc {(agent.accuracy ? agent.accuracy * 100 : 0).toFixed(0)}%</span>
                      </div>

                      {isTraining && (
                        <div className="space-y-1">
                          <Progress value={agent.trainingProgress ?? 0} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground text-center">Training… {agent.trainingProgress ?? 0}%</p>
                        </div>
                      )}

                      <div className="flex gap-1.5 pt-1">
                        <Button
                          onClick={() => handleRunAgent(agent.id)}
                          disabled={isRunning || isTraining || !agent.enabled}
                          size="sm"
                          className="flex-1 gap-1.5"
                        >
                          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Run
                        </Button>
                        <Button
                          onClick={() => handleTrain(agent.id)}
                          disabled={isTraining}
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                        >
                          {isTraining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Train className="w-3.5 h-3.5" />}
                          Train
                        </Button>
                        <Button
                          onClick={() => handleToggle(agent.id, !agent.enabled)}
                          size="sm"
                          variant="ghost"
                          className="px-2"
                          title={agent.enabled ? 'Pause' : 'Activate'}
                        >
                          {agent.enabled ? <Gauge className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="analyses" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4" /> Recent Agent Analyses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                  {agentAnalyses.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Run agents to see analyses</p>
                  ) : (
                    agentAnalyses.map((analysis, idx) => (
                      <div key={idx} className="border-l-2 border-primary pl-3 py-2 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold capitalize">{analysis.agentId.replace(/_/g, ' ')}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(analysis.timestamp).toLocaleTimeString()}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {(analysis.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {analysis.insights.map((insight, i) => (
                            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-sky-400" /> {insight}
                            </p>
                          ))}
                        </div>
                        {analysis.recommendations.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            <p className="text-[11px] font-medium text-foreground/80">Recommendations</p>
                            {analysis.recommendations.map((rec, i) => (
                              <p key={i} className="text-xs text-primary flex items-start gap-1">
                                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" /> {rec}
                              </p>
                            ))}
                          </div>
                        )}
                        {analysis.metrics && Object.keys(analysis.metrics).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {Object.entries(analysis.metrics).map(([k, v]) => (
                              <Badge key={k} variant="secondary" className="text-[10px] font-mono">
                                {k}: {typeof v === 'number' ? v.toFixed(2) : v}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accent}`} />
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

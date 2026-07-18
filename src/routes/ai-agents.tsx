import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app/AppShell';
import { useState, useEffect } from 'react';
import { Brain, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { runAgent, getAllAgents } from '@/lib/ai/agents';
import { botRunner } from '@/lib/bot/runner';

export const Route = createFileRoute('/ai-agents')({ component: AIAgentsPage });

function AIAgentsPage() {
  const [agents, setAgents] = useState(getAllAgents());
  const [agentAnalyses, setAgentAnalyses] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const handleRunAgent = async (agentId: string) => {
    setRunning(true);
    const trades = botRunner.getRecentClosed(100);
    const analysis = await runAgent(agentId, trades);
    setAgentAnalyses(prev => [analysis, ...prev].slice(0, 20));
    setRunning(false);
    toast.success('Agent analysis complete');
  };

  const handleRunAllAgents = async () => {
    setRunning(true);
    const trades = botRunner.getRecentClosed(100);
    const allAnalyses: any[] = [];
    for (const agent of agents) {
      const analysis = await runAgent(agent.id, trades);
      allAnalyses.push(analysis);
    }
    setAgentAnalyses(prev => [...allAnalyses, ...prev].slice(0, 50));
    setRunning(false);
    toast.success('All agents executed');
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" /> AI Multi-Agent System
        </h1>

        <div className="flex gap-2">
          <Button onClick={handleRunAllAgents} disabled={running} className="gap-2">
            <Activity className="w-4 h-4" /> Run All Agents
          </Button>
        </div>

        {/* Active Agents */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {agents.map(agent => (
            <div key={agent.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-bold">{agent.name}</p>
              <p className="text-[10px] text-muted-foreground">{agent.type}</p>
              <div className="flex gap-1 pt-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${agent.enabled ? 'bg-bull/20 text-bull' : 'bg-muted text-muted-foreground'}`}>
                  {agent.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
              <Button
                onClick={() => handleRunAgent(agent.id)}
                disabled={running}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                Run
              </Button>
            </div>
          ))}
        </div>

        {/* Recent Analyses */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Recent Agent Analyses
          </h2>
          <div className="space-y-3 max-h-96 overflow-auto">
            {agentAnalyses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run agents to see analyses</p>
            ) : (
              agentAnalyses.map((analysis, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-3 py-2 space-y-1">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-bold">{analysis.agentId}</p>
                    <span className="text-[10px] text-muted-foreground">Confidence: {(analysis.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="space-y-0.5">
                    {analysis.insights.map((insight: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {insight}
                      </p>
                    ))}
                  </div>
                  {analysis.recommendations.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs font-medium">Recommendations:</p>
                      {analysis.recommendations.map((rec: string, i: number) => (
                        <p key={i} className="text-xs text-primary">• {rec}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
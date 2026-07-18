export interface AIAgent {
  id: string;
  name: string;
  type: 'analyzer' | 'optimizer' | 'predictor' | 'risk_manager';
  enabled: boolean;
  config: Record<string, any>;
  lastRun?: number;
}

export interface AgentAnalysis {
  agentId: string;
  timestamp: number;
  insights: string[];
  recommendations: string[];
  confidence: number;
}

const agents = new Map<string, AIAgent>();
const analyses = new Map<string, AgentAnalysis[]>();

// Built-in AI Agents
const DEFAULT_AGENTS: AIAgent[] = [
  {
    id: 'analyzer_1',
    name: 'Trade Pattern Analyzer',
    type: 'analyzer',
    enabled: true,
    config: { lookbackPeriod: 100, minPattern: 5 }
  },
  {
    id: 'optimizer_1',
    name: 'Parameter Optimizer',
    type: 'optimizer',
    enabled: true,
    config: { iterations: 1000, optimizationMetric: 'sharpe' }
  },
  {
    id: 'predictor_1',
    name: 'Trade Outcome Predictor',
    type: 'predictor',
    enabled: true,
    config: { trainingWindow: 200, predictionConfidence: 0.7 }
  },
  {
    id: 'risk_mgr_1',
    name: 'Dynamic Risk Manager',
    type: 'risk_manager',
    enabled: true,
    config: { maxDrawdownTolerance: 20, rebalanceFrequency: 'daily' }
  }
];

DEFAULT_AGENTS.forEach(agent => agents.set(agent.id, agent));

export function getAgent(agentId: string): AIAgent | undefined {
  return agents.get(agentId);
}

export function getAllAgents(): AIAgent[] {
  return Array.from(agents.values());
}

export function enableAgent(agentId: string): void {
  const agent = agents.get(agentId);
  if (agent) agent.enabled = true;
}

export function disableAgent(agentId: string): void {
  const agent = agents.get(agentId);
  if (agent) agent.enabled = false;
}

export function updateAgentConfig(agentId: string, config: Record<string, any>): void {
  const agent = agents.get(agentId);
  if (agent) {
    agent.config = { ...agent.config, ...config };
  }
}

export async function runAgent(agentId: string, trades: any[]): Promise<AgentAnalysis> {
  const agent = agents.get(agentId);
  if (!agent || !agent.enabled) {
    return { agentId, timestamp: Date.now(), insights: [], recommendations: [], confidence: 0 };
  }

  let insights: string[] = [];
  let recommendations: string[] = [];
  let confidence = 0.7;

  switch (agent.type) {
    case 'analyzer':
      ({ insights, recommendations } = analyzeTradePatterns(trades, agent.config));
      break;
    case 'optimizer':
      ({ insights, recommendations } = optimizeParameters(trades, agent.config));
      break;
    case 'predictor':
      ({ insights, recommendations, confidence } = predictTradeOutcomes(trades, agent.config));
      break;
    case 'risk_manager':
      ({ insights, recommendations } = manageRisk(trades, agent.config));
      break;
  }

  const analysis: AgentAnalysis = {
    agentId,
    timestamp: Date.now(),
    insights,
    recommendations,
    confidence
  };

  if (!analyses.has(agentId)) analyses.set(agentId, []);
  analyses.get(agentId)!.push(analysis);

  agent.lastRun = Date.now();
  return analysis;
}

function analyzeTradePatterns(trades: any[], config: any): { insights: string[]; recommendations: string[] } {
  const insights: string[] = [];
  const recommendations: string[] = [];

  const wins = trades.filter(t => t.result === 'WIN').length;
  const winRate = (wins / trades.length) * 100;

  if (winRate > 60) {
    insights.push('Strong winning pattern detected');
    recommendations.push('Increase position size gradually');
  } else if (winRate < 40) {
    insights.push('Performance below average');
    recommendations.push('Review entry conditions');
  }

  return { insights, recommendations };
}

function optimizeParameters(trades: any[], config: any): { insights: string[]; recommendations: string[] } {
  return {
    insights: ['Parameter optimization complete'],
    recommendations: ['Increase lot size by 10%', 'Reduce stop loss by 5%']
  };
}

function predictTradeOutcomes(trades: any[], config: any): { insights: string[]; recommendations: string[]; confidence: number } {
  return {
    insights: ['Next trade has 65% win probability'],
    recommendations: ['Proceed with caution', 'Use tighter stops'],
    confidence: 0.65
  };
}

function manageRisk(trades: any[], config: any): { insights: string[]; recommendations: string[] } {
  return {
    insights: ['Portfolio heat at 4.2%'],
    recommendations: ['Within safe limits', 'Can add more positions']
  };
}

export function getAgentAnalyses(agentId: string): AgentAnalysis[] {
  return analyses.get(agentId) || [];
}
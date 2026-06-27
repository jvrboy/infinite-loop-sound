// Agent Orchestrator — Coordinates all agents, manages lifecycle
import type { AgentResult, AgentMessage, AgentConfig } from "./types";
import { runStrategyAgent } from "./strategy-agent";
import { runRiskAgent } from "./risk-agent";
import { runNewsAgent } from "./news-agent";
import { runBacktestAgent, type BacktestConfig } from "./backtest-agent";
import type { Candle } from "../engine/indicators";
import type { Tick } from "../engine/heatmap-analytics";
import type { NewsEvent } from "../engine/strategies-v2";

export interface OrchestratorState {
  isRunning: boolean;
  lastRun: number;
  results: Record<string, AgentResult>;
  messageLog: AgentMessage[];
  activeAgents: string[];
}

const initialState: OrchestratorState = {
  isRunning: false,
  lastRun: 0,
  results: {},
  messageLog: [],
  activeAgents: ["strategy-agent", "risk-agent", "news-agent"],
};

let state: OrchestratorState = { ...initialState };

export function getOrchestratorState(): OrchestratorState {
  return { ...state, results: { ...state.results }, messageLog: [...state.messageLog] };
}

export interface FullAnalysisInput {
  pair: string;
  timeframe: string;
  candles: Candle[];
  ticks: Tick[];
  balance: number;
  newsEvents?: NewsEvent[];
  currentEpoch?: number;
  dailyLossCap?: number;
  maxPositions?: number;
}

export function runFullAnalysis(input: FullAnalysisInput): OrchestratorState {
  const {
    pair, timeframe, candles, ticks, balance,
    newsEvents, currentEpoch,
    dailyLossCap = 50, maxPositions = 2,
  } = input;

  state.isRunning = true;
  const newMessages: AgentMessage[] = [];

  // 1. Strategy Agent
  const strategyResult = runStrategyAgent(
    pair, timeframe, candles, ticks,
    newsEvents, currentEpoch
  );
  state.results["strategy-agent"] = strategyResult;
  newMessages.push({
    id: crypto.randomUUID(),
    agentId: "orchestrator",
    type: "info",
    timestamp: Date.now(),
    content: `Strategy Agent: ${strategyResult.signals?.length ?? 0} signals, ${strategyResult.insights?.length ?? 0} insights`,
  });

  // 2. Risk Agent
  const riskResult = runRiskAgent({
    balance,
    dailyLossCap,
    maxPositions,
    winRate: strategyResult.output?.confidence as number ?? 0.6,
    avgWinLossRatio: 1.5,
  });
  state.results["risk-agent"] = riskResult;
  newMessages.push({
    id: crypto.randomUUID(),
    agentId: "orchestrator",
    type: riskResult.status === "error" ? "warning" : "info",
    timestamp: Date.now(),
    content: `Risk Agent: ${riskResult.insights?.[0] ?? "completed"}`,
  });

  // 3. News Agent
  const newsResult = runNewsAgent(currentEpoch ?? Date.now() / 1000, pair);
  state.results["news-agent"] = newsResult;

  // Combine messages
  state.messageLog = [...newMessages, ...state.messageLog].slice(0, 200);
  state.lastRun = Date.now();
  state.isRunning = false;

  return getOrchestratorState();
}

export function runBacktestOnly(config: BacktestConfig): AgentResult {
  const result = runBacktestAgent(config);
  state.results["backtest-agent"] = result;
  state.lastRun = Date.now();
  return result;
}

export function resetOrchestrator() {
  state = { ...initialState };
}

// Export all agent configs for UI
export const ALL_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: "strategy-agent",
    name: "Strategy Agent",
    description: "Multi-strategy confluence engine (14 strategies: 6 legacy + 8 new)",
    enabled: true,
    priority: "critical",
    intervalSec: 30,
    instruments: ["all"],
    timeframes: ["M5", "M15", "M30", "H1", "H4"],
  },
  {
    id: "risk-agent",
    name: "Risk Agent",
    description: "Kelly criterion position sizing, daily loss caps, consecutive loss tracking",
    enabled: true,
    priority: "critical",
    intervalSec: 10,
    instruments: ["all"],
    timeframes: ["all"],
  },
  {
    id: "news-agent",
    name: "News Agent",
    description: "Economic calendar monitor with News Spike Follow signals",
    enabled: true,
    priority: "high",
    intervalSec: 60,
    instruments: ["NZDUSD", "USDCHF", "AUDUSD", "USDCAD", "USDJPY", "EURUSD", "GBPUSD", "SPX500"],
    timeframes: ["H1"],
  },
  {
    id: "backtest-agent",
    name: "Backtest Agent",
    description: "On-demand session-aware strategy validation",
    enabled: true,
    priority: "medium",
    intervalSec: 0,
    instruments: ["all"],
    timeframes: ["H1"],
  },
];
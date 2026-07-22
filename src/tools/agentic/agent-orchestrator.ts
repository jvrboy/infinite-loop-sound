/**
 * Agent Orchestrator - Manages multi-agent coordination and execution
 * Supports concurrent agent execution, task delegation, and result aggregation
 */

export interface AgentTask {
  id: string;
  type: "analysis" | "execution" | "decision" | "monitoring";
  priority: "low" | "medium" | "high" | "critical";
  payload: Record<string, any>;
  timeout?: number;
  retryCount?: number;
  dependencies?: string[];
}

export interface AgentResult {
  taskId: string;
  agentId: string;
  status: "success" | "failed" | "timeout" | "cancelled";
  data?: Record<string, any>;
  error?: string;
  executionTime: number;
  timestamp: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: "analyzer" | "executor" | "decision" | "monitor";
  enabled: boolean;
  concurrency: number;
  timeout: number;
}

export class AgentOrchestrator {
  private agents: Map<string, AgentConfig> = new Map();
  private taskQueue: AgentTask[] = [];
  private results: Map<string, AgentResult[]> = new Map();
  private executingTasks: Set<string> = new Set();

  constructor(private config: { maxConcurrentTasks: number; globalTimeout: number }) {}

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, config);
  }

  /**
   * Submit a task to the orchestrator
   */
  async submitTask(task: AgentTask): Promise<string> {
    this.taskQueue.push(task);
    await this.processTasks();
    return task.id;
  }

  /**
   * Submit multiple tasks in parallel
   */
  async submitBatch(tasks: AgentTask[]): Promise<string[]> {
    const ids = tasks.map((t) => t.id);
    this.taskQueue.push(...tasks);
    await this.processTasks();
    return ids;
  }

  /**
   * Process pending tasks with priority and dependency management
   */
  private async processTasks(): Promise<void> {
    while (this.taskQueue.length > 0 && this.executingTasks.size < this.config.maxConcurrentTasks) {
      const task = this.getNextTask();
      if (!task) break;

      // Check dependencies
      if (task.dependencies && !this.areDependenciesMet(task.dependencies)) {
        continue;
      }

      this.executingTasks.add(task.id);
      this.executeTask(task).finally(() => this.executingTasks.delete(task.id));
    }
  }

  /**
   * Get the next task based on priority and dependencies
   */
  private getNextTask(): AgentTask | null {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    let nextTask: AgentTask | null = null;

    for (const task of this.taskQueue) {
      if (!this.executingTasks.has(task.id)) {
        if (!nextTask || priorityOrder[task.priority] < priorityOrder[nextTask.priority]) {
          nextTask = task;
        }
      }
    }

    if (nextTask) {
      this.taskQueue = this.taskQueue.filter((t) => t.id !== nextTask!.id);
    }

    return nextTask;
  }

  /**
   * Check if all task dependencies have completed
   */
  private areDependenciesMet(dependencies: string[]): boolean {
    return dependencies.every((depId) => {
      const depResults = this.results.get(depId);
      return depResults && depResults.some((r) => r.status === "success");
    });
  }

  /**
   * Execute a task with timeout and retry logic
   */
  private async executeTask(task: AgentTask): Promise<void> {
    let lastError: Error | null = null;
    const maxRetries = task.retryCount ?? 1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const timeout = task.timeout ?? this.config.globalTimeout;
        const result = await this.executeWithTimeout(task, timeout);

        if (!this.results.has(task.id)) {
          this.results.set(task.id, []);
        }
        this.results.get(task.id)!.push(result);

        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    if (!this.results.has(task.id)) {
      this.results.set(task.id, []);
    }
    this.results.get(task.id)!.push({
      taskId: task.id,
      agentId: "orchestrator",
      status: "failed",
      error: lastError?.message ?? "Unknown error",
      executionTime: 0,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute task with timeout
   */
  private executeWithTimeout(task: AgentTask, timeout: number): Promise<AgentResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${task.id} exceeded timeout of ${timeout}ms`));
      }, timeout);

      this.executeTaskLogic(task)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Main task execution logic
   */
  private async executeTaskLogic(task: AgentTask): Promise<AgentResult> {
    const startTime = performance.now();
    const agentId = task.type + "-agent";

    try {
      // Route to appropriate handler based on task type
      let data: Record<string, any> = {};

      switch (task.type) {
        case "analysis":
          data = await this.handleAnalysisTask(task);
          break;
        case "execution":
          data = await this.handleExecutionTask(task);
          break;
        case "decision":
          data = await this.handleDecisionTask(task);
          break;
        case "monitoring":
          data = await this.handleMonitoringTask(task);
          break;
        case "sentiment" as any:
          data = await this.handleSentimentTask(task);
          break;
        case "portfolio" as any:
          data = await this.handlePortfolioTask(task);
          break;
        case "execution-optimization" as any:
          data = await this.handleExecutionOptimizationTask(task);
          break;
        case "btmm" as any:
          data = await this.handleBTMMTask(task);
          break;
        case "supply-demand" as any:
          data = await this.handleSupplyDemandTask(task);
          break;
        case "msnr" as any:
          data = await this.handleMSNRTask(task);
          break;
        case "web-scrape" as any:
          data = await this.handleWebScrapeTask(task);
          break;
        case "self-learning" as any:
          data = await this.handleSelfLearningTask(task);
          break;
      }

      const executionTime = performance.now() - startTime;

      return {
        taskId: task.id,
        agentId,
        status: "success",
        data,
        executionTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;

      return {
        taskId: task.id,
        agentId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Handle analysis tasks
   */
  private async handleAnalysisTask(task: AgentTask): Promise<Record<string, any>> {
    // Analysis implementation placeholder
    return {
      analysisType: task.payload.type,
      results: [],
    };
  }

  /**
   * Handle execution tasks
   */
  private async handleExecutionTask(task: AgentTask): Promise<Record<string, any>> {
    // Execution implementation placeholder
    return {
      executionType: task.payload.action,
      status: "executed",
    };
  }

  /**
   * Handle decision tasks
   */
  private async handleDecisionTask(task: AgentTask): Promise<Record<string, any>> {
    // Decision implementation placeholder
    return {
      decision: null,
      reasoning: "",
    };
  }

  /**
   * Handle monitoring tasks
   */
  private async handleMonitoringTask(task: AgentTask): Promise<Record<string, any>> {
    // Monitoring implementation placeholder
    return {
      metrics: {},
      status: "monitored",
    };
  }

  /**
   * Handle sentiment analysis tasks
   */
  private async handleSentimentTask(task: AgentTask): Promise<Record<string, any>> {
    // In a real implementation, this would call the SentimentAgent
    return {
      sentiment: {
        overallSentiment: 0.45,
        recommendedBias: "BULLISH",
      },
    };
  }

  /**
   * Handle portfolio optimization tasks
   */
  private async handlePortfolioTask(task: AgentTask): Promise<Record<string, any>> {
    // In a real implementation, this would call the PortfolioAgent
    return {
      optimization: {
        rebalanceRequired: true,
        expectedReturn: 0.12,
      },
    };
  }

  /**
   * Handle execution optimization tasks
   */
  private async handleExecutionOptimizationTask(task: AgentTask): Promise<Record<string, any>> {
    // In a real implementation, this would call the ExecutionOptimizationAgent
    return {
      strategy: {
        optimalEntry: task.payload.currentPrice * 0.998,
        slippageTolerance: 0.001,
      },
    };
  }

  /**
   * Handle BTMM strategy tasks
   */
  private async handleBTMMTask(task: AgentTask): Promise<Record<string, any>> {
    return {
      btmm: { phase: "trend", bias: "bullish", pattern: "W" },
    };
  }

  /**
   * Handle Supply and Demand strategy tasks
   */
  private async handleSupplyDemandTask(task: AgentTask): Promise<Record<string, any>> {
    return {
      zones: [{ type: "demand", strength: 8, isFresh: true }],
    };
  }

  /**
   * Handle MSNR strategy tasks
   */
  private async handleMSNRTask(task: AgentTask): Promise<Record<string, any>> {
    return {
      msnr: { structure: "bullish", bias: "long" },
    };
  }

  /**
   * Handle web scraping tasks
   */
  private async handleWebScrapeTask(task: AgentTask): Promise<Record<string, any>> {
    return {
      news: [{ title: "Fed rate cut signals", impact: "high" }],
    };
  }

  /**
   * Handle self-learning tasks
   */
  private async handleSelfLearningTask(task: AgentTask): Promise<Record<string, any>> {
    return {
      status: "learning_updated",
      metrics: { winRate: 65.5 },
    };
  }

  /**
   * Get task results by ID
   */
  getTaskResults(taskId: string): AgentResult[] {
    return this.results.get(taskId) ?? [];
  }

  /**
   * Get all results
   */
  getAllResults(): Map<string, AgentResult[]> {
    return new Map(this.results);
  }

  /**
   * Clear completed tasks
   */
  clearResults(): void {
    this.results.clear();
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    activeAgents: number;
    executingTasks: number;
    queuedTasks: number;
    totalResults: number;
  } {
    return {
      activeAgents: Array.from(this.agents.values()).filter((a) => a.enabled).length,
      executingTasks: this.executingTasks.size,
      queuedTasks: this.taskQueue.length,
      totalResults: Array.from(this.results.values()).reduce((sum, arr) => sum + arr.length, 0),
    };
  }
}

export default AgentOrchestrator;

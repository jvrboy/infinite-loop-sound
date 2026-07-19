# Infinite Loop Sound - Enhanced Trading Platform

Merged all Deriv bot features: multi-agent system, advanced scalper, professional UI fixes.

## What's New

### AI Multi-Agent System (8 trained agents)
- **Trade Pattern Analyzer** — statistical pattern detection across closed trades
- **Parameter Optimizer** — walk-forward optimization with anti-overfit guards
- **Trade Outcome Predictor** — neural net win-probability prediction
- **Dynamic Risk Manager** — portfolio heat, drawdown, and correlation monitoring
- **Sentiment Synthesizer** — normalized -1..+1 market mood scoring
- **Execution Optimizer** — slippage and spread cost minimization
- **Market Regime Classifier** — trend/range/volatile regime gating
- **Portfolio Allocator** — risk-parity rebalancing across strategies

Each agent supports: training (with progress tracking), run, enable/disable, version tracking, and accuracy metrics.

### New Routes
- `/ai-agents` — AI Multi-Agent System dashboard with training UI
- `/portfolio-pro` — Enhanced portfolio manager with P&L tracking
- `/risk-manager` — Risk configuration with score and rule checks
- `/market-news` — Curated headlines with sentiment and impact scoring
- `/strategy-lab` — Build, backtest, and iterate trading strategies

### New Components
- `ShaderCanvas` — 5 animated canvas backgrounds (aurora, hexgrid, plasma, dotfield, neonmesh) inspired by Shaders MCP presets

### Enhanced Navigation
- AppShell sidebar now includes all new routes with proper Lucide icons
- New icons: Newspaper, FlaskConical

Production ready.

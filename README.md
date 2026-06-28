---
title: Infinite Loop Sound
emoji: 🔊
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Infinite Loop Sound — DivergenceIQ

Advanced forex trading intelligence platform built with TanStack Start (React + Vite). Features AI-powered signal analysis, neural network predictions, automated trading bots, and comprehensive risk management tools.

## 🚀 New Features (v2.5)

### Trading Psychology & Journal
- **Psychology Tracker** — Monitor discipline, patience, confidence, focus, and emotional control with tilt detection
- **Trade Journal Enhancement** — Psychology tracker and market sessions heatmap integrated into journal page
- **Mood & Emotion Tracking** — Record pre/post trade emotional states and identify patterns

### Risk Management
- **Position Size Calculator** — Kelly Criterion-based sizing with volatility adjustment and risk assessment
- **Monte Carlo Simulator** — Run 1,000-10,000 randomized simulations to stress-test strategies
- **Risk/Reward Visualizer** — Visual entry/exit/stop-loss planning with R-multiple calculations

### Market Analysis
- **Volatility Regime Detector** — Automatically classify market into LOW/NORMAL/HIGH/EXTREME regimes with adaptive recommendations
- **Correlation Matrix Enhancement** — Risk warnings for correlated pairs, hedging opportunities, and portfolio diversification tips
- **Market Sessions Heatmap** — Visual hourly volatility heatmap with active session detection and optimal trading windows
- **Sentiment Gauge** — Aggregated bullish/bearish/neutral signal visualization

### Engines & Libraries
- **Smart Alerts Engine** — Configurable alert system with 10+ alert types (price, volatility, confluence, drawdown, streak, MTF agreement)
- **Correlation Matrix Engine** — Pearson correlation computation with rolling correlation and regime change detection
- **Monte Carlo Engine** — Full simulation with probability of ruin, Kelly Criterion, and percentile distributions
- **Multi-Timeframe Scanner Hook** — Scan across M1-MN timeframes for confluence
- **Performance Analytics Hook** — Track win rate, expectancy, profit factor, and Sharpe ratio

### Navigation
- Three new routes added to Strategy & Journal section: Monte Carlo, Correlation, Vol Regime

## Deployment

- Hosted on Hugging Face Spaces (Docker SDK): `Vietrin9/infinite-loop-sound`
- Every push to the `main` branch of the GitHub repo is automatically synced to the Space via GitHub Actions (`.github/workflows/sync-to-hf.yml`), which triggers a rebuild.

## Local development

```bash
npm install
npm run dev
```

## Tech Stack

- **Framework:** TanStack Start (React 19 + Vite)
- **Styling:** Tailwind CSS with custom trading theme
- **State:** React hooks + localStorage persistence
- **Data:** Supabase (Postgres + Realtime) + Deriv WebSocket API
- **AI:** OpenAI integration for signal analysis
- **Deployment:** Docker → Hugging Face Spaces

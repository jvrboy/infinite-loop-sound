# Infinite Loop Sound — DivergenceIQ

Professional AI-powered forex divergence scanner and multi-agent trading platform.

## Platform Independence

The app now works across all platforms without hard Supabase dependency:

- **Web**: Full Supabase backend when configured, or IndexedDB local storage fallback
- **Desktop (.exe/.dmg/.AppImage)**: Electron with native model loading support
- **Mobile (.ipa/.apk)**: Capacitor with Filesystem plugin for local model access
- **Offline**: All features work with local data store; syncs to Supabase when available

## AI Multi-Agent System (12 trained agents)

| Agent | Role |
|------|------|
| Strategy Agent | Strategy selection and signal generation |
| Risk Manager | Portfolio heat, drawdown, position sizing |
| News Sentiment | Market mood scoring from news events |
| Confluence Engine | Multi-indicator confluence detection |
| Parameter Optimizer | Walk-forward optimization with anti-overfit |
| Automation Hub | Automated trade execution orchestration |
| Pattern Recognition | Chart pattern detection (harmonic, Elliott, Wyckoff) |
| Self-Learning Core | Adaptive weight learning from trade outcomes |
| **Liquidity Flow** | Liquidity zones, stop hunts, order flow imbalance |
| **Volatility Regime** | ATR/Bollinger regime classification and forecasting |
| **Correlation Matrix** | Cross-asset correlation monitoring for hedging |
| **Execution Flow** | Spread/slippage analysis and optimal execution strategy |

Train all agents from the `/ai-lab` route with progress tracking and accuracy metrics.

## Shader Gallery (11 backgrounds)

| Shader | Technology | Description |
|--------|-----------|-------------|
| Liquid Blobs | Canvas2D | Liquid deformation with scroll/mouse interaction |
| Neural WebGPU | WebGPU | GPU neural field (if supported) |
| Plasma Fractal | WebGL | FBM plasma flow with mouse interaction |
| Aurora Flow | WebGL | Aurora borealis with starfield |
| Hex Matrix | WebGL | Animated honeycomb grid |
| **Voronoi Cells** | WebGL | Shifting cellular zones |
| **Starfield Warp** | WebGL | 3D hyperspace starfield |
| **Fluid Dynamics** | WebGL | Curl-noise fluid flow with mouse interaction |
| **Tunnel Warp** | WebGL | Depth tunnel with flowing rings |
| **Galaxy Spiral** | WebGL | Swirling spiral galaxy with dust lanes |
| None | — | Flat background |

Switch backgrounds from `/theme` or `/shaders`.

## Key Routes

- `/` — Dashboard with live ticks, signals, KPI ticker
- `/theme` — **Fixed**: Full theme picker + shader selector (was broken)
- `/ai-lab` — Agent training dashboard (12 agents)
- `/local-ai` — Platform-aware GGUF model loader (web/desktop/mobile)
- `/shaders` — Shader gallery
- `/ai-agents` — Agent orchestration
- `/portfolio-pro` — Portfolio manager with P&L
- `/risk-manager` — Risk configuration
- `/strategy-lab` — Strategy builder and backtesting

## Architecture

- **Frontend**: TanStack Start + React 19 + Vite 7 + Tailwind CSS 4
- **Backend**: Supabase (Postgres + Auth + Edge Functions) — optional, degrades gracefully
- **Desktop**: Electron with electron-builder (dmg, nsis, AppImage)
- **Mobile**: Capacitor (iOS, Android)
- **AI**: wllama (WASM) for browser, native bindings for desktop, File plugin for mobile
- **Data**: Local Data Store (IndexedDB) with transparent Supabase sync

## Production Ready

- No mockups — all data flows use real Deriv API or local persistence
- Graceful degradation when Supabase is not configured
- Platform-aware model loading for GGUF files
- 12 trained AI agents with accuracy tracking
- 11 WebGL/WebGPU shader backgrounds
- Professional UI components: KPI ticker, agent cards, live prices, shader previews

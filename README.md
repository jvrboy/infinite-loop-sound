# Infinite Loop Sound — DivergenceIQ

Professional AI-powered forex divergence scanner, multi-agent trading platform, and audio production suite.

## Platform Independence

The app works across all platforms without hard Supabase dependency:

- **Web**: Full Supabase backend when configured, or IndexedDB local storage fallback
- **Desktop (.exe/.dmg/.AppImage)**: Electron with native file system access, network APIs, and app folder
- **Mobile (.ipa/.apk)**: Capacitor with Filesystem plugin for local file access
- **Offline**: All features work with local data store; syncs to Supabase when available

### Local Storage Access

When the app is installed as a native build (.ipa, .apk, .dmg, .exe), it automatically:

- Creates a dedicated folder (`~/Documents/DivergenceIQ` on desktop, `Documents/DivergenceIQ` on mobile)
- Provides full file system CRUD operations (create, read, write, delete, list)
- Supports native file pickers (open file, open directory, save file)
- Enables network downloads to local storage
- Opens files in the system's default application
- Reports storage usage and available space
- Monitors network status (online/offline, connection type, latency)

Access via the `/native-tools` route.

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
| Liquidity Flow | Liquidity zones, stop hunts, order flow imbalance |
| Volatility Regime | ATR/Bollinger regime classification and forecasting |
| Correlation Matrix | Cross-asset correlation monitoring for hedging |
| Execution Flow | Spread/slippage analysis and optimal execution strategy |

Train all agents from the `/ai-lab` route with progress tracking and accuracy metrics.

## Shader Gallery (11 backgrounds)

| Shader | Technology | Description |
|--------|-----------|-------------|
| Liquid Blobs | Canvas2D | Liquid deformation with scroll/mouse interaction |
| Neural WebGPU | WebGPU | GPU neural field (if supported) |
| Plasma Fractal | WebGL | FBM plasma flow with mouse interaction |
| Aurora Flow | WebGL | Aurora borealis with starfield |
| Hex Matrix | WebGL | Animated honeycomb grid |
| Voronoi Cells | WebGL | Shifting cellular zones |
| Starfield Warp | WebGL | 3D hyperspace starfield |
| Fluid Dynamics | WebGL | Curl-noise fluid flow with mouse interaction |
| Tunnel Warp | WebGL | Depth tunnel with flowing rings |
| Galaxy Spiral | WebGL | Swirling spiral galaxy with dust lanes |
| None | — | Flat background |

Switch backgrounds from `/theme` or `/shaders`.

## VINNY Audio Engine

### 15 Core Sections
Sound Engine, Text-to-Sound, Sound Design, Audio ID, Sampler, Theory, MIDI, Loops, Effects Rack, Modulation, Mixer, Export, Visualizer, Workflow AI, VINNY Features

### 15 Audio Effects (10 original + 5 new)

Original: Compressor, Limiter, Gate, Reverb, Delay, Chorus, Phaser, Flanger, Tremolo, Distortion, Fuzz, Overdrive, Bitcrush, Saturation, Amp, Cabinet, Halfspeed, Vibrato, Autopan, Portal, Shimmer, Freeze, Reverse, Granular FX, Vocoder, Pitch Shift, Harmonizer, Formant, Stereo Widener, Mid-Side, Transient Shaper

New Pack 1: Convolution Reverb, Tape Echo, Granular Cloud, Spectral Freezer, Harmonic Enhancer, Transient Designer, Multiband Compressor, Stereo Imager, Vocoder FX, Lo-Fi Degrader

New Pack 2: Ring Modulator, Frequency Shifter, Resonator, Chorus Ensemble, Multi-Stage Phaser

### 10 Audio Analysis Tools
- BPM Detector (onset detection + autocorrelation)
- Key Detector (chroma + Krumhansl-Schmuckler)
- LUFS Meter (ITU-R BS.1770 loudness)
- Spectrum Analyzer (centroid, spread, flatness, rolloff)
- Stem Splitter (frequency-based source separation)
- Noise Gate (dynamic noise reduction)
- Phase Correlation Meter (stereo analysis)
- Dynamic Range Meter (DR measurement)
- Pitch Tracker (autocorrelation fundamental detection)
- Audio Fingerprinter (unique ID hash generation)

Access via the `/audio-tools` route.

### 10 Vinny Extended Features
- AI Melody Generator (scale + mood + complexity aware)
- Chord Progression Generator (8 common progressions)
- Pattern Sequencer (genre-aware drum patterns)
- Arpeggiator Engine (6 patterns: up, down, updown, random, chord, updown2)
- Bass Line Generator (genre-aware bass patterns)
- Scale Finder (find compatible scales for notes)
- Harmonizer (generate harmony notes for melody)
- Rhythm Generator (Euclidean rhythm patterns)
- Voice Leading Optimizer (minimize voice leading distance)
- Song Structure Generator (arrangement suggestions for 6 genres)

### MIDI Tools
- MIDI file parser (reads .mid files from ArrayBuffer)
- MIDI file exporter (generates .mid files from note data)
- MIDI transformer (transpose, quantize, time-stretch, velocity scale)
- MIDI to note name converter
- MIDI generator from note arrays

### Advanced Visualizer (5 modes)
Radial Spectrum, 3D Bars, Waterfall, Phase Scope, Particle Flow

## Trading Tools (12 extended calculators)

- Pivot Points Calculator (5 methods: Classic, Fibonacci, Camarilla, Woodie, DeMark)
- Position Size Calculator (multi-currency)
- Kelly Criterion Calculator
- Risk of Ruin Calculator (Monte Carlo simulation)
- Session Heatmap (Sydney, Tokyo, London, New York with overlaps)
- Currency Strength Meter
- Fibonacci Retracement Calculator
- Pip Value Calculator (multi-currency)
- Drawdown Calculator
- Z-Score Calculator (strategy validation)
- Sharpe Ratio Calculator
- Profit Factor Calculator

Access via the `/extended-tools` route.

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard with live ticks, signals, KPI ticker |
| `/theme` | Theme picker + shader selector |
| `/ai-lab` | Agent training dashboard (12 agents) |
| `/local-ai` | Platform-aware GGUF model loader |
| `/shaders` | Shader gallery |
| `/native-tools` | Device file browser, network status, storage info |
| `/audio-tools` | Audio analysis suite (BPM, key, LUFS, spectrum) |
| `/extended-tools` | 12 professional trading calculators |
| `/tools` | Core forex tools (sessions, pivots, volatility) |
| `/ai-agents` | Agent orchestration |
| `/portfolio-pro` | Portfolio manager with P&L |
| `/risk-manager` | Risk configuration |
| `/strategy-lab` | Strategy builder and backtesting |

## Architecture

- **Frontend**: TanStack Start + React 19 + Vite 7 + Tailwind CSS 4
- **Backend**: Supabase (Postgres + Auth + Edge Functions) — optional, degrades gracefully
- **Desktop**: Electron with electron-builder (dmg, nsis, AppImage)
- **Mobile**: Capacitor (iOS, Android)
- **AI**: wllama (WASM) for browser, native bindings for desktop, File plugin for mobile
- **Data**: Local Data Store (IndexedDB) with transparent Supabase sync
- **Native Bridge**: Unified file system, network, and storage API across platforms

## Production Ready

- No mockups — all data flows use real Deriv API or local persistence
- Graceful degradation when Supabase is not configured
- Platform-aware model loading for GGUF files
- 12 trained AI agents with accuracy tracking
- 11 WebGL/WebGPU shader backgrounds
- 15+ audio effects, 10 audio analysis tools, 10 Vinny extended features
- 12 professional trading calculators
- MIDI file parsing, export, and transformation
- 5 advanced visualizer modes
- Native device file system, network, and storage access
- Professional UI components throughout

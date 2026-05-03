
# Infinite Sound — Build Plan

A touch-first sound design lab in the browser. One screen, three modes (Create / Import / Resample), four toolbars (Shape / Flow / DNA / FX), and a one-tap ∞ Export that writes seamless looping WAVs straight into your DAW's sample folder.

## Scope note (please read)

You picked "everything in the spec." The full vision is a multi-month native app. In one Lovable build I can deliver a **functionally complete web version** of the entire surface area — every mode, every tab, every toolbar, the loop engine, packs, settings — but some things will be **lighter than the spec implies**:

- **Audio engine**: Web Audio API + custom DSP in JS/AudioWorklets (not C++). Fast enough for the described sounds; granular will cap at ~64 grains rather than 256 for stability.
- **AI-style features** (vocal extraction, drum extraction, smart-loop scoring, evolve/mutate): implemented with classical DSP heuristics — phase-cancel for vocals, transient detection for drums, zero-crossing + spectral-similarity scoring for loops, parameter randomization for evolve. Useful, not magic.
- **DAW folder sync**: File System Access API (Chromium desktop). Safari/Firefox/mobile fall back to per-export downloads + an in-app library.
- **Native-only items** dropped or stubbed: MIDI drag-into-DAW, true Mac Catalyst/Windows builds, system-wide haptics, inter-app audio. Web haptics (`navigator.vibrate`) used where available.

If any of those compromises is a dealbreaker, tell me before I start.

## What the user gets

### One-screen layout
- Top bar: ∞ Infinite Sound logo, Library (≡), Settings (⚙)
- **Sound Canvas** (top): mode-specific big visual — particle cloud (Create), waveform+spectrum (Import), dual morph view (Resample)
- **Mode switch row**: CREATE / IMPORT / RESAMPLE — three big glass buttons
- **Waveform + loop editor**: always visible, draggable 🔵 start / 🟢 end markers, snap-to-zero toggle, loop-type icons (Forward / Ping-pong / One-shot), tap-region-to-preview-loop
- **Toolbar tabs**: SHAPE / FLOW / DNA / FX — content swaps per active mode
- **Bottom right**: ▶ Play, ∞ Export

### Core loop engine
- Zero-crossing detector (10ms window) → snaps loop markers automatically
- Spectral similarity score between loop start/end → "Loopability %" badge
- Smart-Loop suggests 3 candidate regions, ranked, color-coded
- Custom WAV writer in JS that emits 24-bit/48kHz PCM with proper **`smpl` chunk** (loop start/end/type), **`acid` chunk** (seamless flag, BPM if detected), **`LIST INFO`** chunk (tags, key, date)
- Crossfade-loop option (0–50ms) to mask imperfect joins

### CREATE mode
- Particle-cloud canvas; gestures map to synthesis:
  - Circle → sine fundamental (size = freq)
  - Spiral → pitch sweep
  - Vertical line → harmonic stack
  - Horizontal line → noise/texture
  - Zigzag → rhythmic pulses
  - Star → chord
  - Smudge → granular cloud
- Each gesture spawns voices in a polyphonic Web Audio graph
- SHAPE: timbre wheel (bright/dark × soft/sharp), harmonic morph (sine→saw→square), noise mix, advanced (phase, stereo width, unison 1–8)
- FLOW: draw-a-modulation-curve LFO + presets (rise/fall/oscillate/spike/random) routed to pitch/cutoff/volume/pan/fx
- DNA: Evolve (4 mutated children), Mutate (single 5–20% jitter), Crossbreed (blend two saved sounds), History tree, Save to Library
- FX chain: Reverb / Delay / Distortion / Filter / Chorus / Compressor — drag to reorder, tap to bypass

### IMPORT mode
- Tap canvas → file picker (WAV/AIFF/MP3/M4A/FLAC via Web Audio decode)
- Auto-analyze: tempo (autocorrelation), fundamental (FFT peak), dynamic range, loopability
- Actions: Auto-Loop, Trim, Normalize, Reverse, Strip Silence, Extract Drums (transient gate), Extract Vocals (mid/side phase cancel)
- SHAPE: spectral paint editor (boost/cut/smudge on a live spectrogram), formant shift
- FLOW: time-stretch (phase vocoder), pitch shift, grain size
- DNA: Analyze panel, Smart-Loop with 3 ranked suggestions
- FX: same chain as Create

### RESAMPLE mode
- Dual-waveform morph view (source on top, result on bottom)
- Source = current sound; Target = imported or library pick
- Modes: Morph (spectral blend), Conform (force target's rhythm/spectrum onto source), Granulate (rearrange source grains using target's transient timing)
- Sliders: Morph Amount, Spectral Weight, Rhythm Weight, Grain Size
- DNA: Family-tree history, Breed, Mutate

### Pack system
- Pack drawer in top bar; add current sound, reorder, name pack
- Export Pack → in-app generates folder structure + Pack_Info.txt + Preview.wav, then either writes to chosen Infinite Folder or downloads as a zip
- Starter templates: Drum Kit, Pad Pack, Bass Pack, Arp Pack, FX Pack (templates pre-fill DNA seeds + loop-type defaults)

### Settings
- **Infinite Folder**: pick once via File System Access; app creates `/My Designs /Imported /Resampled /Packs /Temp` subfolders. Fallback: downloads + IndexedDB library
- DAW preset (Ableton/Logic/FL/etc.) — only affects suggested folder layout
- File-naming: Auto / Manual / Template
- Audio: sample rate (44.1/48/96), bit depth (16/24/32f), latency, mono/stereo
- Loop defaults: auto-loop on/off, default type, crossfade ms, snap-to-zero
- Appearance: theme (Liquid Glass default), motion, haptics, preview volume
- Pro: wavetable export (Serum/Vital-compatible 256-frame WAV), debug overlay (zero-crossing markers), reset

### Gestures
Tap, double-tap, long-press, pinch-zoom, two-finger rotate, three-finger reset, drag markers, tap-loop-to-preview, shake-to-undo (devicemotion), two-finger swipe = history prev/next.

### Visual design — Liquid Glass (locked)
- Bg `#0A0A0F` + 5% noise texture
- Glass panels: 80% opacity, 20px backdrop-blur, 0.5px border at 15% white
- Accents: cyan `#32ADE6`, magenta `#FF2D55`, success green `#34C759`, warning orange `#FF9500`
- Typography: SF Pro Display/Text/Mono via `-apple-system` stack with web fallback
- 0.3s cubic transitions, 0.1s spring on gesture feedback, pulsing border on active loop region, shimmer on ∞ when export-ready
- `navigator.vibrate` for haptics where supported

## Build order

1. **Shell + Liquid Glass design system** — colors, glass panel component, top bar, mode buttons, bottom toolbar skeleton, settings drawer
2. **Audio engine core** — Web Audio graph manager, sound model (params + buffer), playback with loop, WAV encoder with `smpl`/`acid`/`LIST` chunks, zero-crossing detector
3. **Waveform + loop editor component** — canvas waveform, draggable markers, snap-to-zero, loop preview, loop-type selector
4. **Export flow** — name dialog, format/normalize options, File System Access folder picker + write, download fallback, IndexedDB library
5. **CREATE mode** — particle canvas, gesture recognizer, gesture→synthesis mapping, SHAPE/FLOW/DNA/FX tabs
6. **IMPORT mode** — file picker + decoder, analysis panel, spectral paint, time-stretch/pitch-shift, smart-loop ranking
7. **RESAMPLE mode** — dual-view, morph/conform/granulate engines, slider controls
8. **Packs** — pack drawer, templates, multi-WAV / zip export
9. **Polish** — gestures (pinch/rotate/shake), haptics, animations, accessibility (reduce-motion, high-contrast, ARIA)

## Technical notes

- Stack: TanStack Start + React 19 + Tailwind v4 (already in project). All client-side; no backend needed for v1.
- Audio: Web Audio API + `AudioWorkletNode` for granular and phase-vocoder DSP.
- WAV writer: hand-rolled in TS to control chunk order; verified against `smpl` spec so Kontakt/Ableton Simpler/Logic Quick Sampler honor loop points.
- File System Access API with capability detection and graceful fallback.
- IndexedDB for in-app library + history tree + DNA lineage.
- No database, no auth, no Lovable Cloud needed for v1. Add later if you want cloud sync of libraries/packs.

## Out of scope for v1 (call out so it's explicit)

- Native iOS/macOS/Windows apps — this is a web app
- MIDI drag-into-DAW (no browser API for it)
- Live mic input recording — easy to add later as a follow-up
- Cloud accounts / sharing
- Real-time inter-app audio

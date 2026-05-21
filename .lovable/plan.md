
# Infinite Sound — Precision Loop & Realtime Playback Update

## 1. Waveform editor: zoom + precise snap

**File:** `src/components/infinite/WaveformLoop.tsx` (+ small helpers in `src/audio/wav.ts`)

- Add zoom state `{ zoom: 1..64, offset: 0..1 }` driving the view window over the buffer.
- Gestures:
  - Pinch (two-pointer) → zoom around midpoint.
  - Wheel + ⌘/Ctrl → zoom; wheel alone → horizontal scroll.
  - Double-tap empty area → zoom to fit loop region.
  - Drag on empty area (no marker) → pan.
- Recompute downsampled peaks per view window (RMS + peak min/max) so zoomed-in views show real sample detail (not stretched pixels). At zoom > ~16, draw individual sample dots with connecting line.
- Render a zoom mini-map strip below the waveform showing the full buffer and a draggable view window.
- Marker hit-testing uses screen-space (account for zoom/offset). Add a thin "playhead" line during preview.

**Snap controls** (new row above waveform):
- Toggle: snap on/off (existing `settings.snapToZero`).
- Search window slider: 1–50 ms (default 10 ms). Stored as `settings.snapWindowMs`.
- Mode segmented control: `Zero` (current), `Zero +slope` (only zero-crossings with matching slope sign — better seamlessness), `Peak` (snap to local max amplitude). Stored as `settings.snapMode`.
- Update `findNearestZeroCrossing` → `findSnapPoint(data, target, windowSamples, mode)` and call from drag handler in `WaveformLoop`. Old function kept as thin wrapper for backward compat.
- Show readout next to marker while dragging: sample index, ms, frequency-locked length (e.g. "≈ 220 Hz" if integer period).

## 2. Loop type override with live marker feedback

**Files:** `src/components/infinite/WaveformLoop.tsx`, `src/state/store.ts`, `src/audio/dsp.ts`

- Replace the small icon row with a prominent 3-way segmented control labelled **SUSTAIN / ONE-SHOT / PING-PONG** under the waveform (always visible, large touch targets).
- Rename internal `forward` → `sustain` (display) but keep WAV chunk type compatible; `pingpong` → `pingpong`; `oneshot` → `oneshot`. Map in `wav.ts` smpl chunk writer.
- On switch, immediately mutate the visualization:
  - **SUSTAIN:** standard S/E markers, region tinted cyan, loopability score visible.
  - **ONE-SHOT:** hide loop region; show only a fade-out tail handle (uses `loopEnd` as fade end); score replaced with "tail Xms".
  - **PING-PONG:** S/E markers with a mirrored "ghost" overlay drawn from E→S to visualize reverse pass; tint magenta.
- Marker drag is disabled in one-shot.

## 3. Loop preview playback (audition before export)

**Files:** `src/audio/playback.ts`, `src/components/infinite/WaveformLoop.tsx`, `src/state/store.ts`

- Extend `playSound` to honor loop type properly:
  - `sustain` → current behavior.
  - `oneshot` → `src.loop=false`, schedule a gain ramp 0 dB → −∞ over `(loopEnd-loopStart)/sr` as fade tail.
  - `pingpong` → since Web Audio has no native ping-pong, render a one-shot AudioBuffer: forward slice + reversed slice concatenated with `settings.crossfadeMs` equal-power crossfade between joins; loop that synthetic buffer.
- Add a persistent floating **Preview** transport in `WaveformLoop`:
  - ▶ Play loop region (loops continuously)
  - ▶ Play full sound (head → loop → release)
  - ◼ Stop
  - Cycle counter ("loop 3×") so user can hear seam reliability.
- Drive an animated playhead via `requestAnimationFrame`, reading `ctx.currentTime` against playback start.
- Wire global state `isPlaying` and current mode so other components (TopBar) can show status.

## 4. First-run setup wizard

**New file:** `src/components/infinite/SetupWizard.tsx` (+ tiny additions to `src/state/store.ts`, `src/state/folder.ts`, `src/routes/index.tsx`)

- Trigger: on mount, if `localStorage["infinite-sound-onboarded"]` is missing AND no Infinite Sound folder picked, open a 4-step glass modal.
- Steps:
  1. **Welcome** — what the app does, "one tap → loop WAV in your DAW".
  2. **Pick your Infinite Sound folder** — big button calling `pickInfiniteFolder()` (File System Access API). Shows browser compatibility note and falls back to "Use downloads instead" if API unavailable.
  3. **Point your DAW here** — DAW selector (Ableton / Logic / FL / Bitwig / Cubase / Generic) with copy-pasteable instructions per DAW (e.g. Ableton: drag folder into Places sidebar; Logic: add to Loop Browser). Stored as `settings.dawPreset`.
  4. **Test export** — generates a tiny ping sound and saves to the folder, confirms write succeeded.
- Skip / Later button on every step. On finish: `localStorage["infinite-sound-onboarded"] = "1"`.
- Re-launchable from Settings drawer ("Re-run setup").

## 5. More tools

Tightly scoped additions, no scope creep:

- **Waveform toolbar buttons** (next to snap): Zoom In, Zoom Out, Fit, Zoom-to-Loop.
- **Loop nudge buttons** (±1 sample, ±1 ms, ±1 cycle for the detected fundamental). Useful with snap off for surgical placement.
- **Crossfade preview overlay** — render the crossfade region as a dashed band when `settings.crossfadeMs > 0`.
- **"Find best loop" sweep** — runs `suggestLoops` constrained to user's current loop length and picks the highest-scoring placement; one-click button in the waveform toolbar.

## 6. Realtime audio playback (engine-wide)

**Files:** `src/audio/engine.ts`, `src/audio/playback.ts`, `src/audio/synth.ts`, `src/components/infinite/SoundCanvas.tsx`, `src/components/infinite/panels/ShapePanel.tsx`, `src/components/infinite/panels/FxPanel.tsx`

Today playback only fires when the user hits play after a render. We will make every parameter audible immediately:

- **Realtime synth voice**: in `engine.ts` add a persistent `LiveVoice` graph (oscillator bank + noise + filter + amp env) routed through the FX chain. Voice is lazily created on first interaction (browser autoplay policy) and reused.
- **Param subscription**: `useApp.subscribe` listens to `sound.params` and `sound.fx` and patches the live voice in <16 ms (smoothed via `AudioParam.linearRampToValueAtTime` over 20 ms to avoid zipper noise).
- **Touch-to-sound** in `SoundCanvas`: pointer-down opens gate, pointer-up closes; X/Y modulate pitch/brightness in realtime; gestures still feed `gestureToSynth` to update stored params. So drawing literally sounds.
- **FX panel**: every knob change audible immediately (route taps through live FX chain).
- **Imported audio**: when a buffer exists, a separate `LivePlayer` source is the audible one (already covered by §3 preview), so realtime applies to FX changes on the buffer too.
- **Rendered export buffer** is still produced offline on Export (unchanged).
- **Master meter** in TopBar (post-FX RMS via `AnalyserNode`) so user sees output level.

## Technical notes

```text
┌─ WaveformLoop ─────────────────────────────────────┐
│ [snap▾][zoomIn][zoomOut][fit][findBest]   loop:Xms │
│ ╔══════════ canvas (zoom+pan) ═════════════╗       │
│ ║  ░░░░░|████████|░░░░░  (crossfade dashed)║       │
│ ╚══════════════════════════════════════════╝       │
│ ┌── minimap ──────────────────────────────┐        │
│ │     [ view window ]                     │        │
│ └─────────────────────────────────────────┘        │
│ [ SUSTAIN | ONE-SHOT | PING-PONG ]                 │
│ ◀ -1smp -1ms   ▶▶ loop  ▶ full  ◼  loops:3        │
└────────────────────────────────────────────────────┘
```

State additions in `Settings`:
```ts
snapWindowMs: number;        // default 10
snapMode: "zero" | "zeroSlope" | "peak";
liveAudioEnabled: boolean;   // default true
```

Store additions:
```ts
view: { zoom: number; offset: number };
setView(patch): void;
nudgeLoop(edge: "start"|"end", samples: number): void;
```

Engine additions:
```ts
ensureLiveVoice(): LiveVoice
LiveVoice = { gate(on:boolean), setParams(p), setFx(fx), meter():number, destroy() }
```

## Out of scope (explicit)

- No new mode tabs, no pack/library changes.
- No worklet rewrite — realtime uses ScriptProcessor-free graph of native nodes.
- Pinch on devices without two pointers falls back to wheel/buttons.

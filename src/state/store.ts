import { create } from "zustand";
import { defaultParams, type SoundParams } from "@/audio/synth";
import { defaultFx, type FxParams } from "@/audio/engine";
import type { LoopType } from "@/audio/wav";

export type Mode = "create" | "import" | "resample";
export type ToolTab = "shape" | "flow" | "dna" | "fx";

export interface Sound {
  id: string;
  name: string;
  params: SoundParams;
  fx: FxParams;
  loopType: LoopType;
  loopStart: number; // sample index
  loopEnd: number;   // sample index
  buffer?: AudioBuffer;
  importedFile?: string; // filename
  parentId?: string;
  createdAt: number;
}

export interface Settings {
  sampleRate: 44100 | 48000 | 96000;
  bitDepth: 16 | 24 | 32;
  defaultLoopType: LoopType;
  autoLoop: boolean;
  snapToZero: boolean;
  crossfadeMs: number;
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  previewVolume: number;
  fileNaming: "auto" | "manual" | "template";
  filenameTemplate: string;
  dawPreset: "ableton" | "logic" | "fl" | "bitwig" | "cubase" | "generic";
  normalizeOnExport: boolean;
  snapWindowMs: number;            // 1..50
  snapMode: "zero" | "zeroSlope" | "peak";
  liveAudioEnabled: boolean;
}

export const defaultSettings: Settings = {
  sampleRate: 48000,
  bitDepth: 24,
  defaultLoopType: "forward",
  autoLoop: true,
  snapToZero: true,
  crossfadeMs: 5,
  hapticsEnabled: true,
  reduceMotion: false,
  previewVolume: 0.85,
  fileNaming: "manual",
  filenameTemplate: "{name}_{date}",
  dawPreset: "generic",
  normalizeOnExport: true,
  snapWindowMs: 10,
  snapMode: "zeroSlope",
  liveAudioEnabled: true,
};

interface AppState {
  mode: Mode;
  tab: ToolTab;
  sound: Sound;
  history: Sound[];
  historyIndex: number;
  packDraft: { name: string; soundIds: string[] };
  settings: Settings;
  infiniteFolderName: string | null;
  isPlaying: boolean;
  view: { zoom: number; offset: number };
  onboarded: boolean;

  setMode: (m: Mode) => void;
  setTab: (t: ToolTab) => void;
  updateParams: (patch: Partial<SoundParams>) => void;
  updateFx: <K extends keyof FxParams>(key: K, patch: Partial<FxParams[K]>) => void;
  setLoop: (start: number, end: number, type?: LoopType) => void;
  setLoopType: (t: LoopType) => void;
  setBuffer: (buf: AudioBuffer | undefined, opts?: { name?: string; importedFile?: string }) => void;
  setName: (n: string) => void;
  newSound: (parent?: Sound) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setIsPlaying: (b: boolean) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setInfiniteFolderName: (n: string | null) => void;
  setView: (patch: Partial<{ zoom: number; offset: number }>) => void;
  nudgeLoop: (edge: "start" | "end", samples: number) => void;
  setOnboarded: (b: boolean) => void;
}

const seed = (): Sound => ({
  id: crypto.randomUUID(),
  name: "Untitled",
  params: { ...defaultParams },
  fx: structuredClone(defaultFx),
  loopType: "forward",
  loopStart: 0,
  loopEnd: 0,
  createdAt: Date.now(),
});

const SETTINGS_KEY = "infinite-sound-settings";
function loadSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}
function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

export const useApp = create<AppState>((set, get) => ({
  mode: "create",
  tab: "shape",
  sound: seed(),
  history: [],
  historyIndex: -1,
  packDraft: { name: "My Pack", soundIds: [] },
  settings: loadSettings(),
  infiniteFolderName: null,
  isPlaying: false,
  view: { zoom: 1, offset: 0 },
  onboarded: typeof window !== "undefined" && !!localStorage.getItem("infinite-sound-onboarded"),

  setMode: (m) => set({ mode: m }),
  setTab: (t) => set({ tab: t }),

  updateParams: (patch) => set((s) => ({ sound: { ...s.sound, params: { ...s.sound.params, ...patch } } })),
  updateFx: (key, patch) => set((s) => ({
    sound: { ...s.sound, fx: { ...s.sound.fx, [key]: { ...s.sound.fx[key], ...patch } } },
  })),
  setLoop: (start, end, type) => set((s) => ({
    sound: { ...s.sound, loopStart: start, loopEnd: end, loopType: type ?? s.sound.loopType },
  })),
  setLoopType: (t) => set((s) => ({ sound: { ...s.sound, loopType: t } })),
  setBuffer: (buf, opts) => set((s) => ({
    sound: {
      ...s.sound,
      buffer: buf,
      loopStart: 0,
      loopEnd: buf?.length ?? 0,
      name: opts?.name ?? s.sound.name,
      importedFile: opts?.importedFile,
      params: { ...s.sound.params, duration: buf ? buf.duration : s.sound.params.duration },
    },
  })),
  setName: (n) => set((s) => ({ sound: { ...s.sound, name: n } })),

  newSound: (parent) => set(() => {
    const ns = seed();
    if (parent) ns.parentId = parent.id;
    return { sound: ns };
  }),

  pushHistory: () => set((s) => {
    const trimmed = s.history.slice(0, s.historyIndex + 1);
    const snapshot: Sound = { ...s.sound, buffer: undefined };
    const next = [...trimmed, snapshot].slice(-30);
    return { history: next, historyIndex: next.length - 1 };
  }),
  undo: () => set((s) => {
    if (s.historyIndex <= 0) return s;
    const idx = s.historyIndex - 1;
    return { historyIndex: idx, sound: { ...s.history[idx], buffer: s.sound.buffer } };
  }),
  redo: () => set((s) => {
    if (s.historyIndex >= s.history.length - 1) return s;
    const idx = s.historyIndex + 1;
    return { historyIndex: idx, sound: { ...s.history[idx], buffer: s.sound.buffer } };
  }),

  setIsPlaying: (b) => set({ isPlaying: b }),
  setSettings: (patch) => set((s) => {
    const next = { ...s.settings, ...patch };
    saveSettings(next);
    return { settings: next };
  }),
  setInfiniteFolderName: (n) => set({ infiniteFolderName: n }),
  setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
  nudgeLoop: (edge, samples) => set((s) => {
    const total = s.sound.buffer?.length ?? Math.floor(s.sound.params.duration * 48000);
    if (edge === "start") {
      const v = Math.max(0, Math.min(s.sound.loopEnd - 64, s.sound.loopStart + samples));
      return { sound: { ...s.sound, loopStart: v } };
    }
    const v = Math.max(s.sound.loopStart + 64, Math.min(total, s.sound.loopEnd + samples));
    return { sound: { ...s.sound, loopEnd: v } };
  }),
  setOnboarded: (b) => {
    try { if (b) localStorage.setItem("infinite-sound-onboarded", "1"); else localStorage.removeItem("infinite-sound-onboarded"); } catch {}
    set({ onboarded: b });
  },
}));

export function haptic(intensity: "light" | "medium" | "heavy" = "light") {
  const enabled = useApp.getState().settings.hapticsEnabled;
  if (!enabled || typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(intensity === "light" ? 8 : intensity === "medium" ? 16 : 28);
}

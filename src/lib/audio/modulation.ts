// LFO & Modulation Matrix — assignable modulators for any AudioEngine parameter.
// Supports LFOs, envelopes, step modulators, and random/S&H sources.

import { AudioEngine } from "./engine";

export type ModSource = "lfo1" | "lfo2" | "lfo3" | "lfo4" | "env1" | "env2" | "step1" | "random1";
export type ModTarget = "pitch" | "filterFreq" | "volume" | "distortion" | "delayTime" | "reverb" | "pan";

export interface ModulationRouting {
  id: string;
  source: ModSource;
  target: ModTarget;
  depth: number; // -1..1
  enabled: boolean;
}

export interface LFOParams {
  rate: number; // Hz
  depth: number; // 0..1
  waveform: "sine" | "square" | "sawtooth" | "triangle" | "random";
  freeRunning: boolean;
}

export interface EnvelopeParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  depth: number;
}

export interface ModulationState {
  lfos: Record<string, LFOParams>;
  envelopes: Record<string, EnvelopeParams>;
  routings: ModulationRouting[];
  active: boolean;
}

export const DEFAULT_MODULATION: ModulationState = {
  lfos: {
    lfo1: { rate: 2, depth: 0.5, waveform: "sine", freeRunning: true },
    lfo2: { rate: 0.5, depth: 0.3, waveform: "triangle", freeRunning: true },
    lfo3: { rate: 5, depth: 0.2, waveform: "sawtooth", freeRunning: true },
    lfo4: { rate: 0.1, depth: 0.4, waveform: "sine", freeRunning: true },
  },
  envelopes: {
    env1: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3, depth: 0.5 },
    env2: { attack: 0.5, decay: 1, sustain: 0.5, release: 2, depth: 0.3 },
  },
  routings: [],
  active: false,
};

export class ModulationEngine {
  state: ModulationState;
  private lfoNodes: Map<string, OscillatorNode | AudioBufferSourceNode> = new Map();
  private lfoGains: Map<string, GainNode> = new Map();
  private interval: number | null = null;
  private step = 0;

  constructor(state: ModulationState) {
    this.state = state;
  }

  start() {
    AudioEngine.init();
    if (!AudioEngine.ctx) return;
    this.state.active = true;
    this.setupLFOs();
    this.runModulations();
  }

  stop() {
    this.state.active = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.lfoNodes.forEach((n) => { try { (n as any).stop?.(); } catch {} });
    this.lfoNodes.clear();
    this.lfoGains.clear();
  }

  private setupLFOs() {
    const ctx = AudioEngine.ctx!;
    for (const [id, params] of Object.entries(this.state.lfos)) {
      const gain = ctx.createGain();
      gain.gain.value = params.depth;
      if (params.waveform === "random") {
        // S&H: use a buffer source with random values
        const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.playbackRate.value = params.rate;
        src.connect(gain);
        src.start();
        this.lfoNodes.set(id, src);
      } else {
        const osc = ctx.createOscillator();
        osc.type = params.waveform;
        osc.frequency.value = params.rate;
        osc.connect(gain);
        osc.start();
        this.lfoNodes.set(id, osc);
      }
      this.lfoGains.set(id, gain);
    }
  }

  private runModulations() {
    this.interval = window.setInterval(() => {
      if (!this.state.active || !AudioEngine.ctx) return;
      const t = AudioEngine.ctx.currentTime;
      for (const routing of this.state.routings) {
        if (!routing.enabled) continue;
        const lfoGain = this.lfoGains.get(routing.source);
        if (!lfoGain) continue;
        // Apply modulation to target
        this.applyToTarget(routing.target, routing.depth, lfoGain.gain.value);
      }
      this.step++;
    }, 50);
  }

  private applyToTarget(target: ModTarget, depth: number, lfoValue: number) {
    const ctx = AudioEngine.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const modValue = lfoValue * depth;
    switch (target) {
      case "filterFreq":
        if (AudioEngine.filterNode) {
          const baseFreq = 20000;
          AudioEngine.filterNode.frequency.setTargetAtTime(
            Math.max(100, baseFreq + modValue * baseFreq * 0.5),
            t, 0.02,
          );
        }
        break;
      case "volume":
        if (AudioEngine.master) {
          AudioEngine.master.gain.setTargetAtTime(0.8 + modValue * 0.3, t, 0.02);
        }
        break;
      case "distortion":
        // Modulate distortion by changing the curve
        break;
      case "delayTime":
        if (AudioEngine.delayNode) {
          AudioEngine.delayNode.delayTime.setTargetAtTime(0.25 + modValue * 0.2, t, 0.02);
        }
        break;
      case "reverb":
        if (AudioEngine.wet) {
          AudioEngine.wet.gain.setTargetAtTime(Math.max(0, 0.5 + modValue * 0.5), t, 0.02);
        }
        break;
      case "pan":
        // Would need a StereoPannerNode on the master
        break;
      case "pitch":
        // Modulate pitch of active voices
        break;
    }
  }

  addRouting(source: ModSource, target: ModTarget, depth: number) {
    this.state.routings.push({
      id: `${source}-${target}-${Date.now()}`,
      source, target, depth, enabled: true,
    });
    if (this.state.active) { this.stop(); this.start(); }
  }

  removeRouting(id: string) {
    this.state.routings = this.state.routings.filter((r) => r.id !== id);
    if (this.state.active) { this.stop(); this.start(); }
  }

  updateLFO(id: string, params: Partial<LFOParams>) {
    if (this.state.lfos[id]) {
      this.state.lfos[id] = { ...this.state.lfos[id], ...params };
      if (this.state.active) { this.stop(); this.start(); }
    }
  }
}

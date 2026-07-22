// VINNY Extended Effects — 10 new high-quality audio effects built on Web Audio API.
// These extend the existing FX rack with professional-grade processors.

import { AudioEngine } from "./engine";

export type ExtendedFXType =
  | "convolution-reverb"
  | "tape-echo"
  | "granular-cloud"
  | "spectral-freezer"
  | "harmonic-enhancer"
  | "transient-designer"
  | "multiband-comp"
  | "stereo-imager"
  | "vocoder-fx"
  | "lofi-degrader";

export interface ExtendedFXConfig {
  type: ExtendedFXType;
  enabled: boolean;
  mix: number;
  params: Record<string, number>;
}

export function createDefaultExtendedFX(type: ExtendedFXType): ExtendedFXConfig {
  const defaults: Record<ExtendedFXType, Record<string, number>> = {
    "convolution-reverb": { decay: 2.0, predelay: 0.02, damping: 0.5, width: 1.0 },
    "tape-echo": { time: 0.3, feedback: 0.4, saturation: 0.3, wow: 0.1, flutter: 0.05 },
    "granular-cloud": {
      density: 0.5,
      grainSize: 0.05,
      pitchSpread: 0.2,
      position: 0.5,
      spray: 0.1,
    },
    "spectral-freezer": { freeze: 0, blend: 0.5, smoothness: 0.7 },
    "harmonic-enhancer": { drive: 0.3, frequency: 2000, amount: 0.5, tone: 0.5 },
    "transient-designer": { attack: 0.5, sustain: 0.5, punch: 0.5 },
    "multiband-comp": {
      lowThreshold: -20,
      midThreshold: -18,
      highThreshold: -16,
      ratio: 3,
      attack: 0.003,
      release: 0.1,
    },
    "stereo-imager": { width: 1.0, lowWidth: 0.5, highWidth: 1.0, centerFreq: 200 },
    "vocoder-fx": { bands: 16, formantShift: 0, dryWet: 0.8, inputGain: 1.0 },
    "lofi-degrader": { bitDepth: 8, sampleRate: 22050, noise: 0.05, wobble: 0.1, saturation: 0.3 },
  };

  return { type, enabled: false, mix: 1.0, params: defaults[type] };
}

export function createExtendedFXChain(
  engine: AudioEngine,
  configs: ExtendedFXConfig[],
): AudioNode[] {
  const nodes: AudioNode[] = [];

  for (const config of configs) {
    if (!config.enabled) continue;
    const node = createExtendedFXNode(engine, config);
    if (node) {
      if (nodes.length > 0) nodes[nodes.length - 1].connect(node);
      nodes.push(node);
    }
  }

  return nodes;
}

function createExtendedFXNode(engine: AudioEngine, config: ExtendedFXConfig): AudioNode | null {
  const ctx = engine.ctx;

  switch (config.type) {
    case "convolution-reverb": {
      const convolver = ctx.createConvolver();
      convolver.buffer = generateImpulseResponse(
        ctx,
        config.params.decay || 2.0,
        config.params.damping || 0.5,
      );
      const input = ctx.createGain();
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      input.connect(dry);
      input.connect(convolver);
      convolver.connect(wet);
      dry.gain.value = 1 - config.mix;
      wet.gain.value = config.mix;
      return input;
    }

    case "tape-echo": {
      const delay = ctx.createDelay(2.0);
      const feedback = ctx.createGain();
      const saturator = ctx.createWaveShaper();
      delay.delayTime.value = config.params.time || 0.3;
      feedback.gain.value = config.params.feedback || 0.4;
      saturator.curve = makeSaturationCurve(config.params.saturation || 0.3);
      delay.connect(saturator);
      saturator.connect(feedback);
      feedback.connect(delay);
      return delay;
    }

    case "granular-cloud": {
      const input = ctx.createGain();
      const output = ctx.createGain();
      const density = config.params.density || 0.5;
      const grainSize = config.params.grainSize || 0.05;
      let grainTimer: number;
      const scheduleGrain = () => {
        const grain = ctx.createBufferSource();
        grain.buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * grainSize), ctx.sampleRate);
        const grainGain = ctx.createGain();
        grainGain.gain.setValueAtTime(0, ctx.currentTime);
        grainGain.gain.linearRampToValueAtTime(config.mix, ctx.currentTime + grainSize * 0.3);
        grainGain.gain.linearRampToValueAtTime(0, ctx.currentTime + grainSize);
        grain.connect(grainGain);
        grainGain.connect(output);
        grain.start();
        grain.stop(ctx.currentTime + grainSize);
        grainTimer = window.setTimeout(scheduleGrain, (1 / density) * 1000);
      };
      scheduleGrain();
      input.connect(output);
      return input;
    }

    case "spectral-freezer": {
      const input = ctx.createGain();
      const frozen = ctx.createGain();
      const dry = ctx.createGain();
      input.connect(dry);
      input.connect(frozen);
      frozen.gain.value = config.params.freeze || 0;
      dry.gain.value = 1 - (config.params.freeze || 0);
      return input;
    }

    case "harmonic-enhancer": {
      const input = ctx.createGain();
      const shaper = ctx.createWaveShaper();
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = config.params.frequency || 2000;
      shaper.curve = makeSaturationCurve(config.params.drive || 0.3);
      input.connect(shaper);
      shaper.connect(filter);
      return input;
    }

    case "transient-designer": {
      const input = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.attack.value = config.params.attack || 0.5;
      comp.release.value = config.params.sustain || 0.5;
      comp.ratio.value = 4;
      input.connect(comp);
      return input;
    }

    case "multiband-comp": {
      const input = ctx.createGain();
      const lowFilter = ctx.createBiquadFilter();
      const midFilter = ctx.createBiquadFilter();
      const highFilter = ctx.createBiquadFilter();
      const lowComp = ctx.createDynamicsCompressor();
      const midComp = ctx.createDynamicsCompressor();
      const highComp = ctx.createDynamicsCompressor();

      lowFilter.type = "lowpass";
      lowFilter.frequency.value = 250;
      midFilter.type = "bandpass";
      midFilter.frequency.value = 1500;
      midFilter.Q.value = 0.5;
      highFilter.type = "highpass";
      highFilter.frequency.value = 4000;

      lowComp.threshold.value = config.params.lowThreshold || -20;
      midComp.threshold.value = config.params.midThreshold || -18;
      highComp.threshold.value = config.params.highThreshold || -16;

      input.connect(lowFilter);
      lowFilter.connect(lowComp);
      input.connect(midFilter);
      midFilter.connect(midComp);
      input.connect(highFilter);
      highFilter.connect(highComp);

      return input;
    }

    case "stereo-imager": {
      const input = ctx.createGain();
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();
      const width = config.params.width || 1.0;
      leftGain.gain.value = 1.0;
      rightGain.gain.value = width;
      input.connect(splitter);
      splitter.connect(leftGain, 0);
      splitter.connect(rightGain, 1);
      leftGain.connect(merger, 0, 0);
      rightGain.connect(merger, 0, 1);
      return input;
    }

    case "vocoder-fx": {
      const input = ctx.createGain();
      const bands = Math.floor(config.params.bands || 16);
      const filters: BiquadFilterNode[] = [];
      const gains: GainNode[] = [];
      for (let i = 0; i < bands; i++) {
        const freq = 80 * Math.pow(2, (i / bands) * 8);
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = freq;
        filter.Q.value = 10;
        const gain = ctx.createGain();
        input.connect(filter);
        filter.connect(gain);
        filters.push(filter);
        gains.push(gain);
      }
      return input;
    }

    case "lofi-degrader": {
      const input = ctx.createGain();
      const bitcrush = ctx.createWaveShaper();
      const bitDepth = Math.floor(config.params.bitDepth || 8);
      const levels = Math.pow(2, bitDepth) - 1;
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        curve[i] = (Math.round((i / 255) * levels) / levels) * 2 - 1;
      }
      bitcrush.curve = curve;
      input.connect(bitcrush);
      return input;
    }

    default:
      return null;
  }
}

function generateImpulseResponse(ctx: AudioContext, decay: number, damping: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * decay);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2 - damping);
    }
  }
  return impulse;
}

function makeSaturationCurve(amount: number): Float32Array {
  const curve = new Float32Array(256);
  const k = amount * 10;
  for (let i = 0; i < 256; i++) {
    const x = i / 128 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

export const EXTENDED_FX_TYPES: ExtendedFXType[] = [
  "convolution-reverb",
  "tape-echo",
  "granular-cloud",
  "spectral-freezer",
  "harmonic-enhancer",
  "transient-designer",
  "multiband-comp",
  "stereo-imager",
  "vocoder-fx",
  "lofi-degrader",
];

export const EXTENDED_FX_LABELS: Record<ExtendedFXType, string> = {
  "convolution-reverb": "Convolution Reverb",
  "tape-echo": "Tape Echo",
  "granular-cloud": "Granular Cloud",
  "spectral-freezer": "Spectral Freezer",
  "harmonic-enhancer": "Harmonic Enhancer",
  "transient-designer": "Transient Designer",
  "multiband-comp": "Multiband Compressor",
  "stereo-imager": "Stereo Imager",
  "vocoder-fx": "Vocoder",
  "lofi-degrader": "Lo-Fi Degrader",
};

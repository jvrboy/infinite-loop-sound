import type { Gesture } from "./gestures";
import type { SoundParams } from "@/audio/synth";

// Map a gesture to SoundParams patch.
export function applyGesture(g: Gesture, w: number, h: number): Partial<SoundParams> {
  switch (g.type) {
    case "circle": {
      // Bigger circle = lower fundamental
      const norm = 1 - (g.size / Math.max(w, h));
      const freq = 55 + norm * 600;
      return { fundamental: freq, harmonics: 0.3, waveshape: 0, noiseMix: 0, chord: [0] };
    }
    case "spiral":
      return { flowShape: "rise", flowRate: 0.5, flowDepth: 0.6, flowTarget: "pitch" };
    case "line-h":
      return { noiseMix: Math.min(1, 0.4 + g.length / w), harmonics: 0.1 };
    case "line-v":
      return { harmonics: Math.min(1, g.height / h), waveshape: 0.5 };
    case "zigzag":
      return { flowShape: "oscillate", flowRate: g.peaks * 0.5, flowDepth: 0.5, flowTarget: "pitch" };
    case "star": {
      const intervals = [0, 4, 7, 11, 14, 16].slice(0, Math.min(6, g.points));
      return { chord: intervals, harmonics: 0.5 };
    }
    case "smudge":
      return { noiseMix: 0.6, harmonics: 0.7, flowShape: "random", flowRate: 4, flowDepth: 0.4, flowTarget: "cutoff" };
  }
}

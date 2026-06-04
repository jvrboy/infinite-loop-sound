import { useEffect, useRef, useState } from "react";
import { useApp } from "@/state/store";
import { getContext, playNote, setNoteFx, type NoteHandle } from "@/audio/engine";
import { cn } from "@/lib/utils";
import { Music2 } from "lucide-react";

/** On-screen + Web MIDI polyphonic keyboard. */
const KEYS = [
  { n: "C3", midi: 48, black: false },
  { n: "C#3", midi: 49, black: true },
  { n: "D3", midi: 50, black: false },
  { n: "D#3", midi: 51, black: true },
  { n: "E3", midi: 52, black: false },
  { n: "F3", midi: 53, black: false },
  { n: "F#3", midi: 54, black: true },
  { n: "G3", midi: 55, black: false },
  { n: "G#3", midi: 56, black: true },
  { n: "A3", midi: 57, black: false },
  { n: "A#3", midi: 58, black: true },
  { n: "B3", midi: 59, black: false },
  { n: "C4", midi: 60, black: false },
  { n: "C#4", midi: 61, black: true },
  { n: "D4", midi: 62, black: false },
  { n: "D#4", midi: 63, black: true },
  { n: "E4", midi: 64, black: false },
  { n: "F4", midi: 65, black: false },
  { n: "F#4", midi: 66, black: true },
  { n: "G4", midi: 67, black: false },
  { n: "G#4", midi: 68, black: true },
  { n: "A4", midi: 69, black: false },
  { n: "A#4", midi: 70, black: true },
  { n: "B4", midi: 71, black: false },
  { n: "C5", midi: 72, black: false },
];

function midiToFreq(midi: number) { return 440 * Math.pow(2, (midi - 69) / 12); }

export function KeyboardTool() {
  const sound = useApp((s) => s.sound);
  const fxRef = useRef(sound.fx);
  const paramsRef = useRef(sound.params);
  const [active, setActive] = useState<Set<number>>(new Set());
  const heldRef = useRef<Map<number, NoteHandle>>(new Map());
  const [midiStatus, setMidiStatus] = useState<"none" | "connecting" | "ready" | "err">("none");

  useEffect(() => { fxRef.current = sound.fx; setNoteFx(sound.fx); }, [sound.fx]);
  useEffect(() => { paramsRef.current = sound.params; }, [sound.params]);

  function noteOn(midi: number, vel = 0.85) {
    if (heldRef.current.has(midi)) return;
    getContext();
    setNoteFx(fxRef.current);
    const h = playNote(midiToFreq(midi), paramsRef.current, undefined, vel);
    heldRef.current.set(midi, h);
    setActive((s) => new Set(s).add(midi));
  }
  function noteOff(midi: number) {
    const h = heldRef.current.get(midi);
    if (h) { h.stop(); heldRef.current.delete(midi); }
    setActive((s) => { const n = new Set(s); n.delete(midi); return n; });
  }

  // Web MIDI
  async function connectMidi() {
    if (!(navigator as any).requestMIDIAccess) { setMidiStatus("err"); return; }
    setMidiStatus("connecting");
    try {
      const access: MIDIAccess = await (navigator as any).requestMIDIAccess();
      const wire = (inp: MIDIInput) => {
        inp.onmidimessage = (e: MIDIMessageEvent) => {
          const [status, d1, d2] = e.data;
          const cmd = status & 0xf0;
          if (cmd === 0x90 && d2 > 0) noteOn(d1, d2 / 127);
          else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) noteOff(d1);
        };
      };
      access.inputs.forEach(wire);
      access.onstatechange = (e: any) => { if (e.port.type === "input" && e.port.state === "connected") wire(e.port); };
      setMidiStatus("ready");
    } catch { setMidiStatus("err"); }
  }

  // QWERTY mapping
  useEffect(() => {
    const map: Record<string, number> = {
      a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72,
    };
    const down = (e: KeyboardEvent) => { if (e.repeat) return; const m = map[e.key.toLowerCase()]; if (m) noteOn(m); };
    const up = (e: KeyboardEvent) => { const m = map[e.key.toLowerCase()]; if (m) noteOff(m); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => () => { heldRef.current.forEach((h) => h.stop()); heldRef.current.clear(); }, []);

  const whites = KEYS.filter((k) => !k.black);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Keyboard · QWERTY a..k</div>
        <button onClick={connectMidi} className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest",
          midiStatus === "ready" ? "bg-[color:var(--cyan)]/15 text-[color:var(--cyan)]" :
          midiStatus === "err" ? "bg-[color:var(--magenta)]/15 text-[color:var(--magenta)]" : "glass",
        )}>
          <Music2 className="h-3 w-3" />
          {midiStatus === "ready" ? "MIDI live" : midiStatus === "connecting" ? "…" : midiStatus === "err" ? "no MIDI" : "Connect MIDI"}
        </button>
      </div>
      <div className="relative h-32 select-none overflow-hidden rounded-xl bg-white/[0.03]">
        <div className="flex h-full">
          {whites.map((k) => (
            <button
              key={k.midi}
              onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); noteOn(k.midi); }}
              onPointerUp={() => noteOff(k.midi)}
              onPointerLeave={(e) => { if ((e.buttons & 1) === 0) return; noteOff(k.midi); }}
              className={cn(
                "flex-1 border-r border-black/40 transition-colors",
                active.has(k.midi) ? "bg-gradient-cyan" : "bg-white/85 hover:bg-white",
              )}
              style={{ color: "#000" }}
            >
              <div className="mt-auto pb-1 text-center font-mono text-[9px] opacity-60">{k.n}</div>
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 flex">
          {whites.map((wk, i) => {
            const black = KEYS.find((k) => k.black && k.midi === wk.midi + 1);
            return (
              <div key={wk.midi} className="relative flex-1">
                {black && i < whites.length - 1 && (
                  <button
                    onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); noteOn(black.midi); }}
                    onPointerUp={() => noteOff(black.midi)}
                    onPointerLeave={(e) => { if ((e.buttons & 1) === 0) return; noteOff(black.midi); }}
                    className={cn(
                      "pointer-events-auto absolute right-[-30%] top-0 z-10 h-3/5 w-[60%] rounded-b-md",
                      active.has(black.midi) ? "bg-gradient-cyan" : "bg-black hover:bg-zinc-800",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
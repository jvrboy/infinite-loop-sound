import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  AudioEngine,
  DEFAULT_SYNTH,
  DEFAULT_GRANULAR,
  DEFAULT_EFFECTS,
  NOTE_NAMES,
  SCALES,
  noteToFreq,
  type SynthVoiceParams,
  type GranularParams,
  type EffectParams,
  type Waveform,
} from "@/lib/audio/engine";
import {
  Music,
  Piano,
  Waves,
  Sparkles,
  Sliders,
  Volume2,
  Play,
  Square,
  Upload,
  Mic,
  Radio,
  Disc3,
  AudioWaveform as WaveIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "Music Studio — Infinite Loop Sound" },
      {
        name: "description",
        content:
          "Complete music synthesis studio: synthesizer, sampler, granular engine, sound design tools, and effects rack.",
      },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  const [activeTab, setActiveTab] = useState("synth");
  const [unlocked, setUnlocked] = useState(false);

  const unlock = useCallback(() => {
    AudioEngine.unlock();
    setUnlocked(true);
  }, []);

  useEffect(() => {
    const handler = () => { if (!unlocked) unlock(); };
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [unlocked, unlock]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Music className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Music Studio</h1>
          {!unlocked && (
            <Button size="sm" onClick={unlock}>
              <Volume2 className="w-4 h-4 mr-1" /> Enable Audio
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="synth" className="text-xs">
              <Piano className="w-3.5 h-3.5 mr-1" /> Synthesizer
            </TabsTrigger>
            <TabsTrigger value="sampler" className="text-xs">
              <Disc3 className="w-3.5 h-3.5 mr-1" /> Sampler
            </TabsTrigger>
            <TabsTrigger value="granular" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Granular
            </TabsTrigger>
            <TabsTrigger value="sounddesign" className="text-xs">
              <WaveIcon className="w-3.5 h-3.5 mr-1" /> Sound Design
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs">
              <Sliders className="w-3.5 h-3.5 mr-1" /> Effects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="synth">
            <SynthesizerTab />
          </TabsContent>
          <TabsContent value="sampler">
            <SamplerTab />
          </TabsContent>
          <TabsContent value="granular">
            <GranularTab />
          </TabsContent>
          <TabsContent value="sounddesign">
            <SoundDesignTab />
          </TabsContent>
          <TabsContent value="effects">
            <EffectsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

// ---------- Synthesizer Tab ----------
function SynthesizerTab() {
  const [params, setParams] = useState<SynthVoiceParams>(DEFAULT_SYNTH);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [scale, setScale] = useState("major");
  const [baseOctave, setBaseOctave] = useState(4);

  const handleNoteOn = (note: string) => {
    AudioEngine.unlock();
    const freq = noteToFreq(note);
    AudioEngine.noteOn(note, freq, params);
    setActiveNotes((s) => new Set(s).add(note));
  };
  const handleNoteOff = (note: string) => {
    AudioEngine.noteOff(note);
    setActiveNotes((s) => {
      const n = new Set(s);
      n.delete(note);
      return n;
    });
  };

  // Keyboard input
  useEffect(() => {
    const keyMap: Record<string, string> = {
      a: "C4", w: "C#4", s: "D4", e: "D#4", d: "E4", f: "F4",
      t: "F#4", g: "G4", y: "G#4", h: "A4", u: "A#4", j: "B4",
      k: "C5", o: "C#5", l: "D5",
    };
    const down = (e: KeyboardEvent) => {
      const note = keyMap[e.key.toLowerCase()];
      if (note && !e.repeat) { e.preventDefault(); handleNoteOn(note); }
    };
    const up = (e: KeyboardEvent) => {
      const note = keyMap[e.key.toLowerCase()];
      if (note) handleNoteOff(note);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [params]);

  const whiteKeys = NOTE_NAMES.filter((n) => !n.includes("#"));
  const blackKeys = NOTE_NAMES.filter((n) => n.includes("#"));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Piano className="w-4 h-4 text-primary" /> Synthesizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <ParamControl label="Waveform">
              <select
                value={params.waveform}
                onChange={(e) => setParams({ ...params, waveform: e.target.value as Waveform })}
                className="bg-card border border-border rounded px-2 py-1 text-sm w-full"
              >
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
              </select>
            </ParamControl>
            <ParamControl label={`Attack (${params.attack.toFixed(3)}s)`}>
              <Slider value={params.attack} min={0} max={2} step={0.01} onChange={(v) => setParams({ ...params, attack: v })} />
            </ParamControl>
            <ParamControl label={`Decay (${params.decay.toFixed(3)}s)`}>
              <Slider value={params.decay} min={0} max={2} step={0.01} onChange={(v) => setParams({ ...params, decay: v })} />
            </ParamControl>
            <ParamControl label={`Sustain (${params.sustain.toFixed(2)})`}>
              <Slider value={params.sustain} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, sustain: v })} />
            </ParamControl>
            <ParamControl label={`Release (${params.release.toFixed(3)}s)`}>
              <Slider value={params.release} min={0} max={3} step={0.01} onChange={(v) => setParams({ ...params, release: v })} />
            </ParamControl>
            <ParamControl label={`Detune (${params.detune} cents)`}>
              <Slider value={params.detune} min={-50} max={50} step={1} onChange={(v) => setParams({ ...params, detune: v })} />
            </ParamControl>
            <ParamControl label={`Gain (${params.gain.toFixed(2)})`}>
              <Slider value={params.gain} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, gain: v })} />
            </ParamControl>
            <ParamControl label="Scale">
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                className="bg-card border border-border rounded px-2 py-1 text-sm w-full"
              >
                {Object.keys(SCALES).map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </ParamControl>
            <ParamControl label={`Base Octave (${baseOctave})`}>
              <Slider value={baseOctave} min={2} max={6} step={1} onChange={(v) => setBaseOctave(v)} />
            </ParamControl>
          </div>

          {/* Keyboard */}
          <div className="relative h-32 select-none">
            <div className="flex h-full">
              {whiteKeys.map((note, i) => {
                const fullNote = `${note}${baseOctave + Math.floor(i / 7)}`;
                const isActive = activeNotes.has(fullNote);
                return (
                  <button
                    key={fullNote}
                    onMouseDown={() => handleNoteOn(fullNote)}
                    onMouseUp={() => handleNoteOff(fullNote)}
                    onMouseLeave={() => activeNotes.has(fullNote) && handleNoteOff(fullNote)}
                    onTouchStart={(e) => { e.preventDefault(); handleNoteOn(fullNote); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleNoteOff(fullNote); }}
                    className={`flex-1 border border-border rounded-b flex items-end justify-center pb-2 text-xs transition-colors ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-white/90 text-black hover:bg-white"
                    }`}
                  >
                    {note}
                  </button>
                );
              })}
            </div>
            {/* Black keys overlay */}
            <div className="absolute inset-0 flex pointer-events-none">
              {whiteKeys.map((_, i) => {
                const noteName = blackKeys[i % 7];
                if (!noteName) return <div key={i} className="flex-1" />;
                const fullNote = `${noteName}${baseOctave + Math.floor(i / 7)}`;
                const isActive = activeNotes.has(fullNote);
                return (
                  <div key={i} className="flex-1 relative">
                    <button
                      onMouseDown={() => handleNoteOn(fullNote)}
                      onMouseUp={() => handleNoteOff(fullNote)}
                      onTouchStart={(e) => { e.preventDefault(); handleNoteOn(fullNote); }}
                      onTouchEnd={(e) => { e.preventDefault(); handleNoteOff(fullNote); }}
                      className={`absolute right-0 top-0 w-[60%] h-[60%] -mr-[30%] rounded-b z-10 pointer-events-auto text-[10px] flex items-end justify-center pb-1 transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-black/90 text-white/60 hover:bg-black"
                      }`}
                    >
                      {noteName}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Play with keyboard: A-K for white keys, W/E/T/Y/U/O for black keys
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Sampler Tab ----------
function SamplerTab() {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [activeChops, setActiveChops] = useState<Set<number>>(new Set());
  const [numChops, setNumChops] = useState(8);
  const [lenPct, setLenPct] = useState(100);
  const [rate, setRate] = useState(1);
  const [latch, setLatch] = useState(false);
  const [fileName, setFileName] = useState("No sample loaded");
  const voicesRef = useRef<Map<number, { src: AudioBufferSourceNode; g: GainNode }>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadFile = useCallback(async (file: File) => {
    AudioEngine.unlock();
    try {
      const ab = await file.arrayBuffer();
      const buf = await AudioEngine.decodeAudio(ab);
      setBuffer(buf);
      setFileName(file.name);
      toast.success("Sample loaded");
    } catch (e: any) {
      toast.error("Failed to decode audio: " + (e?.message ?? "unknown"));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, [loadFile]);

  const startChop = (i: number) => {
    if (!buffer) return;
    AudioEngine.unlock();
    if (voicesRef.current.has(i)) stopChop(i);
    const full = buffer.duration / numChops;
    const start = i * full;
    const voice = AudioEngine.playSample(buffer, start, Math.max(full * (lenPct / 100), 0.001), rate, true);
    if (voice) voicesRef.current.set(i, voice);
    setActiveChops((s) => new Set(s).add(i));
  };
  const stopChop = (i: number) => {
    const v = voicesRef.current.get(i);
    if (v) { AudioEngine.stopSample(v); voicesRef.current.delete(i); }
    setActiveChops((s) => { const n = new Set(s); n.delete(i); return n; });
  };
  const toggleChop = (i: number) => {
    if (activeChops.has(i)) stopChop(i); else startChop(i);
  };

  // Waveform rendering
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx2d = cv.getContext("2d");
    if (!ctx2d) return;
    let raf = 0;
    const render = () => {
      const W = cv.width;
      const H = cv.height;
      ctx2d.clearRect(0, 0, W, H);
      if (buffer) {
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / W);
        const mid = H / 2;
        ctx2d.strokeStyle = "#6366f1";
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        for (let x = 0; x < W; x++) {
          let peak = 0;
          for (let j = 0; j < step; j++) {
            const v = Math.abs(data[x * step + j] || 0);
            if (v > peak) peak = v;
          }
          ctx2d.moveTo(x, mid - peak * mid * 0.9);
          ctx2d.lineTo(x, mid + peak * mid * 0.9);
        }
        ctx2d.stroke();
        // Chop dividers
        const segW = W / numChops;
        for (let i = 0; i < numChops; i++) {
          if (activeChops.has(i)) {
            ctx2d.fillStyle = "rgba(99,102,241,0.15)";
            ctx2d.fillRect(i * segW, 0, segW, H);
          }
          ctx2d.strokeStyle = "rgba(255,255,255,0.1)";
          ctx2d.beginPath();
          ctx2d.moveTo(i * segW, 0);
          ctx2d.lineTo(i * segW, H);
          ctx2d.stroke();
        }
      } else {
        ctx2d.fillStyle = "#6b7280";
        ctx2d.font = "14px monospace";
        ctx2d.textAlign = "center";
        ctx2d.fillText("Load a sample to begin", W / 2, H / 2);
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [buffer, numChops, activeChops]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-primary" /> Sampler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = "audio/*";
              inp.onchange = () => inp.files?.[0] && loadFile(inp.files[0]);
              inp.click();
            }}
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">{fileName}</div>
            <div className="text-xs text-muted-foreground mt-1">Click or drag audio file here</div>
          </div>

          <canvas ref={canvasRef} width={800} height={200} className="w-full h-48 border border-border rounded bg-black/50" />

          {/* Pads */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {Array.from({ length: numChops }).map((_, i) => (
              <button
                key={i}
                onMouseDown={() => (latch ? toggleChop(i) : startChop(i))}
                onMouseUp={() => !latch && stopChop(i)}
                onMouseLeave={() => !latch && activeChops.has(i) && stopChop(i)}
                onTouchStart={(e) => { e.preventDefault(); latch ? toggleChop(i) : startChop(i); }}
                onTouchEnd={(e) => { e.preventDefault(); if (!latch) stopChop(i); }}
                className={`aspect-square rounded border flex flex-col items-center justify-center text-xs font-bold transition-colors ${
                  activeChops.has(i) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"
                }`}
              >
                <span className="text-lg">{i + 1}</span>
                <span className="text-[10px] opacity-60">chop</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <ParamControl label={`Chops (${numChops})`}>
              <Slider value={numChops} min={2} max={16} step={1} onChange={setNumChops} />
            </ParamControl>
            <ParamControl label={`Length (${lenPct}%)`}>
              <Slider value={lenPct} min={1} max={100} step={1} onChange={setLenPct} />
            </ParamControl>
            <ParamControl label={`Pitch (${rate.toFixed(2)}x)`}>
              <Slider value={rate} min={0.25} max={2} step={0.01} onChange={setRate} />
            </ParamControl>
            <ParamControl label="Latch Mode">
              <button
                onClick={() => setLatch(!latch)}
                className={`px-3 py-1.5 rounded text-sm border w-full ${latch ? "bg-primary text-primary-foreground" : "bg-card border-border"}`}
              >
                {latch ? "ON" : "OFF"}
              </button>
            </ParamControl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Granular Tab ----------
function GranularTab() {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [params, setParams] = useState<GranularParams>(DEFAULT_GRANULAR);
  const [playing, setPlaying] = useState(false);
  const [fileName, setFileName] = useState("No buffer loaded");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadFile = useCallback(async (file: File) => {
    AudioEngine.unlock();
    try {
      const ab = await file.arrayBuffer();
      const buf = await AudioEngine.decodeAudio(ab);
      setBuffer(buf);
      AudioEngine.setGranularBuffer(buf);
      setFileName(file.name);
      toast.success("Granular buffer loaded");
    } catch (e: any) {
      toast.error("Decode failed: " + (e?.message ?? "unknown"));
    }
  }, []);

  const togglePlay = () => {
    AudioEngine.unlock();
    if (playing) {
      AudioEngine.stopGranular();
      setPlaying(false);
    } else {
      if (!buffer) { toast.error("Load an audio file first"); return; }
      AudioEngine.startGranular(params);
      setPlaying(true);
    }
  };

  useEffect(() => {
    if (playing) {
      AudioEngine.stopGranular();
      AudioEngine.startGranular(params);
    }
  }, [params]);

  useEffect(() => {
    return () => { AudioEngine.stopGranular(); };
  }, []);

  // Visualization
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx2d = cv.getContext("2d");
    if (!ctx2d) return;
    let raf = 0;
    const render = () => {
      const W = cv.width;
      const H = cv.height;
      ctx2d.fillStyle = "rgba(5,5,5,0.3)";
      ctx2d.fillRect(0, 0, W, H);
      const fd = AudioEngine.getFrequencyData();
      if (fd.length > 0) {
        const barW = W / fd.length * 4;
        for (let i = 0; i < fd.length; i += 4) {
          const h = (fd[i] / 255) * H;
          const hue = (i / fd.length) * 260;
          ctx2d.fillStyle = `hsl(${hue}, 80%, 50%)`;
          ctx2d.fillRect(i * barW / 4, H - h, barW - 1, h);
        }
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Granular Synthesis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && loadFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = "audio/*";
              inp.onchange = () => inp.files?.[0] && loadFile(inp.files[0]);
              inp.click();
            }}
            className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">{fileName}</div>
          </div>

          <canvas ref={canvasRef} width={800} height={200} className="w-full h-40 border border-border rounded bg-black/50" />

          <Button onClick={togglePlay} disabled={!buffer} className="w-full">
            {playing ? <><Square className="w-4 h-4 mr-1" /> Stop</> : <><Play className="w-4 h-4 mr-1" /> Start Granular</>}
          </Button>

          <div className="grid gap-3 md:grid-cols-3">
            <ParamControl label={`Grain Size (${params.grainSize.toFixed(3)}s)`}>
              <Slider value={params.grainSize} min={0.01} max={0.5} step={0.001} onChange={(v) => setParams({ ...params, grainSize: v })} />
            </ParamControl>
            <ParamControl label={`Density (${params.grainDensity} grains/s)`}>
              <Slider value={params.grainDensity} min={1} max={100} step={1} onChange={(v) => setParams({ ...params, grainDensity: v })} />
            </ParamControl>
            <ParamControl label={`Pitch (${params.pitch.toFixed(2)}x)`}>
              <Slider value={params.pitch} min={0.25} max={4} step={0.01} onChange={(v) => setParams({ ...params, pitch: v })} />
            </ParamControl>
            <ParamControl label={`Position (${(params.position * 100).toFixed(0)}%)`}>
              <Slider value={params.position} min={0} max={1} step={0.001} onChange={(v) => setParams({ ...params, position: v })} />
            </ParamControl>
            <ParamControl label={`Position Jitter (${(params.positionJitter * 100).toFixed(0)}%)`}>
              <Slider value={params.positionJitter} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, positionJitter: v })} />
            </ParamControl>
            <ParamControl label={`Spread (${(params.spread * 100).toFixed(0)}%)`}>
              <Slider value={params.spread} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, spread: v })} />
            </ParamControl>
            <ParamControl label={`Envelope (${(params.envelope * 100).toFixed(0)}%)`}>
              <Slider value={params.envelope} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, envelope: v })} />
            </ParamControl>
            <ParamControl label={`Mix (${(params.mix * 100).toFixed(0)}%)`}>
              <Slider value={params.mix} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, mix: v })} />
            </ParamControl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Sound Design Tab ----------
function SoundDesignTab() {
  const [noiseType, setNoiseType] = useState<"white" | "pink" | "brown">("white");
  const [duration, setDuration] = useState(2);
  const [playing, setPlaying] = useState(false);
  const voiceRef = useRef<{ src: AudioBufferSourceNode; g: GainNode } | null>(null);

  const generateNoise = () => {
    AudioEngine.unlock();
    const buf = AudioEngine.createNoiseBuffer(duration, noiseType);
    AudioEngine.setGranularBuffer(buf);
    const voice = AudioEngine.playSample(buf, 0, buf.duration, 1, true);
    if (voice) {
      if (voiceRef.current) AudioEngine.stopSample(voiceRef.current);
      voiceRef.current = voice;
      setPlaying(true);
    }
  };

  const stop = () => {
    if (voiceRef.current) { AudioEngine.stopSample(voiceRef.current); voiceRef.current = null; }
    setPlaying(false);
  };

  // Drone generator
  const [droneFreq, setDroneFreq] = useState(110);
  const [dronePlaying, setDronePlaying] = useState(false);
  const droneRef = useRef<string | null>(null);

  const startDrone = () => {
    AudioEngine.unlock();
    if (droneRef.current) AudioEngine.noteOff(droneRef.current);
    AudioEngine.noteOn("drone", droneFreq, {
      waveform: "sine",
      attack: 1,
      decay: 0,
      sustain: 1,
      release: 2,
      detune: 0,
      gain: 0.3,
    });
    droneRef.current = "drone";
    setDronePlaying(true);
  };
  const stopDrone = () => {
    AudioEngine.noteOff("drone");
    droneRef.current = null;
    setDronePlaying(false);
  };

  useEffect(() => () => { stop(); stopDrone(); }, []);

  return (
    <div className="space-y-4">
      {/* Noise Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" /> Noise Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <ParamControl label="Noise Type">
              <select
                value={noiseType}
                onChange={(e) => setNoiseType(e.target.value as any)}
                className="bg-card border border-border rounded px-2 py-1 text-sm w-full"
              >
                <option value="white">White</option>
                <option value="pink">Pink</option>
                <option value="brown">Brown</option>
              </select>
            </ParamControl>
            <ParamControl label={`Duration (${duration.toFixed(1)}s)`}>
              <Slider value={duration} min={0.5} max={10} step={0.1} onChange={setDuration} />
            </ParamControl>
            <div className="flex items-end">
              <Button onClick={playing ? stop : generateNoise} className="w-full">
                {playing ? <><Square className="w-4 h-4 mr-1" /> Stop</> : <><Play className="w-4 h-4 mr-1" /> Generate</>}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Generated noise is loaded into the granular buffer — switch to the Granular tab to process it.
          </div>
        </CardContent>
      </Card>

      {/* Drone Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Waves className="w-4 h-4 text-primary" /> Drone Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <ParamControl label={`Frequency (${droneFreq.toFixed(1)} Hz)`}>
              <Slider value={droneFreq} min={20} max={880} step={0.1} onChange={setDroneFreq} />
            </ParamControl>
            <div className="flex items-end">
              <Button onClick={dronePlaying ? stopDrone : startDrone} className="w-full">
                {dronePlaying ? <><Square className="w-4 h-4 mr-1" /> Stop Drone</> : <><Play className="w-4 h-4 mr-1" /> Start Drone</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-bass / Sine sweep */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" /> Sub-Bass Tone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubBassTool />
        </CardContent>
      </Card>
    </div>
  );
}

function SubBassTool() {
  const [freq, setFreq] = useState(55);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<string | null>(null);

  const toggle = () => {
    AudioEngine.unlock();
    if (playing) {
      AudioEngine.noteOff("subbass");
      ref.current = null;
      setPlaying(false);
    } else {
      AudioEngine.noteOn("subbass", freq, {
        waveform: "sine",
        attack: 0.5,
        decay: 0,
        sustain: 1,
        release: 1,
        detune: 0,
        gain: 0.4,
      });
      ref.current = "subbass";
      setPlaying(true);
    }
  };

  useEffect(() => () => { if (ref.current) AudioEngine.noteOff("subbass"); }, []);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ParamControl label={`Frequency (${freq.toFixed(1)} Hz)`}>
        <Slider value={freq} min={20} max={200} step={0.1} onChange={(v) => {
          setFreq(v);
          if (playing) {
            AudioEngine.noteOff("subbass");
            AudioEngine.noteOn("subbass", v, {
              waveform: "sine", attack: 0.5, decay: 0, sustain: 1, release: 1, detune: 0, gain: 0.4,
            });
          }
        }} />
      </ParamControl>
      <div className="flex items-end">
        <Button onClick={toggle} className="w-full">
          {playing ? <><Square className="w-4 h-4 mr-1" /> Stop</> : <><Play className="w-4 h-4 mr-1" /> Play</>}
        </Button>
      </div>
    </div>
  );
}

// ---------- Effects Tab ----------
function EffectsTab() {
  const [params, setParams] = useState<EffectParams>(DEFAULT_EFFECTS);
  const [masterVol, setMasterVol] = useState(0.8);

  useEffect(() => {
    AudioEngine.unlock();
    AudioEngine.setEffects(params);
  }, [params]);

  useEffect(() => {
    AudioEngine.unlock();
    AudioEngine.setMasterVolume(masterVol);
  }, [masterVol]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" /> Effects Rack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <ParamControl label={`Reverb (${(params.reverb * 100).toFixed(0)}%)`}>
              <Slider value={params.reverb} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, reverb: v })} />
            </ParamControl>
            <ParamControl label={`Delay (${(params.delay * 100).toFixed(0)}%)`}>
              <Slider value={params.delay} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, delay: v })} />
            </ParamControl>
            <ParamControl label={`Delay Time (${params.delayTime.toFixed(3)}s)`}>
              <Slider value={params.delayTime} min={0.01} max={1} step={0.001} onChange={(v) => setParams({ ...params, delayTime: v })} />
            </ParamControl>
            <ParamControl label={`Feedback (${(params.delayFeedback * 100).toFixed(0)}%)`}>
              <Slider value={params.delayFeedback} min={0} max={0.9} step={0.01} onChange={(v) => setParams({ ...params, delayFeedback: v })} />
            </ParamControl>
            <ParamControl label={`Filter Freq (${params.filterFreq.toFixed(0)} Hz)`}>
              <Slider value={params.filterFreq} min={100} max={20000} step={10} onChange={(v) => setParams({ ...params, filterFreq: v })} />
            </ParamControl>
            <ParamControl label={`Distortion (${(params.distortion * 100).toFixed(0)}%)`}>
              <Slider value={params.distortion} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, distortion: v })} />
            </ParamControl>
            <ParamControl label={`Compressor (${(params.compressor * 100).toFixed(0)}%)`}>
              <Slider value={params.compressor} min={0} max={1} step={0.01} onChange={(v) => setParams({ ...params, compressor: v })} />
            </ParamControl>
            <ParamControl label={`Master Volume (${(masterVol * 100).toFixed(0)}%)`}>
              <Slider value={masterVol} min={0} max={1} step={0.01} onChange={setMasterVol} />
            </ParamControl>
          </div>
          <div className="text-xs text-muted-foreground">
            Effects apply globally to all audio output — synth, sampler, and granular.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Shared UI ----------
function ParamControl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-primary"
    />
  );
}

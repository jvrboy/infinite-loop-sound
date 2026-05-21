import { useState } from "react";
import { useApp, haptic } from "@/state/store";
import { pickInfiniteFolder, writeWavToFolder, FOLDER_SUPPORTED, downloadBlob } from "@/state/folder";
import { encodeWav } from "@/audio/wav";
import { Infinity as InfIcon, FolderOpen, Check, ChevronRight, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DAW_INSTRUCTIONS: Record<string, { name: string; steps: string[] }> = {
  ableton: {
    name: "Ableton Live",
    steps: [
      "Open Ableton Live.",
      "In the Browser sidebar, right-click 'Places' → 'Add Folder…'.",
      "Select your Infinite Sound folder.",
      "Drag any WAV from there straight into a Simpler / clip slot — loop points are read automatically.",
    ],
  },
  logic: {
    name: "Logic Pro",
    steps: [
      "Open Logic Pro → File → Loop Browser.",
      "Drag your Infinite Sound folder onto the Loop Browser, or use Library → Add Loops.",
      "Loops appear under the folder name in the browser.",
    ],
  },
  fl: {
    name: "FL Studio",
    steps: [
      "Open Browser → Options → File settings.",
      "Add your Infinite Sound folder as an Extra search folder.",
      "Hit Refresh — folder appears in the browser tree.",
    ],
  },
  bitwig: {
    name: "Bitwig Studio",
    steps: [
      "Open Settings → Locations → Add 'My Library' location.",
      "Pick your Infinite Sound folder.",
      "Bitwig will index loop metadata automatically.",
    ],
  },
  cubase: {
    name: "Cubase",
    steps: [
      "Open MediaBay (F5).",
      "Right-click 'Define Locations' → add your Infinite Sound folder.",
      "Scan to index — loop points are honored on import.",
    ],
  },
  generic: {
    name: "Other / Generic",
    steps: [
      "Add your Infinite Sound folder to your DAW's sample browser favourites.",
      "WAVs include embedded smpl + acid chunks so most modern samplers loop correctly.",
    ],
  },
};

export function SetupWizard({ onClose }: { onClose: () => void }) {
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const setFolder = useApp((s) => s.setInfiniteFolderName);
  const folder = useApp((s) => s.infiniteFolderName);
  const setOnboarded = useApp((s) => s.setOnboarded);
  const [step, setStep] = useState(0);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [testMsg, setTestMsg] = useState("");

  function finish() { setOnboarded(true); haptic("medium"); onClose(); }

  async function pick() {
    try {
      const n = await pickInfiniteFolder();
      if (n) { setFolder(n); haptic("medium"); }
    } catch {}
  }

  async function runTest() {
    setTestStatus("idle"); setTestMsg("");
    try {
      // tiny 100ms 440Hz sine
      const sr = 48000, len = Math.floor(sr * 0.1);
      const ch = new Float32Array(len);
      for (let i = 0; i < len; i++) ch[i] = Math.sin(2 * Math.PI * 440 * i / sr) * 0.4 * (1 - i / len);
      const blob = encodeWav({
        channels: [ch], sampleRate: sr, bitDepth: 24,
        loopStart: 0, loopEnd: len, loopType: "forward", name: "infinite-test",
      });
      if (folder) {
        const r = await writeWavToFolder("Temp", "infinite-test.wav", blob);
        if (r.ok) { setTestStatus("ok"); setTestMsg(`Wrote to ${folder}/Temp/infinite-test.wav`); }
        else { setTestStatus("fail"); setTestMsg(r.reason ?? "Write failed"); }
      } else {
        downloadBlob(blob, "infinite-test.wav");
        setTestStatus("ok"); setTestMsg("Downloaded to your Downloads folder");
      }
    } catch (e) {
      setTestStatus("fail"); setTestMsg((e as Error).message);
    }
  }

  const steps = [
    {
      title: "Welcome to Infinite Sound",
      body: (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="text-base text-foreground">
            A touch-first sound design lab. Draw, sculpt, import — every sound becomes a seamless loop in your DAW with one tap.
          </p>
          <ul className="space-y-1.5 font-mono text-[11px] uppercase tracking-wider">
            <li>· DRAW gestures → instant synth voices</li>
            <li>· IMPORT any audio → auto-loop with smpl chunks</li>
            <li>· RESAMPLE → morph two sounds together</li>
            <li>· EXPORT → 24-bit WAV, infinite loop points baked in</li>
          </ul>
        </div>
      ),
    },
    {
      title: "Pick your Infinite Folder",
      body: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose one folder. Every export lands there organized into My Designs · Imported · Resampled · Packs.
          </p>
          {!FOLDER_SUPPORTED && (
            <div className="flex items-start gap-2 rounded-xl bg-[oklch(0.78_0.17_65/0.12)] p-3 text-[11px] text-[color:var(--warning)]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your browser doesn't support folder linking. Exports will download to your Downloads folder instead — totally fine, just less seamless.
            </div>
          )}
          <button onClick={pick} disabled={!FOLDER_SUPPORTED}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-cyan py-4 text-sm font-bold uppercase tracking-wider text-background shadow-[0_0_24px_oklch(0.72_0.17_215/0.4)] disabled:opacity-40">
            <FolderOpen className="h-4 w-4" />
            {folder ? `Linked: ${folder}` : "Choose folder"}
          </button>
          {folder && (
            <p className="flex items-center gap-1.5 text-[11px] text-[color:var(--success)]">
              <Check className="h-3 w-3" /> Linked. You can move on.
            </p>
          )}
        </div>
      ),
    },
    {
      title: "Point your DAW to it",
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(DAW_INSTRUCTIONS).map(([k, v]) => (
              <button key={k} onClick={() => setSettings({ dawPreset: k as any })}
                className={cn("rounded-lg py-2 text-[10px] font-semibold uppercase tracking-wider",
                  settings.dawPreset === k ? "bg-foreground text-background" : "glass text-muted-foreground")}>
                {v.name}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3">
            <div className="mb-2 font-display text-xs font-bold">{DAW_INSTRUCTIONS[settings.dawPreset].name}</div>
            <ol className="space-y-1.5 text-[12px] text-muted-foreground">
              {DAW_INSTRUCTIONS[settings.dawPreset].steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-[color:var(--cyan)]">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Once linked, exports show up in your DAW the moment they're written.
          </p>
        </div>
      ),
    },
    {
      title: "Test export",
      body: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We'll write a tiny test loop so you can confirm the pipeline works end-to-end.
          </p>
          <button onClick={runTest}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-aurora py-4 text-sm font-bold uppercase tracking-wider text-background">
            <InfIcon className="h-4 w-4" /> Run test export
          </button>
          {testStatus === "ok" && (
            <div className="flex items-start gap-2 rounded-xl bg-[oklch(0.75_0.18_150/0.12)] p-3 text-[12px] text-[color:var(--success)]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{testMsg}</span>
            </div>
          )}
          {testStatus === "fail" && (
            <div className="flex items-start gap-2 rounded-xl bg-[oklch(0.65_0.24_0/0.12)] p-3 text-[12px] text-[color:var(--destructive)]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{testMsg}</span>
            </div>
          )}
        </div>
      ),
    },
  ];

  const s = steps[step];

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 backdrop-blur-md p-3">
      <div className="w-full max-w-md rounded-3xl glass-strong p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-aurora text-background">
              <InfIcon className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Setup · {step + 1} / {steps.length}
            </span>
          </div>
          <button onClick={finish} className="rounded-full glass p-1.5" aria-label="Skip">
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mb-4 font-display text-2xl font-bold tracking-tight">{s.title}</h2>
        {s.body}

        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={cn("h-1.5 w-6 rounded-full",
                i === step ? "bg-foreground" : i < step ? "bg-foreground/60" : "bg-white/10")} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={finish} className="rounded-full glass px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Skip
            </button>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider text-background">
                Next <ChevronRight className="h-3 w-3" />
              </button>
            ) : (
              <button onClick={finish}
                className="flex items-center gap-1 rounded-full bg-gradient-cyan px-4 py-2 text-xs font-bold uppercase tracking-wider text-background">
                Start creating <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
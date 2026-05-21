import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/infinite/TopBar";
import { ModeSwitch } from "@/components/infinite/ModeSwitch";
import { SoundCanvas } from "@/components/infinite/SoundCanvas";
import { WaveformLoop } from "@/components/infinite/WaveformLoop";
import { Toolbar } from "@/components/infinite/Toolbar";
import { Controls } from "@/components/infinite/Controls";
import { SettingsDrawer } from "@/components/infinite/SettingsDrawer";
import { LibraryDrawer } from "@/components/infinite/LibraryDrawer";
import { SetupWizard } from "@/components/infinite/SetupWizard";
import { useApp } from "@/state/store";
import { stopPlayback } from "@/audio/playback";
import { getInfiniteFolderName } from "@/state/folder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Infinite Sound — Touch-first sound design lab" },
      { name: "description", content: "Design sounds by touching, drawing, and gesturing. One-tap export to seamless looping WAVs with embedded smpl chunks." },
      { property: "og:title", content: "Infinite Sound" },
      { property: "og:description", content: "Touch-first sound design lab. Design, import, resample — export infinite loops to your DAW." },
    ],
  }),
  component: Index,
});

function Index() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const onboarded = useApp((s) => s.onboarded);
  const [wizardOpen, setWizardOpen] = useState(!onboarded);
  const setIsPlaying = useApp((s) => s.setIsPlaying);
  const setFolder = useApp((s) => s.setInfiniteFolderName);

  useEffect(() => {
    getInfiniteFolderName().then((n) => n && setFolder(n));
    return () => { stopPlayback(); setIsPlaying(false); };
  }, [setFolder, setIsPlaying]);

  return (
    <div className="relative mx-auto flex min-h-svh max-w-3xl flex-col gap-3 pb-2">
      <TopBar onOpenLibrary={() => setLibraryOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
      <SoundCanvas />
      <ModeSwitch />
      <WaveformLoop />
      <Toolbar />
      <Controls />
      {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} onRunWizard={() => { setSettingsOpen(false); setWizardOpen(true); }} />}
      {libraryOpen && <LibraryDrawer onClose={() => setLibraryOpen(false)} />}
      {wizardOpen && <SetupWizard onClose={() => setWizardOpen(false)} />}
    </div>
  );
}

import { Palette, Check, RotateCcw } from "lucide-react";
import { THEMES, useTheme } from "@/hooks/use-theme";

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center gap-3">
        <Palette className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Theme Settings</h1>
          <p className="text-sm text-muted-foreground">
            Choose a visual theme for the application.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:scale-[1.02] ${
                active
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div
                className="mb-3 h-20 w-full rounded-lg"
                style={{ background: t.preview }}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t.label}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-lg border border-border bg-card/50 p-4">
        <RotateCcw className="h-5 w-5 text-muted-foreground" />
        <button
          onClick={() => setTheme("midnight")}
          className="text-sm font-medium text-primary hover:underline"
        >
          Reset to default
        </button>
        <span className="text-xs text-muted-foreground">
          Currently using: <strong>{theme}</strong>
        </span>
      </div>

      <section className="mt-8 rounded-lg border border-border bg-card/30 p-6">
        <h2 className="mb-2 text-lg font-semibold">About Themes</h2>
        <p className="text-sm text-muted-foreground">
          Themes are applied instantly and saved to your device. They control
          accent colors, background gradients, and surface tones across every
          page. Your preference is stored locally and works offline.
        </p>
      </section>
    </div>
  );
}

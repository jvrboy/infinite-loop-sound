import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Palette, Check, Eye, Sparkles } from "lucide-react";
import { ProCard, SectionHeader } from "@/components/pro";
import { ShaderPicker, SHADER_REGISTRY, getShader, setShader } from "@/components/app/ShaderRegistry";
import { THEMES, useTheme, applyTheme, type ThemeId } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/theme")({
  head: () => ({ meta: [{ title: "Theme & Appearance — DivergenceIQ" }] }),
  component: ThemePage,
});

function ThemePage() {
  const { theme, setTheme } = useTheme();
  const [activeShader, setActiveShader] = useState(getShader());

  useEffect(() => {
    const h = (e: Event) => setActiveShader((e as CustomEvent).detail);
    window.addEventListener("diq:shader-change", h);
    return () => window.removeEventListener("diq:shader-change", h);
  }, []);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <SectionHeader
          title="Theme & Appearance"
          subtitle="Customize the look and feel of your trading terminal."
          icon={<Palette className="w-5 h-5" />}
          action={<Badge variant="outline"><Sparkles className="w-3 h-3 mr-1" />{THEMES.find((t) => t.id === theme)?.label}</Badge>}
        />

        <ProCard
          title="Color Themes"
          description="Pick a color palette. Applies instantly and persists across sessions."
          icon={<Palette className="w-4 h-4" />}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as ThemeId)}
                className={`relative text-left rounded-lg border p-3 transition-all hover:border-primary/60 ${
                  theme === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-card/80"
                }`}
              >
                <div
                  className="w-full h-10 rounded-md mb-2 border border-border/40"
                  style={{ background: t.swatch }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate">{t.label}</span>
                  {theme === t.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        </ProCard>

        <ProCard
          title="Background Shader"
          description="Choose an animated background renderer. WebGL/WebGPU powered."
          icon={<Eye className="w-4 h-4" />}
        >
          <ShaderPicker />
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline">Active: {SHADER_REGISTRY.find((s) => s.id === activeShader)?.label}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setShader("none")}>
              Disable background
            </Button>
          </div>
        </ProCard>

        <ProCard
          title="Reset"
          description="Restore default appearance settings."
        >
          <Button
            variant="outline"
            onClick={() => {
              setTheme("midnight");
              setShader("three");
            }}
          >
            Reset to defaults
          </Button>
        </ProCard>
      </div>
    </AppShell>
  );
}

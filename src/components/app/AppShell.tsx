import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BarChart3, Bot, Gauge, History, LineChart, Palette, Radio, Wallet, Zap, MoreHorizontal, BookOpen, Key, Rocket, MessageSquare, Shield, TrendingUp, Bell, Flame, Inbox, Cpu, Wrench, Brain, Sparkles, Infinity, DollarSign, Eye, Twitter, Calendar as CalIcon, Calculator, Maximize, Minimize, Globe, LifeBuoy, SplitSquareHorizontal, AlignJustify, ArrowUpFromLine, Landmark, ListChecks, Coins, Dices, Percent } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { THEMES, useTheme } from "@/hooks/use-theme";
import { ThreeBackground } from "./ThreeBackground";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV = [
  { to: "/",         label: "Dashboard", icon: Gauge },
  { to: "/ultra",    label: "Ultra",     icon: Sparkles },
  { to: "/persistence", label: "24/7",   icon: Infinity },
  { to: "/scanner",  label: "Scanner",   icon: Radio },
  { to: "/signals",  label: "Signals",   icon: Zap },
  { to: "/local-ai", label: "Local AI",  icon: Brain },
  { to: "/options-flow", label: "Options", icon: DollarSign },
  { to: "/dark-pool", label: "Dark Pool", icon: Eye },
  { to: "/sentiment", label: "Sentiment", icon: Twitter },
  { to: "/neural",   label: "Neural Net", icon: Brain },
  { to: "/market-profile", label: "Market Profile", icon: BarChart3 },
  { to: "/analysis", label: "Analysis",  icon: Activity },
  { to: "/tools",    label: "Tools",     icon: Wrench },
  { to: "/currency-strength", label: "Strength", icon: Gauge },
  { to: "/sessions", label: "Sessions",  icon: Globe },
  { to: "/plan",     label: "Trading Plan", icon: ListChecks },
  { to: "/simulator",label: "Simulator", icon: Dices },
  { to: "/options-calc", label: "Black-Scholes", icon: Percent },
  { to: "/pip-value", label: "Pip Value", icon: Coins },
  { to: "/compound", label: "Growth Calc", icon: TrendingUp },
  { to: "/recovery", label: "Recovery",  icon: LifeBuoy },
  { to: "/scaling",  label: "Scale Out", icon: SplitSquareHorizontal },
  { to: "/risk-calculator", label: "Risk Calc", icon: Calculator },
  { to: "/pivot",    label: "Pivots",    icon: ArrowUpFromLine },
  { to: "/fibonacci",label: "Fibonacci", icon: AlignJustify },
  { to: "/margin",   label: "Margin",    icon: Landmark },
  { to: "/journal",  label: "Journal",   icon: BookOpen },
  { to: "/calendar", label: "Calendar",  icon: CalIcon },
  { to: "/chat",     label: "AI Chat",   icon: MessageSquare },
  { to: "/chart",    label: "Chart",     icon: LineChart },
  { to: "/heatmap",  label: "Heatmap",   icon: Flame },
  { to: "/backtest", label: "Backtest",  icon: History },
  { to: "/optimizer", label: "Optimizer", icon: Wrench },
  { to: "/bot",      label: "Auto-Bot",  icon: Rocket },
  { to: "/zo",       label: "Zo Cloud",  icon: Cpu },
  { to: "/pnl",      label: "PnL",       icon: TrendingUp },
  { to: "/alerts",   label: "Alerts",    icon: Bell },
  { to: "/dlq",      label: "DLQ Admin", icon: Inbox },
  { to: "/system",   label: "System",    icon: Cpu },
  { to: "/deriv",    label: "Deriv API", icon: Wallet },
  { to: "/telegram", label: "Telegram",  icon: Bot },
  { to: "/api-keys", label: "API Keys",  icon: Key },
  { to: "/webhook-events", label: "Webhooks", icon: Shield },
  { to: "/docs",     label: "API Docs",  icon: BookOpen },
] as const;

// Mobile bottom-tab layout: 4 primary + "More" sheet
const MOBILE_PRIMARY = NAV.slice(0, 4);
const MOBILE_SECONDARY = NAV.slice(4);

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState<Date | null>(null);
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const isMobile = useIsMobile();

  // Background scanner interval for continuous 24/7 scanning simulation
  useEffect(() => {
    const runBackgroundScan = async () => {
      // In Agent Mode / Browser only, we simulate backend crons locally by pinging the keepalive API
      try {
        await fetch("/api/public/hooks/keepalive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "browser_background" })
        });
      } catch (e) {}
    };

    // Run every 2 minutes
    const interval = setInterval(runBackgroundScan, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) {
        switch(e.key) {
          case "k": e.preventDefault(); window.location.href = "/scanner"; break;
          case "1": e.preventDefault(); window.location.href = "/"; break;
          case "2": e.preventDefault(); window.location.href = "/signals"; break;
          case "3": e.preventDefault(); window.location.href = "/analysis"; break;
        }
      }
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zenMode]);

  if (zenMode) {
    return (
      <div className="min-h-screen flex bg-background text-foreground relative">
        <ThreeBackground />
        <main className="flex-1 w-full h-screen overflow-auto relative z-10">
          {children}
          <button 
            onClick={() => setZenMode(false)}
            className="fixed bottom-6 right-6 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition z-50 flex items-center gap-2 text-sm font-medium"
            title="Exit Zen Mode (Esc)"
          >
            <Minimize className="w-4 h-4" /> Exit Zen Mode
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground relative">
      <ThreeBackground />
      {!isMobile && <aside className="flex w-60 flex-col bg-sidebar/90 backdrop-blur-xl border-r border-sidebar-border relative z-10">
        <div className="px-5 py-5 border-b border-sidebar-border flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-bull grid place-items-center shadow-glow-bull">
              <BarChart3 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">DivergenceIQ</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Forex Edge</div>
            </div>
          </Link>
          <button onClick={() => setZenMode(true)} className="text-muted-foreground hover:text-foreground transition" title="Zen Mode">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                         : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-[10px] text-muted-foreground font-mono flex items-center justify-between">
          <span className="pulse-dot">LIVE</span>
          <span suppressHydrationWarning>{now ? now.toLocaleTimeString('en-GB', { timeZone: 'Africa/Johannesburg', hour12: false }) : "--:--:--"} SAST</span>
        </div>
        <div className="px-3 pb-2 text-[9px] text-muted-foreground/60 font-mono">
          ⌘K scanner • ⌘1 dash • ⌘2 signals
        </div>
        <div className="px-3 pb-3 relative">
          <button onClick={() => setThemeOpen(o => !o)}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-sidebar-border">
            <Palette className="w-3.5 h-3.5" /> Theme: {THEMES.find(t => t.id === theme)?.label.split(" ")[0]}
          </button>
          {themeOpen && (
            <div className="absolute bottom-12 left-3 right-3 z-20 rounded border border-border bg-popover p-2 space-y-0.5 shadow-lg">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left ${theme === t.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}>
                  <span className="w-3 h-3 rounded-full border border-border" style={{ background: t.swatch }} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {isMobile && <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
          <Link to="/" className="font-bold flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-bull grid place-items-center"><BarChart3 className="w-3 h-3" /></div>
            DivergenceIQ
          </Link>
          <span className="pulse-dot text-xs font-mono">LIVE</span>
        </header>}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
        {/* Mobile bottom tab bar — fixed, native-app style */}
        {isMobile && <nav className="fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur border-t border-sidebar-border grid grid-cols-5 h-16 pb-[env(safe-area-inset-bottom)]">
          {MOBILE_PRIMARY.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link key={to} to={to}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                }`}>
                <Icon className={`w-5 h-5 ${active ? "scale-110" : ""}`} />
                <span className="font-mono">{label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(o => !o)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] ${moreOpen ? "text-primary" : "text-muted-foreground"}`}>
            <MoreHorizontal className="w-5 h-5" />
            <span className="font-mono">More</span>
          </button>
        </nav>}
        {isMobile && moreOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
            <div className="absolute bottom-16 inset-x-0 bg-sidebar border-t border-sidebar-border p-3 grid grid-cols-3 gap-2 max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {MOBILE_SECONDARY.map(({ to, label, icon: Icon }) => {
                const active = path.startsWith(to);
                return (
                  <Link key={to} to={to} onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg ${
                      active ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground"
                    }`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-mono">{label}</span>
                  </Link>
                );
              })}
              <button onClick={() => { setMoreOpen(false); setThemeOpen(true); }}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-card text-muted-foreground">
                <Palette className="w-5 h-5" />
                <span className="text-[11px] font-mono">Theme</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

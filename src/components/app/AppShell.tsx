import { Link, useRouterState } from "@tanstack/react-router";
import { 
  Activity, BarChart3, Bot, Gauge, History, LineChart, Palette, Radio, Wallet, Zap, 
  MoreHorizontal, BookOpen, Key, Rocket, MessageSquare, Shield, TrendingUp, Bell, 
  Flame, Inbox, Cpu, Wrench, Brain, Sparkles, Infinity, DollarSign, Eye, Twitter, 
  Calendar as CalIcon, Calculator, Maximize, Minimize, Globe, LifeBuoy, 
  SplitSquareHorizontal, AlignJustify, ArrowUpFromLine, Landmark, ListChecks, 
  Coins, Dices, Percent, ChevronDown, ChevronRight, LayoutDashboard, Settings,
  Timer, Layers, Target, Crosshair, PanelLeftClose, PanelLeft, Search, GitCompare,
  X, Bomb
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { THEMES, useTheme } from "@/hooks/use-theme";
import { ThreeBackground } from "./ThreeBackground";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV = [
  { to: "/",         label: "Dashboard", icon: Gauge },
  { to: "/ultra",    label: "Ultra",     icon: Sparkles },
  { to: "/persistence", label: "24/7",   icon: Infinity },
  { to: "/scanner",  label: "Scanner",   icon: Radio },
  { to: "/screener", label: "Screener",  icon: Search },
  { to: "/signals",  label: "Signals",   icon: Zap },
  { to: "/boom-crash", label: "Boom & Crash", icon: Bomb },
  { to: "/correlation", label: "Correlation", icon: GitCompare },
  { to: "/optimization", label: "Signal Optimizer", icon: Target },
  { to: "/uptime",   label: "Uptime",    icon: Activity },
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
  { to: "/confluence", label: "Confluence", icon: Crosshair },
  { to: "/automation", label: "Automation", icon: Timer },
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

// Desktop grouped sections
const SECTIONS = [
  {
    title: "Trading Desk",
    icon: LayoutDashboard,
    items: [
      { to: "/",         label: "Dashboard", icon: Gauge },
      { to: "/signals",  label: "Signals",   icon: Zap },
      { to: "/analysis", label: "Analysis",  icon: Activity },
      { to: "/chart",    label: "Live Chart", icon: LineChart },
      { to: "/heatmap",  label: "Heatmap",   icon: Flame },
    ]
  },
  {
    title: "AI & Scanners",
    icon: Cpu,
    items: [
      { to: "/chat",     label: "AI Chat",   icon: MessageSquare },
      { to: "/local-ai", label: "Local AI",  icon: Brain },
      { to: "/neural",   label: "Neural Net", icon: Brain },
      { to: "/ultra",    label: "Ultra",     icon: Sparkles },
      { to: "/scanner",  label: "Scanner",   icon: Radio },
      { to: "/screener", label: "Screener",  icon: Search },
      { to: "/persistence", label: "24/7 Scan", icon: Infinity },
      { to: "/confluence", label: "Confluence", icon: Crosshair },
      { to: "/boom-crash", label: "Boom & Crash", icon: Bomb },
      { to: "/automation", label: "Automation", icon: Timer },
      { to: "/bot",      label: "Auto-Bot",  icon: Rocket },
    ]
  },
  {
    title: "Market Insights",
    icon: Globe,
    items: [
      { to: "/market-profile", label: "Market Profile", icon: BarChart3 },
      { to: "/dark-pool", label: "Dark Pool", icon: Eye },
      { to: "/options-flow", label: "Options", icon: DollarSign },
      { to: "/sentiment", label: "Sentiment", icon: Twitter },
      { to: "/correlation", label: "Correlation", icon: GitCompare },
      { to: "/sessions", label: "Sessions",  icon: Globe },
      { to: "/currency-strength", label: "Strength", icon: Gauge },
      { to: "/calendar", label: "Calendar",  icon: CalIcon },
    ]
  },
  {
    title: "Calculators",
    icon: Calculator,
    items: [
      { to: "/risk-calculator", label: "Risk Calc", icon: Calculator },
      { to: "/compound", label: "Growth Calc", icon: TrendingUp },
      { to: "/scaling",  label: "Scale Out", icon: SplitSquareHorizontal },
      { to: "/margin",   label: "Margin",    icon: Landmark },
      { to: "/pip-value", label: "Pip Value", icon: Coins },
      { to: "/options-calc", label: "Black-Scholes", icon: Percent },
      { to: "/pivot",    label: "Pivots",    icon: ArrowUpFromLine },
      { to: "/fibonacci",label: "Fibonacci", icon: AlignJustify },
      { to: "/recovery", label: "Recovery",  icon: LifeBuoy },
    ]
  },
  {
    title: "Strategy & Journal",
    icon: BookOpen,
    items: [
      { to: "/plan",     label: "Trading Plan", icon: ListChecks },
      { to: "/journal",  label: "Journal",   icon: BookOpen },
      { to: "/pnl",      label: "PnL Tracker", icon: TrendingUp },
      { to: "/backtest", label: "Backtester",  icon: History },
      { to: "/optimizer", label: "Optimizer", icon: Wrench },
      { to: "/optimization", label: "Signal Optimizer", icon: Target },
      { to: "/confluence", label: "Confluence", icon: Crosshair },
      { to: "/automation", label: "Automation", icon: Timer },
      { to: "/simulator",label: "Simulator", icon: Dices },
    ]
  },
  {
    title: "System Admin",
    icon: Settings,
    items: [
      { to: "/deriv",    label: "Deriv API", icon: Wallet },
      { to: "/api-keys", label: "API Keys",  icon: Key },
      { to: "/telegram", label: "Telegram",  icon: Bot },
      { to: "/webhook-events", label: "Webhooks", icon: Shield },
      { to: "/docs",     label: "API Docs",  icon: BookOpen },
      { to: "/zo",       label: "Zo Cloud",  icon: Cpu },
      { to: "/system",   label: "System Status", icon: Cpu },
      { to: "/uptime",   label: "Uptime",    icon: Activity },
      { to: "/dlq",      label: "DLQ Admin", icon: Inbox },
      { to: "/alerts",   label: "Alerts",    icon: Bell },
    ]
  }
];

// Mobile bottom-tab layout: 4 primary + "More" sheet
const MOBILE_PRIMARY = [
  { to: "/",         label: "Dash",      icon: Gauge },
  { to: "/signals",  label: "Signals",   icon: Zap },
  { to: "/chat",     label: "AI Chat",   icon: MessageSquare },
  { to: "/scanner",  label: "Scanner",   icon: Radio },
] as const;

const MOBILE_SECONDARY = NAV.filter(item => 
  !MOBILE_PRIMARY.some(p => p.to === item.to)
);

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState<Date | null>(null);
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const isMobile = useIsMobile();

  // Sidebar collapse (icon-rail) state — persisted across sessions
  const [collapsed, setCollapsed] = useState(false);
  const [navSearch, setNavSearch] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar:collapsed");
      if (saved !== null) setCollapsed(saved === "1");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("sidebar:collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  // Flattened, de-duplicated nav for collapsed rail + search results
  const flatNav = useMemo(() => {
    const seen = new Set<string>();
    const out: { to: string; label: string; icon: typeof Gauge }[] = [];
    for (const section of SECTIONS) {
      for (const item of section.items) {
        if (seen.has(item.to)) continue;
        seen.add(item.to);
        out.push(item);
      }
    }
    return out;
  }, []);

  const searchResults = useMemo(() => {
    const q = navSearch.trim().toLowerCase();
    if (!q) return [];
    return flatNav.filter(i => i.label.toLowerCase().includes(q) || i.to.toLowerCase().includes(q));
  }, [navSearch, flatNav]);

  // Collapsible sections state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "Trading Desk": true,
    "AI & Scanners": true,
    "Market Insights": false,
    "Calculators": false,
    "Strategy & Journal": false,
    "System Admin": false,
  });

  const toggleSection = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Background scanner interval for continuous 24/7 scanning simulation
  useEffect(() => {
    const runBackgroundScan = async () => {
      try {
        await fetch("/api/public/hooks/keepalive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "browser_background" })
        });
      } catch (e) {}
    };

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
          case "b": e.preventDefault(); toggleCollapsed(); break;
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
      {!isMobile && (
        <aside className={`flex flex-col glass-sidebar border-r border-sidebar-border relative z-10 h-screen select-none transition-[width] duration-300 ease-out ${collapsed ? "w-16" : "w-64"}`}>
          {/* Brand Header */}
          <div className={`border-b border-sidebar-border flex items-center bg-black/10 ${collapsed ? "flex-col gap-3 px-2 py-4" : "justify-between px-5 py-5"}`}>
            {collapsed ? (
              <Link to="/" className="w-9 h-9 rounded bg-gradient-bull grid place-items-center shadow-glow-bull" title="DivergenceIQ">
                <BarChart3 className="w-4 h-4 text-primary-foreground" />
              </Link>
            ) : (
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-gradient-bull grid place-items-center shadow-glow-bull">
                  <BarChart3 className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-tight">DivergenceIQ</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Forex Edge Engine</div>
                </div>
              </Link>
            )}
            <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-1"}`}>
              <button
                onClick={toggleCollapsed}
                className="text-muted-foreground hover:text-foreground transition p-1.5 rounded liquid-press hover:bg-white/5"
                title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
              {!collapsed && (
                <button onClick={() => setZenMode(true)} className="text-muted-foreground hover:text-foreground transition p-1.5 rounded liquid-press hover:bg-white/5" title="Zen Mode">
                  <Maximize className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search filter (expanded only) */}
          {!collapsed && (
            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  value={navSearch}
                  onChange={e => setNavSearch(e.target.value)}
                  placeholder="Search tabs…"
                  className="w-full glass-input rounded-md pl-8 pr-7 py-1.5 text-xs bg-black/20 border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                {navSearch && (
                  <button onClick={() => setNavSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground" aria-label="Clear search">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Collapsed icon rail */}
          {collapsed ? (
            <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
              {flatNav.map((item) => {
                const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={`flex items-center justify-center w-full h-10 rounded-md transition-all duration-150 liquid-press ${
                      active ? "glass-button-active text-primary" : "text-muted-foreground/80 hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <ItemIcon className="w-4 h-4" />
                  </Link>
                );
              })}
            </nav>
          ) : navSearch ? (
            /* Search results */
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
              {searchResults.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground/60 text-center">No tabs match “{navSearch}”.</p>
              ) : searchResults.map((item) => {
                const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setNavSearch("")}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all duration-150 liquid-press ${
                      active ? "glass-button-active text-primary font-semibold" : "text-muted-foreground/80 hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <ItemIcon className="w-3.5 h-3.5 opacity-80" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          ) : (
            /* Grouped Sidebar Navigation */
            <nav className="flex-1 p-3 space-y-2.5 overflow-y-auto scrollbar-thin">
              {SECTIONS.map((section) => {
                const isExpanded = expanded[section.title];
                const SectionIcon = section.icon;
                return (
                  <div key={section.title} className="space-y-1">
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[10px] font-mono font-bold tracking-wider text-muted-foreground/60 uppercase hover:bg-white/5 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <SectionIcon className="w-3.5 h-3.5 text-muted-foreground/45" />
                        <span>{section.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground/35" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground/35" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="space-y-0.5 pl-2 border-l border-white/5 ml-3.5">
                        {section.items.map((item) => {
                          const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-all duration-150 liquid-press ${
                                active
                                  ? "glass-button-active text-primary font-semibold"
                                  : "text-muted-foreground/80 hover:bg-white/5 hover:text-foreground"
                              }`}
                            >
                              <ItemIcon className="w-3.5 h-3.5 opacity-80" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}

          {/* Sidebar Footer */}
          {collapsed ? (
            <div className="p-2 border-t border-sidebar-border bg-black/10 flex flex-col items-center gap-2">
              <span className="pulse-dot" title="Live" />
              <button onClick={() => setThemeOpen(o => !o)} className="text-muted-foreground hover:text-foreground p-1.5 rounded liquid-press hover:bg-white/5" title="Theme">
                <Palette className="w-4 h-4" />
              </button>
              <button onClick={() => setZenMode(true)} className="text-muted-foreground hover:text-foreground p-1.5 rounded liquid-press hover:bg-white/5" title="Zen Mode">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="p-3 border-t border-sidebar-border bg-black/10 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
                <span className="pulse-dot">LIVE</span>
                <span suppressHydrationWarning>{now ? now.toLocaleTimeString('en-GB', { timeZone: 'Africa/Johannesburg', hour12: false }) : "--:--:--"} SAST</span>
              </div>
              <div className="px-3 pb-2 text-[9px] text-muted-foreground/45 font-mono text-center">
                ⌘B sidebar • ⌘K scan • ⌘1 dash
              </div>
              <div className="px-3 pb-3 relative">
                <button onClick={() => setThemeOpen(o => !o)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded border border-sidebar-border bg-black/10 liquid-press">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5" /> 
                    <span>Theme: {THEMES.find(t => t.id === theme)?.label.split(" ")[0]}</span>
                  </div>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              </div>
            </>
          )}
          {themeOpen && (
            <div className="absolute bottom-16 left-3 right-3 z-20 rounded border border-border bg-popover p-2 space-y-0.5 shadow-lg glass-card">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left ${theme === t.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}>
                  <span className="w-3 h-3 rounded-full border border-border" style={{ background: t.swatch }} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {isMobile && (
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar/95 backdrop-blur-md">
            <Link to="/" className="font-bold flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-bull grid place-items-center"><BarChart3 className="w-3 h-3" /></div>
              DivergenceIQ
            </Link>
            <span className="pulse-dot text-xs font-mono">LIVE</span>
          </header>
        )}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom tab bar */}
        {isMobile && (
          <nav className="fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur border-t border-sidebar-border grid grid-cols-5 h-16 pb-[env(safe-area-inset-bottom)]">
            {MOBILE_PRIMARY.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? path === "/" : path.startsWith(to);
              return (
                <Link key={to} to={to}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                    active ? "text-primary font-medium" : "text-muted-foreground active:text-foreground"
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
          </nav>
        )}

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

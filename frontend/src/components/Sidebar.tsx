import {
  Terminal,
  PenTool,
  Calendar,
  Sparkles,
  X,
  RefreshCw,
  Layers,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV_SECTIONS = [
  { id: "app", label: "Forensic App", icon: Terminal, idx: "01" },
  { id: "similarity", label: "Similarity Lab", icon: RefreshCw, idx: "02" },
  { id: "batch", label: "Batch Mode", icon: Layers, idx: "03" },
  { id: "practice", label: "Practice Mode", icon: PenTool, idx: "04" },
  { id: "daily", label: "Daily Challenge", icon: Calendar, idx: "05" },
];

export default function Sidebar({
  activeSection,
  setActiveSection,
  darkMode,
  setDarkMode,
  isOpen = false,
  onClose,
}: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 md:static transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col h-dvh border-r border-border bg-card/70 backdrop-blur-xl flex-shrink-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Brand Block */}
      <div className="h-20 flex items-center gap-3 px-6 relative">
        {/* Monogram — solid ink */}
        <div
          className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-foreground"
          aria-hidden="true"
        >
          <div className="relative h-full w-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-background" strokeWidth={2.4} />
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-display-sans font-extrabold text-xl leading-none tracking-tight text-foreground">
            RePrompt
          </span>
          <span className="label-mono text-muted-foreground mt-1.5">
            Prompt Decoder
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground border border-border transition-colors absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="rule-gradient mx-4" />

      <div className="px-6 pt-6 pb-3">
        <span className="label-mono text-muted-foreground/60">Workspace</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 pb-2 space-y-0.5 overflow-y-auto">
        {NAV_SECTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                if (onClose) onClose();
              }}
              aria-current={isActive ? "page" : undefined}
              className={`group/nav relative w-full flex items-center gap-3 pl-3 pr-3.5 h-11 rounded-lg text-sm font-medium transition-premium cursor-pointer overflow-hidden ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {/* Active rail — left edge */}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isActive
                    ? "bg-foreground opacity-100 scale-y-100"
                    : "bg-foreground opacity-0 scale-y-50 group-hover/nav:opacity-30 group-hover/nav:scale-y-75"
                }`}
              />

              {/* Active background tint */}
              <span
                aria-hidden="true"
                className={`absolute inset-0 transition-opacity duration-300 rounded-lg ${
                  isActive
                    ? "bg-secondary opacity-90"
                    : "opacity-0 group-hover/nav:opacity-60 group-hover/nav:bg-secondary/60"
                }`}
              />

              {/* Index */}
              <span
                className={`relative w-7 text-center font-mono text-[10px] tracking-widest transition-colors duration-300 ${
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground/45 group-hover/nav:text-muted-foreground"
                }`}
              >
                {item.idx}
              </span>

              {/* Icon */}
              <Icon
                className={`relative w-4 h-4 transition-all duration-300 flex-shrink-0 ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground group-hover/nav:text-foreground"
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />

              {/* Label */}
              <span className="relative truncate">{item.label}</span>

              {/* Active dot */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="relative ml-auto inline-flex w-1.5 h-1.5 rounded-full bg-foreground/40"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="border-t border-border">
        <div className="p-5 pb-safe space-y-3">
          <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />

          {/* Status */}
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="label-mono text-muted-foreground/50 truncate">
              API · Online
            </span>
            <span className="relative inline-flex items-center justify-center w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

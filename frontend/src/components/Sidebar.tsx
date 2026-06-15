import {
  Terminal,
  PenTool,
  Calendar,
  BookOpen,
  Sparkles,
  FileCode2,
  Info,
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
  { id: "learn", label: "Learn Academy", icon: BookOpen, idx: "06" },
  { id: "docs", label: "API Docs", icon: FileCode2, idx: "07" },
  { id: "about", label: "About Project", icon: Info, idx: "08" },
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
        {/* Monogram — warm amber gradient with inner specular */}
        <div
          className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 specular-amber"
          aria-hidden="true"
        >
          <div className="relative h-full w-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2.4} />
       </div>
     </div>
        <div className="flex flex-col min-w-0">
          {/* Wordmark — Bricolage with 3-stop sheen */}
          <span className="wordmark text-xl leading-none tracking-tight">
            RePrompt
       </span>
          <span className="label-mono text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span className="font-italic text-[12px] -tracking-wide normal-case text-accent/80">
              the
           </span>
            <span>Prompt Decoder</span>
       </span>
     </div>
        {/* Mobile Close Button */}
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

      {/* Hairline rule below brand */}
      <div className="rule-gradient mx-4" />

      {/* Section eyebrow above nav */}
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <span className="label-mono text-muted-foreground/80">Workspace</span>
        <span className="font-italic text-[12px] text-muted-foreground/60">
          vol. ii
       </span>
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
              {/* Active / hover rail — animated amber bar on the LEFT edge */}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isActive
                    ? "bg-accent opacity-100 scale-y-100"
                    : "bg-accent opacity-0 scale-y-50 group-hover/nav:opacity-40 group-hover/nav:scale-y-75"
                }`}
              />

              {/* Active background tint — barely-there cream */}
              <span
                aria-hidden="true"
                className={`absolute inset-0 transition-opacity duration-300 rounded-lg ${
                  isActive
                    ? "bg-secondary opacity-90"
                    : "opacity-0 group-hover/nav:opacity-60 group-hover/nav:bg-secondary/60"
                }`}
              />

              {/* Engraved italic numeral — gives the list an editorial cadence */}
              <span
                className={`relative w-7 text-center transition-colors duration-300 ${
                  isActive ? "numeral-engrave" : "font-mono text-[10px] tracking-widest text-muted-foreground/55 group-hover/nav:text-muted-foreground"
                }`}
              >
                {item.idx}
           </span>

              {/* Icon */}
              <Icon
                className={`relative w-4 h-4 transition-all duration-300 flex-shrink-0 ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground group-hover/nav:text-foreground group-hover/nav:-translate-y-px"
                }`}
                strokeWidth={isActive ? 2.4 : 2}
              />

              {/* Label */}
              <span className="relative truncate">{item.label}</span>

              {/* Active marker — engraved amber dot, pulsed ring */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="relative ml-auto inline-flex w-1.5 h-1.5 rounded-full bg-accent breathing"
                  style={{
                    boxShadow: "0 0 0 3px hsl(var(--accent) / 0.16)",
                  }}
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

          {/* Connection status pill — engraved italic + breathing dot */}
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="font-italic text-[13px] text-muted-foreground/80 truncate">
              secure channel · on
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

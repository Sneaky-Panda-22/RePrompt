import { Terminal, PenTool, Calendar, BookOpen, Sun, Moon, Sparkles, FileCode2, Info } from "lucide-react";
import { Button } from "./ui/button";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function Sidebar({
  activeSection,
  setActiveSection,
  darkMode,
  setDarkMode,
}: SidebarProps) {
  const menuItems = [
    { id: "app", label: "Forensic App", icon: Terminal },
    { id: "practice", label: "Practice Mode", icon: PenTool },
    { id: "daily", label: "Daily Challenge", icon: Calendar },
    { id: "learn", label: "Learn Academy", icon: BookOpen },
    { id: "docs", label: "API Docs", icon: FileCode2 },
    { id: "about", label: "About Project", icon: Info },
  ];

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col h-screen flex-shrink-0 transition-colors duration-300">
      {/* Brand Logo */}
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <span className="font-outfit font-extrabold text-lg text-zinc-900 dark:text-white tracking-tight">
            RePrompt
          </span>
          <span className="text-[10px] block font-mono font-medium text-zinc-400 -mt-1">
            FORENSICS v2.0
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-md shadow-zinc-900/5 dark:shadow-none"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 transition-colors duration-200 ${
                isActive 
                  ? "text-white dark:text-zinc-950" 
                  : "text-zinc-400 dark:text-zinc-500"
              }`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2 text-xs font-medium border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 h-9"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Light Theme
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              Dark Theme
            </>
          )}
        </Button>
        <div className="text-[10px] text-center text-zinc-400 font-mono">
          SECURE CONNECTION ACTIVE
        </div>
      </div>
    </aside>
  );
}

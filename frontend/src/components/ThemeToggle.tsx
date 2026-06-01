import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function ThemeToggle({ darkMode, setDarkMode }: ThemeToggleProps) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      className="
        group relative w-full h-10 rounded-xl
        flex items-center justify-between gap-2 px-3
        border border-zinc-200 dark:border-zinc-700/60
        bg-zinc-100 dark:bg-zinc-800/70
        hover:bg-zinc-200/70 dark:hover:bg-zinc-800
        transition-all duration-300 ease-in-out
        overflow-hidden cursor-pointer select-none
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-indigo-500 focus-visible:ring-offset-2
      "
    >
      {/* Sliding background pill */}
      <span
        className={`
          absolute top-1 bottom-1 rounded-lg
          bg-white dark:bg-zinc-900
          shadow-sm dark:shadow-none
          border border-zinc-200/80 dark:border-zinc-700/50
          transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${darkMode ? "left-[calc(50%-2px)] right-1" : "left-1 right-[calc(50%-2px)]"}
        `}
      />

      {/* Light label — left side */}
      <span
        className={`
          relative z-10 flex items-center gap-1.5 text-[11px] font-semibold font-mono tracking-wide
          transition-all duration-300
          ${!darkMode
            ? "text-amber-600 dark:text-amber-400"
            : "text-zinc-400 dark:text-zinc-500"
          }
        `}
      >
        <Sun
          className={`
            w-3.5 h-3.5 transition-all duration-300
            ${!darkMode ? "rotate-0 scale-110 text-amber-500" : "rotate-90 scale-75 opacity-50"}
          `}
        />
        Light
      </span>

      {/* Dark label — right side */}
      <span
        className={`
          relative z-10 flex items-center gap-1.5 text-[11px] font-semibold font-mono tracking-wide
          transition-all duration-300
          ${darkMode
            ? "text-indigo-400 dark:text-indigo-300"
            : "text-zinc-400 dark:text-zinc-500"
          }
        `}
      >
        Dark
        <Moon
          className={`
            w-3.5 h-3.5 transition-all duration-300
            ${darkMode ? "rotate-0 scale-110 text-indigo-400" : "-rotate-90 scale-75 opacity-50"}
          `}
        />
      </span>
    </button>
  );
}

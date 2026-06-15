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
      role="switch"
      aria-checked={darkMode}
      className="
        group relative w-full h-10 rounded-xl
        flex items-center justify-between gap-2 px-1
        border border-border
        bg-secondary/60
        hover:bg-secondary
        transition-all duration-300 ease-in-out
        cursor-pointer select-none
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring focus-visible:ring-offset-2
        focus-visible:ring-offset-background
      "
    >
      {/* Sliding background pill */}
      <span
        className={`
          absolute top-1 bottom-1 rounded-lg
          bg-card
          shadow-sm
          border border-border
          transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${darkMode ? "left-[calc(50%-2px)] right-1" : "left-1 right-[calc(50%-2px)]"}
        `}
      />

      {/* Light label — left side */}
      <span
        className={`
          relative z-10 flex-1 flex items-center justify-center gap-1.5
          text-[11px] font-semibold tracking-wide font-mono
          transition-all duration-300
          ${!darkMode
            ? "text-foreground"
            : "text-muted-foreground"
          }
        `}
      >
        <Sun
          className={`
            w-3.5 h-3.5 transition-all duration-300
            ${!darkMode ? "rotate-0 scale-110 text-amber-500" : "rotate-90 scale-75 opacity-50"}
          `}
          strokeWidth={2.2}
        />
        Light
     </span>

      {/* Dark label — right side */}
      <span
        className={`
          relative z-10 flex-1 flex items-center justify-center gap-1.5
          text-[11px] font-semibold tracking-wide font-mono
          transition-all duration-300
          ${darkMode
            ? "text-foreground"
            : "text-muted-foreground"
          }
        `}
      >
        Dark
        <Moon
          className={`
            w-3.5 h-3.5 transition-all duration-300
            ${darkMode ? "rotate-0 scale-110 text-accent" : "-rotate-90 scale-75 opacity-50"}
          `}
          strokeWidth={2.2}
        />
     </span>
   </button>
  );
}

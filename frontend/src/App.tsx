import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import ForensicsApp from "./components/ForensicsApp";
import PracticeMode from "./components/PracticeMode";
import DailyChallenge from "./components/DailyChallenge";
import LearnCourse from "./components/LearnCourse";
import ApiDocs from "./components/ApiDocs";
import AboutProject from "./components/AboutProject";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function App() {
  const [activeSection, setActiveSection] = useState<string>("app");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Apply dark mode theme class
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleSetDarkMode = (dark: boolean) => {
    setDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "app":
        return <ForensicsApp showToast={showToast} />;
      case "practice":
        return <PracticeMode showToast={showToast} />;
      case "daily":
        return <DailyChallenge showToast={showToast} />;
      case "learn":
        return <LearnCourse showToast={showToast} />;
      case "docs":
        return <ApiDocs showToast={showToast} />;
      case "about":
        return <AboutProject showToast={showToast} />;
      default:
        return <ForensicsApp showToast={showToast} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      {/* Sidebar Backdrop Overlay on Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        darkMode={darkMode}
        setDarkMode={handleSetDarkMode}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/20">
        {/* Top Control Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-zinc-950/60 backdrop-blur-md z-10 flex-shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            {/* Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                WORKSPACE
              </span>
              <span className="text-xs text-zinc-300 dark:text-zinc-700">/</span>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider capitalize">
                {activeSection === "app" ? "Forensics App" : activeSection === "practice" ? "Practice Sandbox" : activeSection === "daily" ? "Daily Challenge" : activeSection === "learn" ? "Learn Academy" : activeSection === "docs" ? "API Docs" : "About"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] md:text-[10px] font-bold font-mono text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
              API INSTANCE CONNECTED
            </span>
          </div>
        </header>

        {/* Dynamic View Panel */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-6xl mx-auto h-full">
            {renderSection()}
          </div>
        </div>
      </main>

      {/* Unified Toasts Portal Container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3.5 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-xl shadow-xl border flex items-center justify-between animate-slide-in-right ${
              t.type === "success"
                ? "bg-white dark:bg-zinc-900 border-emerald-500/30 text-zinc-900 dark:text-zinc-50"
                : "bg-white dark:bg-zinc-900 border-red-500/30 text-zinc-900 dark:text-zinc-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  t.type === "success" ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-xs font-semibold leading-relaxed">
                {t.message}
              </span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors ml-4 uppercase font-mono"
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

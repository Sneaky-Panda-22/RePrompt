import { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import ForensicsApp from "./components/ForensicsApp";
import SimilarityLab from "./components/SimilarityLab";
import BatchProcessor from "./components/BatchProcessor";
import PracticeMode from "./components/PracticeMode";
import DailyChallenge from "./components/DailyChallenge";
// import LearnCourse from "./components/LearnCourse";
// import ApiDocs from "./components/ApiDocs";
// import AboutProject from "./components/AboutProject";
import {
  AmbientLattice,
  ScrollProgress,
  PageTransition,
  SlideIn,
  motionTokens,
  easeOutSoft,
} from "@/lib/motion";
import { ShaderCurtain } from "./components/ShaderCurtain";
import { motion } from "motion/react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const sectionTitle: Record<string, string> = {
  app: "Forensics App",
  similarity: "Similarity Lab",
  batch: "Batch Mode",
  practice: "Practice Sandbox",
  daily: "Daily Challenge",
  // learn: "Learn Academy",
  // docs: "API Docs",
  // about: "About",
};

const sectionEyebrow: Record<string, string> = {
  app: "01 — Prompt Extraction",
  similarity: "02 — Target Alignment",
  batch: "03 — Multi-Asset Sweep",
  practice: "04 — Workshop",
  daily: "05 — Daily Brief",
  // learn: "06 — Academy",
  // docs: "07 — Developer Hub",
  // about: "08 — Project Notes",
};

export default function App() {
  const [activeSection, setActiveSection] = useState<string>("app");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState<boolean>(false);
  const [, setHeroMounted] = useState<boolean>(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

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
    const t = setTimeout(() => setHeroMounted(true), 380);
    return () => clearTimeout(t);
  }, []);

  const handleSetDarkMode = (dark: boolean) => {
    setIsThemeTransitioning(true);
    setTimeout(() => {
      setDarkMode(dark);
      if (dark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      setTimeout(() => setIsThemeTransitioning(false), 350);
    }, 80);
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
      case "similarity":
        return <SimilarityLab showToast={showToast} />;
      case "batch":
        return <BatchProcessor showToast={showToast} />;
      case "practice":
        return <PracticeMode showToast={showToast} />;
      case "daily":
        return <DailyChallenge showToast={showToast} />;
      // case "learn":
      //   return <LearnCourse showToast={showToast} />;
      // case "docs":
      //   return <ApiDocs showToast={showToast} />;
      // case "about":
      //   return <AboutProject showToast={showToast} />;
      default:
        return <ForensicsApp showToast={showToast} />;
    }
  };

  const activeTitle = sectionTitle[activeSection] ?? "Forensics App";
  const activeEyebrow = sectionEyebrow[activeSection] ?? "01 — Prompt Extraction";

  return (
    <AmbientLattice>
      {/* Premium layered background */}
      <ScrollProgress target={workspaceRef} />

      {/* Theme transition flash overlay */}
      <div
        className={`fixed inset-0 z-[200] pointer-events-none transition-opacity duration-300 ease-in-out ${
          darkMode ? "bg-zinc-950" : "bg-[#F8F6F1]"
        } ${isThemeTransitioning ? "opacity-50" : "opacity-0"}`}
      />

      <div className="flex h-dvh w-screen overflow-hidden bg-transparent font-sans antialiased text-foreground transition-colors duration-300">
        {/* Sidebar Backdrop Overlay on Mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300"
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
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Control Header */}
          <header className="relative h-20 flex items-center justify-between px-5 md:px-10 z-10 flex-shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              {/* Hamburger Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation"
                className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground border border-border transition-colors cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Editorial breadcrumb */}
              <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex items-baseline gap-3 min-w-0 pointer-events-none md:pointer-events-auto text-center md:text-left">
                <span className="label-mono text-muted-foreground whitespace-nowrap hidden sm:inline">
                  {activeEyebrow}
                </span>
                <span className="hidden sm:inline-block w-px h-3 bg-border" />
                <motion.h1
                  key={activeTitle}
                  initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: motionTokens.micro * 1.6, ease: easeOutSoft }}
                  className="font-display text-xl sm:text-[1.55rem] md:text-2xl leading-none font-medium tracking-tight text-foreground truncate"
                >
                  {activeTitle}
                </motion.h1>
              </div>
            </div>

            {/* Right-side status pill */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div className="hidden md:flex items-center gap-2 px-3 h-8 rounded-full bg-card/70 border border-border">
                <div className="relative w-1.5 h-1.5 rounded-full bg-emerald-500">
                  <span className="absolute inset-0 rounded-full bg-emerald-500/60 animate-ping" />
            </div>
                <span className="label-mono text-muted-foreground">
                  API · Online
            </span>
          </div>
              <div className="flex md:hidden items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 breathing" />
          </div>
        </div>
      </header>

          {/* Hairline below header */}
          <div className="rule-gradient mx-5 md:mx-10" />

          {/* Dynamic View Panel */}
          <div
            ref={workspaceRef}
            className="flex-1 overflow-y-auto px-5 md:px-10 py-8 md:py-10"
          >
            <div className="max-w-6xl mx-auto h-full">
              <PageTransition routeKey={activeSection}>
                {renderSection()}
          </PageTransition>
        </div>
      </div>
    </main>

        {/* Unified Toasts Portal Container */}
        <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-[calc(100%-3rem)] sm:w-full pointer-events-none">
          {toasts.map((t) => (
            <SlideIn key={t.id} show direction="right">
              <div
                className={`pointer-events-auto p-4 rounded-xl shadow-xl border flex items-center justify-between transition-premium ${
                  t.type === "success"
                    ? "bg-card border-emerald-500/30 text-foreground"
                    : "bg-card border-red-500/30 text-foreground"
                }`}
                style={{
                  boxShadow:
                    "0 1px 1px hsl(30 8% 7% / 0.04), 0 12px 32px -16px hsl(30 8% 7% / 0.22)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      t.type === "success" ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-xs font-semibold leading-relaxed">
                    {t.message}
          </span>
        </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors ml-4 label-mono cursor-pointer"
                >
                  Close
        </button>
      </div>
    </SlideIn>
          ))}
    </div>
  </div>

      {/* One-time shader curtain reveal so the workspace never visibly paints */}
      <ShaderCurtain
        delay={2500}
        duration={1800}
        mark={
          <span className="font-display-sans tracking-tight flex flex-col md:flex-row items-center md:items-baseline gap-2 md:gap-4 text-center">
            <span className="wordmark-on-dark text-4xl md:text-6xl">RePrompt</span>
            <span className="kicker-on-dark text-xl md:text-3xl">
              decoding images, line by line
        </span>
         </span>
        }
      />
</AmbientLattice>
  );
}

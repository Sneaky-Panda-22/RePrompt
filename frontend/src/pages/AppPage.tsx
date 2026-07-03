import { useState } from "react";
import ForensicsApp from "../components/ForensicsApp";
import ErrorBoundary from "../components/ErrorBoundary";
import { SlideIn } from "../lib/motion";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function AppPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  return (
    <>
      <ErrorBoundary>
        <ForensicsApp showToast={showToast} />
      </ErrorBoundary>
      <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-[calc(100%-3rem)] sm:w-full pointer-events-none">
        {toasts.map((t) => (
          <SlideIn key={t.id} show direction="right">
            <div
              className={`pointer-events-auto p-4 rounded-xl border flex items-center justify-between transition-premium ${
                t.type === "success"
                  ? "bg-card border-emerald-500/30 text-foreground"
                  : "bg-card border-red-500/30 text-foreground"
              }`}
              style={{
                boxShadow:
                  "0px 1px 1px hsl(0 0% 0% / 0.04), 0px 8px 16px -4px hsl(0 0% 0% / 0.08)",
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
    </>
  );
}

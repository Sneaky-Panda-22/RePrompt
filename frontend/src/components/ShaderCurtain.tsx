import { useEffect, useRef, useState, type ReactNode } from "react";
import { ShaderAnimation } from "@/components/ui/shader-animation";

interface ShaderCurtainProps {
  /** Time the curtain sits at full opacity before lifting (ms). */
  delay?: number;
  /** Duration of the lift / unmount transition (ms). */
  duration?: number;
  /** Foreground text/icon to display over the shader. */
  mark?: ReactNode;
}

/**
 * ShaderCurtain — boot reveal that paints a Three.js shader as the
 * backdrop, lets it sit briefly, then lifts the entire curtain off-screen
 * to expose the workspace underneath.
 *
 * The shader is rendered full-viewport by ShaderAnimation. We give it a
 * fixed timing budget (~2s total), pause rAF on `prefers-reduced-motion`,
 * and dispose the curtain once it's off-screen so we never pay GPU.
 */
export function ShaderCurtain({
  delay = 1100,
  duration = 1100,
  mark,
}: ShaderCurtainProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(true);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  useEffect(() => {
    if (reduced) {
      setMounted(false);
      return;
    }
    const t1 = window.setTimeout(() => {
      if (ref.current) ref.current.dataset.stage = "up";
    }, delay);
    const t2 = window.setTimeout(() => setMounted(false), delay + duration + 50);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [delay, duration, reduced]);

  if (!mounted) return null;

  return (
    <div
      ref={ref}
      className="shader-curtain"
      data-stage="down"
      aria-hidden="true"
    >
      {/* Shader backdrop — fills the curtain */}
      <ShaderAnimation />

      {/* Optional vignette so the text reads on bright frames */}
      <div className="shader-curtain-vignette" aria-hidden="true" />

      {/* Foreground mark — words from the original curtain stay the same */}
      {mark && <div className="shader-curtain-mark">{mark}</div>}
   </div>
  );
}

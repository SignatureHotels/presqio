import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/** Animates from 0 to `target` once `start` is true (ease-out); jumps straight there for reduced motion. */
export function useCountUp(target: number, start: boolean, durationMs = 1400) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [start, target, durationMs, reduced]);
  return value;
}

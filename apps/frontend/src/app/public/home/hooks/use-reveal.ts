import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Reports once an element has scrolled into view. Pair the returned state with the
 * `data-reveal` / `data-reveal-children` attributes styled in HomePage.style.ts.
 */
export function useReveal<T extends Element>(options: { rootMargin?: string } = {}) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  const rootMargin = options.rootMargin ?? "0px 0px -12% 0px";
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);
  return [ref, shown] as const;
}

/** Attribute value for `data-reveal` / `data-reveal-children`. */
export const revealState = (shown: boolean) => (shown ? "in" : "out");

/** Position of an element in a staggered reveal (0 first, then 90ms apart). */
export const stagger = (index: number) => ({ "--i": index }) as CSSProperties;

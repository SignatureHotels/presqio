import { useEffect, useState } from "react";

/** Whether the page has scrolled past the top, and how far through it the visitor is (0–1). */
export function useScrollState() {
  const [state, setState] = useState({ scrolled: false, progress: 0 });
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setState({
        scrolled: window.scrollY > 8,
        progress: max > 0 ? Math.min(1, window.scrollY / max) : 0,
      });
    };
    // Coalesce scroll events into one update per frame.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return state;
}

import { useEffect, useState } from "react";

/** The id of the section currently around the upper third of the viewport (scroll spy). */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        setActive(key.split(",").find((id) => visible.get(id)) ?? null);
      },
      // A thin band near the top third decides which section is "current".
      { rootMargin: "-30% 0px -65% 0px" },
    );
    for (const id of key.split(",")) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [key]);
  return active;
}

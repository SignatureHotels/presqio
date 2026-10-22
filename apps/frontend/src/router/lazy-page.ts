import { lazy, type ComponentType } from "react";

/**
 * Code-splits a page exported by name. Returns the lazy component and a `preload` that starts
 * the download early (e.g. when the browser is idle) so navigating to it shows no loader.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- page props vary; each page keeps its own prop types via M[K].
export function lazyPage<M extends Record<K, ComponentType<any>>, K extends keyof M>(
  load: () => Promise<M>,
  name: K,
) {
  let pending: Promise<{ default: M[K] }> | undefined;
  const preload = () => (pending ??= load().then((module) => ({ default: module[name] })));
  return Object.assign(lazy(preload), { preload });
}

/** Starts loading pages once the browser has nothing better to do. */
export function preloadWhenIdle(pages: { preload: () => unknown }[]) {
  const run = () => pages.forEach((page) => void page.preload());
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 1500);
  return () => window.clearTimeout(id);
}

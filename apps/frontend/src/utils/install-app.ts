import { useSyncExternalStore } from "react";

/**
 * "Install the app" for the employee web app. Chrome on Android fires `beforeinstallprompt` once,
 * soon after load, so this module listens from startup (imported by main.tsx) and keeps the event.
 * iPhones have no install prompt: there we can only explain Safari's Share > Add to Home Screen.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** "prompt": we can show the browser's install dialog. "ios": show the Safari steps. */
export type InstallMode = "prompt" | "ios" | null;

const DISMISSED_KEY = "presqio.installDismissed";
let deferred: InstallPromptEvent | null = null;
let installed = false;
let dismissed = readDismissed();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function readDismissed(): boolean {
  try { return localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
}

/** Opened from the home-screen icon rather than in a browser tab. */
function runningAsApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button instead of Chrome's mini-bar
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

function mode(): InstallMode {
  if (installed || dismissed || runningAsApp()) return null;
  if (deferred) return "prompt";
  return isIos() ? "ios" : null;
}

/** Shows the browser's install dialog. Resolves true when the person installed the app. */
export async function installApp(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // a prompt event can only be used once
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") installed = true;
  notify();
  return outcome === "accepted";
}

/** Hides the install offer on this phone from now on. */
export function dismissInstall() {
  dismissed = true;
  try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* this visit only */ }
  notify();
}

/** How this phone can install the app right now, or null when there's nothing to offer. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    mode,
    () => null,
  );
}

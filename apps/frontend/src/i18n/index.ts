import { useSyncExternalStore } from "react";
import { en, type MessageKey } from "./en";
import { hi } from "./hi";
import { te } from "./te";

export type { MessageKey } from "./en";
export type Lang = "en" | "hi" | "te";
export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "te", label: "తెలుగు" },
];
const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { en, hi, te };
const LOCALES: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };
const KEY = "presqio.lang";

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "hi" || saved === "te") return saved;
  } catch { /* storage blocked: fall back to the browser's language */ }
  const browser = (typeof navigator === "undefined" ? "" : navigator.language).toLowerCase();
  return browser.startsWith("hi") ? "hi" : browser.startsWith("te") ? "te" : "en";
}

let current: Lang = initial();
const listeners = new Set<() => void>();

export const getLang = () => current;
/** The Intl locale for dates and times in the chosen language. */
export const locale = () => LOCALES[current];

export function setLang(lang: Lang) {
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* this visit only */ }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((listener) => listener());
}

/** A message in the chosen language, with {name} placeholders filled in. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const text: string = DICTIONARIES[current][key] ?? en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : text;
}

/** Re-renders the component when the language changes; returns `t`. */
export function useT() {
  useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => current,
    () => current,
  );
  return t;
}

/** The server's common English messages, so they can be shown in the chosen language. */
const SERVER: Record<string, MessageKey> = {
  "We couldn't find that employee ID. Check it with your admin.": "err.idNotFound",
  "Your account is paused. Please contact your admin.": "err.paused",
  "You're already checked in.": "err.alreadyIn",
  "You're already checked in. Tap again to check out.": "err.alreadyInKiosk",
  "You haven't checked in yet.": "err.notIn",
  "That took too long. Please start again.": "err.tooLong",
  "Please start again.": "err.startAgain",
  "The server is taking too long to respond. Please try again.": "err.slow",
  "Something went wrong. Please try again.": "err.generic",
  "You aren't assigned to a branch yet. Ask your admin.": "err.noBranch",
  "That was already recorded.": "err.recorded",
  "This kiosk was signed out by your admin. Ask for a new pairing code.": "err.kioskSignedOut",
  "That code is wrong or has expired. Ask your admin for a new one.": "err.badCode",
  "Your location reading was out of date. Please try again.": "reason.STALE_LOCATION",
  "Your branch has no check-in perimeter yet. Ask your admin.": "reason.NO_PERIMETER",
};

/** A server message in the chosen language when it's a known one; otherwise as sent. */
export function serverText(message: string): string {
  if (current === "en") return message;
  const key = SERVER[message];
  return key ? t(key) : message;
}

/** An error's message in the chosen language (see `serverText`). */
export const errorText = (error: unknown) =>
  serverText(error instanceof Error ? error.message : en["err.generic"]);

/** A rejected check-in's message: the server's (English, more detailed) or a translation of its reason. */
export function rejectionText(outcome: { reason: string; message: string; distance: number | null; accuracy: number }) {
  if (current === "en") return outcome.message;
  const key = `reason.${outcome.reason}` as MessageKey;
  return key in en ? t(key, { distance: outcome.distance ?? "?", accuracy: Math.round(outcome.accuracy) }) : outcome.message;
}

/** "45 min" or "1h 30m" in the chosen language. */
export const durationText = (minutes: number) =>
  minutes < 60 ? t("dur.min", { n: minutes }) : t("dur.hm", { h: Math.floor(minutes / 60), m: String(minutes % 60).padStart(2, "0") });

if (typeof document !== "undefined") document.documentElement.lang = current;

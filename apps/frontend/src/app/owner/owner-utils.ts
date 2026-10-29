import type { ClientState } from "@presqio/lib";

export const STATE_LABEL: Record<ClientState, string> = {
  TRIAL: "Free trial",
  TRIAL_ENDING: "Trial ending",
  TRIAL_EXPIRED: "Trial expired",
  PAYING: "Paying",
  PAYMENT_DUE: "Payment due",
  CANCELED: "Canceled",
  SUSPENDED: "Suspended",
};

/** Global `.chip` colour for each state. */
export const STATE_CHIP: Record<ClientState, string> = {
  TRIAL: "accent",
  TRIAL_ENDING: "warning",
  TRIAL_EXPIRED: "error",
  PAYING: "success",
  PAYMENT_DUE: "warning",
  CANCELED: "neutral",
  SUSPENDED: "error",
};

const IST = "Asia/Kolkata";

export const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" }) : "—";

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** "3 h ago", "5 d ago"; "—" when never. */
export function ago(iso: string | null, now = Date.now()) {
  if (!iso) return "—";
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h ago`;
  if (minutes < 60 * 24 * 30) return `${Math.floor(minutes / 1440)} d ago`;
  return shortDate(iso);
}

/** Whole days from now until `iso` (negative when past). */
export const daysUntil = (iso: string | null, now = Date.now()) =>
  iso ? Math.ceil((new Date(iso).getTime() - now) / 86_400_000) : null;

export const rupees = (minor: number) =>
  `₹${(minor / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** YYYY-MM-DD for <input type="date">, in India time. */
export const toDateInput = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: IST });

/** End of the chosen day in India time, as an ISO instant (a trial "until 5 Nov" lasts all of 5 Nov). */
export const endOfDayIso = (dateInput: string) => new Date(`${dateInput}T23:59:59+05:30`).toISOString();

export const addDays = (from: Date, days: number) => new Date(from.getTime() + days * 86_400_000);

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "P";

import { useEffect, useState } from "react";

/** Re-renders every `ms` with the current time. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return now;
}

export const clockIn = (timeZone: string, at: Date) =>
  at.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

/** "Wednesday, 21 October" for a YYYY-MM-DD date. */
export const dayTitle = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

/** "09:00" → "9:00 AM". */
export function twelveHour(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function greeting(timeZone: string, at: Date) {
  const hour = Number(at.toLocaleString("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** 45 → "45 min", 90 → "1h 30m". */
export const earlyLabel = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

export const minutesLabel = (minutes: number | null) =>
  minutes === null ? "—" : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

/** The Monday–Sunday dates (YYYY-MM-DD) of the week containing `date`. */
export function weekOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setUTCDate(d.getUTCDate() - offset + i);
    return day.toISOString().slice(0, 10);
  });
}

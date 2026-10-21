/** Calendar date (YYYY-MM-DD) of `at` in an IANA time zone. */
export function localDate(timeZone: string, at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Wall-clock time (HH:mm, 24h) of `at` in an IANA time zone. */
export function localTime(timeZone: string, at: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/** Minutes since midnight for "HH:mm". */
export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** YYYY-MM-DD shifted by whole days (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday 1 (Mon) … 7 (Sun) of a YYYY-MM-DD date. */
export const isoWeekday = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
};

/** Prisma `@db.Date` value for a YYYY-MM-DD date. */
export const dateOnly = (date: string) => new Date(`${date}T00:00:00Z`);

/** Shift times saved on an attendance session when it was opened. */
export interface ShiftSnapshot {
  start?: string;
  end?: string;
  overnight?: boolean;
  graceMinutes?: number;
}

/** How many minutes before the shift's end a check-out happened; null if not early or no shift. */
export function minutesEarly(timeZone: string, workDate: string, closedAt: Date, shift: ShiftSnapshot) {
  if (!shift.start || !shift.end) return null;
  const overnight = shift.overnight ?? minutesOf(shift.end) <= minutesOf(shift.start);
  const endDate = overnight ? addDays(workDate, 1) : workDate;
  const days = (dateOnly(endDate).getTime() - dateOnly(localDate(timeZone, closedAt)).getTime()) / 86_400_000;
  const early = days * 1440 + minutesOf(shift.end) - minutesOf(localTime(timeZone, closedAt));
  return early > 0 ? early : null;
}

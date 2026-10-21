import type { AttendanceRegisterResponse, RegisterDay } from "@presqio/lib";
import { csvText } from "@/utils/csv";

export const hoursLabel = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
export const registerTime = (instant: string, timezone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(instant));
export const dayPunches = (day: RegisterDay, timezone: string) => {
  const first = day.sessions[0];
  const last = day.sessions.at(-1);
  const checkoutDate = last?.checkOut ? new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(last.checkOut)) : day.date;
  const offset = Math.round((Date.parse(`${checkoutDate}T00:00:00Z`) - Date.parse(`${day.date}T00:00:00Z`)) / 86_400_000);
  return first ? { checkIn: registerTime(first.checkIn, timezone), checkOut: last?.checkOut ? `${registerTime(last.checkOut, timezone)}${offset ? ` (${offset > 0 ? "+" : ""}${offset}d)` : ""}` : "Open" } : null;
};

/** One row per session, plus rows for dates with no recorded sessions. */
export function registerCsv(data: AttendanceRegisterResponse) {
  return csvText([
    ["Employee", "Employee ID", "Work date", "Time zone", "Status", "Branch", "Shift", "Check-in (ISO)", "Check-out (ISO)", "Worked minutes", "Early departure minutes", "Corrected", "Check-in selfie saved", "Check-out selfie saved"],
    ...data.employees.flatMap((employee) => employee.days.flatMap((day) => {
      const prefix = [employee.name, employee.code, day.date, data.timezone, day.status];
      return day.sessions.length ? day.sessions.map((session) => [
        ...prefix, session.branchName, session.shiftName, session.checkIn, session.checkOut ?? "", session.minutesWorked ?? "", session.earlyMinutes ?? "",
        session.corrected ? "Yes" : "No", session.checkInPhotoAttemptId ? "Yes" : "No", session.checkOutPhotoAttemptId ? "Yes" : "No",
      ]) : [[...prefix, "", "", "", "", "", "", "", "", ""]];
    })),
  ]);
}

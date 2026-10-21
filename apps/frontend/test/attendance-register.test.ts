import { test } from "node:test";
import assert from "node:assert/strict";
import type { AttendanceRegisterResponse, RegisterDay } from "@presqio/lib";
import { dayPunches, hoursLabel, registerCsv } from "../src/app/admin/attendance/register-utils";

const day: RegisterDay = {
  date: "2026-10-21", status: "Present", completedMinutes: 240, gapMinutes: 60, leaveReason: null,
  sessions: [{ id: "one", branchId: "branch", branchName: "HQ", shiftName: "Night", checkIn: "2026-10-21T18:30:00Z", checkOut: "2026-10-21T22:30:00Z", minutesWorked: 240, earlyMinutes: null, corrected: true, checkInPhotoAttemptId: "in", checkOutPhotoAttemptId: "out" },
    { id: "two", branchId: "branch", branchName: "HQ", shiftName: "Night", checkIn: "2026-10-21T23:30:00Z", checkOut: null, minutesWorked: null, earlyMinutes: null, corrected: false, checkInPhotoAttemptId: "second-in", checkOutPhotoAttemptId: null }],
};
test("grid displays the organization's local times and ongoing last sessions", () => {
  assert.deepEqual(dayPunches(day, "Asia/Kolkata"), { checkIn: "00:00", checkOut: "Open" });
  assert.equal(dayPunches({ ...day, sessions: [] }, "Asia/Kolkata"), null);
  assert.equal(hoursLabel(510), "8h 30m");
  assert.deepEqual(dayPunches({ ...day, sessions: [day.sessions[0]] }, "Asia/Kolkata"), { checkIn: "00:00", checkOut: "04:00 (+1d)" });
});
test("register CSV exports every session and blank days with safe employee names", () => {
  const data: AttendanceRegisterResponse = { from: "2026-10-21", to: "2026-10-22", timezone: "Asia/Kolkata", dates: ["2026-10-21", "2026-10-22"], page: 1, pageSize: 25, totalEmployees: 1,
    employees: [{ id: "e", name: "=UNSAFE()", code: "E01", days: [day, { ...day, date: "2026-10-22", status: "Rest day", sessions: [] }] }] };
  const csv = registerCsv(data);
  assert.equal(csv.split("\r\n").length, 4);
  assert.match(csv, /'=UNSAFE\(\)/);
  assert.match(csv, /2026-10-21T18:30:00Z/);
  assert.match(csv, /Rest day/);
  assert.doesNotMatch(csv, /second-in/); // Photo access tokens/URLs never go into exports.
});

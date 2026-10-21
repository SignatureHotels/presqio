import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { RegisterSession } from "@presqio/lib";
import { AttendanceRegisterService, registerDates, registerDay } from "../src/app/features/attendance/attendance-register.service";
import type { DatabaseService } from "../src/app/common/database/database.service";

const session = (overrides: Partial<RegisterSession> = {}): RegisterSession => ({
  id: "session", branchId: "branch", branchName: "Office", shiftName: "Day shift",
  checkIn: "2026-10-21T09:00:00Z", checkOut: "2026-10-21T12:00:00Z", minutesWorked: 180,
  earlyMinutes: null, corrected: false, checkInPhotoAttemptId: "in-photo", checkOutPhotoAttemptId: "out-photo", ...overrides,
});
const base = { date: "2026-10-21", today: "2026-10-21", joined: "2026-01-01", sessions: [] as RegisterSession[], onLeave: false, leaveReason: null, late: false };

test("register date range is inclusive, handles month boundaries and rejects invalid or excessive ranges", () => {
  assert.deepEqual(registerDates("2026-10-31", "2026-11-02"), ["2026-10-31", "2026-11-01", "2026-11-02"]);
  assert.equal(registerDates("2026-10-01", "2026-10-31").length, 31);
  assert.deepEqual(registerDates("2028-02-29", "2028-02-29"), ["2028-02-29"]);
  for (const [from, to] of [["2026-02-29", "2026-03-01"], ["2026-11-01", "2026-10-31"], ["2026-10-01", "2026-11-01"], ["bad", "2026-10-21"]]) {
    assert.throws(() => registerDates(from, to));
  }
});

test("register adds completed work and gaps without counting an ongoing session", () => {
  const sessions = [session(), session({ id: "second", checkIn: "2026-10-21T13:00:00Z", checkOut: null, minutesWorked: null })];
  const day = registerDay({ ...base, sessions });
  assert.equal(day.completedMinutes, 180);
  assert.equal(day.gapMinutes, 60);
  assert.equal(day.sessions.length, 2);
  assert.equal(day.status, "Present");
});

test("leave, rest days, missing records and future schedules have distinct labels", () => {
  assert.equal(registerDay({ ...base, onLeave: true, leaveReason: "Travel" }).status, "On leave");
  assert.equal(registerDay({ ...base, workingDays: [1, 2] }).status, "Rest day");
  assert.equal(registerDay({ ...base, today: "2026-10-22" }).status, "No record");
  assert.equal(registerDay({ ...base }).status, "Not checked in");
  assert.equal(registerDay({ ...base, today: "2026-10-20" }).status, "Scheduled");
  assert.equal(registerDay({ ...base, joined: "2026-10-22" }).status, "Not employed");
  assert.equal(registerDay({ ...base, sessions: [session()], onLeave: true, late: true }).status, "Late");
});

test("register preserves overnight instants, original selfie IDs and corrected times", () => {
  const entry = session({ checkIn: "2026-10-21T22:00:00Z", checkOut: "2026-10-22T06:00:00Z", minutesWorked: 480, corrected: true });
  const day = registerDay({ ...base, sessions: [entry] });
  assert.equal(day.completedMinutes, 480);
  assert.equal(day.sessions[0].checkOut, "2026-10-22T06:00:00Z");
  assert.equal(day.sessions[0].checkOutPhotoAttemptId, "out-photo");
});

test("register queries are scoped to business, selected dates, branch and paginated employees", async () => {
  const seen: Record<string, any> = {};
  const db = {
    async $queryRaw() { return [{ start: new Date("2026-10-20T18:30:00Z"), end: new Date("2026-10-22T18:30:00Z") }]; },
    businesses: { async findUniqueOrThrow(query: unknown) { seen.business = query; return { timezone: "Asia/Kolkata" }; } },
    employees: {
      async findMany(query: unknown) { seen.employees = query; return [{ id: "emp1", full_name: "Asha", employee_code: "A01", joined_on: new Date("2026-01-01"), created_at: new Date("2026-01-01") }]; },
      async count() { return 26; },
    },
    attendance_sessions: { async findMany(query: unknown) { seen.sessions = query; return [{
      id: "s1", employee_id: "emp1", work_date: new Date("2026-10-21"), opened_at: new Date("2026-10-21T04:00:00Z"), closed_at: new Date("2026-10-21T12:30:00Z"),
      branch_id: "branch", branch_id_ref: { name: "HQ" }, shift_snapshot: { name: "Day", start: "09:00", end: "18:00", graceMinutes: 10 }, status: "CORRECTED",
      attendance_events_session_id_rows: [{ type: "CHECK_IN", attempt_id: "photo-in" }, { type: "CHECK_OUT", attempt_id: "photo-out" }],
    }]; } },
    leave_days: { async findMany(query: unknown) { seen.leaves = query; return []; } },
    shift_assignments: { async findMany(query: unknown) { seen.shifts = query; return []; } },
  };
  const result = await new AttendanceRegisterService(db as unknown as DatabaseService).get("tenant-business", { from: "2026-10-21", to: "2026-10-22", page: 2, branchId: "branch", search: "Asha" });
  assert.equal(seen.employees.where.business_id, "tenant-business");
  assert.equal(seen.employees.skip, 25);
  assert.equal(seen.employees.take, 25);
  assert.equal(seen.sessions.where.business_id, "tenant-business");
  assert.equal(seen.sessions.where.branch_id, "branch");
  assert.deepEqual(seen.sessions.where.employee_id.in, ["emp1"]);
  assert.equal(seen.leaves.where.business_id, "tenant-business");
  assert.equal(seen.shifts.where.business_id, "tenant-business");
  assert.equal(result.employees[0].days[0].status, "Late");
  assert.equal(result.employees[0].days[0].sessions[0].checkInPhotoAttemptId, "photo-in");
  assert.equal(result.employees[0].days[0].sessions[0].corrected, true);
  assert.equal(result.employees[0].days[0].completedMinutes, 510);
  assert.equal(result.employees[0].days.length, 2);
  assert.equal(result.totalEmployees, 26);
});

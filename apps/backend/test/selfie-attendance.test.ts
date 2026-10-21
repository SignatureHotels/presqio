import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { AttendanceService } from "../src/app/features/attendance/attendance.service";
import type { DatabaseService } from "../src/app/common/database/database.service";

test("daily attendance exposes both in/out photo IDs and times without a face service", async () => {
  const db = {
    businesses: { async findUniqueOrThrow() { return { timezone: "UTC" }; } },
    attendance_sessions: { async findMany() { return [
      { employee_id: "employee", opened_at: new Date("2026-10-21T09:00:00Z"), closed_at: new Date("2026-10-21T12:00:00Z"), shift_snapshot: {},
        attendance_events_session_id_rows: [{ type: "CHECK_IN", attempt_id: "morning-in" }, { type: "CHECK_OUT", attempt_id: "morning-out" }] },
      { employee_id: "employee", opened_at: new Date("2026-10-21T13:00:00Z"), closed_at: new Date("2026-10-21T17:00:00Z"), shift_snapshot: {},
        attendance_events_session_id_rows: [{ type: "CHECK_IN", attempt_id: "afternoon-in" }, { type: "CHECK_OUT", attempt_id: "afternoon-out" }] },
    ]; } },
    shift_assignments: { async findMany() { return []; } },
    leave_days: { async findMany() { return []; } },
    // No face checks/enrollment provider is configured or available in this fixture.
  };
  const today = await new AttendanceService(db as unknown as DatabaseService).today("business");
  const recorded = today.snapshotOf("employee");
  assert.equal(recorded.checkIn, "09:00");
  assert.equal(recorded.checkOut, "17:00");
  assert.equal(recorded.checkInPhotoAttemptId, "morning-in");
  assert.equal(recorded.checkOutPhotoAttemptId, "afternoon-out");
  assert.equal(recorded.latestPhotoAttemptId, "afternoon-out");
  assert.equal(recorded.status, "Present");
  assert.equal("faceVerified" in recorded, false);
  const empty = today.snapshotOf("another-employee");
  assert.equal(empty.checkInPhotoAttemptId, null);
  assert.equal(empty.checkOutPhotoAttemptId, null);
});

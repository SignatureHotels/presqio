import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { EmployeePortalService } from "../src/app/features/employee-portal/employee-portal.service";
import { EmployeeAuthService } from "../src/app/features/employee-auth/employee-auth.service";
import type { DatabaseService } from "../src/app/common/database/database.service";
import type { AuditService } from "../src/app/features/audit/audit.service";
import type { PhotoStorageService } from "../src/app/common/storage/photo-storage.service";
import type { SessionsService } from "../src/app/common/auth/sessions.service";
import { addDays, localDate } from "../src/app/common/time/zoned";

const ctx = { userId: "user", employeeId: "employee", businessId: "business", organizationId: "org" };
function portal(db: unknown) {
  return new EmployeePortalService(db as DatabaseService, {} as AuditService, { enabled: false } as PhotoStorageService);
}

test("employee attendance rejects missing, inaccurate, stale and out-of-branch GPS without creating a session", async () => {
  for (const reason of ["NO_PERIMETER", "LOW_GPS_ACCURACY", "STALE_LOCATION", "OUTSIDE_GEOFENCE"]) {
    let queries = 0;
    let rejected = false;
    const tx = {
      async $queryRaw() {
        if (++queries === 1) return [{ id: "attempt", action: "CHECK_IN", branch_id: "branch", status: "INITIATED", expires_at: new Date(Date.now() + 60_000) }];
        return reason === "NO_PERIMETER" ? [] : [{ id: "fence", radius_m: 100, max_accuracy_m: 50, distance_m: reason === "OUTSIDE_GEOFENCE" ? 200 : 10 }];
      },
      attendance_attempts: { async update({ data }: { data: { status: string } }) { rejected = data.status === "RETRYABLE_FAILURE"; } },
      location_checks: { async create() {} },
      attendance_sessions: { async create() { assert.fail("Rejected GPS must not create attendance"); } },
    };
    const service = portal({ $transaction: (fn: (tx: unknown) => unknown) => fn(tx) });
    const result = await service.submitAttempt(ctx, "attempt", {
      latitude: 12, longitude: 77, accuracy: reason === "LOW_GPS_ACCURACY" ? 100 : 10,
      capturedAt: new Date(Date.now() - (reason === "STALE_LOCATION" ? 180_000 : 0)).toISOString(),
      photo: "data:image/jpeg;base64,/9j/",
    });
    assert.equal(result.accepted, false);
    if (!result.accepted) assert.equal(result.reason, reason);
    assert.equal(rejected, true);
  }
});

test("leave rejects past days, dates over 180 days away and days already attended", async () => {
  const service = portal({
    businesses: { async findUniqueOrThrow() { return { timezone: "Asia/Kolkata" }; } },
    attendance_sessions: { async count() { return 1; } },
  });
  const today = localDate("Asia/Kolkata");
  await assert.rejects(service.takeLeave(ctx, { date: addDays(today, -1) }), /today or a later day/);
  await assert.rejects(service.takeLeave(ctx, { date: addDays(today, 181) }), /180 days ahead/);
  await assert.rejects(service.takeLeave(ctx, { date: today }), /already checked in/);
});

test("employee login blocks suspended and terminated employees", async () => {
  for (const status of ["SUSPENDED", "TERMINATED"]) {
    const service = new EmployeeAuthService({ employees: { async findFirst() { return { status }; } } } as unknown as DatabaseService, {} as SessionsService, {} as EmployeePortalService);
    await assert.rejects(service.login({ employeeCode: "TEST01" }, {}), /paused|couldn't find/);
  }
});

test("corrections reject an unchanged closed time before the requested check-in", async () => {
  const service = portal({
    attendance_sessions: { async findFirst() { return {
      id: "session", work_date: new Date("2026-10-21T00:00:00Z"),
      opened_at: new Date("2026-10-21T09:00:00Z"), closed_at: new Date("2026-10-21T17:00:00Z"),
      business_id_ref: { timezone: "UTC" },
    }; } },
    attendance_corrections: { async count() { return 0; } },
    async $queryRaw() { return [{ at: new Date("2026-10-21T18:00:00Z") }]; },
  });
  await assert.rejects(service.requestCorrection(ctx, { sessionId: "session", requestedIn: "18:00", reason: "Wrong check-in" }), /Check-out must be after check-in/);
});

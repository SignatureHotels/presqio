import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { EmployeePortalService, pickPerimeter } from "../src/app/features/employee-portal/employee-portal.service";
import { EmployeeAuthService } from "../src/app/features/employee-auth/employee-auth.service";
import type { DatabaseService } from "../src/app/common/database/database.service";
import type { AuditService } from "../src/app/features/audit/audit.service";
import type { PhotoStorageService } from "../src/app/common/storage/photo-storage.service";
import type { SessionsService } from "../src/app/common/auth/sessions.service";
import { addDays, localDate } from "../src/app/common/time/zoned";
import { TimeOffService } from "../src/app/features/time-off/time-off.service";

const ctx = { userId: "user", employeeId: "employee", businessId: "business", organizationId: "org" };
function portal(db: unknown, audit: unknown = {}) {
  return new EmployeePortalService(db as DatabaseService, audit as AuditService, { enabled: false } as PhotoStorageService,
    new TimeOffService(db as DatabaseService, audit as AuditService));
}

test("employee attendance rejects missing, inaccurate, stale and out-of-branch GPS without creating a session", async () => {
  for (const reason of ["NO_PERIMETER", "LOW_GPS_ACCURACY", "STALE_LOCATION", "OUTSIDE_GEOFENCE"]) {
    let queries = 0;
    let rejected = false;
    const tx = {
      async $queryRaw() {
        if (++queries === 1) return [{ id: "attempt", action: "CHECK_IN", branch_id: "branch", status: "INITIATED", expires_at: new Date(Date.now() + 60_000) }];
        return reason === "NO_PERIMETER" ? [] : [{ id: "fence", branch_id: "branch", radius_m: 100, max_accuracy_m: 50, distance_m: reason === "OUTSIDE_GEOFENCE" ? 200 : 10 }];
      },
      employees: { async findUniqueOrThrow() { return { check_in_anywhere: false }; } },
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

test("leave types: a type is required, holidays need no leave, and paid allowances are enforced", async () => {
  const today = localDate("Asia/Kolkata");
  const day = addDays(today, 3), holidayDay = addDays(today, 4);
  const casual = { id: "11111111-1111-4111-8111-111111111111", name: "Casual leave", paid: true, days_per_year: 2, archived_at: null, created_at: new Date() };
  const unpaid = { id: "22222222-2222-4222-8222-222222222222", name: "Unpaid leave", paid: false, days_per_year: null, archived_at: null, created_at: new Date() };
  let usedCasual = 2;
  const types = [casual, unpaid];
  const created: { leave_type_id: string | null }[] = [];
  const leaveDays = {
    async groupBy() { return [{ leave_type_id: casual.id, _count: { _all: usedCasual } }]; },
    async create(args: { data: { leave_date: Date; leave_type_id: string | null } }) {
      created.push(args.data);
      const type = types.find((t) => t.id === args.data.leave_type_id);
      return { id: "leave", leave_date: args.data.leave_date, reason: null, leave_type_id: args.data.leave_type_id,
        leave_type_ref: type ? { name: type.name, paid: type.paid } : null };
    },
  };
  const tx = { async $queryRaw() { return []; }, leave_days: leaveDays, employees: { async findUniqueOrThrow() { return { full_name: "Asha" }; } } };
  const service = portal({
    businesses: { async findUniqueOrThrow() { return { timezone: "Asia/Kolkata" }; } },
    attendance_sessions: { async count() { return 0; } },
    calendars: { async findFirst(q: { where: { calendar_date: Date } }) {
      return q.where.calendar_date.toISOString().slice(0, 10) === holidayDay ? { id: "h", name: "Diwali" } : null;
    } },
    leave_types: { async findMany() { return types; } },
    leave_days: leaveDays,
    async $transaction(fn: (t: typeof tx) => unknown) { return fn(tx); },
  }, { async record() {} });

  await assert.rejects(service.takeLeave(ctx, { date: day }), /Choose the kind of leave/);
  await assert.rejects(service.takeLeave(ctx, { date: holidayDay, typeId: casual.id }), /Diwali is a holiday/);
  await assert.rejects(service.takeLeave(ctx, { date: day, typeId: casual.id }), /used all 2 days of Casual leave.*unpaid leave instead/);
  assert.equal(created.length, 0, "nothing saved when refused");

  usedCasual = 1;
  const leave = await service.takeLeave(ctx, { date: day, typeId: casual.id });
  assert.equal(leave.typeName, "Casual leave");
  assert.equal(leave.paid, true);
  const off = await service.takeLeave(ctx, { date: day, typeId: unpaid.id });
  assert.equal(off.paid, false, "unpaid leave has no limit");
  assert.deepEqual(created.map((c) => c.leave_type_id), [casual.id, unpaid.id]);
});

test("check-in picks the site the employee is at, and only 'anywhere' staff pass outside every site", () => {
  const home = { id: "f1", branch_id: "home", radius_m: 100, distance_m: 900 };
  const store = { id: "f2", branch_id: "store", radius_m: 150, distance_m: 40 };
  const depot = { id: "f3", branch_id: "depot", radius_m: 300, distance_m: 250 };
  // inside two sites: the nearer one wins
  assert.deepEqual(pickPerimeter([home, store, depot], "home", false), { fence: store, offsite: false });
  // outside every site: judged against the nearest, and off-site
  const far = [{ ...home, distance_m: 5000 }, { ...store, distance_m: 800 }];
  assert.deepEqual(pickPerimeter(far, "home", false), { fence: far[1], offsite: true });
  // an 'anywhere' employee outside every site is recorded against the home branch
  assert.deepEqual(pickPerimeter(far, "home", true), { fence: far[0], offsite: true });
  assert.deepEqual(pickPerimeter([], "home", true), { fence: null, offsite: true });
});

test("check-in: another assigned site moves the day there; 'anywhere' staff pass with reason OFFSITE", async () => {
  for (const scenario of ["other-site", "anywhere", "anywhere-no-perimeter", "not-allowed"] as const) {
    let queries = 0;
    let check: { result: string; reason: string | null; geofence_id: string | null } | undefined;
    let movedTo: string | undefined;
    const tx = {
      async $queryRaw() {
        if (++queries === 1) return [{ id: "attempt", action: "CHECK_IN", branch_id: "home", status: "INITIATED", expires_at: new Date(Date.now() + 60_000) }];
        if (scenario === "anywhere-no-perimeter") return [];
        return [
          { id: "home-fence", branch_id: "home", radius_m: 100, max_accuracy_m: 50, distance_m: 3000 },
          { id: "site-fence", branch_id: "site", radius_m: 100, max_accuracy_m: 50, distance_m: scenario === "other-site" ? 30 : 2000 },
        ];
      },
      employees: { async findUniqueOrThrow() { return { check_in_anywhere: scenario.startsWith("anywhere") }; } },
      attendance_attempts: { async update({ data }: { data: { branch_id?: string } }) { movedTo = data.branch_id ?? movedTo; } },
      location_checks: { async create({ data }: { data: typeof check }) { check = data; } },
      branches: { async findUniqueOrThrow() { return { name: "Site" }; } },
      attendance_sessions: { async findFirst() { throw new Error("stop"); }, async create() { throw new Error("stop"); } },
      shift_assignments: { async findFirst() { throw new Error("stop"); } },
      attendance_events: { async create() { throw new Error("stop"); } },
    };
    const service = portal({ $transaction: (fn: (tx: unknown) => unknown) => fn(tx) });
    const outcome = await service.submitAttempt(ctx, "attempt", {
      latitude: 12, longitude: 77, accuracy: 20, capturedAt: new Date().toISOString(), photo: "data:image/jpeg;base64,/9j/",
    }).catch((e: Error) => e);
    if (scenario === "not-allowed") {
      assert.ok(!(outcome instanceof Error) && !outcome.accepted && outcome.reason === "OUTSIDE_GEOFENCE");
      assert.match((outcome as { message: string }).message, /nearest of your sites/);
      continue;
    }
    assert.equal(check?.result, "PASS", scenario);
    if (scenario === "other-site") {
      assert.equal(check?.geofence_id, "site-fence");
      assert.equal(movedTo, "site");
    } else {
      assert.equal(check?.reason, "OFFSITE");
      assert.equal(check?.geofence_id, scenario === "anywhere" ? "home-fence" : null);
      assert.equal(movedTo, undefined);
    }
  }
});

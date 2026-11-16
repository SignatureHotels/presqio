import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ExecutionContext } from "@nestjs/common";
import { KioskGuard } from "../src/app/features/kiosks/kiosk.guard";
import { KiosksService, pairingCode } from "../src/app/features/kiosks/kiosks.service";
import { EmployeePortalService } from "../src/app/features/employee-portal/employee-portal.service";
import { TimeOffService } from "../src/app/features/time-off/time-off.service";
import { hashToken } from "../src/app/common/security/tokens";
import type { DatabaseService } from "../src/app/common/database/database.service";
import type { AuditService } from "../src/app/features/audit/audit.service";
import type { PhotoStorageService } from "../src/app/common/storage/photo-storage.service";

const audit = { async record() {} } as unknown as AuditService;
const ctx = { userId: "user", employeeId: "employee", businessId: "business", organizationId: "org" };
const kiosk = { id: "kiosk", name: "Front desk", branchId: "store", branchName: "MG Road store" };
const PHOTO = "data:image/jpeg;base64,/9j/4AAQ";
function portal(db: unknown) {
  return new EmployeePortalService(db as DatabaseService, audit, { enabled: false } as PhotoStorageService, new TimeOffService(db as DatabaseService, audit));
}

test("pairing codes are 8 easy-to-read characters", () => {
  for (let i = 0; i < 200; i++) assert.match(pairingCode(), /^[2-9A-HJKMNP-Z]{8}$/);
});

test("a pairing code works once, and only before it expires", async () => {
  let used = false;
  const row = { id: "kiosk", name: "Front desk", pairing_code_hash: hashToken("K7PM3QXD"), branch_id_ref: { name: "Store" },
    business_id_ref: { timezone: "Asia/Kolkata", employee_prefix: "SGH", organization_id_ref: { name: "Org" } } };
  const db = {
    kiosks: {
      async findFirst({ where }: { where: { pairing_code_hash: string } }) { return where.pairing_code_hash === row.pairing_code_hash ? row : null; },
      async updateMany() { const count = used ? 0 : 1; used = true; return { count }; },
    },
  };
  const service = new KiosksService(db as unknown as DatabaseService, audit, {} as EmployeePortalService);
  const paired = await service.pair("K7PM3QXD");
  assert.ok(paired.token.length > 20);
  assert.equal(paired.kiosk.branchName, "Store");
  await assert.rejects(service.pair("K7PM3QXD"), /just used/);
  await assert.rejects(service.pair("WRONG234"), /wrong or has expired/);
});

test("kiosk routes need a paired device token", async () => {
  const request: { headers: Record<string, string>; kiosk?: unknown } = { headers: {} };
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  let seen: { token_hash?: string } = {};
  const db = { kiosks: { async findFirst({ where }: { where: { token_hash: string } }) { seen = where; return null; } } };
  const guard = new KioskGuard(db as unknown as DatabaseService);
  await assert.rejects(guard.canActivate(context), /isn't set up/);
  request.headers["x-kiosk-token"] = "a-revoked-or-unknown-device-token";
  await assert.rejects(guard.canActivate(context), /signed out/);
  assert.equal(seen.token_hash, hashToken("a-revoked-or-unknown-device-token"), "only the token's hash is looked up");
});

test("a kiosk checks people in only at their own branch or sites, and out where they checked in", async () => {
  const db = (open: { branch_id: string } | null, home: string, site = false, anywhere = false) => ({
    attendance_sessions: { async findFirst() { return open; } },
    branches: { async findUnique() { return { name: "HQ" }; } },
    employees: { async findUniqueOrThrow() { return { check_in_anywhere: anywhere }; } },
    employee_branch_assignments: { async findFirst() { return { branch_id: home }; } },
    employee_sites: { async findFirst() { return site ? { id: "site" } : null; } },
    attendance_attempts: { async findUnique() { return null; }, async create() { throw new Error("allowed"); } },
  });
  const punch = (d: unknown, action: "CHECK_IN" | "CHECK_OUT") => portal(d).kioskPunch(ctx, kiosk, action, PHOTO, "key-12345678");
  await assert.rejects(punch(db(null, "hq"), "CHECK_IN"), /aren't set up to check in at MG Road store/);
  await assert.rejects(punch(db(null, "store"), "CHECK_IN"), /allowed/, "home branch");
  await assert.rejects(punch(db(null, "hq", true), "CHECK_IN"), /allowed/, "one of their sites");
  await assert.rejects(punch(db(null, "hq", false, true), "CHECK_IN"), /allowed/, "check in from anywhere");
  await assert.rejects(punch(db({ branch_id: "hq" }, "store"), "CHECK_OUT"), /checked in at HQ/);
  await assert.rejects(punch(db({ branch_id: "store" }, "store"), "CHECK_IN"), /already checked in/);
  await assert.rejects(punch(db(null, "store"), "CHECK_OUT"), /haven't checked in/);
});

test("a kiosk punch is placed at the branch perimeter with reason KIOSK, without reading GPS", async () => {
  let check: Record<string, unknown> | undefined; let policy: unknown;
  let queries = 0;
  const tx = {
    async $queryRaw() {
      if (++queries === 1) return [{ id: "attempt", action: "CHECK_IN", branch_id: "store", status: "INITIATED", expires_at: new Date(Date.now() + 60_000) }];
      return [{ id: "fence", branch_id: "store", radius_m: 100, max_accuracy_m: 50, distance_m: 0, latitude: 17.4, longitude: 78.5 }];
    },
    location_checks: { async create({ data }: { data: Record<string, unknown> }) { check = data; } },
    attendance_attempts: { async update({ data }: { data: { policy_snapshot?: unknown } }) { if (data.policy_snapshot) policy = data.policy_snapshot; } },
    attendance_photos: { async create() { throw new Error("stop"); } },
    employees: { async findUniqueOrThrow() { assert.fail("a kiosk doesn't check GPS perimeters per employee"); } },
  };
  const db = {
    attendance_sessions: { async findFirst() { return null; } },
    employees: { async findUniqueOrThrow() { return { check_in_anywhere: false }; } },
    employee_branch_assignments: { async findFirst() { return { branch_id: "store" }; } },
    employee_sites: { async findFirst() { return null; } },
    attendance_attempts: { async findUnique() { return null; }, async create() { return { id: "attempt" }; } },
    $transaction: (fn: (t: unknown) => unknown) => fn(tx),
  };
  await assert.rejects(portal(db).kioskPunch(ctx, kiosk, "CHECK_IN", PHOTO, "key-12345678"), /stop/);
  assert.equal(check?.result, "PASS");
  assert.equal(check?.reason, "KIOSK");
  assert.equal(check?.geofence_id, "fence");
  assert.deepEqual([check?.reported_lat, check?.reported_lon, check?.distance_m], [17.4, 78.5, 0]);
  assert.deepEqual(policy, { kioskId: "kiosk", kiosk: "Front desk" });
});

import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { shifts } from "@prisma/client";
import { dayPlan, groupRoster, pickShift } from "../src/app/features/roster/roster-schedule";
import { RosterService } from "../src/app/features/roster/roster.service";
import { calculatePayroll, EMPTY_PROFILE, EMPTY_REVIEW } from "../src/app/features/payroll/payroll-calculation";
import type { DatabaseService } from "../src/app/common/database/database.service";
import type { AuditService } from "../src/app/features/audit/audit.service";

const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const shift = (id: string, start: string, end: string): shifts => ({
  id, business_id: "b", name: id, starts_local: time(start), ends_local: time(end), timezone: "Asia/Kolkata",
  grace_min: 10, break_min: 0, overnight: end < start, policy_json: {},
} as shifts);
const lunch = shift("Lunch", "10:00", "16:00"), dinner = shift("Dinner", "17:00", "23:30"), night = shift("Night", "22:00", "06:00");
const m = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

test("a split day's check-in belongs to the shift under way, else the next one", () => {
  assert.equal(pickShift([lunch, dinner], m("09:50"))?.id, "Lunch");
  assert.equal(pickShift([lunch, dinner], m("12:00"))?.id, "Lunch");
  assert.equal(pickShift([lunch, dinner], m("16:40"))?.id, "Dinner", "between shifts: the next one");
  assert.equal(pickShift([lunch, dinner], m("23:50"))?.id, "Dinner", "after the last: the last one");
  assert.equal(pickShift([night], m("23:00"))?.id, "Night");
  assert.equal(pickShift([], m("12:00")), null);
});

test("roster rows group into days: shifts earliest first, a shiftless row is a day off", () => {
  const d = new Date("2026-11-20");
  const days = groupRoster([
    { employee_id: "e1", work_date: d, shift_id_ref: dinner },
    { employee_id: "e1", work_date: d, shift_id_ref: lunch },
    { employee_id: "e2", work_date: d, shift_id_ref: null },
  ]);
  assert.deepEqual(days.get("e1:2026-11-20")?.shifts.map((s) => s.id), ["Lunch", "Dinner"]);
  assert.equal(days.get("e1:2026-11-20")?.off, false);
  assert.equal(days.get("e2:2026-11-20")?.off, true);
  // no roster: the usual shift on working days, nothing on weekly offs
  const usual = { shift: lunch, workingDays: [1, 2, 3, 4, 5] };
  assert.deepEqual(dayPlan(undefined, usual, 1), { off: false, shifts: [lunch], rostered: false });
  assert.deepEqual(dayPlan(undefined, usual, 7), { off: true, shifts: [], rostered: false });
  assert.equal(dayPlan(days.get("e1:2026-11-20"), usual, 7).shifts.length, 2, "rostered on a weekly off");
});

test("saving a roster replaces each person's day, and checks employees, shifts and days off", async () => {
  const deleted: unknown[] = []; let created: { shift_id: string | null; employee_id: string }[] = [];
  const tx = {
    roster_entries: {
      async deleteMany(q: unknown) { deleted.push(q); },
      async createMany({ data }: { data: typeof created }) { created = data; },
    },
  };
  const db = (employees: number, shiftCount: number) => ({
    employees: { async count() { return employees; } },
    shifts: { async count() { return shiftCount; } },
    $transaction: (fn: (t: unknown) => unknown) => fn(tx),
  });
  const audit = { async record() {} } as unknown as AuditService;
  const org = { organizationId: "o" } as never, actor = { userId: "u" } as never;
  const service = new RosterService(db(2, 2) as unknown as DatabaseService, audit);
  const result = await service.save(org, "b", actor, { changes: [
    { employeeId: "e1", date: "2026-11-20", shiftIds: ["s1", "s2"], off: false },
    { employeeId: "e2", date: "2026-11-20", shiftIds: [], off: true },
    { employeeId: "e2", date: "2026-11-21", shiftIds: [], off: false }, // back to the usual shift
  ] });
  assert.equal(result.saved, 3);
  assert.equal(deleted.length, 3);
  assert.deepEqual(created.map((r) => [r.employee_id, r.shift_id]), [["e1", "s1"], ["e1", "s2"], ["e2", null]]);
  await assert.rejects(service.save(org, "b", actor, { changes: [{ employeeId: "e1", date: "2026-11-20", shiftIds: ["s1"], off: true }] }), /day off/);
  await assert.rejects(new RosterService(db(1, 2) as unknown as DatabaseService, audit).save(org, "b", actor,
    { changes: [{ employeeId: "e1", date: "2026-11-20", shiftIds: [], off: true }, { employeeId: "x", date: "2026-11-20", shiftIds: [], off: true }] }), /employees/);
});

test("payroll follows the roster: a rostered day off isn't missing, a rostered shift on a weekly off is", () => {
  const snap = calculatePayroll({
    month: "2026-01", today: "2026-02-05", company: { legalName: "X", address: "", logoUrl: "" },
    employee: { id: "e", code: "E1", name: "E", designation: "", joinedOn: "2026-01-01", status: "ACTIVE" },
    compensation: { id: "c", earnings: [{ label: "Basic", amount: 3_100_000 }], deductions: [] }, profile: EMPTY_PROFILE,
    sessions: [], leaves: [], pendingCorrections: 0, review: EMPTY_REVIEW, source: {},
    // Monday to Friday usually; 2026-01-05 is a Monday, 2026-01-04 a Sunday
    assignments: [{ from: "2026-01-01", to: null, workingDays: [1, 2, 3, 4, 5] }],
    roster: [{ date: "2026-01-05", off: true }, { date: "2026-01-04", off: false }],
  });
  assert.ok(!snap.attendance.missingDates.includes("2026-01-05"));
  assert.ok(snap.attendance.missingDates.includes("2026-01-04"));
});

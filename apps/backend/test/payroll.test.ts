import { test } from "node:test";
import assert from "node:assert/strict";
import type { PayrollReview } from "@presqio/lib";
import {
  calculatePayroll,
  EMPTY_PROFILE,
  EMPTY_REVIEW,
  isClean,
  itemIssues,
  monthBounds,
  type CalculationInput,
} from "../src/app/features/payroll/payroll-calculation";
import { termsSource } from "../src/app/features/payroll/payroll.service";

// January 2026: 31 days, the 1st is a Thursday. Amounts are paise.
const input = (overrides: Partial<CalculationInput> = {}): CalculationInput => ({
  month: "2026-01",
  today: "2026-02-05",
  company: { legalName: "Mithril Telecommunications Pvt Ltd", address: "Hyderabad", logoUrl: "" },
  employee: { id: "e1", code: "HO1234", name: "Asha Rao", designation: "Zonal Manager", joinedOn: "2022-03-01", status: "ACTIVE" },
  compensation: {
    id: "c1",
    earnings: [{ label: "Basic Salary", amount: 14_000_000 }, { label: "HRA", amount: 6_000_000 }],
    deductions: [{ label: "PF", amount: 180_000 }, { label: "PT", amount: 20_000 }, { label: "TDS", amount: 100_000 }],
  },
  profile: EMPTY_PROFILE,
  // Present every day, so nothing is missing.
  sessions: Array.from({ length: 31 }, (_, i) => {
    const date = `2026-01-${String(i + 1).padStart(2, "0")}`;
    return { id: `s${i}`, date, openedAt: `${date}T04:00:00Z`, closedAt: `${date}T12:00:00Z` };
  }),
  leaves: [],
  assignments: [],
  pendingCorrections: 0,
  review: EMPTY_REVIEW,
  source: { pay: 1 },
  ...overrides,
});
const review = (patch: Partial<PayrollReview>): PayrollReview => ({ ...EMPTY_REVIEW, note: "Checked", ...patch });

test("month bounds know month lengths and leap years", () => {
  assert.deepEqual(monthBounds("2026-01"), { start: "2026-01-01", end: "2026-01-31", days: 31 });
  assert.equal(monthBounds("2028-02").days, 29);
  assert.equal(monthBounds("2026-02").days, 28);
  assert.throws(() => monthBounds("2026-13"));
});

test("a full month reproduces the sample payslip", () => {
  const s = calculatePayroll(input());
  assert.equal(s.totalEarnings, 20_000_000); // ₹2,00,000
  assert.equal(s.totalDeductions, 300_000); // ₹3,000
  assert.equal(s.netPayable, 19_700_000); // ₹1,97,000
  assert.equal(s.paidDays, 31);
  assert.equal(s.lopDays, 0);
  assert.deepEqual(s.blockers, []);
  assert.ok(isClean(s));
});

test("loss-of-pay prorates earnings by calendar days, in half days, with rounding", () => {
  const s = calculatePayroll(input({ review: review({ lopHalfDays: 3 }) })); // 1.5 days
  assert.equal(s.paidDays, 29.5);
  assert.equal(s.lopDays, 1.5);
  // 1,40,000 × 59/62 = 1,33,225.806… → 1,33,225.81
  assert.equal(s.earnings[0].amount, 13_322_581);
  // Fixed deductions are not prorated.
  assert.equal(s.totalDeductions, 300_000);
});

test("mid-month joiners are paid only for employed days", () => {
  const s = calculatePayroll(input({ employee: { ...input().employee, joinedOn: "2026-01-17" } }));
  assert.equal(s.eligibleDays, 15);
  assert.equal(s.earnings[0].amount, Math.round((14_000_000 * 15) / 31));
});

test("leavers are paid up to their last working date", () => {
  const s = calculatePayroll(input({ profile: { ...EMPTY_PROFILE, lastWorkingDate: "2026-01-10" } }));
  assert.equal(s.eligibleDays, 10);
});

test("LOP above employed days is rejected", () => {
  assert.throws(() => calculatePayroll(input({ review: review({ lopHalfDays: 63 }) })));
});

test("missing days skip weekly offs, leave and future dates, and become the suggested LOP", () => {
  const s = calculatePayroll(input({
    today: "2026-01-12",
    sessions: input().sessions.filter((x) => x.date !== "2026-01-05" && x.date !== "2026-01-06" && x.date !== "2026-01-04"),
    leaves: ["2026-01-06"],
    // Mon–Sat shift: Sunday 4 Jan is a weekly off.
    assignments: [{ from: "2025-01-01", to: null, workingDays: [1, 2, 3, 4, 5, 6] }],
  }));
  assert.deepEqual(s.attendance.missingDates, ["2026-01-05"]);
  assert.deepEqual(s.attendance.leaveDates, ["2026-01-06"]);
  assert.equal(s.suggestedLopHalfDays, 2);
  // A suggestion is never applied on its own.
  assert.equal(s.lopDays, 0);
  assert.equal(isClean(s), false);
});

test("blockers: no salary, leaver without a last working date, deductions above earnings", () => {
  assert.match(calculatePayroll(input({ compensation: null })).blockers.join(), /Salary is not configured/);
  assert.match(
    calculatePayroll(input({ employee: { ...input().employee, status: "TERMINATED" } })).blockers.join(),
    /last working date/,
  );
  const heavy = calculatePayroll(input({ review: review({ additionalDeductions: [{ label: "Advance", amount: 30_000_000 }] }) }));
  assert.match(heavy.blockers.join(), /Deductions exceed earnings/);
});

test("duplicate component names between salary and adjustments are rejected", () => {
  assert.throws(() => calculatePayroll(input({ review: review({ additionalEarnings: [{ label: "hra", amount: 1 }] }) })));
});

test("the source hash follows pay inputs only", () => {
  const a = calculatePayroll(input());
  // Company, names and bank details are not part of `source`; the service passes pay inputs only.
  const renamed = calculatePayroll(input({
    company: { legalName: "Renamed", address: "Elsewhere", logoUrl: "" },
    profile: { ...EMPTY_PROFILE, bankAccount: "50100089790471" },
  }));
  assert.equal(a.sourceHash, renamed.sourceHash);
  assert.notEqual(a.sourceHash, calculatePayroll(input({ source: { pay: 2 } })).sourceHash);
});

test("item issues explain what blocks finalization", () => {
  const saved = calculatePayroll(input());
  assert.deepEqual(itemIssues(saved, saved, EMPTY_REVIEW, false), ["Needs review."]);
  assert.deepEqual(itemIssues(saved, saved, review({}), true), []);
  const changed = calculatePayroll(input({ source: { pay: 2 } }));
  assert.match(itemIssues(saved, changed, review({}), true)[0], /changed after review/);
  const withGaps = calculatePayroll(input({ sessions: input().sessions.slice(1) }));
  assert.deepEqual(itemIssues(withGaps, withGaps, review({}), true), ["Attendance exceptions are not acknowledged."]);
  assert.deepEqual(itemIssues(withGaps, withGaps, review({ acceptAttendanceExceptions: true }), true), []);
});

test("a running month is paid only up to today", () => {
  const s = calculatePayroll(input({ month: "2026-10", today: "2026-10-22", period: { from: "2026-10-01", to: "2026-10-22" }, sessions: [] }));
  assert.equal(s.eligibleDays, 22);
  assert.equal(s.paidDays, 22);
  assert.equal(s.earnings[0].amount, Math.round((14_000_000 * 22) / 31));
  assert.equal(s.periodEnd, "2026-10-22");
});

test("a custom date range pays the employed days inside it", () => {
  // Joined on the 21st; range 15th–25th covers the 21st–25th only.
  const s = calculatePayroll(input({
    month: "2026-10", today: "2026-10-30", period: { from: "2026-10-15", to: "2026-10-25" }, sessions: [],
    employee: { ...input().employee, joinedOn: "2026-10-21" },
  }));
  assert.equal(s.eligibleDays, 5);
  assert.equal(s.daysInMonth, 31);
  assert.deepEqual([s.periodStart, s.periodEnd], ["2026-10-15", "2026-10-25"]);
});

// ── holidays and leave types ─────────────────────────────────────────────────
// 5–7 Jan 2026 (Mon–Wed) away; Mon–Sat shift; today is the 12th.
const away = (overrides: Partial<CalculationInput>) => calculatePayroll(input({
  today: "2026-01-12",
  sessions: input().sessions.filter((x) => !["2026-01-05", "2026-01-06", "2026-01-07"].includes(x.date)),
  assignments: [{ from: "2025-01-01", to: null, workingDays: [1, 2, 3, 4, 5, 6] }],
  ...overrides,
}));

test("a holiday is not a missing day and needs no decision", () => {
  const s = away({ holidays: ["2026-01-05"], paidLeaves: ["2026-01-06", "2026-01-07"] });
  assert.deepEqual(s.attendance.missingDates, []);
  assert.deepEqual(s.attendance.holidayDates, ["2026-01-05"]);
  assert.equal(s.suggestedLopHalfDays, 0);
  assert.ok(isClean(s), "holidays and paid leave alone need no review");
});

test("paid leave is paid: not missing, no loss of pay, nothing to acknowledge", () => {
  const s = away({ paidLeaves: ["2026-01-05", "2026-01-06", "2026-01-07"] });
  assert.deepEqual(s.attendance.missingDates, []);
  assert.deepEqual(s.attendance.paidLeaveDates, ["2026-01-05", "2026-01-06", "2026-01-07"]);
  assert.deepEqual(s.attendance.leaveDates, []);
  assert.equal(s.suggestedLopHalfDays, 0);
  assert.equal(s.netPayable, 19_700_000);
  assert.ok(isClean(s));
  assert.deepEqual(itemIssues(s, s, review({}), true), []);
});

test("unpaid leave is suggested as loss of pay and needs a decision", () => {
  const s = away({ paidLeaves: ["2026-01-05"], unpaidLeaves: ["2026-01-06", "2026-01-07"] });
  assert.deepEqual(s.attendance.missingDates, []);
  assert.deepEqual(s.attendance.unpaidLeaveDates, ["2026-01-06", "2026-01-07"]);
  assert.equal(s.suggestedLopHalfDays, 4); // 2 days
  assert.equal(s.lopDays, 0, "a suggestion is never applied on its own");
  assert.equal(isClean(s), false);
  assert.match(itemIssues(s, s, review({}), true).join(), /exceptions are not acknowledged/);
  assert.deepEqual(itemIssues(s, s, review({ acceptAttendanceExceptions: true }), true), []);
});

test("missing days and unpaid leave add up in the suggestion; untyped leave still needs judgement", () => {
  const s = away({ unpaidLeaves: ["2026-01-06"], leaves: ["2026-01-07"] });
  assert.deepEqual(s.attendance.missingDates, ["2026-01-05"]);
  assert.deepEqual(s.attendance.leaveDates, ["2026-01-07"]);
  assert.equal(s.suggestedLopHalfDays, 4); // missing 5th + unpaid 6th; untyped 7th is the admin's call
  assert.equal(isClean(s), false);
});

const day = (n: number) => `2026-01-${String(n).padStart(2, "0")}`;
const worked = (dates: number[], minutes: number) => dates.map((n) => ({
  id: `w${n}`, date: day(n), openedAt: `${day(n)}T04:00:00Z`, closedAt: new Date(Date.parse(`${day(n)}T04:00:00Z`) + minutes * 60_000).toISOString(),
}));

test("daily wage pays days worked plus paid leave and holidays; absences need no loss of pay", () => {
  const snap = calculatePayroll(input({
    compensation: { id: "c1", payBasis: "DAILY", rate: 70_000, earnings: [], deductions: [] },
    sessions: worked(Array.from({ length: 20 }, (_, i) => i + 1), 480),
    paidLeaves: [day(21)], holidays: [day(26)],
  }));
  assert.equal(snap.pay?.units, 22);
  assert.equal(snap.earnings[0].amount, 1_540_000);
  assert.match(snap.earnings[0].label, /22 days × ₹700/);
  assert.equal(snap.suggestedLopHalfDays, 0);
  assert.ok(snap.attendance.missingDates.length > 0);
  assert.equal(isClean(snap), true, "missing days are simply unpaid for daily wages");
  // a half day docked by the reviewer
  const docked = calculatePayroll(input({
    compensation: { id: "c1", payBasis: "DAILY", rate: 70_000, earnings: [], deductions: [] },
    sessions: worked([1, 2], 480), review: review({ lopHalfDays: 1 }),
  }));
  assert.equal(docked.earnings[0].amount, 105_000);
});

test("hourly wage pays regular hours, and overtime beyond the standard day at its multiplier", () => {
  const base = { id: "c1", payBasis: "HOURLY" as const, rate: 15_000, standardDayMinutes: 480, overtimePercent: 150, earnings: [], deductions: [] };
  const snap = calculatePayroll(input({ compensation: base, sessions: worked([5, 6, 7, 8, 9], 600) }));
  assert.equal(snap.pay?.units, 40);
  assert.equal(snap.earnings[0].amount, 600_000);
  assert.equal(snap.pay?.overtimeWorkedMinutes, 600);
  assert.equal(snap.pay?.overtimeRate, 22_500);
  assert.equal(snap.pay?.overtimeAmount, 225_000);
  assert.match(snap.earnings[1].label, /Overtime \(10h at 1.5×\)/);
  assert.equal(snap.totalEarnings, 825_000);
  // the reviewer approves only one hour of overtime
  const approved = calculatePayroll(input({ compensation: base, sessions: worked([5, 6, 7, 8, 9], 600), review: review({ overtimeMinutes: 60 }) }));
  assert.equal(approved.pay?.overtimeAmount, 22_500);
  // without an overtime rate, extra time is not paid
  const unpaid = calculatePayroll(input({ compensation: { ...base, overtimePercent: null }, sessions: worked([5], 600) }));
  assert.equal(unpaid.pay?.overtimeAmount, 0);
  assert.equal(unpaid.earnings.length, 1);
});

test("monthly salary can pay overtime at the salary's hourly equivalent; a wage without a rate is blocked", () => {
  const monthly = { id: "c1", earnings: [{ label: "Basic", amount: 20_000_000 }], deductions: [], overtimePercent: 200 };
  const sessions = input().sessions.map((s, i) => i === 0 ? worked([1], 540)[0] : s);
  const snap = calculatePayroll(input({ compensation: monthly, sessions }));
  assert.equal(snap.earnings[0].amount, 20_000_000, "the salary itself is unchanged");
  assert.equal(snap.pay?.overtimeMinutes, 60);
  assert.equal(snap.pay?.overtimeRate, 161_290); // ₹2,00,000 / 31 days / 8 h × 2
  assert.equal(snap.earnings[1].amount, 161_290);
  // plain monthly salaries are paid exactly as before
  assert.deepEqual(calculatePayroll(input()).earnings.map((l) => l.amount), [14_000_000, 6_000_000]);
  const noRate = calculatePayroll(input({ compensation: { id: "c1", payBasis: "HOURLY", rate: null, earnings: [], deductions: [] } }));
  assert.ok(noRate.blockers.some((b) => /hourly rate/.test(b)));
});

test("a plain monthly salary hashes as before, so drafts reviewed earlier stay reviewed", () => {
  const row = { pay_basis: "MONTHLY", rate: null, standard_day_min: 480, overtime_pct: null } as Parameters<typeof termsSource>[0];
  assert.deepEqual(termsSource(row), {});
  assert.deepEqual(termsSource({ ...row, overtime_pct: 150 }), { pay: { payBasis: "MONTHLY", rate: null, standardDayMinutes: 480, overtimePercent: 150 } });
  assert.deepEqual(termsSource({ ...row, pay_basis: "DAILY", rate: 70_000n }).pay, { payBasis: "DAILY", rate: 70_000, standardDayMinutes: 480, overtimePercent: null });
});

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

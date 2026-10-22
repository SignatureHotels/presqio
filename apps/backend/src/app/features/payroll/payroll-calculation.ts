import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { PayrollLine, PayrollProfile, PayrollReview, PayrollSettings, PayrollSnapshot } from '@presqio/lib';
import { addDays, dateOnly, isoWeekday } from '../../common/time/zoned';

export const EMPTY_REVIEW: PayrollReview = { lopHalfDays: 0, acceptAttendanceExceptions: false, additionalEarnings: [], additionalDeductions: [], note: '' };
export const EMPTY_PROFILE: PayrollProfile = { department:'', dateOfBirth:'', pan:'', uan:'', esi:'', bankName:'', bankAccount:'', bankIfsc:'', bankBranch:'', lastWorkingDate:'' };
export function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(dateOnly(date).getTime()) && dateOnly(date).toISOString().slice(0,10) === date;
}
export function monthBounds(month: string) {
  if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('Choose a payroll month between 2000 and 2099.');
  const start = `${month}-01`;
  const next = new Date(`${start}T00:00:00Z`); next.setUTCMonth(next.getUTCMonth()+1);
  const end = addDays(next.toISOString().slice(0,10), -1);
  return { start, end, days: Number(end.slice(-2)) };
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const sourceHash = hash;
export function checkLines(lines: PayrollLine[]) {
  const labels = new Set<string>();
  for (const line of lines) {
    if (!line.label.trim() || !Number.isSafeInteger(line.amount) || line.amount < 0 || line.amount > 100_000_000_000)
      throw new BadRequestException('Salary amounts must be non-negative integer paise.');
    const key = line.label.trim().toLowerCase();
    if (labels.has(key)) throw new BadRequestException(`Duplicate salary component: ${line.label}`);
    labels.add(key);
  }
}
export interface CalculationInput {
  month: string; today: string; company: PayrollSettings;
  /** Pay period inside the month (YYYY-MM-DD); defaults to the whole month. A live month ends today. */
  period?: { from: string; to: string };
  employee: { id: string; code: string; name: string; designation: string; joinedOn: string; status: string };
  compensation: { id: string; earnings: PayrollLine[]; deductions: PayrollLine[] } | null;
  profile: PayrollProfile;
  sessions: { id:string; date:string; openedAt:string; closedAt:string|null }[];
  leaves: string[];
  assignments: { from:string; to:string|null; workingDays:number[] }[];
  pendingCorrections: number; review: PayrollReview;
  /** Pay-affecting inputs only; display details (names, company, bank) must not invalidate a review. */
  source: unknown;
}
export function calculatePayroll(input: CalculationInput): PayrollSnapshot {
  const { start, end, days } = monthBounds(input.month);
  const profile = input.profile;
  const blockers: string[] = [];
  if (!input.compensation) blockers.push('Salary is not configured for this month.');
  if (input.employee.status === 'TERMINATED' && !profile.lastWorkingDate) blockers.push('Set the employee’s last working date in their employee details.');
  const periodStart = input.period?.from ?? start, periodEnd = input.period?.to ?? end;
  const eligibleStart = input.employee.joinedOn > periodStart ? input.employee.joinedOn : periodStart;
  const eligibleEnd = profile.lastWorkingDate && profile.lastWorkingDate < periodEnd ? profile.lastWorkingDate : periodEnd;
  const eligibleDays = Math.max(0, Math.round((dateOnly(eligibleEnd).getTime()-dateOnly(eligibleStart).getTime())/86_400_000)+1);
  if (input.review.lopHalfDays > eligibleDays*2) throw new BadRequestException('Loss-of-pay days cannot exceed employed days in this month.');
  const paidHalfDays = eligibleDays*2-input.review.lopHalfDays;
  const sessions = input.sessions.filter(s => s.date >= eligibleStart && s.date <= eligibleEnd);
  const present = new Set(sessions.map(s => s.date));
  const leave = new Set(input.leaves.filter(d => d >= eligibleStart && d <= eligibleEnd));
  const missingDates: string[] = [];
  for (let date = eligibleStart; date <= eligibleEnd; date = addDays(date, 1)) {
    if (date > input.today || present.has(date) || leave.has(date)) continue;
    const assignment = input.assignments.find(a => a.from <= date && (!a.to || a.to >= date));
    if (!assignment || assignment.workingDays.includes(isoWeekday(date))) missingDates.push(date);
  }
  // Missing working days are a suggestion only: holidays and paid leave still need the admin's judgement.
  const suggestedLopHalfDays = Math.min(missingDates.length*2, eligibleDays*2);
  const earnings = (input.compensation?.earnings ?? []).map(line => ({ ...line,
    amount: Number((BigInt(line.amount)*BigInt(paidHalfDays)+BigInt(days))/BigInt(days*2)),
  })).concat(input.review.additionalEarnings);
  const deductions = [...(input.compensation?.deductions ?? []), ...input.review.additionalDeductions];
  checkLines(earnings); checkLines(deductions);
  const totalEarnings = earnings.reduce((sum,l) => sum+l.amount,0);
  const totalDeductions = deductions.reduce((sum,l) => sum+l.amount,0);
  if (totalDeductions > totalEarnings) blockers.push('Deductions exceed earnings; correct the salary or deductions.');
  return {
    version:1, month:input.month, periodStart, periodEnd, currency:'INR', company:input.company,
    employee: { id:input.employee.id, code:input.employee.code, name:input.employee.name, designation:input.employee.designation, joinedOn:input.employee.joinedOn },
    profile, compensationId:input.compensation?.id ?? null, daysInMonth:days, eligibleDays, paidDays:paidHalfDays/2, lopDays:input.review.lopHalfDays/2, suggestedLopHalfDays,
    attendance:{ presentDays:present.size, completedMinutes:sessions.reduce((sum,s) => sum+(s.closedAt ? Math.max(0,Math.round((Date.parse(s.closedAt)-Date.parse(s.openedAt))/60000)):0),0),
      missingDates, leaveDates:[...leave].sort(), openSessions:sessions.filter(s => !s.closedAt).length, pendingCorrections:input.pendingCorrections },
    earnings, deductions, totalEarnings, totalDeductions, netPayable:totalEarnings-totalDeductions,
    blockers, sourceHash:hash(input.source),
  };
}

/** Everything that stops one employee's draft payslip from being finalized, in the admin's words. */
export function itemIssues(saved: PayrollSnapshot, current: PayrollSnapshot, review: PayrollReview, reviewed: boolean): string[] {
  if (saved.sourceHash !== current.sourceHash)
    return [reviewed ? 'Salary or attendance changed after review. Refresh the draft and review again.' : 'Salary or attendance changed. Refresh the draft.'];
  const issues = [...current.blockers];
  if (!reviewed || !review.note.trim()) issues.push('Needs review.');
  const a = current.attendance;
  if (reviewed && (a.openSessions || a.pendingCorrections || a.missingDates.length || a.leaveDates.length) && !review.acceptAttendanceExceptions)
    issues.push('Attendance exceptions are not acknowledged.');
  return issues;
}
/** True when nothing about this employee's month needs a human decision. */
export function isClean(s: PayrollSnapshot) {
  const a = s.attendance;
  return !s.blockers.length && !a.openSessions && !a.pendingCorrections && !a.missingDates.length && !a.leaveDates.length;
}

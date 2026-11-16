import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { PayBasis, PayrollLine, PayrollPayDetails, PayrollProfile, PayrollReview, PayrollSettings, PayrollSnapshot, PayTerms } from '@presqio/lib';
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
  compensation: ({ id: string; earnings: PayrollLine[]; deductions: PayrollLine[] } & PayTerms) | null;
  profile: PayrollProfile;
  sessions: { id:string; date:string; openedAt:string; closedAt:string|null }[];
  /** Leave with no type (taken before leave types existed): the admin decides how it is paid. */
  leaves: string[];
  /** Typed leave: paid leave is paid; unpaid leave is suggested as loss of pay. */
  paidLeaves?: string[]; unpaidLeaves?: string[];
  /** The business's holidays: not working days, so never missing. */
  holidays?: string[];
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
  const inPeriod = (dates: string[] | undefined) => new Set((dates ?? []).filter(d => d >= eligibleStart && d <= eligibleEnd));
  const leave = inPeriod(input.leaves), paidLeave = inPeriod(input.paidLeaves), unpaidLeave = inPeriod(input.unpaidLeaves);
  const holidays = inPeriod(input.holidays);
  const missingDates: string[] = [];
  for (let date = eligibleStart; date <= eligibleEnd; date = addDays(date, 1)) {
    if (date > input.today || present.has(date) || leave.has(date) || paidLeave.has(date) || unpaidLeave.has(date) || holidays.has(date)) continue;
    const assignment = input.assignments.find(a => a.from <= date && (!a.to || a.to >= date));
    if (!assignment || assignment.workingDays.includes(isoWeekday(date))) missingDates.push(date);
  }
  const c = input.compensation;
  const basis: PayBasis = c?.payBasis ?? 'MONTHLY';
  const rate = basis === 'MONTHLY' ? null : (c?.rate ?? null);
  const standard = c?.standardDayMinutes ?? 480;
  const overtimePercent = c?.overtimePercent ?? null;
  if (c && basis !== 'MONTHLY' && !rate) blockers.push(`Set the ${basis === 'DAILY' ? 'daily' : 'hourly'} rate in this employee's salary.`);
  // Worked minutes per day (completed sessions only); time beyond a standard day is overtime.
  const dayMinutes = new Map<string, number>();
  for (const s of sessions) if (s.closedAt)
    dayMinutes.set(s.date, (dayMinutes.get(s.date) ?? 0) + Math.max(0, Math.round((Date.parse(s.closedAt)-Date.parse(s.openedAt))/60000)));
  const overtimeWorkedMinutes = [...dayMinutes.values()].reduce((sum, m) => sum + Math.max(0, m - standard), 0);
  const overtimeMinutes = overtimePercent === null ? 0 : (input.review.overtimeMinutes ?? overtimeWorkedMinutes);
  // Paid days off without work: paid leave and holidays.
  const paidOff = [...new Set([...paidLeave, ...holidays])].filter(d => !present.has(d)).length;
  const fixed = c?.earnings ?? [];
  let wageLines: PayrollLine[], units: number | null = null, hourlyBase: number, paidDays = paidHalfDays/2;
  if (basis === 'MONTHLY') {
    wageLines = fixed.map(line => ({ ...line, amount: Number((BigInt(line.amount)*BigInt(paidHalfDays)+BigInt(days))/BigInt(days*2)) }));
    hourlyBase = fixed.reduce((sum, l) => sum + l.amount, 0) / days / (standard/60);
  } else if (basis === 'DAILY') {
    const halfDays = Math.max(0, (present.size + paidOff)*2 - input.review.lopHalfDays);
    units = halfDays/2; paidDays = units;
    wageLines = [{ label: `Wages (${units} day${units === 1 ? '' : 's'} × ${rupees(rate ?? 0)})`, amount: Math.round((rate ?? 0)*units) }, ...fixed];
    hourlyBase = (rate ?? 0) / (standard/60);
  } else {
    const regular = Math.max(0, [...dayMinutes.values()].reduce((sum, m) => sum + Math.min(m, standard), 0) + paidOff*standard - input.review.lopHalfDays*standard/2);
    units = Math.round(regular/60*100)/100;
    paidDays = Math.max(0, present.size + paidOff - input.review.lopHalfDays/2);
    wageLines = [{ label: `Wages (${hoursLabel(regular)} × ${rupees(rate ?? 0)}/h)`, amount: Math.round((rate ?? 0)*regular/60) }, ...fixed];
    hourlyBase = rate ?? 0;
  }
  const overtimeRate = overtimePercent === null ? null : Math.round(hourlyBase*overtimePercent/100);
  const overtimeAmount = overtimeRate === null ? 0 : Math.round(overtimeRate*overtimeMinutes/60);
  if (overtimeAmount > 0) wageLines.push({ label: `Overtime (${hoursLabel(overtimeMinutes)} at ${overtimePercent!/100}×)`, amount: overtimeAmount });
  const pay: PayrollPayDetails = { basis, rate, units, standardDayMinutes: standard, overtimeWorkedMinutes, overtimeMinutes, overtimePercent, overtimeRate, overtimeAmount };
  // A suggestion only, never applied by itself: missing working days and unpaid leave. Holidays and paid
  // leave are paid; leave with no type still needs the admin's judgement. Daily and hourly wages already
  // pay only for days worked, so nothing is suggested.
  const suggestedLopHalfDays = basis === 'MONTHLY' ? Math.min((missingDates.length+unpaidLeave.size)*2, eligibleDays*2) : 0;
  const earnings = wageLines.concat(input.review.additionalEarnings);
  const deductions = [...(input.compensation?.deductions ?? []), ...input.review.additionalDeductions];
  checkLines(earnings); checkLines(deductions);
  const totalEarnings = earnings.reduce((sum,l) => sum+l.amount,0);
  const totalDeductions = deductions.reduce((sum,l) => sum+l.amount,0);
  if (totalDeductions > totalEarnings) blockers.push('Deductions exceed earnings; correct the salary or deductions.');
  return {
    version:1, month:input.month, periodStart, periodEnd, currency:'INR', company:input.company,
    employee: { id:input.employee.id, code:input.employee.code, name:input.employee.name, designation:input.employee.designation, joinedOn:input.employee.joinedOn },
    profile, compensationId:input.compensation?.id ?? null, daysInMonth:days, eligibleDays, paidDays, lopDays:input.review.lopHalfDays/2, suggestedLopHalfDays,
    attendance:{ presentDays:present.size, completedMinutes:sessions.reduce((sum,s) => sum+(s.closedAt ? Math.max(0,Math.round((Date.parse(s.closedAt)-Date.parse(s.openedAt))/60000)):0),0),
      missingDates, leaveDates:[...leave].sort(), openSessions:sessions.filter(s => !s.closedAt).length, pendingCorrections:input.pendingCorrections,
      holidayDates:[...holidays].sort(), paidLeaveDates:[...paidLeave].sort(), unpaidLeaveDates:[...unpaidLeave].sort() },
    earnings, deductions, totalEarnings, totalDeductions, netPayable:totalEarnings-totalDeductions,
    blockers, sourceHash:hash(input.source), pay,
  };
}

/** Everything that stops one employee's draft payslip from being finalized, in the admin's words. */
export function itemIssues(saved: PayrollSnapshot, current: PayrollSnapshot, review: PayrollReview, reviewed: boolean): string[] {
  if (saved.sourceHash !== current.sourceHash)
    return [reviewed ? 'Salary or attendance changed after review. Refresh the draft and review again.' : 'Salary or attendance changed. Refresh the draft.'];
  const issues = [...current.blockers];
  if (!reviewed || !review.note.trim()) issues.push('Needs review.');
  const a = current.attendance;
  if (reviewed && (a.openSessions || a.pendingCorrections || payMissing(current) || a.leaveDates.length || a.unpaidLeaveDates?.length) && !review.acceptAttendanceExceptions)
    issues.push('Attendance exceptions are not acknowledged.');
  return issues;
}
/** True when nothing about this employee's month needs a human decision. Holidays and paid leave
 *  within the allowance don't; unpaid leave does (its loss of pay should be applied). */
export function isClean(s: PayrollSnapshot) {
  const a = s.attendance;
  return !s.blockers.length && !a.openSessions && !a.pendingCorrections && !payMissing(s) && !a.leaveDates.length && !a.unpaidLeaveDates?.length;
}
/** Missing days matter to a monthly salary; daily and hourly wages simply don't pay for them. */
const payMissing = (s: PayrollSnapshot) => (!s.pay || s.pay.basis === 'MONTHLY') && s.attendance.missingDates.length > 0;
const rupees = (paise: number) => `₹${(paise/100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const hoursLabel = (minutes: number) => { const m = Math.round(minutes); return `${Math.floor(m/60)}h${m%60 ? ` ${m%60}m` : ''}`; };

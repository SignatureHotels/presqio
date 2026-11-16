/** All money is integer paise. Payroll access is restricted to organization owners/admins. */
export interface PayrollLine { label: string; amount: number }
export interface PayrollProfile {
  department: string; dateOfBirth: string; pan: string; uan: string; esi: string;
  bankName: string; bankAccount: string; bankIfsc: string; bankBranch: string; lastWorkingDate: string;
}
/** MONTHLY: a salary prorated by paid days. DAILY: a wage per day worked. HOURLY: a wage per hour worked. */
export type PayBasis = 'MONTHLY' | 'DAILY' | 'HOURLY';
/** How a salary version is paid. Absent fields mean a monthly salary with no overtime pay. */
export interface PayTerms {
  payBasis?: PayBasis;
  /** Paise per day (DAILY) or per hour (HOURLY); null for MONTHLY. */
  rate?: number | null;
  /** A normal working day in minutes; time beyond it is overtime. Default 480. */
  standardDayMinutes?: number;
  /** Overtime pay as a percentage of the hourly rate (100, 150, 200); null when not paid. */
  overtimePercent?: number | null;
}
export interface PayrollCompensation extends PayTerms {
  id: string; employeeId: string; effectiveMonth: string; earnings: PayrollLine[]; deductions: PayrollLine[];
}
/** A salary version: applies from the first day of `effectiveMonth` until the next version. For daily and
 *  hourly wages, `earnings` are fixed monthly allowances paid on top of the wage (often none). */
export interface PayrollSalaryInput extends PayTerms { effectiveMonth: string; earnings: PayrollLine[]; deductions: PayrollLine[] }
export interface SaveCompensationRequest extends PayrollSalaryInput { employeeId: string }
/** Payroll details saved with an employee; only organization owners/admins may send or read them. */
export interface EmployeePayrollInput { profile: PayrollProfile; salary?: PayrollSalaryInput }
export interface EmployeePayrollDetails { profile: PayrollProfile; compensations: PayrollCompensation[] }
export interface PayrollSettings { legalName: string; address: string; logoUrl: string }
export interface PayrollReview {
  lopHalfDays: number; acceptAttendanceExceptions: boolean; additionalEarnings: PayrollLine[]; additionalDeductions: PayrollLine[]; note: string;
  /** Overtime to pay instead of the minutes worked out from attendance; absent or null uses attendance. */
  overtimeMinutes?: number | null;
}
/** How this payslip's pay was worked out (absent on payslips made before daily and hourly pay). */
export interface PayrollPayDetails {
  basis: PayBasis;
  /** Paise per day or hour; null for MONTHLY. */
  rate: number | null;
  /** Days (DAILY) or hours (HOURLY) paid at the rate; null for MONTHLY. */
  units: number | null;
  standardDayMinutes: number;
  /** Overtime worked out from attendance, and what's paid (the reviewer may change it). */
  overtimeWorkedMinutes: number; overtimeMinutes: number;
  overtimePercent: number | null;
  /** Paise per overtime hour, after the percentage. */
  overtimeRate: number | null;
  overtimeAmount: number;
}
export interface PayrollSnapshot {
  version: 1; month: string; currency: 'INR'; company: PayrollSettings;
  /** Days covered (YYYY-MM-DD): the whole month, or up to today while the month is running. */
  periodStart: string; periodEnd: string;
  employee: { id: string; code: string; name: string; designation: string; joinedOn: string };
  profile: PayrollProfile; compensationId: string | null;
  daysInMonth: number; eligibleDays: number; paidDays: number; lopDays: number;
  /** (Missing past working days + unpaid leave) × 2; a starting point for the reviewer, never applied automatically. */
  suggestedLopHalfDays: number;
  attendance: {
    presentDays: number; completedMinutes: number; missingDates: string[];
    /** Leave with no type (taken before leave types existed): the admin decides how it is paid. */
    leaveDates: string[]; openSessions: number; pendingCorrections: number;
    /** Holidays and typed leave; absent in payslips made before leave types existed. */
    holidayDates?: string[]; paidLeaveDates?: string[]; unpaidLeaveDates?: string[];
  };
  earnings: PayrollLine[]; deductions: PayrollLine[]; totalEarnings: number; totalDeductions: number; netPayable: number;
  blockers: string[]; sourceHash: string;
  pay?: PayrollPayDetails;
}
export interface PayrollPayment { id: string; amount: number; reference: string; paidOn: string }
export interface PayrollItem {
  id: string; employeeId: string; snapshot: PayrollSnapshot; review: PayrollReview;
  reviewed: boolean; payments: PayrollPayment[];
  /** Draft only: what still blocks finalization for this employee (empty when ready). */
  issues: string[];
}
export interface PayrollRun {
  id: string; month: string; status: 'DRAFT' | 'FINALIZED'; createdAt: string; finalizedAt: string | null;
  items: PayrollItem[];
  /** Draft only: employees now eligible for this month but not yet in the draft (refresh adds them). */
  missingEmployees: { id: string; name: string; code: string }[];
}
/** Earnings for any dates within one month; calculated on request and never saved. */
export interface PayrollPreview { from: string; to: string; items: PayrollItem[] }
export interface PayrollRunSummary { id: string; month: string; status: 'DRAFT' | 'FINALIZED'; employees: number }
export interface PayrollSetup {
  settings: PayrollSettings; compensations: PayrollCompensation[];
  employees: { id: string; name: string; code: string; status: string }[];
}

/** All money is integer paise. Payroll access is restricted to organization owners/admins. */
export interface PayrollLine { label: string; amount: number }
export interface PayrollProfile {
  department: string; dateOfBirth: string; pan: string; uan: string; esi: string;
  bankName: string; bankAccount: string; bankIfsc: string; bankBranch: string; lastWorkingDate: string;
}
export interface PayrollCompensation {
  id: string; employeeId: string; effectiveMonth: string; earnings: PayrollLine[]; deductions: PayrollLine[];
}
/** A salary version: applies from the first day of `effectiveMonth` until the next version. */
export interface PayrollSalaryInput { effectiveMonth: string; earnings: PayrollLine[]; deductions: PayrollLine[] }
export interface SaveCompensationRequest extends PayrollSalaryInput { employeeId: string }
/** Payroll details saved with an employee; only organization owners/admins may send or read them. */
export interface EmployeePayrollInput { profile: PayrollProfile; salary?: PayrollSalaryInput }
export interface EmployeePayrollDetails { profile: PayrollProfile; compensations: PayrollCompensation[] }
export interface PayrollSettings { legalName: string; address: string; logoUrl: string }
export interface PayrollReview {
  lopHalfDays: number; acceptAttendanceExceptions: boolean; additionalEarnings: PayrollLine[]; additionalDeductions: PayrollLine[]; note: string;
}
export interface PayrollSnapshot {
  version: 1; month: string; currency: 'INR'; company: PayrollSettings;
  /** Days covered (YYYY-MM-DD): the whole month, or up to today while the month is running. */
  periodStart: string; periodEnd: string;
  employee: { id: string; code: string; name: string; designation: string; joinedOn: string };
  profile: PayrollProfile; compensationId: string | null;
  daysInMonth: number; eligibleDays: number; paidDays: number; lopDays: number;
  /** Missing past working days × 2; a starting point for the reviewer, never applied automatically. */
  suggestedLopHalfDays: number;
  attendance: { presentDays: number; completedMinutes: number; missingDates: string[]; leaveDates: string[]; openSessions: number; pendingCorrections: number };
  earnings: PayrollLine[]; deductions: PayrollLine[]; totalEarnings: number; totalDeductions: number; netPayable: number;
  blockers: string[]; sourceHash: string;
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

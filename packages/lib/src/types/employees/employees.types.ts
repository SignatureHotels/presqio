import type { AttendanceSnapshot } from "../attendance";
export interface EmployeeSummary {
  id: string;
  code: string;
  name: string;
  businessId: string;
  branchId: string;
  role: string;
  phone: string;
}
/** Public employee directory/attendance row; no credentials or image payloads. */
export interface EmployeeTableRow extends EmployeeSummary, AttendanceSnapshot {}

/** Account lifecycle; PENDING until the employee activates and their photo is approved. */
export type EmployeeAccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED";

/** An employee as returned by the API, with today's attendance snapshot. */
export interface EmployeeRecord extends EmployeeTableRow {
  accountStatus: EmployeeAccountStatus;
  /** True once the employee has signed in to the mobile app at least once. */
  hasLogin: boolean;
  /** Today's check-out time (local HH:mm), if any. */
  checkOut: string | null;
  /** Minutes today's check-out came before the shift's end. */
  earlyMinutes: number | null;
  /** Leave the employee has taken from today on (YYYY-MM-DD). */
  upcomingLeave: string[];
  /** Attempt id of today's latest check-in/out photo, for the admin to view. */
  latestPhotoAttemptId: string | null;
  /** Today's first check-in selfie and latest check-out selfie (attempt ids). */
  checkInPhotoAttemptId: string | null;
  checkOutPhotoAttemptId: string | null;
  email: string;
  shiftId: string | null;
  /** YYYY-MM-DD */
  joinedOn: string | null;
}
export interface CreateEmployeeRequest {
  fullName: string;
  /** Unique across all organizations; generated from the organization's prefix (SGH0001 …) when omitted. */
  code?: string;
  phone?: string;
  email?: string;
  jobTitle?: string;
  branchId: string;
  shiftId?: string;
  /** YYYY-MM-DD */
  joinedOn?: string;
}
export interface UpdateEmployeeRequest {
  fullName?: string;
  phone?: string;
  email?: string;
  jobTitle?: string;
  /** Moving branch closes the current assignment and opens a new one from now. */
  branchId?: string;
  /** null removes the shift assignment. */
  shiftId?: string | null;
  accountStatus?: Exclude<EmployeeAccountStatus, "PENDING">;
}

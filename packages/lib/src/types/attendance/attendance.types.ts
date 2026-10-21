export type AttendanceAction = "CHECK_IN" | "CHECK_OUT";
/** Display categories; persisted verification states are validated by the backend. */
export type AttendanceStatus =
  "Present" | "Late" | "Not checked in" | "On leave";
export interface AttendanceSnapshot {
  status: AttendanceStatus;
  checkIn: string | null;
}
export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  leave: number;
  waiting: number;
  rate: number;
}

export interface AttendanceDay {
  /** YYYY-MM-DD in the organization's time zone. */
  date: string;
  /** Short weekday, e.g. "Mon". */
  label: string;
  scheduled: number;
  present: number;
}
export interface BranchAttendance {
  branchId: string;
  name: string;
  total: number;
  present: number;
  rate: number;
}
export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
}
/** Everything the admin overview needs, computed from real records. */
export interface OverviewResponse {
  /** Today, YYYY-MM-DD in `timezone`. */
  date: string;
  timezone: string;
  summary: AttendanceSummary;
  days: AttendanceDay[];
  branches: BranchAttendance[];
  activity: ActivityItem[];
}

/** Attendance register: employee rows and calendar-date columns. */
export type RegisterStatus = "Present" | "Late" | "On leave" | "Rest day" | "No record" | "Not checked in" | "Scheduled" | "Not employed";
export interface RegisterSession {
  id: string;
  branchId: string;
  branchName: string;
  shiftName: string;
  checkIn: string;
  checkOut: string | null;
  minutesWorked: number | null;
  earlyMinutes: number | null;
  corrected: boolean;
  checkInPhotoAttemptId: string | null;
  checkOutPhotoAttemptId: string | null;
}
export interface RegisterDay {
  date: string;
  status: RegisterStatus;
  sessions: RegisterSession[];
  /** Completed sessions only; ongoing sessions are not estimated. */
  completedMinutes: number;
  /** Time between recorded sessions. This does not establish an approved break. */
  gapMinutes: number;
  leaveReason: string | null;
}
export interface RegisterEmployee {
  id: string;
  name: string;
  code: string;
  days: RegisterDay[];
}
export interface AttendanceRegisterResponse {
  from: string;
  to: string;
  timezone: string;
  dates: string[];
  employees: RegisterEmployee[];
  page: number;
  pageSize: number;
  totalEmployees: number;
}

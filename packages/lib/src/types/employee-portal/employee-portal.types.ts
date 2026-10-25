import type { AttendanceAction, AttendanceStatus } from "../attendance";
import type { Weekday } from "../shifts";

export interface EmployeeLoginRequest {
  /** Unique across all organizations, so it alone identifies the organization. */
  employeeCode: string;
}

export interface EmployeeBranchInfo {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  maxAccuracy: number;
}
export interface EmployeeShiftInfo {
  name: string;
  start: string;
  end: string;
  overnight: boolean;
  graceMinutes: number;
  workingDays: Weekday[];
}
export type EmployeeDayState = "NOT_CHECKED_IN" | "CHECKED_IN" | "CHECKED_OUT";

export interface EmployeeProfile {
  id: string;
  name: string;
  code: string;
  jobTitle: string;
  department: string;
  phone: string;
  email: string;
  /** YYYY-MM-DD, or null when not recorded. */
  joinedOn: string | null;
  dateOfBirth: string | null;
  organizationName: string;
  timezone: string;
  branch: EmployeeBranchInfo | null;
  shift: EmployeeShiftInfo | null;
  today: {
    /** YYYY-MM-DD in the organization's time zone. */
    date: string;
    state: EmployeeDayState;
    status: AttendanceStatus;
    /** Local HH:mm. */
    checkIn: string | null;
    checkOut: string | null;
    /** Minutes the last check-out came before the shift's end. */
    earlyMinutes: number | null;
    /** The employee took leave today (and hasn't checked in). */
    onLeave: boolean;
  };
}
export interface EmployeeSessionResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  profile: EmployeeProfile;
}

export interface StartAttemptRequest {
  action: AttendanceAction;
  /** Client-generated; repeating it returns the same attempt instead of a new one. */
  idempotencyKey: string;
}
export interface AttemptResponse {
  attemptId: string;
  action: AttendanceAction;
  expiresAt: string;
}
export interface SubmitAttemptRequest {
  latitude: number;
  longitude: number;
  /** Reported GPS accuracy radius in metres. */
  accuracy: number;
  /** When the phone took the GPS reading (ISO). */
  capturedAt: string;
  /** Live selfie as a data URL (image/jpeg or image/webp). */
  photo: string;
}
export type AttemptOutcomeReason =
  | "OUTSIDE_GEOFENCE"
  | "LOW_GPS_ACCURACY"
  | "STALE_LOCATION"
  | "NO_PERIMETER";
export type AttemptOutcome =
  | {
      accepted: true;
      action: AttendanceAction;
      time: string;
      distance: number;
      /** Check-out only: minutes before the shift's end. */
      earlyMinutes: number | null;
      profile: EmployeeProfile;
    }
  | {
      accepted: false;
      reason: AttemptOutcomeReason;
      message: string;
      distance: number | null;
      accuracy: number;
    };

export interface AttendanceHistoryDay {
  sessionId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  minutesWorked: number | null;
  status: AttendanceStatus;
  /** Minutes the check-out came before the shift's end. */
  earlyMinutes: number | null;
  branchName: string;
}

export interface TakeLeaveRequest {
  /** YYYY-MM-DD, today or later. */
  date: string;
  reason?: string;
}
export interface LeaveDay {
  id: string;
  date: string;
  reason: string;
  /** Today or later, and not checked in that day. */
  cancellable: boolean;
}

export interface EmployeeCorrectionRequest {
  sessionId: string;
  /** Local HH:mm on that work date. */
  requestedIn?: string;
  requestedOut?: string;
  reason: string;
}
export interface EmployeeCorrection {
  id: string;
  date: string;
  type: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  decisionReason?: string;
  submitted: string;
}

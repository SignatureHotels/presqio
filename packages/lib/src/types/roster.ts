import type { ShiftRecord, Weekday } from "./shifts/shifts.types";

/** A date set on the roster: the shifts worked (two or more = a split day), or a day off. */
export interface RosterDay {
  shiftIds: string[];
  off: boolean;
}
export interface RosterEmployee {
  id: string;
  name: string;
  code: string;
  branchId: string | null;
  /** The usual shift and weekly working days, used on dates not on the roster. */
  usualShiftId: string | null;
  workingDays: Weekday[] | null;
  /** Rostered dates only (YYYY-MM-DD); other dates follow the usual shift. */
  days: Record<string, RosterDay>;
}
export interface RosterResponse {
  from: string;
  to: string;
  dates: string[];
  shifts: ShiftRecord[];
  employees: RosterEmployee[];
  /** Business holidays in the range, by date. */
  holidays: Record<string, string>;
}
/** Sets one person's day. No shifts and `off: false` puts the day back on the usual shift. */
export interface RosterChange {
  employeeId: string;
  date: string;
  shiftIds: string[];
  off: boolean;
}
export interface SaveRosterRequest {
  changes: RosterChange[];
}
/** One day of an employee's own schedule. */
export interface EmployeeScheduleDay {
  date: string;
  /** Not expected to work: a rostered day off or a weekly off. */
  off: boolean;
  shifts: { name: string; start: string; end: string; overnight: boolean }[];
  /** Set on the roster (rather than the usual shift). */
  rostered: boolean;
  holiday: string | null;
  onLeave: boolean;
}

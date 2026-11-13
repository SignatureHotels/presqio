/** Holidays (days the whole business is off) and leave types with yearly allowances. */

export interface HolidayRecord {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  name: string;
}
export interface CreateHolidayRequest {
  date: string;
  name: string;
}

export interface LeaveTypeRecord {
  id: string;
  name: string;
  /** Paid leave isn't loss of pay; unpaid leave is suggested as loss of pay in payroll. */
  paid: boolean;
  /** Days each employee may take per calendar year; null means no limit. */
  daysPerYear: number | null;
  archived: boolean;
}
export interface CreateLeaveTypeRequest {
  name: string;
  paid: boolean;
  daysPerYear: number | null;
}
export interface UpdateLeaveTypeRequest {
  name?: string;
  paid?: boolean;
  daysPerYear?: number | null;
  archived?: boolean;
}

/** One employee's use of one leave type in a calendar year. */
export interface LeaveBalance {
  typeId: string;
  used: number;
  /** null when the type has no yearly limit */
  allowed: number | null;
  remaining: number | null;
}
export interface EmployeeLeaveBalances {
  employeeId: string;
  code: string;
  name: string;
  balances: LeaveBalance[];
  /** Leave taken before leave types existed, in this year. */
  untyped: number;
}
export interface LeaveBalancesResponse {
  year: number;
  types: LeaveTypeRecord[];
  employees: EmployeeLeaveBalances[];
}

/** What the employee sees when taking leave: the active types with their own balance this year. */
export interface EmployeeLeaveOptions {
  year: number;
  types: (LeaveTypeRecord & LeaveBalance)[];
  /** Upcoming holidays (the next 12 months). */
  holidays: HolidayRecord[];
}

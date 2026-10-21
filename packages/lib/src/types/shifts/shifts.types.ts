export interface Shift {
  id: string;
  businessId: string;
  name: string;
  start: string;
  end: string;
  breakMinutes: number;
  graceMinutes: number;
}
/** ISO weekday numbers: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface ShiftRecord extends Shift {
  overnight: boolean;
  workingDays: Weekday[];
}
export interface CreateShiftRequest {
  name: string;
  /** Local "HH:mm". An end at or before the start means the shift ends the next day. */
  start: string;
  end: string;
  graceMinutes?: number;
  breakMinutes?: number;
  workingDays?: Weekday[];
}
export type UpdateShiftRequest = Partial<CreateShiftRequest>;

import type {
  CreateHolidayRequest, CreateLeaveTypeRequest, HolidayRecord, LeaveBalancesResponse, LeaveTypeRecord, UpdateLeaveTypeRequest,
} from "@presqio/lib";
import { api } from "./client";

const base = (o: string, b: string) => `/organizations/${o}/businesses/${b}/time-off`;

/** Holidays and leave types (admin). */
export const timeOffApi = {
  holidays: (o: string, b: string, year: number) => api<HolidayRecord[]>(`${base(o, b)}/holidays?year=${year}`),
  addHoliday: (o: string, b: string, body: CreateHolidayRequest) => api<HolidayRecord>(`${base(o, b)}/holidays`, { method: "POST", body }),
  removeHoliday: (o: string, b: string, id: string) => api<void>(`${base(o, b)}/holidays/${id}`, { method: "DELETE" }),
  leaveTypes: (o: string, b: string) => api<LeaveTypeRecord[]>(`${base(o, b)}/leave-types`),
  createLeaveType: (o: string, b: string, body: CreateLeaveTypeRequest) =>
    api<LeaveTypeRecord>(`${base(o, b)}/leave-types`, { method: "POST", body }),
  updateLeaveType: (o: string, b: string, id: string, body: UpdateLeaveTypeRequest) =>
    api<LeaveTypeRecord>(`${base(o, b)}/leave-types/${id}`, { method: "PATCH", body }),
  balances: (o: string, b: string, year: number) => api<LeaveBalancesResponse>(`${base(o, b)}/balances?year=${year}`),
};

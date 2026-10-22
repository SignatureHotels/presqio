import type {
  LeaveDay,
  TakeLeaveRequest,
  AttemptOutcome,
  AttemptResponse,
  AttendanceHistoryDay,
  EmployeeCorrection,
  EmployeeCorrectionRequest,
  EmployeeLoginRequest,
  EmployeeProfile,
  EmployeeSessionResponse,
  StartAttemptRequest,
  SubmitAttemptRequest,
} from "@presqio/lib";
import { parse } from "./client";
import { request } from "./request";

import { API_BASE_URL as BASE } from "./config";

/**
 * The employee app's own session, separate from the admin one so both can be signed in on the
 * same browser. The access token lives in memory; the refresh token is the httpOnly
 * `presqio_ert` cookie scoped to /api/v1/employee-auth.
 */
let accessToken: string | null = null;
let refreshing: Promise<EmployeeSessionResponse | null> | null = null;
let onSessionChange: (session: EmployeeSessionResponse | null) => void = () => {};

export const subscribeToEmployeeSession = (listener: typeof onSessionChange) => {
  onSessionChange = listener;
  return () => { if (onSessionChange === listener) onSessionChange = () => {}; };
};

export const setEmployeeAccessToken = (token: string | null) => {
  accessToken = token;
};

export function refreshEmployeeSession(): Promise<EmployeeSessionResponse | null> {
  refreshing ??= request(`${BASE}/employee-auth/refresh`, { method: "POST", credentials: "include" }, async (response) => {
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          accessToken = null;
          onSessionChange(null);
        }
        return null;
      }
      const session = await parse<EmployeeSessionResponse>(response);
      accessToken = session.accessToken;
      onSessionChange(session);
      return session;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const send = (retry: boolean): Promise<T> =>
    request(`${BASE}${path}`, {
      method: init.method ?? "GET",
      credentials: "include",
      headers: {
        ...(init.body !== undefined && { "content-type": "application/json" }),
        ...(accessToken && { authorization: `Bearer ${accessToken}` }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }, async (response) => {
      if (retry && response.status === 401 && accessToken && !path.startsWith("/employee-auth/")) {
        if (await refreshEmployeeSession()) return send(false);
      }
      return parse<T>(response);
    });
  return send(true);
}

export const employeeApi = {
  login: (body: EmployeeLoginRequest) =>
    call<EmployeeSessionResponse>("/employee-auth/login", { method: "POST", body }),
  logout: () => call<void>("/employee-auth/logout", { method: "POST" }),
  me: () => call<EmployeeProfile>("/employee/me"),
  startAttempt: (body: StartAttemptRequest) =>
    call<AttemptResponse>("/employee/attendance/attempts", { method: "POST", body }),
  submitAttempt: (attemptId: string, body: SubmitAttemptRequest) =>
    call<AttemptOutcome>(`/employee/attendance/attempts/${attemptId}/submit`, { method: "POST", body }),
  history: () => call<AttendanceHistoryDay[]>("/employee/attendance/history"),
  corrections: () => call<EmployeeCorrection[]>("/employee/corrections"),
  requestCorrection: (body: EmployeeCorrectionRequest) =>
    call<EmployeeCorrection>("/employee/corrections", { method: "POST", body }),
  leaves: () => call<LeaveDay[]>("/employee/leave"),
  takeLeave: (body: TakeLeaveRequest) => call<LeaveDay>("/employee/leave", { method: "POST", body }),
  cancelLeave: (leaveId: string) => call<void>(`/employee/leave/${leaveId}`, { method: "DELETE" }),
};

import type {
  AccessibleBusiness,
  AttendanceRegisterResponse,
  Approval,
  CreateEmployeeRequest,
  DecideCorrectionRequest,
  EmployeeRecord,
  OverviewResponse,
  UpdateBranchRequest,
  UpdateEmployeeRequest,
  UpdateShiftRequest,
  AuthSessionResponse,
  BranchRecord,
  CreateBranchRequest,
  CreateOrganizationRequest,
  CreateShiftRequest,
  LoginRequest,
  MeResponse,
  OrganizationDetail,
  RegisterRequest,
  ShiftRecord,
  UpdateOrganizationRequest,
} from "@presqio/lib";
import { api, apiObjectUrl } from "./client";

export const authApi = {
  register: (body: RegisterRequest) =>
    api<AuthSessionResponse>("/auth/register", { method: "POST", body }),
  login: (body: LoginRequest) =>
    api<AuthSessionResponse>("/auth/login", { method: "POST", body }),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
  me: () => api<MeResponse>("/auth/me"),
  verifyEmail: (token: string) =>
    api<void>("/auth/verify-email", { method: "POST", body: { token } }),
  resendVerification: () =>
    api<void>("/auth/resend-verification", { method: "POST" }),
  forgotPassword: (email: string) =>
    api<void>("/auth/forgot-password", { method: "POST", body: { email } }),
  ownerSignInLink: (email: string) =>
    api<void>("/auth/owner/sign-in-link", { method: "POST", body: { email } }),
  ownerSignIn: (token: string) =>
    api<AuthSessionResponse>("/auth/owner/sign-in", { method: "POST", body: { token } }),
  resetPassword: (token: string, password: string) =>
    api<void>("/auth/reset-password", {
      method: "POST",
      body: { token, password },
    }),
};

export const organizationsApi = {
  create: (body: CreateOrganizationRequest) =>
    api<OrganizationDetail>("/organizations", { method: "POST", body }),
  get: (id: string) => api<OrganizationDetail>(`/organizations/${id}`),
  update: (id: string, body: UpdateOrganizationRequest) =>
    api<OrganizationDetail>(`/organizations/${id}`, { method: "PATCH", body }),
  businesses: (id: string) =>
    api<AccessibleBusiness[]>(`/organizations/${id}/businesses`),
};

const businessPath = (organizationId: string, businessId: string) =>
  `/organizations/${organizationId}/businesses/${businessId}`;

export const businessApi = {
  attendanceRegister: (o: string, b: string, query: { from: string; to: string; branchId?: string; search?: string; page: number }) => {
    const params = new URLSearchParams({ from: query.from, to: query.to, page: String(query.page) });
    if (query.branchId) params.set("branchId", query.branchId);
    if (query.search) params.set("search", query.search);
    return api<AttendanceRegisterResponse>(`${businessPath(o, b)}/attendance/register?${params}`);
  },
  branches: (organizationId: string, businessId: string) =>
    api<BranchRecord[]>(`${businessPath(organizationId, businessId)}/branches`),
  createBranch: (organizationId: string, businessId: string, body: CreateBranchRequest) =>
    api<BranchRecord>(`${businessPath(organizationId, businessId)}/branches`, {
      method: "POST",
      body,
    }),
  shifts: (organizationId: string, businessId: string) =>
    api<ShiftRecord[]>(`${businessPath(organizationId, businessId)}/shifts`),
  createShift: (organizationId: string, businessId: string, body: CreateShiftRequest) =>
    api<ShiftRecord>(`${businessPath(organizationId, businessId)}/shifts`, {
      method: "POST",
      body,
    }),
  updateBranch: (o: string, b: string, branchId: string, body: UpdateBranchRequest) =>
    api<BranchRecord>(`${businessPath(o, b)}/branches/${branchId}`, { method: "PATCH", body }),
  updateShift: (o: string, b: string, shiftId: string, body: UpdateShiftRequest) =>
    api<ShiftRecord>(`${businessPath(o, b)}/shifts/${shiftId}`, { method: "PATCH", body }),
  employees: (o: string, b: string) => api<EmployeeRecord[]>(`${businessPath(o, b)}/employees`),
  createEmployee: (o: string, b: string, body: CreateEmployeeRequest) =>
    api<EmployeeRecord>(`${businessPath(o, b)}/employees`, { method: "POST", body }),
  updateEmployee: (o: string, b: string, employeeId: string, body: UpdateEmployeeRequest) =>
    api<EmployeeRecord>(`${businessPath(o, b)}/employees/${employeeId}`, {
      method: "PATCH",
      body,
    }),
  /** Object URL for a check-in/out selfie; revoke it when no longer shown. */
  photoUrl: (o: string, b: string, attemptId: string) =>
    apiObjectUrl(`${businessPath(o, b)}/employees/photos/${attemptId}`),
  overview: (o: string, b: string) => api<OverviewResponse>(`${businessPath(o, b)}/overview`),
  corrections: (o: string, b: string) => api<Approval[]>(`${businessPath(o, b)}/corrections`),
  decideCorrection: (o: string, b: string, correctionId: string, body: DecideCorrectionRequest) =>
    api<Approval>(`${businessPath(o, b)}/corrections/${correctionId}/decision`, {
      method: "POST",
      body,
    }),
};

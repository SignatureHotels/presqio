import type { BusinessRole, OrganizationRole, SessionKind } from "@prisma/client";
import type { Request } from "express";

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  kind: SessionKind;
}
export interface RequestUser {
  userId: string;
  sessionId: string;
  kind: SessionKind;
}
export interface OrganizationContext {
  organizationId: string;
  role: OrganizationRole;
}
export interface BusinessContext {
  businessId: string;
  /** The caller's business membership role; null when access comes from OWNER/ADMIN. */
  role: BusinessRole | null;
}
/** The signed-in employee (mobile app sessions only). */
export interface EmployeeContext {
  userId: string;
  employeeId: string;
  businessId: string;
  organizationId: string;
}
export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  organization?: OrganizationContext;
  business?: BusinessContext;
  employee?: EmployeeContext;
}

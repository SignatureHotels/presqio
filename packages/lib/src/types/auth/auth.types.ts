import type { ISODateTime } from "../common";
import type { BusinessSummary, OrganizationSummary } from "../businesses";

export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";
export type BusinessRole = "BUSINESS_ADMIN" | "BRANCH_MANAGER" | "VIEWER";

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface ForgotPasswordRequest {
  email: string;
}
export interface ResetPasswordRequest {
  token: string;
  password: string;
}
export interface VerifyEmailRequest {
  token: string;
}

export interface CurrentUser {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  /** Presqio staff who may open the owner console (/owner). */
  isPlatformOwner?: boolean;
}
/** A business the user can open, with the role that grants access. */
export interface AccessibleBusiness extends BusinessSummary {
  /** null when access comes from the organization OWNER/ADMIN role. */
  businessRole: BusinessRole | null;
}
export interface OrganizationAccess extends OrganizationSummary {
  role: OrganizationRole;
  /** Active branches across the organization. */
  branchCount: number;
  businesses: AccessibleBusiness[];
}
export interface MeResponse {
  user: CurrentUser;
  organizations: OrganizationAccess[];
  /** Names of the user's organizations that Presqio has suspended (they can't be opened). */
  suspendedOrganizations?: string[];
}
/** Returned by register, login and refresh. The refresh token is only ever in an httpOnly cookie. */
export interface AuthSessionResponse extends MeResponse {
  accessToken: string;
  accessTokenExpiresAt: ISODateTime;
}

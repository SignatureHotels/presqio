import type { ISODateTime } from "../common";

export type OnboardingStep =
  | "ORGANIZATION"
  | "BUSINESS"
  | "BRANCH"
  | "SHIFT"
  | "TEAM"
  | "COMPLETED";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface Business {
  id: string;
  name: string;
}
export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  code: string;
  timezone: string;
  /** Start of generated employee IDs, e.g. "SGH" → SGH0001. Unique across organizations. */
  employeeIdPrefix: string;
}
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  onboardingStep: OnboardingStep;
}
export interface PlanLimits {
  maxBusinesses: number | null;
  maxBranches: number | null;
  maxEmployees: number | null;
}
export interface SubscriptionSummary {
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  trialEndsAt: ISODateTime | null;
  limits: PlanLimits;
}
export interface OrganizationDetail extends OrganizationSummary {
  country: string;
  defaultTimezone: string;
  onboardingCompletedAt: ISODateTime | null;
  /**
   * The record that holds this organization's branches and shifts. Null only for organizations created before branches moved here.
   */
  defaultBusiness: BusinessSummary | null;
  subscription: SubscriptionSummary | null;
}
export interface CreateOrganizationRequest {
  name: string;
  country?: string;
  defaultTimezone?: string;
}
export interface UpdateOrganizationRequest {
  name?: string;
  country?: string;
  defaultTimezone?: string;
  onboardingStep?: OnboardingStep;
}

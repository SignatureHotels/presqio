import type { ISODateTime } from "./common";

/** Where a client stands commercially, derived from its subscription and organization status. */
export type ClientState =
  | "TRIAL"
  | "TRIAL_ENDING"
  | "TRIAL_EXPIRED"
  | "PAYING"
  | "PAYMENT_DUE"
  | "CANCELED"
  | "SUSPENDED";

export type SubscriptionStatusCode = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface OwnerPlan {
  code: string;
  name: string;
  monthlyPriceMinor: number;
  currency: string;
  maxBusinesses: number | null;
  maxBranches: number | null;
  maxEmployees: number | null;
}

export interface OwnerClientContact {
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  lastLoginAt: ISODateTime | null;
}

/** One row of the owner console's client table. */
export interface OwnerClient {
  id: string;
  name: string;
  createdAt: ISODateTime;
  suspended: boolean;
  state: ClientState;
  owner: OwnerClientContact | null;
  plan: { code: string; name: string } | null;
  subscriptionStatus: SubscriptionStatusCode | null;
  trialEndsAt: ISODateTime | null;
  paidUntil: ISODateTime | null;
  onboardingDone: boolean;
  businesses: number;
  branches: number;
  employees: number;
  checkins7d: number;
  lastActivityAt: ISODateTime | null;
}

export interface OwnerClientList {
  clients: OwnerClient[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OwnerOverview {
  clients: number;
  newLast7Days: number;
  newLast30Days: number;
  byState: Record<ClientState, number>;
  businesses: number;
  branches: number;
  employees: number;
  activeToday: number;
  verifiedOwners: number;
  /** Sign-ups per day for the last 30 days, oldest first (YYYY-MM-DD in India time). */
  signups: { date: string; count: number }[];
  /** Monthly value of paying clients at list price, in minor units (paise). */
  monthlyRevenueMinor: number;
}

export interface OwnerClientDetail extends OwnerClient {
  slug: string;
  timezone: string;
  admins: OwnerClientContact[];
  businessesList: {
    id: string;
    name: string;
    code: string;
    industry: string | null;
    address: string | null;
    branches: { id: string; name: string; address: string | null; active: boolean }[];
    employees: number;
  }[];
  /** Check-ins per day for the last 14 days, oldest first. */
  checkinsByDay: { date: string; count: number }[];
  payrollRuns: number;
  lastPayrollMonth: string | null;
  history: { at: ISODateTime; action: string; detail: string }[];
}

export interface UpdateClientSubscriptionRequest {
  planCode?: string;
  status?: SubscriptionStatusCode;
  /** End of the free trial (sets the status to TRIALING when given). */
  trialEndsAt?: ISODateTime;
  /** Paid until this date (sets the status to ACTIVE when given). */
  paidUntil?: ISODateTime;
}

/**
 * What someone on the team can do:
 * ADMIN: everything, including payroll, settings and the team.
 * MANAGER: run their branches (employees, attendance, approvals, roster).
 * VIEWER: see their branches, change nothing.
 */
export type TeamAccess = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";
export type InvitableAccess = Exclude<TeamAccess, "OWNER">;

export interface TeamMember {
  userId: string;
  name: string;
  email: string | null;
  access: TeamAccess;
  /** For managers and viewers: their branches (empty = every branch). */
  branchIds: string[];
  you: boolean;
  joinedAt: string;
}
export interface TeamInvitation {
  id: string;
  email: string;
  access: InvitableAccess;
  branchIds: string[];
  invitedBy: string | null;
  expiresAt: string;
  createdAt: string;
}
export interface TeamResponse {
  members: TeamMember[];
  invitations: TeamInvitation[];
}
export interface InviteRequest {
  email: string;
  access: InvitableAccess;
  /** Managers and viewers only; empty = every branch. */
  branchIds?: string[];
}
export interface UpdateMemberRequest {
  access: InvitableAccess;
  branchIds?: string[];
}

/** What the invite link shows before it's accepted. */
export interface InvitationPreview {
  organizationName: string;
  email: string;
  access: InvitableAccess;
  branchNames: string[];
  invitedBy: string | null;
  /** An account with this email exists: sign in to accept. Otherwise create one. */
  accountExists: boolean;
}
export interface AcceptInvitationRequest {
  token: string;
}
export interface RegisterWithInvitationRequest {
  token: string;
  fullName: string;
  password: string;
}

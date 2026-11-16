import type {
  InvitationPreview, InviteRequest, TeamInvitation, TeamMember, TeamResponse, UpdateMemberRequest,
} from "@presqio/lib";
import { api } from "./client";

const base = (o: string) => `/organizations/${o}/team`;

/** The people who run a workspace, and invitations (owners and admins). */
export const teamApi = {
  list: (o: string) => api<TeamResponse>(base(o)),
  invite: (o: string, body: InviteRequest) => api<TeamInvitation>(`${base(o)}/invitations`, { method: "POST", body }),
  resend: (o: string, id: string) => api<TeamInvitation>(`${base(o)}/invitations/${id}/resend`, { method: "POST" }),
  revoke: (o: string, id: string) => api<void>(`${base(o)}/invitations/${id}`, { method: "DELETE" }),
  update: (o: string, userId: string, body: UpdateMemberRequest) => api<TeamMember>(`${base(o)}/members/${userId}`, { method: "PATCH", body }),
  remove: (o: string, userId: string) => api<void>(`${base(o)}/members/${userId}`, { method: "DELETE" }),
};

/** The invite link. */
export const invitationsApi = {
  preview: (token: string) => api<InvitationPreview>("/invitations/preview", { method: "POST", body: { token } }),
  accept: (token: string) => api<{ organizationId: string }>("/invitations/accept", { method: "POST", body: { token } }),
};

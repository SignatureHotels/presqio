import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException } from "@nestjs/common";
import type { BusinessRole, OrganizationRole, Prisma } from "@prisma/client";
import type { InvitableAccess, InvitationPreview, InviteRequest, TeamAccess, TeamInvitation, TeamMember, TeamResponse, UpdateMemberRequest } from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { mailTemplates } from "../../common/mail/mail-templates";
import { MailService } from "../../common/mail/mail.service";
import { createOpaqueToken, hashToken } from "../../common/security/tokens";
import { AuditService } from "../audit/audit.service";

const INVITE_TTL_MS = 7 * 86_400_000;
const LABEL: Record<InvitableAccess, string> = { ADMIN: "an admin", MANAGER: "a branch manager", VIEWER: "a viewer" };

/** The roles behind each access level. */
export function rolesFor(access: InvitableAccess): { organization: OrganizationRole; business: BusinessRole | null } {
  return access === "ADMIN" ? { organization: "ADMIN", business: null }
    : { organization: "MEMBER", business: access === "MANAGER" ? "BRANCH_MANAGER" : "VIEWER" };
}
/** The access level a person's roles add up to. */
export function accessOf(organization: OrganizationRole, business: BusinessRole | null | undefined): TeamAccess {
  if (organization === "OWNER") return "OWNER";
  if (organization === "ADMIN") return "ADMIN";
  return business === "VIEWER" ? "VIEWER" : "MANAGER";
}

type Tx = Prisma.TransactionClient;
type Invitation = Prisma.invitationsGetPayload<object>;

/** Owners and admins bring people in, choose what they can do, and take access away. */
@Injectable()
export class TeamService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async team(organizationId: string, actorId: string): Promise<TeamResponse> {
    const business = await this.business(organizationId);
    const [members, invitations] = await Promise.all([
      this.db.organization_memberships.findMany({
        where: { organization_id: organizationId, status: "ACTIVE" },
        include: { user_id_ref: { select: { display_name: true, email: true } } },
        orderBy: { created_at: "asc" },
      }),
      this.db.invitations.findMany({
        where: { organization_id: organizationId, accepted_at: null, revoked_at: null, expires_at: { gt: new Date() } },
        include: { invited_by_ref: { select: { display_name: true } } },
        orderBy: { created_at: "desc" },
      }),
    ]);
    const roles = business ? await this.db.business_memberships.findMany({
      where: { business_id: business.id, user_id: { in: members.map((m) => m.user_id) } },
      include: { branch_scope_rows: { select: { branch_id: true } } },
    }) : [];
    const order: Record<TeamAccess, number> = { OWNER: 0, ADMIN: 1, MANAGER: 2, VIEWER: 3 };
    const rows: TeamMember[] = members.map((m) => {
      const role = roles.find((r) => r.user_id === m.user_id);
      return {
        userId: m.user_id, name: m.user_id_ref.display_name, email: m.user_id_ref.email,
        access: accessOf(m.role, role?.role), branchIds: m.role === "MEMBER" ? role?.branch_scope_rows.map((b) => b.branch_id) ?? [] : [],
        you: m.user_id === actorId, joinedAt: m.created_at.toISOString(),
      };
    }).sort((a, b) => order[a.access] - order[b.access] || a.name.localeCompare(b.name));
    return { members: rows, invitations: invitations.map((i) => toInvitation(i, i.invited_by_ref.display_name)) };
  }

  async invite(org: OrganizationContext, actor: RequestUser, dto: InviteRequest): Promise<TeamInvitation> {
    const inviter = await this.db.users.findUniqueOrThrow({ where: { id: actor.userId }, select: { display_name: true, email_verified_at: true } });
    if (!inviter.email_verified_at) throw new ForbiddenException("Verify your email before inviting people. We sent you a link when you signed up.");
    const already = await this.db.organization_memberships.findFirst({
      where: { organization_id: org.organizationId, status: "ACTIVE", user_id_ref: { email: dto.email } }, select: { id: true },
    });
    if (already) throw new ConflictException("That person is already on your team. Change their access instead.");
    const business = await this.business(org.organizationId);
    const branchIds = await this.checkBranches(business?.id, dto.access, dto.branchIds);
    const roles = rolesFor(dto.access);
    if (roles.business && !business) throw new BadRequestException("Set up your workspace before inviting branch managers.");
    const token = createOpaqueToken();
    const row = await this.db.$transaction(async (tx) => {
      // one pending invitation per email: a new one replaces the old
      await tx.invitations.updateMany({
        where: { organization_id: org.organizationId, email: dto.email, accepted_at: null, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      const created = await tx.invitations.create({
        data: {
          organization_id: org.organizationId, email: dto.email, organization_role: roles.organization,
          business_id: roles.business ? business!.id : null, business_role: roles.business, branch_ids: branchIds,
          token_hash: hashToken(token), invited_by: actor.userId, expires_at: new Date(Date.now() + INVITE_TTL_MS),
        },
      });
      await this.audit.record({ organizationId: org.organizationId, businessId: business?.id, actorId: actor.userId,
        objectType: "invitation", objectId: created.id, action: "created", after: { email: dto.email, access: dto.access, branches: branchIds.length } }, tx);
      return created;
    });
    await this.send(row, token, inviter.display_name);
    return toInvitation(row, inviter.display_name);
  }

  async resend(org: OrganizationContext, actor: RequestUser, invitationId: string): Promise<TeamInvitation> {
    const current = await this.pending(org.organizationId, invitationId);
    const inviter = await this.db.users.findUniqueOrThrow({ where: { id: actor.userId }, select: { display_name: true } });
    const token = createOpaqueToken();
    const row = await this.db.invitations.update({
      where: { id: current.id }, data: { token_hash: hashToken(token), expires_at: new Date(Date.now() + INVITE_TTL_MS) },
    });
    await this.send(row, token, inviter.display_name);
    return toInvitation(row, inviter.display_name);
  }

  async revoke(org: OrganizationContext, actor: RequestUser, invitationId: string): Promise<void> {
    const current = await this.pending(org.organizationId, invitationId);
    await this.db.invitations.update({ where: { id: current.id }, data: { revoked_at: new Date() } });
    await this.audit.record({ organizationId: org.organizationId, actorId: actor.userId, objectType: "invitation", objectId: current.id, action: "revoked", after: { email: current.email } });
  }

  async updateMember(org: OrganizationContext, actor: RequestUser, userId: string, dto: UpdateMemberRequest): Promise<TeamMember> {
    const membership = await this.member(org.organizationId, actor, userId);
    const business = await this.business(org.organizationId);
    const branchIds = await this.checkBranches(business?.id, dto.access, dto.branchIds);
    const roles = rolesFor(dto.access);
    await this.db.$transaction(async (tx) => {
      await tx.organization_memberships.update({ where: { id: membership.id }, data: { role: roles.organization } });
      if (business) await this.setBusinessRole(tx, business.id, userId, roles.business, branchIds);
      await this.audit.record({ organizationId: org.organizationId, businessId: business?.id, actorId: actor.userId,
        objectType: "team_member", objectId: userId, action: "updated", after: { access: dto.access, branches: branchIds.length } }, tx);
    });
    return (await this.team(org.organizationId, actor.userId)).members.find((m) => m.userId === userId)!;
  }

  async removeMember(org: OrganizationContext, actor: RequestUser, userId: string): Promise<void> {
    const membership = await this.member(org.organizationId, actor, userId);
    const businesses = await this.db.businesses.findMany({ where: { organization_id: org.organizationId }, select: { id: true } });
    await this.db.$transaction(async (tx) => {
      for (const b of businesses) await this.setBusinessRole(tx, b.id, userId, null, []);
      await tx.organization_memberships.delete({ where: { id: membership.id } });
      await this.audit.record({ organizationId: org.organizationId, actorId: actor.userId, objectType: "team_member", objectId: userId, action: "removed" }, tx);
    });
  }

  // ── accepting ───────────────────────────────────────────────────────────

  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.byToken(token);
    const [organization, inviter, branches, account] = await Promise.all([
      this.db.organizations.findUniqueOrThrow({ where: { id: invitation.organization_id }, select: { name: true } }),
      this.db.users.findUnique({ where: { id: invitation.invited_by }, select: { display_name: true } }),
      invitation.branch_ids.length ? this.db.branches.findMany({ where: { id: { in: invitation.branch_ids } }, select: { name: true } }) : [],
      this.db.users.findFirst({ where: { email: invitation.email }, select: { id: true } }),
    ]);
    return {
      organizationName: organization.name, email: invitation.email, access: accessOf(invitation.organization_role, invitation.business_role) as InvitableAccess,
      branchNames: branches.map((b) => b.name), invitedBy: inviter?.display_name ?? null, accountExists: Boolean(account),
    };
  }

  /** A signed-in user accepts an invitation sent to their email. */
  async accept(userId: string, token: string): Promise<{ organizationId: string }> {
    const invitation = await this.byToken(token);
    const user = await this.db.users.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    if (user.email?.toLowerCase() !== invitation.email)
      throw new ForbiddenException(`This invitation is for ${invitation.email}. Sign in with that email to accept it.`);
    await this.db.$transaction((tx) => this.join(tx, invitation, userId));
    return { organizationId: invitation.organization_id };
  }

  async byToken(token: string): Promise<Invitation> {
    const invitation = await this.db.invitations.findUnique({ where: { token_hash: hashToken(token) } });
    if (!invitation || invitation.revoked_at) throw new NotFoundException("This invitation isn't valid any more. Ask for a new one.");
    if (invitation.accepted_at) throw new GoneException("This invitation was already accepted. Sign in to continue.");
    if (invitation.expires_at <= new Date()) throw new GoneException("This invitation has expired. Ask for a new one.");
    return invitation;
  }

  /** Gives the user the invitation's access, inside the caller's transaction (also used at sign-up). */
  async join(tx: Tx, invitation: Invitation, userId: string) {
    const { count } = await tx.invitations.updateMany({ where: { id: invitation.id, accepted_at: null, revoked_at: null }, data: { accepted_at: new Date() } });
    if (!count) throw new GoneException("This invitation was already used.");
    const existing = await tx.organization_memberships.findUnique({ where: { organization_id_user_id: { organization_id: invitation.organization_id, user_id: userId } } });
    if (existing?.role === "OWNER") return;
    if (existing) await tx.organization_memberships.update({ where: { id: existing.id }, data: { role: invitation.organization_role, status: "ACTIVE" } });
    else await tx.organization_memberships.create({ data: { organization_id: invitation.organization_id, user_id: userId, role: invitation.organization_role } });
    if (invitation.business_id) await this.setBusinessRole(tx, invitation.business_id, userId, invitation.business_role, invitation.branch_ids);
    await this.audit.record({ organizationId: invitation.organization_id, businessId: invitation.business_id ?? undefined, actorId: userId,
      objectType: "invitation", objectId: invitation.id, action: "accepted" }, tx);
  }

  // ── internals ───────────────────────────────────────────────────────────

  private async setBusinessRole(tx: Tx, businessId: string, userId: string, role: BusinessRole | null, branchIds: string[]) {
    const current = await tx.business_memberships.findUnique({ where: { business_id_user_id: { business_id: businessId, user_id: userId } } });
    if (current) await tx.business_membership_branches.deleteMany({ where: { membership_id: current.id } });
    if (!role) {
      if (current) await tx.business_memberships.delete({ where: { id: current.id } });
      return;
    }
    const membership = current
      ? await tx.business_memberships.update({ where: { id: current.id }, data: { role } })
      : await tx.business_memberships.create({ data: { business_id: businessId, user_id: userId, role } });
    if (branchIds.length)
      await tx.business_membership_branches.createMany({ data: branchIds.map((branch_id) => ({ business_id: businessId, membership_id: membership.id, branch_id })) });
  }

  private async checkBranches(businessId: string | undefined, access: InvitableAccess, branchIds: string[] = []) {
    if (access === "ADMIN") return [];
    const ids = [...new Set(branchIds)];
    if (!ids.length) {
      if (access === "MANAGER") throw new BadRequestException("Choose the branches this manager runs.");
      return [];
    }
    const found = businessId ? await this.db.branches.count({ where: { business_id: businessId, id: { in: ids } } }) : 0;
    if (found !== ids.length) throw new BadRequestException("One of those branches isn't in this workspace.");
    return ids;
  }

  private async member(organizationId: string, actor: RequestUser, userId: string) {
    if (userId === actor.userId) throw new BadRequestException("You can't change your own access. Ask another admin.");
    const membership = await this.db.organization_memberships.findUnique({ where: { organization_id_user_id: { organization_id: organizationId, user_id: userId } } });
    if (!membership || membership.status !== "ACTIVE") throw new NotFoundException("Team member not found");
    if (membership.role === "OWNER") throw new ForbiddenException("The owner's access can't be changed.");
    return membership;
  }

  private async pending(organizationId: string, invitationId: string) {
    const row = await this.db.invitations.findFirst({ where: { id: invitationId, organization_id: organizationId, accepted_at: null, revoked_at: null } });
    if (!row) throw new NotFoundException("Invitation not found");
    return row;
  }

  private business(organizationId: string) {
    return this.db.businesses.findFirst({ where: { organization_id: organizationId }, orderBy: { created_at: "asc" }, select: { id: true } });
  }

  private async send(row: Invitation, token: string, inviter: string) {
    const [organization, branches] = await Promise.all([
      this.db.organizations.findUniqueOrThrow({ where: { id: row.organization_id }, select: { name: true } }),
      row.branch_ids.length ? this.db.branches.findMany({ where: { id: { in: row.branch_ids } }, select: { name: true } }) : [],
    ]);
    const access = accessOf(row.organization_role, row.business_role) as InvitableAccess;
    this.mail.queue(row.email, mailTemplates.invitation({
      inviter, organizationName: organization.name, access: LABEL[access],
      branches: branches.map((b) => b.name).join(", "), acceptUrl: this.mail.link("/invite", token),
    }));
  }
}

function toInvitation(row: Invitation, invitedBy: string | null): TeamInvitation {
  return {
    id: row.id, email: row.email, access: accessOf(row.organization_role, row.business_role) as InvitableAccess,
    branchIds: row.branch_ids, invitedBy, expiresAt: row.expires_at.toISOString(), createdAt: row.created_at.toISOString(),
  };
}

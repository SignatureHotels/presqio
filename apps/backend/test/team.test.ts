import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { accessOf, rolesFor, TeamService } from "../src/app/features/team/team.service";
import { BusinessAccessGuard } from "../src/app/common/auth/business-access.guard";
import { assertBranchInScope, employeesInScope } from "../src/app/common/auth/branch-scope";
import { hashToken } from "../src/app/common/security/tokens";
import type { DatabaseService } from "../src/app/common/database/database.service";
import type { AuditService } from "../src/app/features/audit/audit.service";
import type { MailService } from "../src/app/common/mail/mail.service";

const audit = { async record() {} } as unknown as AuditService;
const mail = { queue() {}, link: (p: string, t: string) => `https://app${p}?token=${t}` } as unknown as MailService;
const org = { organizationId: "org", role: "OWNER" as const };
const actor = { userId: "owner", sessionId: "s", kind: "ADMIN" as const };

test("access levels map to organization and business roles both ways", () => {
  assert.deepEqual(rolesFor("ADMIN"), { organization: "ADMIN", business: null });
  assert.deepEqual(rolesFor("MANAGER"), { organization: "MEMBER", business: "BRANCH_MANAGER" });
  assert.deepEqual(rolesFor("VIEWER"), { organization: "MEMBER", business: "VIEWER" });
  for (const access of ["ADMIN", "MANAGER", "VIEWER"] as const) {
    const r = rolesFor(access);
    assert.equal(accessOf(r.organization, r.business), access);
  }
  assert.equal(accessOf("OWNER", null), "OWNER");
});

test("inviting needs a verified email, a new person, and branches for a manager", async () => {
  let created: Record<string, unknown> | undefined; let mailed = "";
  const db = (verified: boolean, member: boolean, branches = 1) => ({
    users: { async findUniqueOrThrow() { return { display_name: "Owner", email_verified_at: verified ? new Date() : null }; } },
    organization_memberships: { async findFirst() { return member ? { id: "m" } : null; } },
    businesses: { async findFirst() { return { id: "biz" }; } },
    branches: { async count() { return branches; }, async findMany() { return [{ name: "MG Road" }]; } },
    organizations: { async findUniqueOrThrow() { return { name: "Sri Ganesh" }; } },
    $transaction: (fn: (t: unknown) => unknown) => fn({
      invitations: {
        async updateMany() { return { count: 0 }; },
        async create({ data }: { data: Record<string, unknown> }) { created = data; return { id: "inv", created_at: new Date(), ...data }; },
      },
    }),
  });
  const service = (d: unknown) => new TeamService(d as DatabaseService, audit, { ...mail, queue: (to: string) => { mailed = to; } } as unknown as MailService);
  await assert.rejects(service(db(false, false)).invite(org, actor, { email: "ravi@x.in", access: "ADMIN" }), /Verify your email/);
  await assert.rejects(service(db(true, true)).invite(org, actor, { email: "ravi@x.in", access: "ADMIN" }), /already on your team/);
  await assert.rejects(service(db(true, false)).invite(org, actor, { email: "ravi@x.in", access: "MANAGER" }), /Choose the branches/);
  await assert.rejects(service(db(true, false, 0)).invite(org, actor, { email: "ravi@x.in", access: "MANAGER", branchIds: ["11111111-1111-4111-8111-111111111111"] }), /isn't in this workspace/);
  const invitation = await service(db(true, false)).invite(org, actor, { email: "ravi@x.in", access: "MANAGER", branchIds: ["11111111-1111-4111-8111-111111111111"] });
  assert.equal(invitation.access, "MANAGER");
  assert.equal(created?.organization_role, "MEMBER");
  assert.equal(created?.business_role, "BRANCH_MANAGER");
  assert.deepEqual(created?.branch_ids, ["11111111-1111-4111-8111-111111111111"]);
  assert.notEqual(created?.token_hash, undefined);
  assert.equal(mailed, "ravi@x.in");
});

test("an invitation is accepted only by its email, once, and gives the invited branches", async () => {
  const invitation = { id: "inv", organization_id: "org", email: "ravi@x.in", organization_role: "MEMBER", business_id: "biz", business_role: "BRANCH_MANAGER",
    branch_ids: ["b1", "b2"], token_hash: hashToken("good-token-good-token"), invited_by: "owner", expires_at: new Date(Date.now() + 1e6), accepted_at: null, revoked_at: null };
  let branchRows: unknown[] = []; let joined = 0;
  const tx = {
    invitations: { async updateMany() { return { count: joined++ === 0 ? 1 : 0 }; } },
    organization_memberships: { async findUnique() { return null; }, async create({ data }: { data: { role: string } }) { assert.equal(data.role, "MEMBER"); } },
    business_memberships: { async findUnique() { return null; }, async create() { return { id: "bm" }; } },
    business_membership_branches: { async createMany({ data }: { data: unknown[] }) { branchRows = data; } },
  };
  const db = (email: string) => ({
    invitations: { async findUnique({ where }: { where: { token_hash: string } }) { return where.token_hash === invitation.token_hash ? invitation : null; } },
    users: { async findUniqueOrThrow() { return { email }; } },
    $transaction: (fn: (t: unknown) => unknown) => fn(tx),
  });
  await assert.rejects(new TeamService(db("someone@else.in") as unknown as DatabaseService, audit, mail).accept("u", "good-token-good-token"), /for ravi@x.in/);
  await assert.rejects(new TeamService(db("ravi@x.in") as unknown as DatabaseService, audit, mail).accept("u", "wrong-token-wrong-token"), /isn't valid/);
  assert.deepEqual(await new TeamService(db("Ravi@X.in") as unknown as DatabaseService, audit, mail).accept("u", "good-token-good-token"), { organizationId: "org" });
  assert.deepEqual(branchRows, [{ business_id: "biz", membership_id: "bm", branch_id: "b1" }, { business_id: "biz", membership_id: "bm", branch_id: "b2" }]);
  await assert.rejects(new TeamService(db("ravi@x.in") as unknown as DatabaseService, audit, mail).accept("u", "good-token-good-token"), /already used/);
});

test("nobody changes their own access or the owner's", async () => {
  const db = { organization_memberships: { async findUnique() { return { id: "m", role: "OWNER", status: "ACTIVE" }; } } };
  const service = new TeamService(db as unknown as DatabaseService, audit, mail);
  await assert.rejects(service.removeMember(org, actor, "owner"), /your own access/);
  await assert.rejects(service.removeMember(org, actor, "other"), /owner's access/);
});

test("a branch manager's context carries their branches; owners and admins see all", async () => {
  const run = async (orgRole: "OWNER" | "MEMBER", branches: string[]) => {
    const request: Record<string, unknown> = { params: { businessId: "22222222-2222-4222-8222-222222222222" }, organization: { organizationId: "org", role: orgRole }, user: { userId: "u" } };
    const db = { businesses: { async findFirst() { return { business_memberships_business_id_rows: [{ role: "BRANCH_MANAGER", branch_scope_rows: branches.map((branch_id) => ({ branch_id })) }] }; } } };
    const context = { switchToHttp: () => ({ getRequest: () => request }), getHandler: () => () => {}, getClass: () => class {} } as unknown as ExecutionContext;
    await new BusinessAccessGuard(new Reflector(), db as unknown as DatabaseService).canActivate(context);
    return request.business as { branchIds: string[] | null };
  };
  assert.deepEqual((await run("MEMBER", ["b1"])).branchIds, ["b1"]);
  assert.equal((await run("MEMBER", [])).branchIds, null, "no branch rows: every branch");
  assert.equal((await run("OWNER", ["b1"])).branchIds, null);
  assert.deepEqual(employeesInScope(["b1"]), { employee_branch_assignments_employee_id_rows: { some: { branch_id: { in: ["b1"] }, effective_to: null } } });
  assert.deepEqual(employeesInScope(null), {});
  assert.throws(() => assertBranchInScope(["b1"], "b2"), /isn't one of yours/);
  assert.doesNotThrow(() => assertBranchInScope(null, "b2"));
});

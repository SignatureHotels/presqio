import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  ClientState,
  OwnerClient,
  OwnerClientContact,
  OwnerClientDetail,
  OwnerClientList,
  OwnerOverview,
  OwnerPlan,
  SubscriptionStatusCode,
} from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import type { ClientListQueryDto, UpdateClientSubscriptionDto } from "./owner.dto";

const DAY_MS = 86_400_000;
/** A trial this close to its end is flagged as "ending". */
const TRIAL_ENDING_MS = 3 * DAY_MS;
const IST = "Asia/Kolkata";
/** Owner-console actions are written to the audit log under this object type. */
const AUDIT_TYPE = "platform";

const STATES: ClientState[] = ["TRIAL", "TRIAL_ENDING", "TRIAL_EXPIRED", "PAYING", "PAYMENT_DUE", "CANCELED", "SUSPENDED"];

const orgInclude = {
  subscription: { include: { plan_ref: true } },
  organization_memberships_organization_id_rows: {
    where: { role: "OWNER" as const, status: "ACTIVE" as const },
    orderBy: { created_at: "asc" as const },
    take: 1,
    include: { user_id_ref: true },
  },
} satisfies Prisma.organizationsInclude;
type OrgRow = Prisma.organizationsGetPayload<{ include: typeof orgInclude }>;

interface Activity {
  businesses: number;
  branches: number;
  employees: number;
  checkins7d: number;
  lastActivityAt: Date | null;
}

/** YYYY-MM-DD of an instant in India time. */
const istDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST });

/** The last `days` dates (India time), oldest first. */
function lastDays(days: number, now = new Date()) {
  return Array.from({ length: days }, (_, i) => istDate(new Date(now.getTime() - (days - 1 - i) * DAY_MS)));
}

function contact(user: { display_name: string; email: string | null; phone: string | null; email_verified_at: Date | null; last_login_at: Date | null }): OwnerClientContact {
  return {
    name: user.display_name,
    email: user.email ?? "",
    phone: user.phone,
    emailVerified: Boolean(user.email_verified_at),
    lastLoginAt: user.last_login_at?.toISOString() ?? null,
  };
}

export function clientState(org: { status: string; subscription: OrgRow["subscription"] }, now = new Date()): ClientState {
  const sub = org.subscription;
  if (org.status === "DISABLED") return "SUSPENDED";
  if (!sub || sub.status === "CANCELED") return "CANCELED";
  if (sub.status === "PAST_DUE") return "PAYMENT_DUE";
  if (sub.status === "ACTIVE")
    return sub.current_period_end && sub.current_period_end < now ? "PAYMENT_DUE" : "PAYING";
  if (sub.trial_ends_at && sub.trial_ends_at < now) return "TRIAL_EXPIRED";
  if (sub.trial_ends_at && sub.trial_ends_at.getTime() - now.getTime() < TRIAL_ENDING_MS) return "TRIAL_ENDING";
  return "TRIAL";
}

/** Everything the owner console shows about Presqio's clients, and the actions it can take on them. */
@Injectable()
export class OwnerService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  plans(): Promise<OwnerPlan[]> {
    return this.db.plans
      .findMany({ orderBy: { monthly_price_minor: "asc" } })
      .then((plans) =>
        plans.map((p) => ({
          code: p.code,
          name: p.name,
          monthlyPriceMinor: p.monthly_price_minor,
          currency: p.currency,
          maxBusinesses: p.max_businesses,
          maxBranches: p.max_branches,
          maxEmployees: p.max_employees,
        })),
      );
  }

  async overview(): Promise<OwnerOverview> {
    const clients = await this.allClients();
    const now = Date.now();
    const byState = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<ClientState, number>;
    for (const c of clients) byState[c.state] += 1;

    const startOfToday = new Date(`${istDate(new Date())}T00:00:00+05:30`);
    const [activeToday] = await this.db.$queryRaw<{ count: number }[]>`
      SELECT count(DISTINCT b.organization_id)::int AS count
        FROM attendance_events e JOIN businesses b ON b.id = e.business_id
       WHERE e.occurred_at >= ${startOfToday}`;

    const days = lastDays(30);
    const perDay = new Map(days.map((d) => [d, 0]));
    for (const c of clients) {
      const d = istDate(new Date(c.createdAt));
      if (perDay.has(d)) perDay.set(d, perDay.get(d)! + 1);
    }

    const prices = new Map((await this.plans()).map((p) => [p.code, p.monthlyPriceMinor]));
    return {
      clients: clients.length,
      newLast7Days: clients.filter((c) => now - new Date(c.createdAt).getTime() < 7 * DAY_MS).length,
      newLast30Days: clients.filter((c) => now - new Date(c.createdAt).getTime() < 30 * DAY_MS).length,
      byState,
      businesses: clients.reduce((n, c) => n + c.businesses, 0),
      branches: clients.reduce((n, c) => n + c.branches, 0),
      employees: clients.reduce((n, c) => n + c.employees, 0),
      activeToday: activeToday?.count ?? 0,
      verifiedOwners: clients.filter((c) => c.owner?.emailVerified).length,
      signups: days.map((date) => ({ date, count: perDay.get(date)! })),
      monthlyRevenueMinor: clients
        .filter((c) => c.state === "PAYING" && c.plan)
        .reduce((sum, c) => sum + (prices.get(c.plan!.code) ?? 0), 0),
    };
  }

  async clients(query: ClientListQueryDto): Promise<OwnerClientList> {
    const pageSize = query.pageSize ?? 20;
    const page = Math.max(1, query.page ?? 1);
    const words = (query.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    let rows = (await this.allClients()).filter((c) => {
      if (query.state && c.state !== query.state) return false;
      if (!words.length) return true;
      const hay = [c.name, c.owner?.name, c.owner?.email, c.owner?.phone, c.plan?.name].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const sorters: Record<string, (a: OwnerClient, b: OwnerClient) => number> = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
      name: (a, b) => a.name.localeCompare(b.name),
      employees: (a, b) => b.employees - a.employees,
      activity: (a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""),
      trialEnd: (a, b) => (a.trialEndsAt ?? "9999").localeCompare(b.trialEndsAt ?? "9999"),
    };
    rows = rows.sort(sorters[query.sort ?? "newest"] ?? sorters.newest);
    return { clients: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  }

  async client(organizationId: string): Promise<OwnerClientDetail> {
    const org = await this.db.organizations.findUnique({
      where: { id: organizationId },
      include: {
        ...orgInclude,
        businesses_organization_id_rows: {
          orderBy: { created_at: "asc" },
          include: {
            branches_business_id_rows: { orderBy: { name: "asc" } },
            _count: { select: { employees_business_id_rows: { where: { status: { not: "TERMINATED" } } } } },
          },
        },
      },
    });
    if (!org) throw new NotFoundException("Client not found");
    const activity = (await this.activity([org.id])).get(org.id) ?? emptyActivity();
    const admins = await this.db.organization_memberships.findMany({
      where: { organization_id: org.id, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
      orderBy: { created_at: "asc" },
      include: { user_id_ref: true },
    });

    const days = lastDays(14);
    const since = new Date(`${days[0]}T00:00:00+05:30`);
    const perDay = await this.db.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char(e.occurred_at AT TIME ZONE ${IST}, 'YYYY-MM-DD') AS day, count(*)::int AS count
        FROM attendance_events e JOIN businesses b ON b.id = e.business_id
       WHERE b.organization_id = ${org.id}::uuid AND e.type = 'CHECK_IN' AND e.occurred_at >= ${since}
       GROUP BY 1`;
    const counts = new Map(perDay.map((r) => [r.day, r.count]));

    const businessIds = org.businesses_organization_id_rows.map((b) => b.id);
    const [payrollRuns, lastRun, history] = await Promise.all([
      this.db.payroll_runs.count({ where: { business_id: { in: businessIds } } }),
      this.db.payroll_runs.findFirst({ where: { business_id: { in: businessIds } }, orderBy: { month: "desc" }, select: { month: true } }),
      this.db.audit_logs.findMany({
        where: { organization_id: org.id, object_type: AUDIT_TYPE },
        orderBy: { occurred_at: "desc" },
        take: 25,
      }),
    ]);

    return {
      ...this.toClient(org, activity),
      slug: org.slug,
      timezone: org.default_timezone,
      admins: admins.map((m) => contact(m.user_id_ref)),
      businessesList: org.businesses_organization_id_rows.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        industry: b.industry,
        address: b.address,
        branches: b.branches_business_id_rows.map((br) => ({ id: br.id, name: br.name, address: br.address, active: br.status === "ACTIVE" })),
        employees: b._count.employees_business_id_rows,
      })),
      checkinsByDay: days.map((date) => ({ date, count: counts.get(date) ?? 0 })),
      payrollRuns,
      lastPayrollMonth: lastRun ? lastRun.month.toISOString().slice(0, 7) : null,
      history: history.map((h) => ({
        at: h.occurred_at.toISOString(),
        action: h.action,
        detail: typeof h.after_json === "object" && h.after_json && "summary" in h.after_json ? String(h.after_json.summary) : h.action,
      })),
    };
  }

  // ── actions ────────────────────────────────────────────────────────────────

  async updateSubscription(organizationId: string, dto: UpdateClientSubscriptionDto, actorId: string) {
    const sub = await this.db.subscriptions.findUnique({ where: { organization_id: organizationId }, include: { plan_ref: true } });
    if (!sub) throw new NotFoundException("Client not found");
    if (dto.trialEndsAt && dto.paidUntil) throw new BadRequestException("Set either a trial end or a paid-until date, not both");
    const data: Prisma.subscriptionsUpdateInput = {};
    const changes: string[] = [];
    if (dto.planCode && dto.planCode !== sub.plan_code) {
      const plan = await this.db.plans.findUnique({ where: { code: dto.planCode } });
      if (!plan) throw new BadRequestException("Unknown plan");
      data.plan_ref = { connect: { code: plan.code } };
      changes.push(`plan ${sub.plan_ref.name} → ${plan.name}`);
    }
    if (dto.trialEndsAt) {
      const end = new Date(dto.trialEndsAt);
      data.trial_ends_at = end;
      data.status = "TRIALING";
      changes.push(`free trial until ${istLong(end)}`);
    }
    if (dto.paidUntil) {
      const end = new Date(dto.paidUntil);
      data.current_period_end = end;
      data.status = "ACTIVE";
      changes.push(`paid until ${istLong(end)}`);
    }
    if (dto.status && !dto.trialEndsAt && !dto.paidUntil && dto.status !== sub.status) {
      data.status = dto.status;
      changes.push(`status ${label(sub.status)} → ${label(dto.status)}`);
    }
    if (!changes.length) return this.client(organizationId);
    await this.db.$transaction(async (tx) => {
      await tx.subscriptions.update({ where: { id: sub.id }, data });
      await this.audit.record({
        organizationId,
        actorId,
        objectType: AUDIT_TYPE,
        objectId: organizationId,
        action: "subscription.updated",
        before: { plan: sub.plan_code, status: sub.status, trialEndsAt: sub.trial_ends_at?.toISOString() ?? null, paidUntil: sub.current_period_end?.toISOString() ?? null },
        after: { summary: `Changed ${changes.join(", ")}` },
      }, tx);
    });
    return this.client(organizationId);
  }

  async setSuspended(organizationId: string, suspended: boolean, actorId: string, reason?: string) {
    const org = await this.db.organizations.findUnique({ where: { id: organizationId }, select: { status: true } });
    if (!org) throw new NotFoundException("Client not found");
    const status = suspended ? "DISABLED" : "ACTIVE";
    if (org.status !== status) {
      await this.db.$transaction(async (tx) => {
        await tx.organizations.update({ where: { id: organizationId }, data: { status } });
        await this.audit.record({
          organizationId,
          actorId,
          objectType: AUDIT_TYPE,
          objectId: organizationId,
          action: suspended ? "client.suspended" : "client.reactivated",
          after: { summary: suspended ? `Suspended${reason ? `: ${reason}` : ""}` : "Reactivated" },
        }, tx);
      });
    }
    return this.client(organizationId);
  }

  async resendVerification(organizationId: string, actorId: string) {
    const owner = await this.db.organization_memberships.findFirst({
      where: { organization_id: organizationId, role: "OWNER", status: "ACTIVE" },
      orderBy: { created_at: "asc" },
      include: { user_id_ref: true },
    });
    if (!owner) throw new NotFoundException("This client has no owner account");
    if (owner.user_id_ref.email_verified_at) throw new ConflictException("The owner's email is already verified");
    await this.auth.resendVerification(owner.user_id);
    await this.audit.record({
      organizationId,
      actorId,
      objectType: AUDIT_TYPE,
      objectId: organizationId,
      action: "client.verification_resent",
      after: { summary: `Verification email sent again to ${owner.user_id_ref.email}` },
    });
    return { sent: true };
  }

  // ── building rows ──────────────────────────────────────────────────────────

  private async allClients(): Promise<OwnerClient[]> {
    const orgs = await this.db.organizations.findMany({ include: orgInclude, orderBy: { created_at: "desc" } });
    const activity = await this.activity(orgs.map((o) => o.id));
    return orgs.map((o) => this.toClient(o, activity.get(o.id) ?? emptyActivity()));
  }

  /** Per-organization counts in four grouped queries, however many clients there are. */
  private async activity(ids: string[]): Promise<Map<string, Activity>> {
    const map = new Map<string, Activity>(ids.map((id) => [id, emptyActivity()]));
    if (!ids.length) return map;
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);
    const [businesses, branches, employees, events] = await Promise.all([
      this.db.$queryRaw<{ org: string; n: number }[]>`
        SELECT organization_id::text AS org, count(*)::int AS n FROM businesses
         WHERE organization_id = ANY(${ids}::uuid[]) GROUP BY 1`,
      this.db.$queryRaw<{ org: string; n: number }[]>`
        SELECT b.organization_id::text AS org, count(*)::int AS n FROM branches br JOIN businesses b ON b.id = br.business_id
         WHERE b.organization_id = ANY(${ids}::uuid[]) AND br.status = 'ACTIVE' GROUP BY 1`,
      this.db.$queryRaw<{ org: string; n: number }[]>`
        SELECT b.organization_id::text AS org, count(*)::int AS n FROM employees e JOIN businesses b ON b.id = e.business_id
         WHERE b.organization_id = ANY(${ids}::uuid[]) AND e.status <> 'TERMINATED' GROUP BY 1`,
      this.db.$queryRaw<{ org: string; last: Date | null; week: number }[]>`
        SELECT b.organization_id::text AS org, max(e.occurred_at) AS last,
               (count(*) FILTER (WHERE e.type = 'CHECK_IN' AND e.occurred_at >= ${weekAgo}))::int AS week
          FROM attendance_events e JOIN businesses b ON b.id = e.business_id
         WHERE b.organization_id = ANY(${ids}::uuid[]) GROUP BY 1`,
    ]);
    for (const r of businesses) map.get(r.org)!.businesses = r.n;
    for (const r of branches) map.get(r.org)!.branches = r.n;
    for (const r of employees) map.get(r.org)!.employees = r.n;
    for (const r of events) Object.assign(map.get(r.org)!, { lastActivityAt: r.last, checkins7d: r.week });
    return map;
  }

  private toClient(org: OrgRow, a: Activity): OwnerClient {
    const owner = org.organization_memberships_organization_id_rows[0]?.user_id_ref;
    const sub = org.subscription;
    const lastLogin = owner?.last_login_at ?? null;
    // last activity is the latest of a check-in and the owner's last sign-in
    const last = [a.lastActivityAt, lastLogin].filter((d): d is Date => Boolean(d)).sort((x, y) => y.getTime() - x.getTime())[0] ?? null;
    return {
      id: org.id,
      name: org.name,
      createdAt: org.created_at.toISOString(),
      suspended: org.status === "DISABLED",
      state: clientState(org),
      owner: owner ? contact(owner) : null,
      plan: sub ? { code: sub.plan_code, name: sub.plan_ref.name } : null,
      subscriptionStatus: (sub?.status as SubscriptionStatusCode | undefined) ?? null,
      trialEndsAt: sub?.trial_ends_at?.toISOString() ?? null,
      paidUntil: sub?.current_period_end?.toISOString() ?? null,
      onboardingDone: org.onboarding_step === "COMPLETED",
      businesses: a.businesses,
      branches: a.branches,
      employees: a.employees,
      checkins7d: a.checkins7d,
      lastActivityAt: last?.toISOString() ?? null,
    };
  }
}

function emptyActivity(): Activity {
  return { businesses: 0, branches: 0, employees: 0, checkins7d: 0, lastActivityAt: null };
}

const istLong = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });
const label = (status: string) => ({ TRIALING: "trial", ACTIVE: "paying", PAST_DUE: "payment due", CANCELED: "canceled" })[status] ?? status;

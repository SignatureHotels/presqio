import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { OrganizationDetail } from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import { BusinessesService } from "../businesses/businesses.service";
import { randomSuffix, slugify } from "../../common/security/tokens";
import type { CreateOrganizationDto, UpdateOrganizationDto } from "./dto/organization.dto";

/** New organizations get a full-featured trial so multi-branch setup can be tried. */
const TRIAL_PLAN = "GROWTH";
const TRIAL_DAYS = 14;
/** Stops trial farming; owners needing more can be raised manually. */
const MAX_OWNED_ORGANIZATIONS = 20;

const DETAIL_INCLUDE = {
  subscription: { include: { plan_ref: true } },
  businesses_organization_id_rows: { orderBy: { created_at: "asc" }, take: 1 },
} satisfies Prisma.organizationsInclude;
type OrganizationRow = Prisma.organizationsGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly businesses: BusinessesService,
  ) {}

  /**
   * Creates organization + OWNER membership + trial subscription + the organization's business
   * (which holds its branches) inside the caller's transaction.
   */
  async createWithOwner(
    tx: Prisma.TransactionClient,
    input: { ownerId: string; name: string; country?: string; defaultTimezone?: string },
  ) {
    const organization = await tx.organizations.create({
      data: {
        name: input.name,
        slug: await this.uniqueSlug(tx, input.name),
        country: input.country,
        default_timezone: input.defaultTimezone,
        created_by: input.ownerId,
      },
    });
    await tx.organization_memberships.create({
      data: { organization_id: organization.id, user_id: input.ownerId, role: "OWNER" },
    });
    await tx.subscriptions.create({
      data: {
        organization_id: organization.id,
        plan_code: TRIAL_PLAN,
        status: "TRIALING",
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
      },
    });
    await this.businesses.createDefault(tx, {
      id: organization.id,
      name: organization.name,
      country: organization.country,
      defaultTimezone: organization.default_timezone,
    });
    return organization;
  }

  /** An existing user creating an additional organization (e.g. a consultant's second client). */
  async create(userId: string, dto: CreateOrganizationDto) {
    const user = await this.db.users.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email_verified_at: true,
        _count: { select: { organization_memberships_user_id_rows: { where: { role: "OWNER" } } } },
      },
    });
    const owned = user._count.organization_memberships_user_id_rows;
    if (owned > 0 && !user.email_verified_at)
      throw new ForbiddenException("Verify your email before creating another organization");
    if (owned >= MAX_OWNED_ORGANIZATIONS)
      throw new ForbiddenException("You have reached the limit of organizations you can own");
    const organization = await this.db.$transaction((tx) =>
      this.createWithOwner(tx, { ownerId: userId, ...dto }),
    );
    return this.detail(organization.id);
  }

  async detail(organizationId: string): Promise<OrganizationDetail> {
    return toDetail(
      await this.db.organizations.findUniqueOrThrow({
        where: { id: organizationId },
        include: DETAIL_INCLUDE,
      }),
    );
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    const completing = dto.onboardingStep === "COMPLETED";
    await this.db.$transaction([
      this.db.organizations.update({
        where: { id: organizationId },
        data: {
          name: dto.name,
          country: dto.country,
          default_timezone: dto.defaultTimezone,
          onboarding_step: dto.onboardingStep,
          ...(dto.onboardingStep && {
            onboarding_completed_at: completing ? new Date() : null,
          }),
        },
      }),
      // Keep the organization's business (which holds the branches) in step with it.
      this.db.businesses.updateMany({
        where: { organization_id: organizationId },
        data: { name: dto.name, country: dto.country, timezone: dto.defaultTimezone },
      }),
    ]);
    return this.detail(organizationId);
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, name: string) {
    const base = (slugify(name, 40) || "org").padEnd(3, "0");
    for (let attempt = 0; attempt < 6; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${randomSuffix(4)}`;
      if (!(await tx.organizations.findUnique({ where: { slug }, select: { id: true } })))
        return slug;
    }
    return `${base}-${randomSuffix(8)}`;
  }
}

const toDetail = (org: OrganizationRow): OrganizationDetail => ({
  id: org.id,
  name: org.name,
  slug: org.slug,
  onboardingStep: org.onboarding_step,
  country: org.country,
  defaultTimezone: org.default_timezone,
  onboardingCompletedAt: org.onboarding_completed_at?.toISOString() ?? null,
  defaultBusiness: org.businesses_organization_id_rows[0]
    ? {
        id: org.businesses_organization_id_rows[0].id,
        name: org.businesses_organization_id_rows[0].name,
        slug: org.businesses_organization_id_rows[0].slug,
        code: org.businesses_organization_id_rows[0].code,
        timezone: org.businesses_organization_id_rows[0].timezone,
        employeeIdPrefix: org.businesses_organization_id_rows[0].employee_prefix,
      }
    : null,
  subscription: org.subscription && {
    planCode: org.subscription.plan_code,
    planName: org.subscription.plan_ref.name,
    status: org.subscription.status,
    trialEndsAt: org.subscription.trial_ends_at?.toISOString() ?? null,
    limits: {
      maxBusinesses: org.subscription.plan_ref.max_businesses,
      maxBranches: org.subscription.plan_ref.max_branches,
      maxEmployees: org.subscription.plan_ref.max_employees,
    },
  },
});

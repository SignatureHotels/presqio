import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AccessibleBusiness } from "@presqio/lib";
import type { OrganizationContext } from "../../common/auth/auth.types";
import { DatabaseService } from "../../common/database/database.service";
import { randomSuffix, slugify } from "../../common/security/tokens";

@Injectable()
export class BusinessesService {
  constructor(private readonly db: DatabaseService) {}

  /** OWNER/ADMIN see every business; MEMBERs only those they hold a business membership in. */
  async list(org: OrganizationContext, userId: string): Promise<AccessibleBusiness[]> {
    const rows = await this.db.businesses.findMany({
      where: {
        organization_id: org.organizationId,
        status: "ACTIVE",
        ...(org.role === "MEMBER" && {
          business_memberships_business_id_rows: { some: { user_id: userId } },
        }),
      },
      include: {
        business_memberships_business_id_rows: {
          where: { user_id: userId },
          select: { role: true },
        },
      },
      orderBy: { created_at: "asc" },
    });
    return rows.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      code: b.code,
      timezone: b.timezone,
      employeeIdPrefix: b.employee_prefix,
      businessRole:
        org.role === "MEMBER" ? (b.business_memberships_business_id_rows[0]?.role ?? null) : null,
    }));
  }

  /**
   * Each organization owns exactly one business, created with it, that holds its branches and
   * shifts. The product is organization -> branches; this record is an implementation detail,
   * and its prefix starts every employee ID (SGH0001), which is all employees type at sign-in.
   */
  async createDefault(
    tx: Prisma.TransactionClient,
    organization: { id: string; name: string; country: string; defaultTimezone: string },
  ) {
    return tx.businesses.create({
      data: {
        organization_id: organization.id,
        name: organization.name,
        code: await this.suggestCode(tx, organization.name),
        employee_prefix: await this.employeePrefix(tx, organization.name),
        slug: await this.uniqueSlug(tx, organization.id, organization.name),
        country: organization.country,
        timezone: organization.defaultTimezone,
      },
    });
  }

  private async suggestCode(tx: Prisma.TransactionClient, name: string) {
    const base = slugify(name, 60).replace(/-/g, "").toUpperCase().slice(0, 8).padEnd(3, "X");
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = attempt === 0 ? base : `${base.slice(0, 8)}${randomSuffix(4).toUpperCase()}`;
      if (!(await tx.businesses.findUnique({ where: { code }, select: { id: true } }))) return code;
    }
    return `${base.slice(0, 4)}${randomSuffix(8).toUpperCase()}`;
  }

  /**
   * Initials of the name ("Signature Group of Hotels" → SGH; one word → first 3 letters). A taken
   * prefix gets a letter (SGHB, SGHC …), never a digit, so the ID's number stays readable.
   */
  private async employeePrefix(tx: Prisma.TransactionClient, name: string) {
    const words = name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w && !["OF", "THE", "AND"].includes(w));
    const initials =
      words.length > 1 ? words.map((w) => w[0]).join("").slice(0, 4) : (words[0] ?? "").slice(0, 3);
    const base = initials.length >= 2 ? initials : "ORG";
    const free = async (prefix: string) =>
      !(await tx.businesses.findUnique({ where: { employee_prefix: prefix }, select: { id: true } }));
    if (await free(base)) return base;
    for (const letter of "BCDEFGHJKLMNPQRSTUVWXYZ") if (await free(base + letter)) return base + letter;
    return `${base}${randomSuffix(4).toUpperCase().replace(/[^A-Z]/g, "Q")}`.slice(0, 12);
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, organizationId: string, name: string) {
    const base = (slugify(name, 40) || "business").padEnd(2, "0");
    for (let attempt = 0; attempt < 6; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${randomSuffix(4)}`;
      const taken = await tx.businesses.findUnique({
        where: { organization_id_slug: { organization_id: organizationId, slug } },
        select: { id: true },
      });
      if (!taken) return slug;
    }
    return `${base}-${randomSuffix(8)}`;
  }
}

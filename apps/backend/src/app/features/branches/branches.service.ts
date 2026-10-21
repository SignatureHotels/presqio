import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { BranchRecord } from "@presqio/lib";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { DatabaseService } from "../../common/database/database.service";
import { randomSuffix, slugify } from "../../common/security/tokens";
import { AuditService } from "../audit/audit.service";
import type { CreateBranchDto, UpdateBranchDto } from "./dto/branch.dto";

interface BranchRow {
  id: string;
  business_id: string;
  code: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_m: number | null;
  max_accuracy_m: number | null;
}

@Injectable()
export class BranchesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Active branches with their current perimeter (PostGIS point read back as lat/lng). */
  async list(businessId: string, branchId?: string): Promise<BranchRecord[]> {
    const rows = await this.db.$queryRaw<BranchRow[]>`
      SELECT b.id, b.business_id, b.code, b.name, b.address,
             ST_Y(g.center::geometry) AS latitude, ST_X(g.center::geometry) AS longitude,
             g.radius_m, g.max_accuracy_m
        FROM branches b
        LEFT JOIN LATERAL (
          SELECT center, radius_m, max_accuracy_m FROM geofences
           WHERE business_id = b.business_id AND branch_id = b.id AND active_to IS NULL
           ORDER BY active_from DESC LIMIT 1
        ) g ON true
       WHERE b.business_id = ${businessId}::uuid AND b.status = 'ACTIVE'
         ${branchId ? Prisma.sql`AND b.id = ${branchId}::uuid` : Prisma.empty}
       ORDER BY b.name`;
    return rows.map((r) => ({
      id: r.id,
      businessId: r.business_id,
      code: r.code,
      name: r.name,
      address: r.address ?? "",
      latitude: r.latitude ?? 0,
      longitude: r.longitude ?? 0,
      radius: r.radius_m ?? 0,
      maxAccuracy: r.max_accuracy_m ?? 0,
    }));
  }

  async create(
    org: OrganizationContext,
    businessId: string,
    actor: RequestUser,
    dto: CreateBranchDto,
  ): Promise<BranchRecord> {
    let branchId: string;
    try {
      branchId = await this.db.$transaction(async (tx) => {
        // Serialize with other creates in this organization so the plan limit holds.
        const [plan] = await tx.$queryRaw<{ max_branches: number | null; status: string }[]>`
          SELECT p.max_branches, s.status FROM subscriptions s
            JOIN plans p ON p.code = s.plan_code
           WHERE s.organization_id = ${org.organizationId}::uuid
           FOR UPDATE OF s`;
        if (!plan || plan.status === "CANCELED")
          throw new ForbiddenException("This organization has no active subscription");
        if (plan.max_branches !== null) {
          const count = await tx.branches.count({
            where: { business_id_ref: { organization_id: org.organizationId } },
          });
          if (count >= plan.max_branches)
            throw new ForbiddenException(
              `Your plan allows ${plan.max_branches} branch(es). Upgrade to add more.`,
            );
        }
        const business = await tx.businesses.findUniqueOrThrow({
          where: { id: businessId },
          select: { timezone: true },
        });
        const branch = await tx.branches.create({
          data: {
            business_id: businessId,
            name: dto.name,
            code: dto.code ?? (await this.suggestCode(tx, businessId, dto.name)),
            address: dto.address || null,
            timezone: business.timezone,
          },
        });
        await tx.$executeRaw`
          INSERT INTO geofences (business_id, branch_id, center, radius_m, max_accuracy_m)
          VALUES (${businessId}::uuid, ${branch.id}::uuid,
                  ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography,
                  ${dto.radius}, ${dto.maxAccuracy})`;
        await this.audit.record(
          {
            organizationId: org.organizationId,
            businessId,
            actorId: actor.userId,
            objectType: "branch",
            objectId: branch.id,
            action: "created",
            after: { name: branch.name, radius: dto.radius, maxAccuracy: dto.maxAccuracy },
          },
          tx,
        );
        return branch.id;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ConflictException("That branch code is already used in this business");
      throw error;
    }
    return (await this.list(businessId, branchId))[0];
  }

  /**
   * Edits name/address in place. A perimeter change ends the current geofence and starts a new
   * one, so past check-ins keep the perimeter they were judged against.
   */
  async update(
    org: OrganizationContext,
    businessId: string,
    actor: RequestUser,
    branchId: string,
    dto: UpdateBranchDto,
  ): Promise<BranchRecord> {
    const [current] = await this.list(businessId, branchId);
    if (!current) throw new NotFoundException("Branch not found");
    const perimeter = {
      latitude: dto.latitude ?? current.latitude,
      longitude: dto.longitude ?? current.longitude,
      radius: dto.radius ?? current.radius,
      maxAccuracy: dto.maxAccuracy ?? current.maxAccuracy,
    };
    const perimeterChanged =
      perimeter.latitude !== current.latitude ||
      perimeter.longitude !== current.longitude ||
      perimeter.radius !== current.radius ||
      perimeter.maxAccuracy !== current.maxAccuracy;
    try {
      await this.db.$transaction(async (tx) => {
        await tx.branches.update({
          where: { id: branchId },
          data: {
            name: dto.name,
            code: dto.code,
            address: dto.address === undefined ? undefined : dto.address || null,
          },
        });
        if (perimeterChanged) {
          await tx.geofences.updateMany({
            where: { business_id: businessId, branch_id: branchId, active_to: null },
            data: { active_to: new Date() },
          });
          await tx.$executeRaw`
            INSERT INTO geofences (business_id, branch_id, center, radius_m, max_accuracy_m)
            VALUES (${businessId}::uuid, ${branchId}::uuid,
                    ST_SetSRID(ST_MakePoint(${perimeter.longitude}, ${perimeter.latitude}), 4326)::geography,
                    ${perimeter.radius}, ${perimeter.maxAccuracy})`;
        }
        await this.audit.record(
          {
            organizationId: org.organizationId,
            businessId,
            actorId: actor.userId,
            objectType: "branch",
            objectId: branchId,
            action: "updated",
            before: { name: current.name, ...pick(current) },
            after: { name: dto.name ?? current.name, ...perimeter },
          },
          tx,
        );
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ConflictException("That branch code is already used in this business");
      throw error;
    }
    return (await this.list(businessId, branchId))[0];
  }

  private async suggestCode(tx: Prisma.TransactionClient, businessId: string, name: string) {
    const base = slugify(name, 40).replace(/-/g, "").toUpperCase().slice(0, 6).padEnd(2, "B");
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = attempt === 0 ? base : `${base.slice(0, 6)}${randomSuffix(3).toUpperCase()}`;
      const taken = await tx.branches.findUnique({
        where: { business_id_code: { business_id: businessId, code } },
        select: { id: true },
      });
      if (!taken) return code;
    }
    return `${base.slice(0, 4)}${randomSuffix(6).toUpperCase()}`;
  }
}

const pick = (b: BranchRecord) => ({
  latitude: b.latitude,
  longitude: b.longitude,
  radius: b.radius,
  maxAccuracy: b.maxAccuracy,
});

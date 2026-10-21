import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { BusinessRole } from "@prisma/client";
import { DatabaseService } from "../database/database.service";
import { BUSINESS_ROLES } from "./auth.decorators";
import type { AuthenticatedRequest } from "./auth.types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs after OrganizationAccessGuard. Resolves `:businessId` inside the organization:
 * OWNER/ADMIN always pass; MEMBERs need a business membership whose role is allowed.
 */
@Injectable()
export class BusinessAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const param = request.params.businessId;
    const businessId = typeof param === "string" ? param : "";
    const organization = request.organization;
    if (!organization || !UUID.test(businessId))
      throw new NotFoundException("Business not found");
    const business = await this.db.businesses.findFirst({
      where: {
        id: businessId,
        organization_id: organization.organizationId,
        status: "ACTIVE",
      },
      select: {
        business_memberships_business_id_rows: {
          where: { user_id: request.user!.userId },
          select: { role: true },
        },
      },
    });
    if (!business) throw new NotFoundException("Business not found");
    const role = business.business_memberships_business_id_rows[0]?.role ?? null;
    if (organization.role === "MEMBER") {
      if (!role) throw new NotFoundException("Business not found");
      const allowed = this.reflector.getAllAndOverride<BusinessRole[] | undefined>(
        BUSINESS_ROLES,
        [context.getHandler(), context.getClass()],
      );
      if (allowed && !allowed.includes(role))
        throw new ForbiddenException("Your role cannot perform this action");
    }
    request.business = { businessId, role };
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { OrganizationRole } from "@prisma/client";
import { DatabaseService } from "../database/database.service";
import { ORGANIZATION_ROLES } from "./auth.decorators";
import type { AuthenticatedRequest } from "./auth.types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves `:organizationId` against the signed-in user's active membership.
 * Non-members get 404 so organization ids cannot be probed.
 */
@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const param = request.params.organizationId;
    const organizationId = typeof param === "string" ? param : "";
    if (!request.user || request.user.kind !== "ADMIN" || !UUID.test(organizationId))
      throw new NotFoundException("Organization not found");
    const membership = await this.db.organization_memberships.findFirst({
      where: {
        organization_id: organizationId,
        user_id: request.user.userId,
        status: "ACTIVE",
        organization_id_ref: { status: "ACTIVE" },
      },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException("Organization not found");
    const allowed = this.reflector.getAllAndOverride<OrganizationRole[] | undefined>(
      ORGANIZATION_ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (allowed && !allowed.includes(membership.role))
      throw new ForbiddenException("Your role cannot perform this action");
    request.organization = { organizationId, role: membership.role };
    return true;
  }
}

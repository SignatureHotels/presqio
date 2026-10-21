import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { BusinessRole, OrganizationRole } from "@prisma/client";
import type {
  AuthenticatedRequest,
  BusinessContext,
  EmployeeContext,
  OrganizationContext,
  RequestUser,
} from "./auth.types";

export const IS_PUBLIC = "presqio:isPublic";
/** Skips the global access-token guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ORGANIZATION_ROLES = "presqio:organizationRoles";
/** Restricts an organization-scoped route to these organization roles. */
export const OrganizationRoles = (...roles: OrganizationRole[]) =>
  SetMetadata(ORGANIZATION_ROLES, roles);

export const BUSINESS_ROLES = "presqio:businessRoles";
/** Business roles a MEMBER needs; organization OWNER/ADMIN always pass. */
export const BusinessRoles = (...roles: BusinessRole[]) =>
  SetMetadata(BUSINESS_ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): RequestUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user!,
);

export const CurrentOrganization = createParamDecorator(
  (_: unknown, context: ExecutionContext): OrganizationContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().organization!,
);

export const CurrentBusiness = createParamDecorator(
  (_: unknown, context: ExecutionContext): BusinessContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().business!,
);

export const CurrentEmployee = createParamDecorator(
  (_: unknown, context: ExecutionContext): EmployeeContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().employee!,
);

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { AuthenticatedRequest } from "./auth.types";

/**
 * Employee mobile routes: requires an EMPLOYEE session (the global guard already checked the token
 * and that the session is live) and an active employee record linked to that user.
 */
@Injectable()
export class EmployeeGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.kind !== "EMPLOYEE") throw new ForbiddenException("Employee sign-in required");
    const employee = await this.db.employees.findFirst({
      where: {
        user_id: request.user.userId,
        status: "ACTIVE",
        business_id_ref: { status: "ACTIVE", organization_id_ref: { status: "ACTIVE" } },
      },
      select: { id: true, business_id: true, business_id_ref: { select: { organization_id: true } } },
    });
    if (!employee) throw new ForbiddenException("Your account is not active. Please contact your admin.");
    request.employee = {
      userId: request.user.userId,
      employeeId: employee.id,
      businessId: employee.business_id,
      organizationId: employee.business_id_ref.organization_id,
    };
    return true;
  }
}

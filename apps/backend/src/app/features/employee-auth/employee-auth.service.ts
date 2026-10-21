import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { EmployeeSessionResponse } from "@presqio/lib";
import { SessionsService, type ClientInfo } from "../../common/auth/sessions.service";
import { DatabaseService } from "../../common/database/database.service";
import { EmployeePortalService } from "../employee-portal/employee-portal.service";
import type { EmployeeLoginDto } from "./dto/employee-auth.dto";


export interface IssuedEmployeeSession {
  response: EmployeeSessionResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Employee sign-in with just the employee ID (unique platform-wide), from any phone or browser,
 * so staff without a smartphone can use a colleague's. Each check-in still needs a live selfie
 * inside the branch perimeter, and admins see that selfie.
 */
@Injectable()
export class EmployeeAuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sessions: SessionsService,
    private readonly portal: EmployeePortalService,
  ) {}

  async login(dto: EmployeeLoginDto, client: ClientInfo): Promise<IssuedEmployeeSession> {
    const employee = await this.findEmployee(dto.employeeCode);
    if (!employee || !["PENDING", "ACTIVE", "SUSPENDED"].includes(employee.status))
      throw new UnauthorizedException("We couldn't find that employee ID. Check it with your admin.");
    if (employee.status === "SUSPENDED")
      throw new UnauthorizedException("Your account is paused. Please contact your admin.");
    const userId =
      employee.user_id ??
      (await this.db.$transaction(async (tx) => {
        const user = await tx.users.create({
          data: { display_name: employee.full_name, phone: employee.phone },
        });
        await tx.employees.update({
          where: { id: employee.id },
          data: { user_id: user.id, status: "ACTIVE" },
        });
        return user.id;
      }));
    return this.issue(userId, employee.id, employee.business_id, client);
  }

  async refresh(refreshToken: string | undefined, client: ClientInfo): Promise<IssuedEmployeeSession> {
    const issued = await this.sessions.rotate(refreshToken, "EMPLOYEE", client);
    const employee = await this.db.employees.findFirst({
      where: { user_id: issued.userId, status: "ACTIVE",
        business_id_ref: { status: "ACTIVE", organization_id_ref: { status: "ACTIVE" } },
      },
      select: { id: true, business_id: true },
    });
    if (!employee) throw new UnauthorizedException("Your account is not active.");
    return {
      response: {
        ...(await this.sessions.accessToken(issued.userId, issued.sessionId, "EMPLOYEE")),
        profile: await this.portal.profile({ employeeId: employee.id, businessId: employee.business_id }),
      },
      refreshToken: issued.refreshToken,
      refreshExpiresAt: issued.refreshExpiresAt,
    };
  }

  logout(refreshToken: string | undefined) {
    return this.sessions.revoke(refreshToken);
  }

  private async issue(userId: string, employeeId: string, businessId: string, client: ClientInfo) {
    const issued = await this.sessions.issue(userId, "EMPLOYEE", client);
    return {
      response: {
        ...(await this.sessions.accessToken(userId, issued.sessionId, "EMPLOYEE")),
        profile: await this.portal.profile({ employeeId, businessId }),
      },
      refreshToken: issued.refreshToken,
      refreshExpiresAt: issued.refreshExpiresAt,
    };
  }

  /** Employee IDs are unique platform-wide, so the ID alone finds the organization. */
  private findEmployee(employeeCode: string) {
    return this.db.employees.findFirst({
      where: {
        employee_code: employeeCode,
        business_id_ref: {
          status: "ACTIVE",
          organization_id_ref: { status: "ACTIVE" },
        },
      },
    });
  }
}

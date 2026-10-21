import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { OverviewResponse } from "@presqio/lib";
import { CurrentBusiness, CurrentOrganization } from "../../common/auth/auth.decorators";
import type { BusinessContext, OrganizationContext } from "../../common/auth/auth.types";
import { BusinessAccessGuard } from "../../common/auth/business-access.guard";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { AttendanceRegisterService } from "./attendance-register.service";
import { AttendanceRegisterDto } from "./dto/attendance-register.dto";
import { AttendanceService } from "./attendance.service";

@ApiTags("Attendance")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard, BusinessAccessGuard)
@Controller("organizations/:organizationId/businesses/:businessId")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService, private readonly register: AttendanceRegisterService) {}

  @Get("attendance/register")
  attendanceRegister(@CurrentBusiness() business: BusinessContext, @Query() query: AttendanceRegisterDto) {
    return this.register.get(business.businessId, query);
  }

  @Get("overview")
  overview(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentBusiness() business: BusinessContext,
  ): Promise<OverviewResponse> {
    return this.attendance.overview(org.organizationId, business.businessId);
  }
}

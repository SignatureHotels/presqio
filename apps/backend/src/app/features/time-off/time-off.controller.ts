import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { HolidayRecord, LeaveBalancesResponse, LeaveTypeRecord } from "@presqio/lib";
import { BusinessRoles, CurrentBusiness, CurrentOrganization, CurrentUser } from "../../common/auth/auth.decorators";
import type { BusinessContext, OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { BusinessAccessGuard } from "../../common/auth/business-access.guard";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { CreateHolidayDto, CreateLeaveTypeDto, UpdateLeaveTypeDto, YearQueryDto } from "./dto/time-off.dto";
import { TimeOffService } from "./time-off.service";

@ApiTags("Holidays & leave")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard, BusinessAccessGuard)
@Controller("organizations/:organizationId/businesses/:businessId/time-off")
export class TimeOffController {
  constructor(private readonly timeOff: TimeOffService) {}

  @Get("holidays")
  holidays(@CurrentBusiness() business: BusinessContext, @Query() query: YearQueryDto): Promise<HolidayRecord[]> {
    const year = query.year ?? new Date().getUTCFullYear();
    return this.timeOff.holidays(business.businessId, `${year}-01-01`, `${year}-12-31`);
  }

  @BusinessRoles("BUSINESS_ADMIN")
  @Post("holidays")
  addHoliday(
    @CurrentOrganization() org: OrganizationContext, @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser, @Body() dto: CreateHolidayDto,
  ): Promise<HolidayRecord> {
    return this.timeOff.addHoliday(org, business.businessId, user, dto);
  }

  @BusinessRoles("BUSINESS_ADMIN")
  @Delete("holidays/:holidayId")
  @HttpCode(204)
  removeHoliday(
    @CurrentOrganization() org: OrganizationContext, @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser, @Param("holidayId", ParseUUIDPipe) holidayId: string,
  ): Promise<void> {
    return this.timeOff.removeHoliday(org, business.businessId, user, holidayId);
  }

  @Get("leave-types")
  leaveTypes(@CurrentBusiness() business: BusinessContext): Promise<LeaveTypeRecord[]> {
    return this.timeOff.leaveTypes(business.businessId);
  }

  @BusinessRoles("BUSINESS_ADMIN")
  @Post("leave-types")
  createLeaveType(
    @CurrentOrganization() org: OrganizationContext, @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser, @Body() dto: CreateLeaveTypeDto,
  ): Promise<LeaveTypeRecord> {
    return this.timeOff.createLeaveType(org, business.businessId, user, dto);
  }

  @BusinessRoles("BUSINESS_ADMIN")
  @Patch("leave-types/:typeId")
  updateLeaveType(
    @CurrentOrganization() org: OrganizationContext, @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser, @Param("typeId", ParseUUIDPipe) typeId: string, @Body() dto: UpdateLeaveTypeDto,
  ): Promise<LeaveTypeRecord> {
    return this.timeOff.updateLeaveType(org, business.businessId, user, typeId, dto);
  }

  @Get("balances")
  balances(@CurrentBusiness() business: BusinessContext, @Query() query: YearQueryDto): Promise<LeaveBalancesResponse> {
    return this.timeOff.balances(business.businessId, query.year, business.branchIds);
  }
}

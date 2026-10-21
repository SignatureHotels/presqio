import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { ShiftRecord } from "@presqio/lib";
import {
  BusinessRoles,
  CurrentBusiness,
  CurrentOrganization,
  CurrentUser,
} from "../../common/auth/auth.decorators";
import type {
  BusinessContext,
  OrganizationContext,
  RequestUser,
} from "../../common/auth/auth.types";
import { BusinessAccessGuard } from "../../common/auth/business-access.guard";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { CreateShiftDto, UpdateShiftDto } from "./dto/shift.dto";
import { ShiftsService } from "./shifts.service";

@ApiTags("Shifts")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard, BusinessAccessGuard)
@Controller("organizations/:organizationId/businesses/:businessId/shifts")
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  list(@CurrentBusiness() business: BusinessContext): Promise<ShiftRecord[]> {
    return this.shifts.list(business.businessId);
  }

  @BusinessRoles("BUSINESS_ADMIN")
  @Post()
  create(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateShiftDto,
  ): Promise<ShiftRecord> {
    return this.shifts.create(org, business.businessId, user, dto);
  }

  @BusinessRoles("BUSINESS_ADMIN")
  @Patch(":shiftId")
  update(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser,
    @Param("shiftId", ParseUUIDPipe) shiftId: string,
    @Body() dto: UpdateShiftDto,
  ): Promise<ShiftRecord> {
    return this.shifts.update(org, business.businessId, user, shiftId, dto);
  }
}

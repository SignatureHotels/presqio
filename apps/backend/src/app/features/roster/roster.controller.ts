import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { RosterResponse } from "@presqio/lib";
import { BusinessRoles, CurrentBusiness, CurrentOrganization, CurrentUser } from "../../common/auth/auth.decorators";
import type { BusinessContext, OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { BusinessAccessGuard } from "../../common/auth/business-access.guard";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { RosterQueryDto, SaveRosterDto } from "./dto/roster.dto";
import { RosterService } from "./roster.service";

@ApiTags("Roster")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard, BusinessAccessGuard)
@Controller("organizations/:organizationId/businesses/:businessId/roster")
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @Get()
  get(@CurrentBusiness() business: BusinessContext, @Query() query: RosterQueryDto): Promise<RosterResponse> {
    return this.roster.get(business.businessId, query, business.branchIds);
  }

  @BusinessRoles("BUSINESS_ADMIN", "BRANCH_MANAGER")
  @Put()
  save(
    @CurrentOrganization() org: OrganizationContext, @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser, @Body() dto: SaveRosterDto,
  ): Promise<{ saved: number }> {
    return this.roster.save(org, business.businessId, user, dto, business.branchIds);
  }
}

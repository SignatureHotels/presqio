import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { BranchRecord } from "@presqio/lib";
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
import { BranchesService } from "./branches.service";
import { CreateBranchDto, UpdateBranchDto } from "./dto/branch.dto";

@ApiTags("Branches")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard, BusinessAccessGuard)
@Controller("organizations/:organizationId/businesses/:businessId/branches")
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list(@CurrentBusiness() business: BusinessContext): Promise<BranchRecord[]> {
    return this.branches.list(business.businessId);
  }

  @BusinessRoles("BUSINESS_ADMIN")
  @Post()
  create(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBranchDto,
  ): Promise<BranchRecord> {
    return this.branches.create(org, business.businessId, user, dto);
  }

  @BusinessRoles("BUSINESS_ADMIN")
  @Patch(":branchId")
  update(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser,
    @Param("branchId", ParseUUIDPipe) branchId: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<BranchRecord> {
    return this.branches.update(org, business.businessId, user, branchId, dto);
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Approval } from "@presqio/lib";
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
import { CorrectionsService } from "./corrections.service";
import { DecideCorrectionDto } from "./dto/decide-correction.dto";

@ApiTags("Corrections")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard, BusinessAccessGuard)
@Controller("organizations/:organizationId/businesses/:businessId/corrections")
export class CorrectionsController {
  constructor(private readonly corrections: CorrectionsService) {}

  @Get()
  list(@CurrentBusiness() business: BusinessContext): Promise<Approval[]> {
    return this.corrections.list(business.businessId);
  }

  @BusinessRoles("BUSINESS_ADMIN", "BRANCH_MANAGER")
  @Post(":correctionId/decision")
  decide(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser,
    @Param("correctionId", ParseUUIDPipe) correctionId: string,
    @Body() dto: DecideCorrectionDto,
  ): Promise<Approval> {
    return this.corrections.decide(org, business.businessId, user, correctionId, dto);
  }
}

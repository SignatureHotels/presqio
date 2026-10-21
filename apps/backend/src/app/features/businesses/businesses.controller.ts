import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AccessibleBusiness } from "@presqio/lib";
import { CurrentOrganization, CurrentUser } from "../../common/auth/auth.decorators";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { BusinessesService } from "./businesses.service";

@ApiTags("Businesses")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard)
@Controller("organizations/:organizationId/businesses")
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  list(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentUser() user: RequestUser,
  ): Promise<AccessibleBusiness[]> {
    return this.businesses.list(org, user.userId);
  }
}

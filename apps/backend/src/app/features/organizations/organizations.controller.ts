import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { OrganizationDetail } from "@presqio/lib";
import {
  CurrentOrganization,
  CurrentUser,
  OrganizationRoles,
} from "../../common/auth/auth.decorators";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { CreateOrganizationDto, UpdateOrganizationDto } from "./dto/organization.dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("Organizations")
@ApiBearerAuth()
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationDetail> {
    return this.organizations.create(user.userId, dto);
  }

  @UseGuards(OrganizationAccessGuard)
  @Get(":organizationId")
  detail(@CurrentOrganization() org: OrganizationContext): Promise<OrganizationDetail> {
    return this.organizations.detail(org.organizationId);
  }

  @UseGuards(OrganizationAccessGuard)
  @OrganizationRoles("OWNER", "ADMIN")
  @Patch(":organizationId")
  update(
    @CurrentOrganization() org: OrganizationContext,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationDetail> {
    return this.organizations.update(org.organizationId, dto);
  }
}

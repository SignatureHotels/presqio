import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { InvitationPreview, TeamInvitation, TeamMember, TeamResponse } from "@presqio/lib";
import { CurrentOrganization, CurrentUser, OrganizationRoles, Public } from "../../common/auth/auth.decorators";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { InvitationTokenDto, InviteDto, UpdateMemberDto } from "./dto/team.dto";
import { TeamService } from "./team.service";

@ApiTags("Team")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard)
@OrganizationRoles("OWNER", "ADMIN")
@Controller("organizations/:organizationId/team")
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list(@CurrentOrganization() org: OrganizationContext, @CurrentUser() user: RequestUser): Promise<TeamResponse> {
    return this.team.team(org.organizationId, user.userId);
  }

  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @Post("invitations")
  invite(@CurrentOrganization() org: OrganizationContext, @CurrentUser() user: RequestUser, @Body() dto: InviteDto): Promise<TeamInvitation> {
    return this.team.invite(org, user, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @HttpCode(200)
  @Post("invitations/:invitationId/resend")
  resend(@CurrentOrganization() org: OrganizationContext, @CurrentUser() user: RequestUser,
    @Param("invitationId", ParseUUIDPipe) id: string): Promise<TeamInvitation> {
    return this.team.resend(org, user, id);
  }

  @Delete("invitations/:invitationId")
  @HttpCode(204)
  revoke(@CurrentOrganization() org: OrganizationContext, @CurrentUser() user: RequestUser,
    @Param("invitationId", ParseUUIDPipe) id: string): Promise<void> {
    return this.team.revoke(org, user, id);
  }

  @Patch("members/:userId")
  update(@CurrentOrganization() org: OrganizationContext, @CurrentUser() user: RequestUser,
    @Param("userId", ParseUUIDPipe) userId: string, @Body() dto: UpdateMemberDto): Promise<TeamMember> {
    return this.team.updateMember(org, user, userId, dto);
  }

  @Delete("members/:userId")
  @HttpCode(204)
  remove(@CurrentOrganization() org: OrganizationContext, @CurrentUser() user: RequestUser,
    @Param("userId", ParseUUIDPipe) userId: string): Promise<void> {
    return this.team.removeMember(org, user, userId);
  }
}

/** The invite link: anyone with it can see what it's for; accepting needs the invited email's account. */
@ApiTags("Team")
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly team: TeamService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post("preview")
  preview(@Body() dto: InvitationTokenDto): Promise<InvitationPreview> {
    return this.team.preview(dto.token);
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post("accept")
  accept(@CurrentUser() user: RequestUser, @Body() dto: InvitationTokenDto): Promise<{ organizationId: string }> {
    return this.team.accept(user.userId, dto.token);
  }
}

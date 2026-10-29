import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { DeletedClient, OwnerClientDetail, OwnerClientList, OwnerOverview, OwnerPlan } from "@presqio/lib";
import { CurrentUser } from "../../common/auth/auth.decorators";
import type { RequestUser } from "../../common/auth/auth.types";
import { PlatformOwnerGuard } from "../../common/auth/platform-owner.guard";
import { ClientListQueryDto, DeleteClientDto, SuspendClientDto, UpdateClientSubscriptionDto } from "./owner.dto";
import { OwnerService } from "./owner.service";

/** Presqio's own console over every client. Only PLATFORM_OWNER_EMAILS get in; others see 404. */
@ApiTags("Owner console")
@ApiBearerAuth()
@UseGuards(PlatformOwnerGuard)
@Controller("owner")
export class OwnerController {
  constructor(private readonly owner: OwnerService) {}

  @Get("overview")
  overview(): Promise<OwnerOverview> {
    return this.owner.overview();
  }

  @Get("plans")
  plans(): Promise<OwnerPlan[]> {
    return this.owner.plans();
  }

  @Get("clients")
  clients(@Query() query: ClientListQueryDto): Promise<OwnerClientList> {
    return this.owner.clients(query);
  }

  @Get("clients/:organizationId")
  client(@Param("organizationId", ParseUUIDPipe) id: string): Promise<OwnerClientDetail> {
    return this.owner.client(id);
  }

  @Patch("clients/:organizationId/subscription")
  updateSubscription(
    @Param("organizationId", ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientSubscriptionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<OwnerClientDetail> {
    return this.owner.updateSubscription(id, dto, user.userId);
  }

  @Post("clients/:organizationId/suspend")
  @HttpCode(200)
  suspend(
    @Param("organizationId", ParseUUIDPipe) id: string,
    @Body() dto: SuspendClientDto,
    @CurrentUser() user: RequestUser,
  ): Promise<OwnerClientDetail> {
    return this.owner.setSuspended(id, true, user.userId, dto.reason);
  }

  @Post("clients/:organizationId/reactivate")
  @HttpCode(200)
  reactivate(@Param("organizationId", ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser): Promise<OwnerClientDetail> {
    return this.owner.setSuspended(id, false, user.userId);
  }

  /** Permanent: removes the client and all of its data. */
  @Delete("clients/:organizationId")
  @HttpCode(200)
  deleteClient(
    @Param("organizationId", ParseUUIDPipe) id: string,
    @Body() dto: DeleteClientDto,
    @CurrentUser() user: RequestUser,
  ): Promise<DeletedClient> {
    return this.owner.deleteClient(id, dto.confirmName, user.userId);
  }

  @Post("clients/:organizationId/resend-verification")
  @HttpCode(200)
  resendVerification(@Param("organizationId", ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.owner.resendVerification(id, user.userId);
  }
}

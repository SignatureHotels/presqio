import {
  Body, Controller, createParamDecorator, Delete, type ExecutionContext, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { KioskInfo, KioskLookupResponse, KioskPairing, KioskPairResponse, KioskPunchResponse, KioskRecord } from "@presqio/lib";
import { BusinessRoles, CurrentBusiness, CurrentOrganization, CurrentUser, Public } from "../../common/auth/auth.decorators";
import type { BusinessContext, OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { BusinessAccessGuard } from "../../common/auth/business-access.guard";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { CreateKioskDto, KioskLookupDto, KioskPairDto, KioskPunchDto } from "./dto/kiosk.dto";
import { KioskGuard, type KioskContext, type KioskRequest } from "./kiosk.guard";
import { KiosksService } from "./kiosks.service";

const CurrentKiosk = createParamDecorator((_: unknown, context: ExecutionContext): KioskContext =>
  context.switchToHttp().getRequest<KioskRequest>().kiosk!);

@ApiTags("Kiosks")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard, BusinessAccessGuard)
@BusinessRoles("BUSINESS_ADMIN")
@Controller("organizations/:organizationId/businesses/:businessId/kiosks")
export class KiosksAdminController {
  constructor(private readonly kiosks: KiosksService) {}

  @Get()
  list(@CurrentBusiness() business: BusinessContext): Promise<KioskRecord[]> {
    return this.kiosks.list(business.businessId);
  }

  @Post()
  create(
    @CurrentOrganization() org: OrganizationContext, @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser, @Body() dto: CreateKioskDto,
  ): Promise<KioskPairing> {
    return this.kiosks.create(org, business.businessId, user, dto);
  }

  @Post(":kioskId/pairing")
  repair(
    @CurrentOrganization() org: OrganizationContext, @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser, @Param("kioskId", ParseUUIDPipe) kioskId: string,
  ): Promise<KioskPairing> {
    return this.kiosks.repair(org, business.businessId, user, kioskId);
  }

  @Delete(":kioskId")
  @HttpCode(204)
  revoke(
    @CurrentOrganization() org: OrganizationContext, @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser, @Param("kioskId", ParseUUIDPipe) kioskId: string,
  ): Promise<void> {
    return this.kiosks.revoke(org, business.businessId, user, kioskId);
  }
}

/** The shared device itself: it has no user session, only its kiosk token. */
@ApiTags("Kiosk device")
@Public()
@Controller("kiosk")
export class KioskDeviceController {
  constructor(private readonly kiosks: KiosksService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post("pair")
  pair(@Body() dto: KioskPairDto): Promise<KioskPairResponse> {
    return this.kiosks.pair(dto.code);
  }

  @UseGuards(KioskGuard)
  @Get("me")
  me(@CurrentKiosk() kiosk: KioskContext): KioskInfo {
    return this.kiosks.info(kiosk);
  }

  // a busy entrance at shift change: dozens of people a minute
  @UseGuards(KioskGuard)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(200)
  @Post("lookup")
  lookup(@CurrentKiosk() kiosk: KioskContext, @Body() dto: KioskLookupDto): Promise<KioskLookupResponse> {
    return this.kiosks.lookup(kiosk, dto.employeeCode);
  }

  @UseGuards(KioskGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(200)
  @Post("punch")
  punch(@CurrentKiosk() kiosk: KioskContext, @Body() dto: KioskPunchDto): Promise<KioskPunchResponse> {
    return this.kiosks.punch(kiosk, dto);
  }
}

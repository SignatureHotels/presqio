import { Body, Controller, ForbiddenException, HttpCode, UnauthorizedException, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { EmployeeSessionResponse } from "@presqio/lib";
import type { Request, Response } from "express";
import { Public } from "../../common/auth/auth.decorators";
import type { ClientInfo } from "../../common/auth/sessions.service";
import { EmployeeLoginDto } from "./dto/employee-auth.dto";
import { EmployeeAuthService, type IssuedEmployeeSession } from "./employee-auth.service";

/** Separate from the admin cookie so one browser can hold both sessions. */
export const EMPLOYEE_REFRESH_COOKIE = "presqio_ert";
const COOKIE_PATH = "/api/v1/employee-auth";
const STRICT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags("Employee app")
@Controller("employee-auth")
export class EmployeeAuthController {
  constructor(
    private readonly auth: EmployeeAuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle(STRICT)
  @HttpCode(200)
  @Post("login")
  async login(
    @Body() dto: EmployeeLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EmployeeSessionResponse> {
    return this.withCookie(res, await this.auth.login(dto, client(req)));
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<EmployeeSessionResponse> {
    this.assertAppOrigin(req);
    try {
      return this.withCookie(res, await this.auth.refresh(req.cookies?.[EMPLOYEE_REFRESH_COOKIE], client(req)));
    } catch (error) {
      if (error instanceof UnauthorizedException) res.clearCookie(EMPLOYEE_REFRESH_COOKIE, { path: COOKIE_PATH });
      throw error;
    }
  }

  @Public()
  @HttpCode(204)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertAppOrigin(req);
    await this.auth.logout(req.cookies?.[EMPLOYEE_REFRESH_COOKIE]);
    res.clearCookie(EMPLOYEE_REFRESH_COOKIE, { path: COOKIE_PATH });
  }

  private assertAppOrigin(req: Request) {
    const origin = req.headers.origin;
    if (origin && origin !== this.config.getOrThrow<string>("UI_ORIGIN"))
      throw new ForbiddenException("Request origin not allowed");
  }

  private withCookie(res: Response, issued: IssuedEmployeeSession) {
    res.cookie(EMPLOYEE_REFRESH_COOKIE, issued.refreshToken, {
      httpOnly: true,
      secure: this.config.get("NODE_ENV") === "production",
      sameSite: "lax",
      path: COOKIE_PATH,
      expires: issued.refreshExpiresAt,
    });
    return issued.response;
  }
}

const client = (req: Request): ClientInfo => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"]?.slice(0, 300),
});

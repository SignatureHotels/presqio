import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  UnauthorizedException,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { AuthSessionResponse, MeResponse } from "@presqio/lib";
import type { Request, Response } from "express";
import { CurrentUser, Public } from "../../common/auth/auth.decorators";
import type { RequestUser } from "../../common/auth/auth.types";
import { AuthService, ClientInfo, IssuedSession } from "./auth.service";
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/auth.dto";

export const REFRESH_COOKIE = "presqio_rt";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const STRICT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle(STRICT)
  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    return this.withCookie(res, await this.auth.register(dto, client(req)));
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(200)
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    return this.withCookie(res, await this.auth.login(dto.email, dto.password, client(req)));
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    this.assertAppOrigin(req);
    try {
      return this.withCookie(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], client(req)));
    } catch (error) {
      // A temporary database/mail outage must not destroy a valid refresh session.
      if (error instanceof UnauthorizedException) this.clearCookie(res);
      throw error;
    }
  }

  @Public()
  @HttpCode(204)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.assertAppOrigin(req);
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookie(res);
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() user: RequestUser): Promise<MeResponse> {
    return this.auth.me(user.userId);
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(204)
  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(204)
  @Post("resend-verification")
  resendVerification(@CurrentUser() user: RequestUser) {
    return this.auth.resendVerification(user.userId);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(202)
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(202)
  @Post("owner/sign-in-link")
  ownerSignInLink(@Body() dto: ForgotPasswordDto) {
    return this.auth.ownerSignInLink(dto.email);
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(200)
  @Post("owner/sign-in")
  async ownerSignIn(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    return this.withCookie(res, await this.auth.ownerSignIn(dto.token, client(req)));
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(204)
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  /**
   * Refresh and logout authenticate with the cookie alone. SameSite=Lax already keeps it off
   * cross-site requests; rejecting foreign Origin headers is a second layer against CSRF.
   */
  private assertAppOrigin(req: Request) {
    const origin = req.headers.origin;
    if (origin && origin !== this.config.getOrThrow<string>("UI_ORIGIN"))
      throw new ForbiddenException("Request origin not allowed");
  }

  private withCookie(res: Response, issued: IssuedSession) {
    res.cookie(REFRESH_COOKIE, issued.refreshToken, {
      httpOnly: true,
      secure: this.config.get("NODE_ENV") === "production",
      sameSite: "lax",
      path: REFRESH_COOKIE_PATH,
      expires: issued.refreshExpiresAt,
    });
    return issued.response;
  }

  private clearCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }
}

const client = (req: Request): ClientInfo => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"]?.slice(0, 300),
});

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { DatabaseService } from "../database/database.service";
import { IS_PUBLIC } from "./auth.decorators";
import type { AccessTokenPayload, AuthenticatedRequest } from "./auth.types";

/**
 * Global guard: every route needs a valid Bearer access token unless marked @Public().
 * Besides the signature, the session must still be live and the user active, so logout,
 * password reset and account suspension take effect immediately instead of at token expiry.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token)
      throw new UnauthorizedException("Sign in required");
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Session expired");
    }
    const live = await this.db.sessions.count({
      where: {
        id: payload.sid,
        user_id: payload.sub,
        kind: payload.kind,
        revoked_at: null,
        expires_at: { gt: new Date() },
        user_id_ref: { status: "ACTIVE" },
      },
    });
    if (!live) throw new UnauthorizedException("Session expired");
    request.user = { userId: payload.sub, sessionId: payload.sid, kind: payload.kind };
    return true;
  }
}

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { SessionKind } from "@prisma/client";
import { DatabaseService } from "../database/database.service";
import { createOpaqueToken, hashToken } from "../security/tokens";
import type { AccessTokenPayload } from "./auth.types";

const REFRESH_GRACE_MS = 60 * 1000;

export interface ClientInfo {
  ip?: string;
  userAgent?: string;
}
export interface IssuedRefresh {
  userId: string;
  sessionId: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Refresh-token sessions shared by admin and employee sign-in. The refresh token lives only in an
 * httpOnly cookie and is stored as a hash; it rotates on every refresh.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issue(userId: string, kind: SessionKind, client: ClientInfo): Promise<IssuedRefresh> {
    const refreshToken = createOpaqueToken();
    const refreshExpiresAt = new Date(
      Date.now() + this.config.getOrThrow<number>("REFRESH_TOKEN_TTL_DAYS") * 86_400_000,
    );
    const session = await this.db.sessions.create({
      data: {
        user_id: userId,
        kind,
        refresh_token_hash: hashToken(refreshToken),
        expires_at: refreshExpiresAt,
        last_used_at: new Date(),
        ip: client.ip,
        user_agent: client.userAgent,
      },
    });
    return { userId, sessionId: session.id, refreshToken, refreshExpiresAt };
  }

  /**
   * Rotates the refresh token. The previous token keeps working for a short grace period (a
   * response lost to a closed tab must not sign the user out); presenting it after that is
   * treated as token theft and revokes the session.
   */
  async rotate(
    refreshToken: string | undefined,
    kind: SessionKind,
    client: ClientInfo,
  ): Promise<IssuedRefresh> {
    if (!refreshToken) throw new UnauthorizedException("Sign in required");
    const presented = hashToken(refreshToken);
    const include = { user_id_ref: { select: { status: true } } } as const;
    const session =
      (await this.db.sessions.findUnique({ where: { refresh_token_hash: presented }, include })) ??
      (await this.db.sessions.findUnique({
        where: { previous_refresh_token_hash: presented },
        include,
      }));
    if (
      !session ||
      session.kind !== kind ||
      session.revoked_at ||
      session.expires_at <= new Date() ||
      session.user_id_ref.status !== "ACTIVE"
    )
      throw new UnauthorizedException("Session expired");
    const usedPrevious = session.refresh_token_hash !== presented;
    if (usedPrevious) {
      const withinGrace =
        session.rotated_at && Date.now() - session.rotated_at.getTime() < REFRESH_GRACE_MS;
      if (!withinGrace) {
        await this.db.sessions.update({
          where: { id: session.id },
          data: { revoked_at: new Date() },
        });
        throw new UnauthorizedException("Session expired");
      }
    }
    const next = createOpaqueToken();
    const rotated = await this.db.sessions.updateMany({
      where: { id: session.id, refresh_token_hash: session.refresh_token_hash },
      data: {
        refresh_token_hash: hashToken(next),
        // Retrying with the previous token (its response was lost) keeps that token valid for
        // the rest of the original grace window, so repeated interrupted refreshes still recover.
        ...(!usedPrevious && {
          previous_refresh_token_hash: session.refresh_token_hash,
          rotated_at: new Date(),
        }),
        last_used_at: new Date(),
        ip: client.ip,
        user_agent: client.userAgent,
      },
    });
    // A concurrent refresh already rotated this token.
    if (rotated.count !== 1) throw new UnauthorizedException("Session expired");
    return {
      userId: session.user_id,
      sessionId: session.id,
      refreshToken: next,
      refreshExpiresAt: session.expires_at,
    };
  }

  async revoke(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const presented = hashToken(refreshToken);
    await this.db.sessions.updateMany({
      where: {
        revoked_at: null,
        OR: [{ refresh_token_hash: presented }, { previous_refresh_token_hash: presented }],
      },
      data: { revoked_at: new Date() },
    });
  }

  async accessToken(userId: string, sessionId: string, kind: SessionKind) {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId, kind };
    const ttl = this.config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS");
    return {
      accessToken: await this.jwt.signAsync(payload),
      accessTokenExpiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }
}

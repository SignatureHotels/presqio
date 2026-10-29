import { CanActivate, ExecutionContext, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import type { AuthenticatedRequest } from "./auth.types";

/** Emails allowed into the owner console (PLATFORM_OWNER_EMAILS, lower-cased). */
export function platformOwnerEmails(config: ConfigService): Set<string> {
  return new Set(
    (config.get<string>("PLATFORM_OWNER_EMAILS") ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformOwner(
  config: ConfigService,
  user: { email: string | null; email_verified_at: Date | null },
) {
  return Boolean(user.email && user.email_verified_at && platformOwnerEmails(config).has(user.email.toLowerCase()));
}

/**
 * The owner console sees every client, so only listed, verified Presqio staff get in.
 * Everyone else gets 404, so the console's existence isn't revealed.
 */
@Injectable()
export class PlatformOwnerGuard implements CanActivate {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user || request.user.kind !== "ADMIN") throw new NotFoundException();
    const user = await this.db.users.findUnique({
      where: { id: request.user.userId },
      select: { email: true, email_verified_at: true, status: true },
    });
    if (!user || user.status !== "ACTIVE" || !isPlatformOwner(this.config, user)) throw new NotFoundException();
    return true;
  }
}

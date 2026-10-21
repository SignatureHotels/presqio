import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthTokenPurpose } from "@prisma/client";
import type { AuthSessionResponse, MeResponse } from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import { mailTemplates } from "../../common/mail/mail-templates";
import { MailService } from "../../common/mail/mail.service";
import {
  createOpaqueToken,
  hashToken,
  normalizeEmail,
} from "../../common/security/tokens";
import { SessionsService, type ClientInfo } from "../../common/auth/sessions.service";
import { OrganizationsService } from "../organizations/organizations.service";

export type { ClientInfo };
import type { RegisterDto } from "./dto/auth.dto";
import { passwordProblem } from "./password-policy";
import { PasswordService } from "./password.service";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_PASSWORD_TTL_MS = 30 * 60 * 1000;
/** Per user and purpose, so the reset/verify endpoints cannot be used to flood an inbox. */
const MAX_EMAILS_PER_HOUR = 3;

export interface IssuedSession {
  response: AuthSessionResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sessions: SessionsService,
    private readonly passwords: PasswordService,
    private readonly mail: MailService,
    private readonly organizations: OrganizationsService,
  ) {}

  async register(dto: RegisterDto, client: ClientInfo): Promise<IssuedSession> {
    const email = normalizeEmail(dto.email);
    const problem = passwordProblem(dto.password, { email, name: dto.fullName });
    if (problem) throw new BadRequestException(problem);
    const passwordHash = await this.passwords.hash(dto.password);
    let userId: string;
    try {
      userId = await this.db.$transaction(async (tx) => {
        const user = await tx.users.create({
          data: { display_name: dto.fullName, email },
        });
        await tx.credentials.create({
          data: { user_id: user.id, password_hash: passwordHash },
        });
        await this.organizations.createWithOwner(tx, {
          ownerId: user.id,
          name: dto.organizationName,
        });
        return user.id;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        String(error.meta?.target ?? "").includes("email")
      )
        throw new ConflictException("An account with this email already exists");
      throw error;
    }
    // A brand-new user cannot be over the hourly email limit, so a token is always issued.
    const token = (await this.createToken(userId, "VERIFY_EMAIL", VERIFY_EMAIL_TTL_MS))!;
    this.mail.queue(
      email,
      mailTemplates.welcome({
        name: dto.fullName,
        organizationName: dto.organizationName,
        verifyUrl: this.mail.link("/verify-email", token),
      }),
    );
    return this.issueSession(userId, client);
  }

  async login(emailInput: string, password: string, client: ClientInfo) {
    const email = normalizeEmail(emailInput);
    const user = await this.db.users.findUnique({
      where: { email },
      include: { credentials_user_id_rows: true },
    });
    const credential = user?.credentials_user_id_rows[0];
    const invalid = new UnauthorizedException("Incorrect email or password");
    if (credential?.locked_until && credential.locked_until > new Date()) {
      await this.passwords.verify(null, password);
      throw new UnauthorizedException(
        "Too many failed attempts. Try again in a few minutes or reset your password.",
      );
    }
    const valid = await this.passwords.verify(credential?.password_hash, password);
    if (!user || !credential?.password_hash || !valid) {
      if (credential && user) await this.recordFailedLogin(credential.id, user);
      throw invalid;
    }
    if (user.status !== "ACTIVE") throw invalid;
    await this.db.$transaction([
      this.db.credentials.update({
        where: { id: credential.id },
        data: { failed_attempts: 0, locked_until: null },
      }),
      this.db.users.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      }),
    ]);
    return this.issueSession(user.id, client);
  }

  async refresh(refreshToken: string | undefined, client: ClientInfo): Promise<IssuedSession> {
    const issued = await this.sessions.rotate(refreshToken, "ADMIN", client);
    return {
      response: await this.sessionResponse(issued.userId, issued.sessionId),
      refreshToken: issued.refreshToken,
      refreshExpiresAt: issued.refreshExpiresAt,
    };
  }

  logout(refreshToken: string | undefined) {
    return this.sessions.revoke(refreshToken);
  }

  async verifyEmail(token: string) {
    const record = await this.consumeToken(token, "VERIFY_EMAIL");
    await this.db.users.update({
      where: { id: record.user_id },
      data: { email_verified_at: new Date() },
    });
  }

  async resendVerification(userId: string) {
    const user = await this.db.users.findUniqueOrThrow({ where: { id: userId } });
    if (!user.email || user.email_verified_at) return;
    const token = await this.createToken(user.id, "VERIFY_EMAIL", VERIFY_EMAIL_TTL_MS, {
      throwWhenLimited: true,
    });
    this.mail.queue(
      user.email,
      mailTemplates.verifyEmail({
        name: user.display_name,
        verifyUrl: this.mail.link("/verify-email", token!),
      }),
    );
  }

  /** Always succeeds from the caller's view so registered emails cannot be enumerated. */
  async forgotPassword(emailInput: string) {
    const user = await this.db.users.findUnique({
      where: { email: normalizeEmail(emailInput) },
    });
    if (!user?.email || user.status !== "ACTIVE") return;
    // Over the hourly limit we silently skip, so the response still reveals nothing.
    const token = await this.createToken(user.id, "RESET_PASSWORD", RESET_PASSWORD_TTL_MS);
    if (!token) return;
    this.mail.queue(
      user.email,
      mailTemplates.resetPassword({
        name: user.display_name,
        resetUrl: this.mail.link("/reset-password", token),
      }),
    );
  }

  /** Sets a new password and signs out every existing session. */
  async resetPassword(token: string, password: string) {
    const record = await this.consumeToken(token, "RESET_PASSWORD");
    const user = await this.db.users.findUniqueOrThrow({ where: { id: record.user_id } });
    const problem = passwordProblem(password, { email: user.email, name: user.display_name });
    if (problem) {
      // Give the link back so the user can try another password.
      await this.db.auth_tokens.update({ where: { id: record.id }, data: { consumed_at: null } });
      throw new BadRequestException(problem);
    }
    const passwordHash = await this.passwords.hash(password);
    const now = new Date();
    await this.db.$transaction([
      this.db.credentials.upsert({
        where: { user_id: record.user_id },
        create: { user_id: record.user_id, password_hash: passwordHash },
        update: {
          password_hash: passwordHash,
          changed_at: new Date(),
          failed_attempts: 0,
          locked_until: null,
        },
      }),
      this.db.sessions.updateMany({
        where: { user_id: record.user_id, revoked_at: null },
        data: { revoked_at: now },
      }),
      // Any other reset link that was sent is now useless.
      this.db.auth_tokens.updateMany({
        where: { user_id: record.user_id, purpose: "RESET_PASSWORD", consumed_at: null },
        data: { consumed_at: now },
      }),
      // Receiving the reset link proves control of the mailbox.
      this.db.users.updateMany({
        where: { id: record.user_id, email_verified_at: null },
        data: { email_verified_at: now },
      }),
    ]);
    if (user.email)
      this.mail.queue(
        user.email,
        mailTemplates.passwordChanged({
          name: user.display_name,
          when: now.toUTCString(),
          resetUrl: this.mail.link("/forgot-password"),
        }),
      );
  }

  /** The signed-in user with every organization and business they can open. */
  async me(userId: string): Promise<MeResponse> {
    const user = await this.db.users.findUniqueOrThrow({
      where: { id: userId },
      include: {
        organization_memberships_user_id_rows: {
          where: { status: "ACTIVE", organization_id_ref: { status: "ACTIVE" } },
          orderBy: { created_at: "asc" },
          include: {
            organization_id_ref: {
              include: {
                businesses_organization_id_rows: {
                  where: { status: "ACTIVE" },
                  orderBy: { created_at: "asc" },
                  include: {
                    _count: {
                      select: { branches_business_id_rows: { where: { status: "ACTIVE" } } },
                    },
                  },
                },
              },
            },
          },
        },
        business_memberships_user_id_rows: { select: { business_id: true, role: true } },
      },
    });
    const businessRoles = new Map(
      user.business_memberships_user_id_rows.map((m) => [m.business_id, m.role]),
    );
    return {
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email ?? "",
        emailVerified: Boolean(user.email_verified_at),
      },
      organizations: user.organization_memberships_user_id_rows.map(
        ({ role, organization_id_ref: org }) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          onboardingStep: org.onboarding_step,
          role,
          branchCount: org.businesses_organization_id_rows.reduce(
            (sum, b) => sum + b._count.branches_business_id_rows,
            0,
          ),
          businesses: org.businesses_organization_id_rows
            .filter((b) => role !== "MEMBER" || businessRoles.has(b.id))
            .map((b) => ({
              id: b.id,
              name: b.name,
              slug: b.slug,
              code: b.code,
              timezone: b.timezone,
              employeeIdPrefix: b.employee_prefix,
              businessRole: role === "MEMBER" ? businessRoles.get(b.id)! : null,
            })),
        }),
      ),
    };
  }

  /** Atomically counts a failed password; the 5th failure locks sign-in and emails the owner. */
  private async recordFailedLogin(
    credentialId: string,
    user: { email: string | null; display_name: string },
  ) {
    const { failed_attempts } = await this.db.credentials.update({
      where: { id: credentialId },
      data: { failed_attempts: { increment: 1 } },
      select: { failed_attempts: true },
    });
    if (failed_attempts < MAX_FAILED_LOGINS) return;
    const locked = await this.db.credentials.updateMany({
      where: { id: credentialId, failed_attempts: { gte: MAX_FAILED_LOGINS } },
      data: { failed_attempts: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60_000) },
    });
    // Only the request that actually applied the lock sends the notice.
    if (locked.count === 1 && user.email)
      this.mail.queue(
        user.email,
        mailTemplates.accountLocked({
          name: user.display_name,
          minutes: LOCK_MINUTES,
          resetUrl: this.mail.link("/forgot-password"),
        }),
      );
  }

  private async issueSession(userId: string, client: ClientInfo): Promise<IssuedSession> {
    const issued = await this.sessions.issue(userId, "ADMIN", client);
    return {
      response: await this.sessionResponse(userId, issued.sessionId),
      refreshToken: issued.refreshToken,
      refreshExpiresAt: issued.refreshExpiresAt,
    };
  }

  private async sessionResponse(userId: string, sessionId: string): Promise<AuthSessionResponse> {
    return {
      ...(await this.sessions.accessToken(userId, sessionId, "ADMIN")),
      ...(await this.me(userId)),
    };
  }

  /**
   * Issues a single-use token and invalidates earlier unused tokens of the same purpose.
   * Returns null (or throws 429 when asked) once the user hit the hourly email limit.
   */
  private async createToken(
    userId: string,
    purpose: AuthTokenPurpose,
    ttlMs: number,
    options: { throwWhenLimited?: boolean } = {},
  ) {
    const recent = await this.db.auth_tokens.count({
      where: { user_id: userId, purpose, created_at: { gt: new Date(Date.now() - 3_600_000) } },
    });
    if (recent >= MAX_EMAILS_PER_HOUR) {
      if (options.throwWhenLimited)
        throw new HttpException(
          "Too many emails requested. Please wait an hour and try again.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      return null;
    }
    const token = createOpaqueToken();
    await this.db.$transaction([
      this.db.auth_tokens.updateMany({
        where: { user_id: userId, purpose, consumed_at: null },
        data: { consumed_at: new Date() },
      }),
      this.db.auth_tokens.create({
        data: {
          user_id: userId,
          purpose,
          token_hash: hashToken(token),
          expires_at: new Date(Date.now() + ttlMs),
        },
      }),
    ]);
    return token;
  }

  private async consumeToken(token: string, purpose: AuthTokenPurpose) {
    const now = new Date();
    const record = await this.db.auth_tokens.findUnique({
      where: { token_hash: hashToken(token) },
    });
    const consumed =
      record?.purpose === purpose &&
      (await this.db.auth_tokens.updateMany({
        where: { id: record.id, consumed_at: null, expires_at: { gt: now } },
        data: { consumed_at: now },
      })).count === 1;
    if (!record || !consumed)
      throw new BadRequestException("This link is invalid or has expired");
    return record;
  }
}

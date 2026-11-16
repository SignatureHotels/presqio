import { randomInt } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { kiosks } from "@prisma/client";
import type { KioskInfo, KioskLookupResponse, KioskPairResponse, KioskPairing, KioskPunchResponse, KioskRecord } from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { createOpaqueToken, hashToken } from "../../common/security/tokens";
import { AuditService } from "../audit/audit.service";
import { EmployeePortalService } from "../employee-portal/employee-portal.service";
import type { CreateKioskDto, KioskPunchDto } from "./dto/kiosk.dto";
import type { KioskContext } from "./kiosk.guard";

const PAIRING_TTL_MS = 15 * 60_000;
/** No 0/O, 1/I/L: easy to read off one screen and type on another. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const pairingCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const show = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export function toKiosk(row: kiosks & { branch_id_ref: { name: string } }): KioskRecord {
  return {
    id: row.id, name: row.name, branchId: row.branch_id, branchName: row.branch_id_ref.name,
    status: row.revoked_at ? "REVOKED" : row.token_hash ? "ACTIVE" : "PAIRING",
    pairingExpiresAt: row.pairing_expires_at?.toISOString() ?? null, pairedAt: row.paired_at?.toISOString() ?? null,
    lastSeenAt: row.last_seen_at?.toISOString() ?? null, createdAt: row.created_at.toISOString(),
  };
}

/** Shared check-in devices: admins create and revoke them; a paired device records punches. */
@Injectable()
export class KiosksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly portal: EmployeePortalService,
  ) {}

  // ── admin ───────────────────────────────────────────────────────────────

  async list(businessId: string): Promise<KioskRecord[]> {
    const rows = await this.db.kiosks.findMany({
      where: { business_id: businessId }, include: { branch_id_ref: { select: { name: true } } },
      orderBy: [{ revoked_at: { sort: "asc", nulls: "first" } }, { created_at: "asc" }],
    });
    return rows.map(toKiosk);
  }

  async create(org: OrganizationContext, businessId: string, actor: RequestUser, dto: CreateKioskDto): Promise<KioskPairing> {
    const branch = await this.db.branches.findFirst({ where: { id: dto.branchId, business_id: businessId, status: "ACTIVE" }, select: { id: true } });
    if (!branch) throw new NotFoundException("Branch not found");
    const code = pairingCode();
    const row = await this.db.kiosks.create({
      data: { business_id: businessId, branch_id: branch.id, name: dto.name, created_by: actor.userId,
        pairing_code_hash: hashToken(code), pairing_expires_at: new Date(Date.now() + PAIRING_TTL_MS) },
      include: { branch_id_ref: { select: { name: true } } },
    });
    await this.record(org, businessId, actor, row.id, "created", { name: row.name, branch: row.branch_id_ref.name });
    return { kiosk: toKiosk(row), code: show(code), expiresAt: row.pairing_expires_at!.toISOString() };
  }

  /** A new pairing code; the device currently paired (if any) is signed out. */
  async repair(org: OrganizationContext, businessId: string, actor: RequestUser, kioskId: string): Promise<KioskPairing> {
    const current = await this.db.kiosks.findFirst({ where: { id: kioskId, business_id: businessId, revoked_at: null } });
    if (!current) throw new NotFoundException("Kiosk not found");
    const code = pairingCode();
    const row = await this.db.kiosks.update({
      where: { id: current.id },
      data: { token_hash: null, paired_at: null, pairing_code_hash: hashToken(code), pairing_expires_at: new Date(Date.now() + PAIRING_TTL_MS) },
      include: { branch_id_ref: { select: { name: true } } },
    });
    await this.record(org, businessId, actor, row.id, "re-paired", { name: row.name });
    return { kiosk: toKiosk(row), code: show(code), expiresAt: row.pairing_expires_at!.toISOString() };
  }

  async revoke(org: OrganizationContext, businessId: string, actor: RequestUser, kioskId: string): Promise<void> {
    const current = await this.db.kiosks.findFirst({ where: { id: kioskId, business_id: businessId, revoked_at: null } });
    if (!current) throw new NotFoundException("Kiosk not found");
    await this.db.kiosks.update({ where: { id: current.id }, data: { revoked_at: new Date(), token_hash: null, pairing_code_hash: null, pairing_expires_at: null } });
    await this.record(org, businessId, actor, current.id, "revoked", { name: current.name });
  }

  // ── device ──────────────────────────────────────────────────────────────

  async pair(code: string): Promise<KioskPairResponse> {
    const row = await this.db.kiosks.findFirst({
      where: { pairing_code_hash: hashToken(code), revoked_at: null, pairing_expires_at: { gt: new Date() },
        business_id_ref: { status: "ACTIVE", organization_id_ref: { status: "ACTIVE" } } },
      include: { branch_id_ref: { select: { name: true } }, business_id_ref: { select: { timezone: true, employee_prefix: true, organization_id_ref: { select: { name: true } } } } },
    });
    if (!row) throw new UnauthorizedException("That code is wrong or has expired. Ask your admin for a new one.");
    const token = createOpaqueToken();
    // the code works once
    const { count } = await this.db.kiosks.updateMany({
      where: { id: row.id, pairing_code_hash: row.pairing_code_hash },
      data: { token_hash: hashToken(token), paired_at: new Date(), last_seen_at: new Date(), pairing_code_hash: null, pairing_expires_at: null },
    });
    if (!count) throw new UnauthorizedException("That code was just used. Ask your admin for a new one.");
    return { token, kiosk: { name: row.name, branchName: row.branch_id_ref.name, organizationName: row.business_id_ref.organization_id_ref.name, timezone: row.business_id_ref.timezone, employeeIdPrefix: row.business_id_ref.employee_prefix } };
  }

  info(kiosk: KioskContext): KioskInfo {
    return { name: kiosk.name, branchName: kiosk.branchName, organizationName: kiosk.organizationName, timezone: kiosk.timezone, employeeIdPrefix: kiosk.employeeIdPrefix };
  }

  async lookup(kiosk: KioskContext, employeeCode: string): Promise<KioskLookupResponse> {
    const employee = await this.employee(kiosk, employeeCode);
    const profile = await this.portal.profile({ employeeId: employee.id, businessId: kiosk.businessId });
    const checkedIn = profile.today.state === "CHECKED_IN";
    return {
      employeeCode: employee.employee_code, name: employee.full_name, firstName: employee.full_name.split(" ")[0],
      action: checkedIn ? "CHECK_OUT" : "CHECK_IN",
      checkedInAt: checkedIn ? profile.today.checkIn : null,
      shift: profile.today.shifts?.length ? profile.today.shifts.map((s) => s.name).join(" + ") : profile.shift?.name ?? null,
    };
  }

  async punch(kiosk: KioskContext, dto: KioskPunchDto): Promise<KioskPunchResponse> {
    const employee = await this.employee(kiosk, dto.employeeCode);
    const userId = employee.user_id ?? (await this.db.$transaction(async (tx) => {
      // first use, as at the phone sign-in: the employee gets their user record
      const user = await tx.users.create({ data: { display_name: employee.full_name, phone: employee.phone } });
      await tx.employees.update({ where: { id: employee.id }, data: { user_id: user.id, status: "ACTIVE" } });
      return user.id;
    }));
    const outcome = await this.portal.kioskPunch(
      { userId, employeeId: employee.id, businessId: kiosk.businessId, organizationId: kiosk.organizationId },
      { id: kiosk.id, name: kiosk.name, branchId: kiosk.branchId, branchName: kiosk.branchName },
      dto.action, dto.photo, dto.idempotencyKey,
    );
    return outcome.accepted
      ? { accepted: true, action: outcome.action, time: outcome.time, name: employee.full_name, earlyMinutes: outcome.earlyMinutes }
      : { accepted: false, message: outcome.message };
  }

  /** An employee of the kiosk's business who may use it (IDs are looked up within the business only). */
  private async employee(kiosk: KioskContext, employeeCode: string) {
    const employee = await this.db.employees.findFirst({ where: { business_id: kiosk.businessId, employee_code: employeeCode } });
    if (!employee || !["PENDING", "ACTIVE"].includes(employee.status)) {
      if (employee?.status === "SUSPENDED") throw new BadRequestException("Your account is paused. Please contact your admin.");
      throw new NotFoundException("We couldn't find that employee ID. Check it with your admin.");
    }
    return employee;
  }

  private record(org: OrganizationContext, businessId: string, actor: RequestUser, objectId: string, action: string, after: object) {
    return this.audit.record({ organizationId: org.organizationId, businessId, actorId: actor.userId, objectType: "kiosk", objectId, action, after });
  }
}

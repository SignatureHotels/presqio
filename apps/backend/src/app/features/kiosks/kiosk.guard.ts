import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { DatabaseService } from "../../common/database/database.service";
import { hashToken } from "../../common/security/tokens";

export const KIOSK_HEADER = "x-kiosk-token";
export interface KioskContext {
  id: string; name: string; businessId: string; organizationId: string; branchId: string; branchName: string; timezone: string; organizationName: string; employeeIdPrefix: string;
}
export type KioskRequest = Request & { kiosk?: KioskContext };

/** Kiosk routes: a paired, unrevoked device whose business and organization are active. */
@Injectable()
export class KioskGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<KioskRequest>();
    const token = request.headers[KIOSK_HEADER];
    if (typeof token !== "string" || token.length < 20 || token.length > 200) throw new UnauthorizedException("This kiosk isn't set up. Ask your admin for a pairing code.");
    const kiosk = await this.db.kiosks.findFirst({
      where: { token_hash: hashToken(token), revoked_at: null,
        business_id_ref: { status: "ACTIVE", organization_id_ref: { status: "ACTIVE" } }, branch_id_ref: { status: "ACTIVE" } },
      include: { branch_id_ref: { select: { name: true } }, business_id_ref: { select: { organization_id: true, timezone: true, employee_prefix: true, organization_id_ref: { select: { name: true } } } } },
    });
    if (!kiosk) throw new UnauthorizedException("This kiosk was signed out by your admin. Ask for a new pairing code.");
    // a heartbeat for the admin's "last seen", at most once a minute
    if (!kiosk.last_seen_at || Date.now() - kiosk.last_seen_at.getTime() > 60_000)
      await this.db.kiosks.update({ where: { id: kiosk.id }, data: { last_seen_at: new Date() } });
    request.kiosk = {
      id: kiosk.id, name: kiosk.name, businessId: kiosk.business_id, branchId: kiosk.branch_id, branchName: kiosk.branch_id_ref.name,
      organizationId: kiosk.business_id_ref.organization_id, timezone: kiosk.business_id_ref.timezone, organizationName: kiosk.business_id_ref.organization_id_ref.name,
      employeeIdPrefix: kiosk.business_id_ref.employee_prefix,
    };
    return true;
  }
}

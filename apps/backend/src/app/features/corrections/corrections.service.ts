import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Approval, ReviewStatus } from "@presqio/lib";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { DatabaseService } from "../../common/database/database.service";
import { AuditService } from "../audit/audit.service";
import type { DecideCorrectionDto } from "./dto/decide-correction.dto";

const STATUS: Record<"PENDING" | "APPROVED" | "REJECTED", ReviewStatus> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** Correction requests (missed check-out, wrong time …) and their reviewed decisions. */
@Injectable()
export class CorrectionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(businessId: string): Promise<Approval[]> {
    const rows = await this.db.attendance_corrections.findMany({
      where: { business_id: businessId },
      orderBy: { created_at: "desc" },
      take: 200,
      include: {
        approvals_correction_id_rows: { orderBy: { created_at: "desc" }, take: 1 },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      type:
        row.requested_in && row.requested_out
          ? "Time correction"
          : row.requested_out
            ? "Missed check-out"
            : row.requested_in
              ? "Missed check-in"
              : "Attendance correction",
      submitted: row.created_at.toISOString(),
      reason: row.reason,
      status: STATUS[row.status],
      decisionReason: row.approvals_correction_id_rows[0]?.reason,
    }));
  }

  async decide(
    org: OrganizationContext,
    businessId: string,
    actor: RequestUser,
    correctionId: string,
    dto: DecideCorrectionDto,
  ) {
    const decision = dto.decision === "Approved" ? "APPROVED" : "REJECTED";
    await this.db.$transaction(async (tx) => {
      // Only a still-pending request can be decided, and only once.
      const updated = await tx.attendance_corrections.updateMany({
        where: { id: correctionId, business_id: businessId, status: "PENDING" },
        data: { status: decision, reviewer_id: actor.userId, reviewed_at: new Date() },
      });
      if (updated.count !== 1) {
        const exists = await tx.attendance_corrections.count({
          where: { id: correctionId, business_id: businessId },
        });
        if (!exists) throw new NotFoundException("Request not found");
        throw new ConflictException("This request has already been decided");
      }
      if (decision === "APPROVED") await this.applyCorrection(tx, businessId, correctionId, actor.userId);
      await tx.approvals.create({
        data: {
          business_id: businessId,
          correction_id: correctionId,
          reviewer_id: actor.userId,
          decision,
          reason: dto.reason,
        },
      });
      await this.audit.record(
        {
          organizationId: org.organizationId,
          businessId,
          actorId: actor.userId,
          objectType: "correction",
          objectId: correctionId,
          action: decision === "APPROVED" ? "approved" : "rejected",
          after: { name: "Correction request", reason: dto.reason },
        },
        tx,
      );
    });
    return (await this.list(businessId)).find((c) => c.id === correctionId)!;
  }

  /**
   * An approved correction is recorded as an adjustment (the original check-in events are never
   * changed) and the session's times are updated, e.g. a missed check-out closes the session.
   */
  private async applyCorrection(
    tx: Prisma.TransactionClient,
    businessId: string,
    correctionId: string,
    approverId: string,
  ) {
    const correction = await tx.attendance_corrections.findUniqueOrThrow({
      where: { id: correctionId },
      include: { session_id_ref: true },
    });
    const session = correction.session_id_ref;
    const openedAt = correction.requested_in ?? session.opened_at;
    const closedAt = correction.requested_out ?? session.closed_at;
    if (closedAt && closedAt <= openedAt)
      throw new BadRequestException("Check-out must be after check-in. Ask the employee to correct both times.");
    await tx.attendance_adjustments.create({
      data: {
        business_id: businessId,
        correction_id: correctionId,
        session_id: session.id,
        approved_in: correction.requested_in,
        approved_out: correction.requested_out,
        approved_by: approverId,
      },
    });
    await tx.attendance_sessions.update({
      where: { id: session.id },
      data: {
        opened_at: openedAt,
        closed_at: closedAt,
        status: closedAt ? "CORRECTED" : session.status,
        minutes_worked_cached: closedAt
          ? Math.max(0, Math.round((closedAt.getTime() - openedAt.getTime()) / 60_000))
          : null,
      },
    });
  }
}

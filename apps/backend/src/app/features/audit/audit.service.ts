import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DatabaseService } from "../../common/database/database.service";

export interface AuditEntry {
  organizationId: string;
  businessId?: string | null;
  actorId?: string | null;
  /** e.g. "employee", "branch", "shift", "correction" */
  objectType: string;
  objectId: string;
  /** e.g. "created", "updated", "approved" */
  action: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

/** Append-only record of admin changes (the table rejects updates and deletes). */
@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  record(entry: AuditEntry, tx: Prisma.TransactionClient = this.db) {
    return tx.audit_logs.create({
      data: {
        organization_id: entry.organizationId,
        business_id: entry.businessId ?? null,
        actor_id: entry.actorId ?? null,
        object_type: entry.objectType,
        object_id: entry.objectId,
        action: entry.action,
        before_json: entry.before,
        after_json: entry.after,
      },
    });
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { shifts } from "@prisma/client";
import type { ShiftRecord, Weekday } from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { AuditService } from "../audit/audit.service";
import type { CreateShiftDto, UpdateShiftDto } from "./dto/shift.dto";

const DEFAULT_WORKING_DAYS: Weekday[] = [1, 2, 3, 4, 5, 6];

/** Postgres TIME columns round-trip through Prisma as a Date on 1970-01-01 UTC. */
const toTime = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const fromTime = (date: Date) => date.toISOString().slice(11, 16);

@Injectable()
export class ShiftsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(businessId: string): Promise<ShiftRecord[]> {
    const rows = await this.db.shifts.findMany({
      where: { business_id: businessId },
      orderBy: [{ starts_local: "asc" }, { name: "asc" }],
    });
    return rows.map(toRecord);
  }

  async create(
    org: OrganizationContext,
    businessId: string,
    actor: RequestUser,
    dto: CreateShiftDto,
  ): Promise<ShiftRecord> {
    if (dto.start === dto.end)
      throw new BadRequestException("A shift must end at a different time than it starts");
    const business = await this.db.businesses.findUniqueOrThrow({
      where: { id: businessId },
      select: { timezone: true },
    });
    const workingDays = [...(dto.workingDays ?? DEFAULT_WORKING_DAYS)].sort((a, b) => a - b);
    const row = await this.db.shifts.create({
      data: {
        business_id: businessId,
        name: dto.name,
        starts_local: toTime(dto.start),
        ends_local: toTime(dto.end),
        overnight: dto.end < dto.start,
        timezone: business.timezone,
        grace_min: dto.graceMinutes ?? 10,
        break_min: dto.breakMinutes ?? 0,
        policy_json: { workingDays },
      },
    });
    await this.audit.record({
      organizationId: org.organizationId,
      businessId,
      actorId: actor.userId,
      objectType: "shift",
      objectId: row.id,
      action: "created",
      after: { name: row.name, start: dto.start, end: dto.end },
    });
    return toRecord(row);
  }

  async update(
    org: OrganizationContext,
    businessId: string,
    actor: RequestUser,
    shiftId: string,
    dto: UpdateShiftDto,
  ): Promise<ShiftRecord> {
    const current = await this.db.shifts.findFirst({
      where: { id: shiftId, business_id: businessId },
    });
    if (!current) throw new NotFoundException("Shift not found");
    const before = toRecord(current);
    const start = dto.start ?? before.start;
    const end = dto.end ?? before.end;
    if (start === end)
      throw new BadRequestException("A shift must end at a different time than it starts");
    const workingDays = dto.workingDays
      ? [...dto.workingDays].sort((a, b) => a - b)
      : before.workingDays;
    const row = await this.db.shifts.update({
      where: { id: shiftId },
      data: {
        name: dto.name,
        starts_local: toTime(start),
        ends_local: toTime(end),
        overnight: end < start,
        grace_min: dto.graceMinutes,
        break_min: dto.breakMinutes,
        policy_json: { ...((current.policy_json ?? {}) as object), workingDays },
      },
    });
    await this.audit.record({
      organizationId: org.organizationId,
      businessId,
      actorId: actor.userId,
      objectType: "shift",
      objectId: shiftId,
      action: "updated",
      before: { name: before.name, start: before.start, end: before.end },
      after: { name: row.name, start, end },
    });
    return toRecord(row);
  }
}

const toRecord = (row: shifts): ShiftRecord => {
  const policy = (row.policy_json ?? {}) as { workingDays?: Weekday[] };
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    start: fromTime(row.starts_local),
    end: fromTime(row.ends_local),
    breakMinutes: row.break_min,
    graceMinutes: row.grace_min,
    overnight: row.overnight,
    workingDays: policy.workingDays ?? DEFAULT_WORKING_DAYS,
  };
};

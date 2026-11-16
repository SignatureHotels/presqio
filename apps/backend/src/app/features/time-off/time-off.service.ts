import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type leave_types } from "@prisma/client";
import type {
  EmployeeLeaveBalances, HolidayRecord, LeaveBalance, LeaveBalancesResponse, LeaveTypeRecord,
} from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { dateOnly, localDate } from "../../common/time/zoned";
import { AuditService } from "../audit/audit.service";
import { employeesInScope, type BranchScope } from "../../common/auth/branch-scope";
import type { CreateHolidayDto, CreateLeaveTypeDto, UpdateLeaveTypeDto } from "./dto/time-off.dto";

type Db = DatabaseService | Prisma.TransactionClient;
const day = (d: Date) => d.toISOString().slice(0, 10);
export const yearRange = (year: number) => ({ gte: dateOnly(`${year}-01-01`), lte: dateOnly(`${year}-12-31`) });

export function toLeaveType(row: leave_types): LeaveTypeRecord {
  return { id: row.id, name: row.name, paid: row.paid, daysPerYear: row.days_per_year, archived: Boolean(row.archived_at) };
}

export function balanceOf(type: Pick<LeaveTypeRecord, "id" | "daysPerYear">, used: number): LeaveBalance {
  return { typeId: type.id, used, allowed: type.daysPerYear, remaining: type.daysPerYear === null ? null : Math.max(0, type.daysPerYear - used) };
}

/** Holidays (the whole business is off) and leave types with yearly allowances. */
@Injectable()
export class TimeOffService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  // ── holidays ────────────────────────────────────────────────────────────

  async holidays(businessId: string, from: string, to: string, db: Db = this.db): Promise<HolidayRecord[]> {
    const rows = await db.calendars.findMany({
      where: { business_id: businessId, is_working_day: false, calendar_date: { gte: dateOnly(from), lte: dateOnly(to) } },
      orderBy: { calendar_date: "asc" },
    });
    return rows.map((r) => ({ id: r.id, date: day(r.calendar_date), name: r.name }));
  }

  async holiday(businessId: string, date: string, db: Db = this.db): Promise<HolidayRecord | null> {
    const row = await db.calendars.findFirst({ where: { business_id: businessId, calendar_date: dateOnly(date), is_working_day: false } });
    return row ? { id: row.id, date, name: row.name } : null;
  }

  async addHoliday(org: OrganizationContext, businessId: string, actor: RequestUser, dto: CreateHolidayDto): Promise<HolidayRecord> {
    try {
      const row = await this.db.calendars.create({
        data: { business_id: businessId, calendar_date: dateOnly(dto.date), name: dto.name, is_working_day: false },
      });
      await this.record(org, businessId, actor, "holiday", row.id, "created", { date: dto.date, name: dto.name });
      return { id: row.id, date: dto.date, name: row.name };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ConflictException("There's already a holiday on that date.");
      throw error;
    }
  }

  async removeHoliday(org: OrganizationContext, businessId: string, actor: RequestUser, holidayId: string): Promise<void> {
    const row = await this.db.calendars.findFirst({ where: { id: holidayId, business_id: businessId } });
    if (!row) throw new NotFoundException("Holiday not found");
    await this.db.calendars.delete({ where: { id: row.id } });
    await this.record(org, businessId, actor, "holiday", row.id, "deleted", { date: day(row.calendar_date), name: row.name });
  }

  // ── leave types ─────────────────────────────────────────────────────────

  async leaveTypes(businessId: string, opts: { activeOnly?: boolean } = {}, db: Db = this.db): Promise<LeaveTypeRecord[]> {
    const rows = await db.leave_types.findMany({
      where: { business_id: businessId, ...(opts.activeOnly && { archived_at: null }) },
      orderBy: [{ archived_at: { sort: "asc", nulls: "first" } }, { created_at: "asc" }],
    });
    return rows.map(toLeaveType);
  }

  async createLeaveType(org: OrganizationContext, businessId: string, actor: RequestUser, dto: CreateLeaveTypeDto): Promise<LeaveTypeRecord> {
    try {
      const row = await this.db.leave_types.create({
        data: { business_id: businessId, name: dto.name, paid: dto.paid, days_per_year: dto.daysPerYear },
      });
      await this.record(org, businessId, actor, "leave_type", row.id, "created", { name: row.name, paid: row.paid, daysPerYear: row.days_per_year });
      return toLeaveType(row);
    } catch (error) {
      throw this.nameTaken(error);
    }
  }

  async updateLeaveType(org: OrganizationContext, businessId: string, actor: RequestUser, typeId: string, dto: UpdateLeaveTypeDto): Promise<LeaveTypeRecord> {
    const current = await this.db.leave_types.findFirst({ where: { id: typeId, business_id: businessId } });
    if (!current) throw new NotFoundException("Leave type not found");
    try {
      const row = await this.db.leave_types.update({
        where: { id: current.id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.paid !== undefined && { paid: dto.paid }),
          ...(dto.daysPerYear !== undefined && { days_per_year: dto.daysPerYear }),
          ...(dto.archived !== undefined && { archived_at: dto.archived ? (current.archived_at ?? new Date()) : null }),
        },
      });
      await this.record(org, businessId, actor, "leave_type", row.id, "updated", { before: toLeaveType(current), after: toLeaveType(row) });
      return toLeaveType(row);
    } catch (error) {
      throw this.nameTaken(error);
    }
  }

  // ── balances ────────────────────────────────────────────────────────────

  /** Days of each type an employee has taken in a calendar year (cancelled leave doesn't count). */
  async used(businessId: string, employeeId: string, year: number, db: Db = this.db): Promise<Map<string | null, number>> {
    const rows = await db.leave_days.groupBy({
      by: ["leave_type_id"],
      where: { business_id: businessId, employee_id: employeeId, cancelled_at: null, leave_date: yearRange(year) },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.leave_type_id, r._count._all]));
  }

  async balances(businessId: string, year?: number, scope?: BranchScope): Promise<LeaveBalancesResponse> {
    const { timezone } = await this.db.businesses.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } });
    const y = year ?? Number(localDate(timezone).slice(0, 4));
    const [types, employees, counts] = await Promise.all([
      this.leaveTypes(businessId),
      this.db.employees.findMany({
        where: { business_id: businessId, status: { not: "TERMINATED" }, ...employeesInScope(scope) },
        orderBy: [{ full_name: "asc" }, { id: "asc" }], take: 1000,
        select: { id: true, employee_code: true, full_name: true },
      }),
      this.db.leave_days.groupBy({
        by: ["employee_id", "leave_type_id"],
        where: { business_id: businessId, cancelled_at: null, leave_date: yearRange(y) },
        _count: { _all: true },
      }),
    ]);
    const count = (employeeId: string, typeId: string | null) =>
      counts.find((c) => c.employee_id === employeeId && c.leave_type_id === typeId)?._count._all ?? 0;
    const rows: EmployeeLeaveBalances[] = employees.map((e) => ({
      employeeId: e.id, code: e.employee_code, name: e.full_name,
      balances: types.map((t) => balanceOf(t, count(e.id, t.id))),
      untyped: count(e.id, null),
    }));
    return { year: y, types, employees: rows };
  }

  // ── internals ───────────────────────────────────────────────────────────

  private nameTaken(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return new ConflictException("A leave type with that name already exists.");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004")
      return new BadRequestException("Check the name (2–40 characters) and days per year (0–366).");
    return error;
  }

  private record(org: OrganizationContext, businessId: string, actor: RequestUser, objectType: string, objectId: string, action: string, after: object) {
    return this.audit.record({ organizationId: org.organizationId, businessId, actorId: actor.userId, objectType, objectId, action, after });
  }
}

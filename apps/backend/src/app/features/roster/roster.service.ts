import { BadRequestException, Injectable } from "@nestjs/common";
import type { RosterEmployee, RosterResponse, Weekday } from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { dateOnly } from "../../common/time/zoned";
import { AuditService } from "../audit/audit.service";
import { registerDates } from "../attendance/attendance-register.service";
import { toRecord } from "../shifts/shifts.service";
import type { RosterQueryDto, SaveRosterDto } from "./dto/roster.dto";
import { assertBranchInScope, employeesInScope, type BranchScope } from "../../common/auth/branch-scope";
import { rosterDays } from "./roster-schedule";

const MAX_EMPLOYEES = 500;

/** Who works which shift on which date, on top of each person's usual shift. */
@Injectable()
export class RosterService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async get(businessId: string, query: RosterQueryDto, scope?: BranchScope): Promise<RosterResponse> {
    if (query.branchId) assertBranchInScope(scope, query.branchId);
    const dates = registerDates(query.from, query.to);
    const [shifts, employees, holidays] = await Promise.all([
      this.db.shifts.findMany({ where: { business_id: businessId }, orderBy: [{ starts_local: "asc" }, { name: "asc" }] }),
      this.db.employees.findMany({
        where: {
          business_id: businessId,
          status: { not: "TERMINATED" },
          ...employeesInScope(scope),
          ...(query.branchId && { employee_branch_assignments_employee_id_rows: { some: { branch_id: query.branchId, effective_to: null } } }),
        },
        orderBy: [{ full_name: "asc" }, { id: "asc" }],
        take: MAX_EMPLOYEES,
        select: {
          id: true, full_name: true, employee_code: true,
          employee_branch_assignments_employee_id_rows: { where: { effective_to: null }, take: 1, select: { branch_id: true } },
          shift_assignments_employee_id_rows: { where: { effective_to: null }, take: 1, orderBy: { effective_from: "desc" },
            select: { shift_id: true, weekly_pattern: true, shift_id_ref: { select: { policy_json: true } } } },
        },
      }),
      this.db.calendars.findMany({ where: { business_id: businessId, is_working_day: false, calendar_date: { gte: dateOnly(query.from), lte: dateOnly(query.to) } } }),
    ]);
    const days = await rosterDays(this.db, businessId, query.from, query.to, employees.map((e) => e.id));
    const rows: RosterEmployee[] = employees.map((e) => {
      const assignment = e.shift_assignments_employee_id_rows[0];
      const workingDays = assignment
        ? (Array.isArray(assignment.weekly_pattern) ? assignment.weekly_pattern : (assignment.shift_id_ref.policy_json as { workingDays?: Weekday[] })?.workingDays) as Weekday[] ?? null
        : null;
      const own: RosterEmployee["days"] = {};
      for (const date of dates) {
        const entry = days.get(`${e.id}:${date}`);
        if (entry) own[date] = { off: entry.off, shiftIds: entry.shifts.map((s) => s.id) };
      }
      return {
        id: e.id, name: e.full_name, code: e.employee_code,
        branchId: e.employee_branch_assignments_employee_id_rows[0]?.branch_id ?? null,
        usualShiftId: assignment?.shift_id ?? null, workingDays, days: own,
      };
    });
    return {
      from: query.from, to: query.to, dates, shifts: shifts.map(toRecord), employees: rows,
      holidays: Object.fromEntries(holidays.map((h) => [h.calendar_date.toISOString().slice(0, 10), h.name])),
    };
  }

  /** Replaces the given people's days; a change with no shifts and not off returns the day to the usual shift. */
  async save(org: OrganizationContext, businessId: string, actor: RequestUser, dto: SaveRosterDto, scope?: BranchScope): Promise<{ saved: number }> {
    // the last change for a person and date wins
    const changes = [...new Map(dto.changes.map((c) => [`${c.employeeId}:${c.date}`, c])).values()];
    for (const c of changes) {
      registerDates(c.date, c.date);
      if (c.off && c.shiftIds.length) throw new BadRequestException("A day off can't also have shifts.");
      if (new Set(c.shiftIds).size !== c.shiftIds.length) throw new BadRequestException("The same shift is listed twice on one day.");
    }
    const employeeIds = [...new Set(changes.map((c) => c.employeeId))];
    const shiftIds = [...new Set(changes.flatMap((c) => c.shiftIds))];
    const [employees, shifts] = await Promise.all([
      this.db.employees.count({ where: { business_id: businessId, id: { in: employeeIds }, ...employeesInScope(scope) } }),
      this.db.shifts.count({ where: { business_id: businessId, id: { in: shiftIds } } }),
    ]);
    if (employees !== employeeIds.length) throw new BadRequestException("One of these employees isn't in this business.");
    if (shifts !== shiftIds.length) throw new BadRequestException("One of these shifts isn't in this business.");
    const dates = changes.map((c) => c.date).sort();
    await this.db.$transaction(async (tx) => {
      for (const c of changes)
        await tx.roster_entries.deleteMany({ where: { business_id: businessId, employee_id: c.employeeId, work_date: dateOnly(c.date) } });
      const rows = changes.flatMap((c) =>
        c.off ? [{ shift_id: null as string | null, ...base(c) }] : c.shiftIds.map((shift_id) => ({ shift_id, ...base(c) })));
      if (rows.length) await tx.roster_entries.createMany({ data: rows });
      await this.audit.record({
        organizationId: org.organizationId, businessId, actorId: actor.userId, objectType: "roster", objectId: businessId, action: "updated",
        after: { days: changes.length, people: employeeIds.length, from: dates[0], to: dates[dates.length - 1] },
      }, tx);
    });
    return { saved: changes.length };

    function base(c: { employeeId: string; date: string }) {
      return { business_id: businessId, employee_id: c.employeeId, work_date: dateOnly(c.date), created_by: actor.userId };
    }
  }
}

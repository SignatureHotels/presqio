import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AttendanceRegisterResponse, RegisterDay, RegisterSession, RegisterStatus, Weekday } from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import { addDays, dateOnly, isoWeekday, localDate, localTime, minutesEarly, minutesOf, type ShiftSnapshot } from "../../common/time/zoned";
import type { AttendanceRegisterDto } from "./dto/attendance-register.dto";

const PAGE_SIZE = 25;

export function registerDates(from: string, to: string) {
  for (const date of [from, to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dateOnly(date).getTime()) || dateOnly(date).toISOString().slice(0, 10) !== date)
      throw new BadRequestException("Choose valid start and end dates.");
  }
  const length = (dateOnly(to).getTime() - dateOnly(from).getTime()) / 86_400_000 + 1;
  if (length < 1 || length > 31) throw new BadRequestException("Choose a date range of 1–31 days.");
  return Array.from({ length }, (_, i) => addDays(from, i));
}

export function registerDay(input: {
  date: string; today: string; joined: string; sessions: RegisterSession[];
  leaveReason: string | null; onLeave: boolean; workingDays?: Weekday[]; late: boolean;
}): RegisterDay {
  const sessions = input.sessions;
  const status: RegisterStatus = sessions.length ? input.late ? "Late" : "Present"
    : input.date < input.joined ? "Not employed"
    : input.onLeave ? "On leave"
    : input.workingDays && !input.workingDays.includes(isoWeekday(input.date) as Weekday) ? "Rest day"
    : input.date > input.today ? "Scheduled"
    : input.date === input.today ? "Not checked in" : "No record";
  let gapMinutes = 0;
  for (let i = 1; i < sessions.length; i++) {
    const previous = sessions[i - 1].checkOut;
    if (previous) gapMinutes += Math.max(0, Math.round((Date.parse(sessions[i].checkIn) - Date.parse(previous)) / 60_000));
  }
  return {
    date: input.date, status, sessions, gapMinutes,
    completedMinutes: sessions.reduce((sum, s) => sum + (s.minutesWorked ?? 0), 0),
    leaveReason: input.onLeave ? input.leaveReason : null,
  };
}

@Injectable()
export class AttendanceRegisterService {
  constructor(private readonly db: DatabaseService) {}

  async get(businessId: string, query: AttendanceRegisterDto): Promise<AttendanceRegisterResponse> {
    const dates = registerDates(query.from, query.to);
    const { timezone } = await this.db.businesses.findUniqueOrThrow({ where: { id: businessId }, select: { timezone: true } });
    const today = localDate(timezone);
    const range = { gte: dateOnly(query.from), lte: dateOnly(query.to) };
    // Assignment timestamps must overlap the selected branch's local calendar days.
    const bounds = query.branchId ? (await this.db.$queryRaw<{ start: Date; end: Date }[]>`
      SELECT (${query.from}::date::timestamp AT TIME ZONE ${timezone}) AS "start",
             ((${query.to}::date + 1)::timestamp AT TIME ZONE ${timezone}) AS "end"
    `)[0] : null;
    const where: Prisma.employeesWhereInput = {
      business_id: businessId,
      ...(query.search?.trim() && { OR: [
        { full_name: { contains: query.search.trim(), mode: "insensitive" } },
        { employee_code: { contains: query.search.trim(), mode: "insensitive" } },
      ] }),
      ...(query.branchId && { AND: [{ OR: [
        { employee_branch_assignments_employee_id_rows: { some: {
          branch_id: query.branchId,
          effective_from: { lt: bounds!.end },
          OR: [{ effective_to: null }, { effective_to: { gt: bounds!.start } }],
        } } },
        { attendance_sessions_employee_id_rows: { some: { branch_id: query.branchId, work_date: range } } },
      ] }] }),
    };
    const [employees, totalEmployees] = await Promise.all([
      this.db.employees.findMany({ where, orderBy: [{ full_name: "asc" }, { id: "asc" }], skip: (query.page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        select: { id: true, full_name: true, employee_code: true, joined_on: true, created_at: true } }),
      this.db.employees.count({ where }),
    ]);
    const employeeIds = employees.map((e) => e.id);
    const [sessions, leaves, assignments] = await Promise.all([
      this.db.attendance_sessions.findMany({
        where: { business_id: businessId, employee_id: { in: employeeIds }, work_date: range, ...(query.branchId && { branch_id: query.branchId }) },
        orderBy: { opened_at: "asc" },
        include: { branch_id_ref: { select: { name: true } }, attendance_events_session_id_rows: {
          orderBy: { occurred_at: "asc" }, select: { type: true, attempt_id: true },
        } },
      }),
      this.db.leave_days.findMany({ where: { business_id: businessId, employee_id: { in: employeeIds }, leave_date: range, cancelled_at: null } }),
      this.db.shift_assignments.findMany({ where: { business_id: businessId, employee_id: { in: employeeIds }, effective_from: { lte: range.lte },
        OR: [{ effective_to: null }, { effective_to: { gte: range.gte } }] },
        orderBy: { effective_from: "desc" }, include: { shift_id_ref: true } }),
    ]);
    const byDay = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const key = `${session.employee_id}:${session.work_date.toISOString().slice(0, 10)}`;
      const rows = byDay.get(key) ?? []; rows.push(session); byDay.set(key, rows);
    }
    const leaveByDay = new Map(leaves.map((l) => [`${l.employee_id}:${l.leave_date.toISOString().slice(0, 10)}`, l]));
    return {
      from: query.from, to: query.to, timezone, dates, page: query.page, pageSize: PAGE_SIZE, totalEmployees,
      employees: employees.map((employee) => ({
        id: employee.id, name: employee.full_name, code: employee.employee_code,
        days: dates.map((date) => {
          const key = `${employee.id}:${date}`;
          const rows = byDay.get(key) ?? [];
          const assignment = assignments.find((a) => a.employee_id === employee.id && a.effective_from <= dateOnly(date) && (!a.effective_to || a.effective_to >= dateOnly(date)));
          const policy = assignment?.shift_id_ref.policy_json as { workingDays?: Weekday[] } | null | undefined;
          const first = rows[0];
          const snapshot = first?.shift_snapshot as (ShiftSnapshot & { name?: string }) | undefined;
          const shiftStart = snapshot?.start;
          const late = Boolean(first && shiftStart && minutesOf(localTime(timezone, first.opened_at)) > minutesOf(shiftStart) + (snapshot?.graceMinutes ?? 0));
          return registerDay({ date, today, joined: employee.joined_on?.toISOString().slice(0, 10) ?? localDate(timezone, employee.created_at),
            late, workingDays: assignment
              ? Array.isArray(assignment.weekly_pattern) ? assignment.weekly_pattern as Weekday[] : policy?.workingDays ?? [1, 2, 3, 4, 5, 6]
              : undefined,
            onLeave: leaveByDay.has(key), leaveReason: leaveByDay.get(key)?.reason ?? null,
            sessions: rows.map((row) => {
              const snapshot = row.shift_snapshot as ShiftSnapshot & { name?: string };
              const events = row.attendance_events_session_id_rows;
              return {
                id: row.id, branchId: row.branch_id, branchName: row.branch_id_ref.name, shiftName: snapshot?.name ?? "No shift",
                checkIn: row.opened_at.toISOString(), checkOut: row.closed_at?.toISOString() ?? null,
                minutesWorked: row.closed_at ? Math.max(0, Math.round((row.closed_at.getTime() - row.opened_at.getTime()) / 60_000)) : null,
                earlyMinutes: row.closed_at ? minutesEarly(timezone, date, row.closed_at, snapshot ?? {}) : null,
                corrected: row.status === "CORRECTED",
                checkInPhotoAttemptId: events.find((e) => e.type === "CHECK_IN")?.attempt_id ?? null,
                checkOutPhotoAttemptId: [...events].reverse().find((e) => e.type === "CHECK_OUT")?.attempt_id ?? null,
              };
            }),
          });
        }),
      })),
    };
  }
}

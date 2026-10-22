import { Injectable } from "@nestjs/common";
import type {
  ActivityItem,
  AttendanceDay,
  AttendanceSnapshot,
  AttendanceSummary,
  BranchAttendance,
  OverviewResponse,
  Weekday,
} from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
import {
  addDays,
  dateOnly,
  isoWeekday,
  localDate,
  localTime,
  minutesEarly,
  minutesOf,
  type ShiftSnapshot,
} from "../../common/time/zoned";

export interface TodaySnapshot extends AttendanceSnapshot {
  checkOut: string | null;
  earlyMinutes: number | null;
  latestPhotoAttemptId: string | null;
  checkInPhotoAttemptId: string | null;
  checkOutPhotoAttemptId: string | null;
  upcomingLeave: string[];
}

const NOT_CHECKED_IN: Omit<TodaySnapshot, "upcomingLeave"> = {
  status: "Not checked in",
  checkIn: null,
  checkOut: null,
  earlyMinutes: null,
  latestPhotoAttemptId: null,
  checkInPhotoAttemptId: null,
  checkOutPhotoAttemptId: null,
};
const HISTORY_DAYS = 7;

interface ShiftInfo {
  startMinutes: number;
  graceMinutes: number;
  workingDays: Weekday[];
}

const fromTime = (date: Date) => date.toISOString().slice(11, 16);

/**
 * Attendance status is derived from accepted check-in sessions only. Sessions exist only after a
 * accepted check-in (enforced by a database trigger), so a session means a saved selfie
 * and passing GPS check. Nobody is marked absent before their shift window closes; they stay "Not checked in".
 */
@Injectable()
export class AttendanceService {
  constructor(private readonly db: DatabaseService) {}

  // Simultaneous employee-list and overview requests share work, but never cache attendance.
  private readonly pendingToday = new Map<string, ReturnType<AttendanceService["loadToday"]>>();

  async timezoneOf(businessId: string) {
    const business = await this.db.businesses.findUniqueOrThrow({
      where: { id: businessId },
      select: { timezone: true },
    });
    return business.timezone;
  }

  /** Each employee's current shift (start, grace, working days) on `date`. */
  async currentShifts(businessId: string, date: string) {
    const rows = await this.db.shift_assignments.findMany({
      where: {
        business_id: businessId,
        effective_from: { lte: dateOnly(date) },
        OR: [{ effective_to: null }, { effective_to: { gte: dateOnly(date) } }],
      },
      orderBy: { effective_from: "desc" },
      include: { shift_id_ref: true },
    });
    const byEmployee = new Map<string, ShiftInfo & { shiftId: string }>();
    for (const row of rows) {
      if (byEmployee.has(row.employee_id)) continue;
      const policy = (row.shift_id_ref.policy_json ?? {}) as { workingDays?: Weekday[] };
      byEmployee.set(row.employee_id, {
        shiftId: row.shift_id,
        startMinutes: minutesOf(fromTime(row.shift_id_ref.starts_local)),
        graceMinutes: row.shift_id_ref.grace_min,
        workingDays: policy.workingDays ?? [1, 2, 3, 4, 5, 6],
      });
    }
    return byEmployee;
  }

  /** Today's attendance snapshot per employee id. */
  today(businessId: string) {
    let pending = this.pendingToday.get(businessId);
    if (!pending) {
      pending = this.loadToday(businessId).finally(() => this.pendingToday.delete(businessId));
      this.pendingToday.set(businessId, pending);
    }
    return pending;
  }

  private async loadToday(businessId: string) {
    const timezone = await this.timezoneOf(businessId);
    const date = localDate(timezone);
    const [sessions, shifts, leaves] = await Promise.all([
      this.db.attendance_sessions.findMany({
        where: { business_id: businessId, work_date: dateOnly(date) },
        orderBy: { opened_at: "asc" },
        select: {
          employee_id: true,
          opened_at: true,
          closed_at: true,
          status: true,
          shift_snapshot: true,
          attendance_events_session_id_rows: {
            orderBy: { occurred_at: "asc" },
            select: { attempt_id: true, type: true },
          },
        },
      }),
      this.currentShifts(businessId, date),
      this.db.leave_days.findMany({
        where: { business_id: businessId, cancelled_at: null, leave_date: { gte: dateOnly(date) } },
        orderBy: { leave_date: "asc" },
        select: { employee_id: true, leave_date: true },
      }),
    ]);
    const upcomingLeave = new Map<string, string[]>();
    for (const leave of leaves) {
      const list = upcomingLeave.get(leave.employee_id) ?? [];
      list.push(leave.leave_date.toISOString().slice(0, 10));
      upcomingLeave.set(leave.employee_id, list);
    }
    const early = (session: (typeof sessions)[number]) =>
      session.closed_at
        ? minutesEarly(timezone, date, session.closed_at, session.shift_snapshot as ShiftSnapshot)
        : null;
    const snapshots = new Map<string, TodaySnapshot>();
    for (const session of sessions) {
      const existing = snapshots.get(session.employee_id);
      const events = session.attendance_events_session_id_rows;
      const latestAttempt = events[events.length - 1]?.attempt_id ?? null;
      const checkOutAttempt =
        [...events].reverse().find((e) => e.type === "CHECK_OUT")?.attempt_id ?? null;
      if (existing) {
        // A later session the same day: keep the first check-in, update check-out and photo.
        existing.checkOut = session.closed_at ? localTime(timezone, session.closed_at) : null;
        existing.earlyMinutes = early(session);
        existing.latestPhotoAttemptId = latestAttempt ?? existing.latestPhotoAttemptId;
        existing.checkOutPhotoAttemptId = checkOutAttempt;
        continue;
      }
      const checkIn = localTime(timezone, session.opened_at);
      const shift = shifts.get(session.employee_id);
      const late = shift ? minutesOf(checkIn) > shift.startMinutes + shift.graceMinutes : false;
      const checkInAttempt = events.find((e) => e.type === "CHECK_IN")?.attempt_id;
      snapshots.set(session.employee_id, {
        status: late ? "Late" : "Present",
        checkIn,
        checkOut: session.closed_at ? localTime(timezone, session.closed_at) : null,
        earlyMinutes: early(session),
        latestPhotoAttemptId: latestAttempt,
        checkInPhotoAttemptId: checkInAttempt ?? null,
        checkOutPhotoAttemptId: checkOutAttempt,
        upcomingLeave: upcomingLeave.get(session.employee_id) ?? [],
      });
    }
    return {
      date,
      timezone,
      shifts,
      snapshotOf: (employeeId: string): TodaySnapshot => {
        const checkedIn = snapshots.get(employeeId);
        if (checkedIn) return checkedIn;
        const leave = upcomingLeave.get(employeeId) ?? [];
        return {
          ...NOT_CHECKED_IN,
          status: leave[0] === date ? "On leave" : "Not checked in",
          upcomingLeave: leave,
        };
      },
    };
  }

  async overview(organizationId: string, businessId: string): Promise<OverviewResponse> {
    const timezone = await this.timezoneOf(businessId);
    const date = localDate(timezone);
    const from = addDays(date, -(HISTORY_DAYS - 1));
    const [employees, branches, sessions, today, logs, leaves] = await Promise.all([
      this.db.employees.findMany({
        where: { business_id: businessId, status: { in: ["PENDING", "ACTIVE"] } },
        select: {
          id: true,
          created_at: true,
          employee_branch_assignments_employee_id_rows: {
            where: { effective_to: null },
            select: { branch_id: true },
          },
        },
      }),
      this.db.branches.findMany({
        where: { business_id: businessId, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      this.db.attendance_sessions.findMany({
        where: {
          business_id: businessId,
          work_date: { gte: dateOnly(from), lte: dateOnly(date) },
        },
        select: { employee_id: true, work_date: true },
      }),
      this.today(businessId),
      this.recentActivity(organizationId),
      this.db.leave_days.findMany({
        where: {
          business_id: businessId,
          cancelled_at: null,
          leave_date: { gte: dateOnly(from), lte: dateOnly(date) },
        },
        select: { employee_id: true, leave_date: true },
      }),
    ]);
    const shifts = today.shifts;
    const onLeave = new Set(
      leaves.map((l) => `${l.employee_id}:${l.leave_date.toISOString().slice(0, 10)}`),
    );

    // Today's summary.
    const snapshots = employees.map((e) => today.snapshotOf(e.id));
    const present = snapshots.filter((s) => s.status === "Present" || s.status === "Late").length;
    const summary: AttendanceSummary = {
      total: employees.length,
      present,
      late: snapshots.filter((s) => s.status === "Late").length,
      leave: snapshots.filter((s) => s.status === "On leave").length,
      waiting: snapshots.filter((s) => s.status === "Not checked in").length,
      rate: employees.length ? Math.round((present / employees.length) * 100) : 0,
    };

    // Last seven days: scheduled = employees on the books whose shift covers that weekday.
    const presentByDay = new Map<string, Set<string>>();
    for (const session of sessions) {
      const day = session.work_date.toISOString().slice(0, 10);
      if (!presentByDay.has(day)) presentByDay.set(day, new Set());
      presentByDay.get(day)!.add(session.employee_id);
    }
    const days: AttendanceDay[] = Array.from({ length: HISTORY_DAYS }, (_, i) => {
      const day = addDays(from, i);
      const weekday = isoWeekday(day) as Weekday;
      const scheduled = employees.filter((e) => {
        const joined = localDate(timezone, e.created_at) <= day;
        const shift = shifts.get(e.id);
        // A day off the employee took isn't a day they were expected in.
        return (
          joined &&
          (!shift || shift.workingDays.includes(weekday)) &&
          !onLeave.has(`${e.id}:${day}`)
        );
      }).length;
      return {
        date: day,
        label: new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC",
        }),
        scheduled,
        present: presentByDay.get(day)?.size ?? 0,
      };
    });

    // Per branch, today.
    const branchStats: BranchAttendance[] = branches.map((branch) => {
      const members = employees.filter(
        (e) => e.employee_branch_assignments_employee_id_rows[0]?.branch_id === branch.id,
      );
      const here = members.filter((e) => {
        const s = today.snapshotOf(e.id).status;
        return s === "Present" || s === "Late";
      }).length;
      return {
        branchId: branch.id,
        name: branch.name,
        total: members.length,
        present: here,
        rate: members.length ? Math.round((here / members.length) * 100) : 0,
      };
    });

    return { date, timezone, summary, days, branches: branchStats, activity: logs };
  }

  /** Latest admin changes, phrased for people. */
  async recentActivity(organizationId: string, take = 8): Promise<ActivityItem[]> {
    const logs = await this.db.audit_logs.findMany({
      where: { organization_id: organizationId },
      orderBy: { occurred_at: "desc" },
      take,
      include: { actor_id_ref: { select: { display_name: true } } },
    });
    return logs.map((log) => {
      const after = (log.after_json ?? {}) as { name?: string; date?: string; earlyMinutes?: number };
      const subject = after.name ?? log.object_type;
      const on = after.date ? ` for ${shortDate(after.date)}` : "";
      const verb =
        {
          created: "added",
          updated: "updated",
          approved: "approved",
          rejected: "rejected",
          checked_in: "checked in",
          checked_out: after.earlyMinutes ? `checked out ${after.earlyMinutes} min early` : "checked out",
          leave_taken: `took leave${on}`,
          leave_cancelled: `cancelled leave${on}`,
        }[log.action] ?? log.action;
      return {
        id: log.id,
        title: `${subject} ${verb}`,
        description: `${capitalize(log.object_type)} · by ${log.actor_id_ref?.display_name ?? "system"}`,
        occurredAt: log.occurred_at.toISOString(),
      };
    });
  }
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

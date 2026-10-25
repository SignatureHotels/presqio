import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AttemptOutcome,
  AttemptResponse,
  AttendanceHistoryDay,
  EmployeeCorrection,
  EmployeeProfile,
  LeaveDay,
  Weekday,
} from "@presqio/lib";
import type { EmployeeContext } from "../../common/auth/auth.types";
import { DatabaseService } from "../../common/database/database.service";
import { parsePhotoDataUrl } from "../../common/security/photo";
import { PhotoStorageService } from "../../common/storage/photo-storage.service";
import { createOpaqueToken, hashToken } from "../../common/security/tokens";
import {
  addDays,
  dateOnly,
  localDate,
  localTime,
  minutesEarly,
  minutesOf,
  type ShiftSnapshot,
} from "../../common/time/zoned";
import { AuditService } from "../audit/audit.service";
import type {
  CreateCorrectionDto,
  StartAttemptDto,
  SubmitAttemptDto,
  TakeLeaveDto,
} from "./dto/employee-portal.dto";

/** How long a check-in started on the phone stays valid. */
const ATTEMPT_TTL_MS = 3 * 60_000;
/** GPS readings older than this (or from the future) are not trusted. */
const MAX_LOCATION_AGE_MS = 2 * 60_000;
const MAX_CLOCK_SKEW_MS = 60_000;
const HISTORY_DAYS = 45;
/** How far ahead leave can be taken. */
const LEAVE_AHEAD_DAYS = 180;

const fromTime = (date: Date) => date.toISOString().slice(11, 16);
const STATUS = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" } as const;

@Injectable()
export class EmployeePortalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly storage: PhotoStorageService,
  ) {}

  /** Everything the employee home screen needs. */
  async profile(ctx: Pick<EmployeeContext, "employeeId" | "businessId">): Promise<EmployeeProfile> {
    const employee = await this.db.employees.findUniqueOrThrow({
      where: { id: ctx.employeeId },
      include: {
        business_id_ref: { include: { organization_id_ref: { select: { name: true } } } },
        payroll_profile_row: { select: { department: true, date_of_birth: true } },
        employee_branch_assignments_employee_id_rows: { where: { effective_to: null }, take: 1 },
        shift_assignments_employee_id_rows: {
          where: { effective_to: null },
          take: 1,
          include: { shift_id_ref: true },
        },
      },
    });
    const timezone = employee.business_id_ref.timezone;
    const today = localDate(timezone);
    const branchId = employee.employee_branch_assignments_employee_id_rows[0]?.branch_id;
    const branch = branchId ? await this.branchWithPerimeter(ctx.businessId, branchId) : null;
    const shiftRow = employee.shift_assignments_employee_id_rows[0]?.shift_id_ref;
    const [open, todays, leaveToday] = await Promise.all([
      this.openSession(ctx.businessId, ctx.employeeId),
      this.db.attendance_sessions.findMany({
        where: { business_id: ctx.businessId, employee_id: ctx.employeeId, work_date: dateOnly(today) },
        orderBy: { opened_at: "asc" },
      }),
      this.db.leave_days.count({
        where: {
          business_id: ctx.businessId,
          employee_id: ctx.employeeId,
          leave_date: dateOnly(today),
          cancelled_at: null,
        },
      }),
    ]);
    const first = open ?? todays[0];
    const lastClosed = [...todays].reverse().find((s) => s.closed_at);
    const checkIn = first ? localTime(timezone, first.opened_at) : null;
    const graceEnd = shiftRow
      ? minutesOf(fromTime(shiftRow.starts_local)) + shiftRow.grace_min
      : Number.POSITIVE_INFINITY;
    return {
      id: employee.id,
      name: employee.full_name,
      code: employee.employee_code,
      jobTitle: employee.job_title ?? "",
      department: employee.payroll_profile_row?.department ?? "",
      phone: employee.phone ?? "",
      email: employee.email ?? "",
      joinedOn: employee.joined_on?.toISOString().slice(0, 10) ?? null,
      dateOfBirth: employee.payroll_profile_row?.date_of_birth?.toISOString().slice(0, 10) ?? null,
      organizationName: employee.business_id_ref.organization_id_ref.name,
      timezone,
      branch,
      shift: shiftRow
        ? {
            name: shiftRow.name,
            start: fromTime(shiftRow.starts_local),
            end: fromTime(shiftRow.ends_local),
            overnight: shiftRow.overnight,
            graceMinutes: shiftRow.grace_min,
            workingDays:
              ((shiftRow.policy_json ?? {}) as { workingDays?: Weekday[] }).workingDays ?? [1, 2, 3, 4, 5, 6],
          }
        : null,
      today: {
        date: today,
        state: open ? "CHECKED_IN" : todays.length ? "CHECKED_OUT" : "NOT_CHECKED_IN",
        status: !checkIn
          ? leaveToday
            ? "On leave"
            : "Not checked in"
          : minutesOf(checkIn) > graceEnd
            ? "Late"
            : "Present",
        checkIn,
        checkOut: !open && lastClosed?.closed_at ? localTime(timezone, lastClosed.closed_at) : null,
        earlyMinutes:
          !open && lastClosed?.closed_at
            ? minutesEarly(timezone, today, lastClosed.closed_at, lastClosed.shift_snapshot as ShiftSnapshot)
            : null,
        onLeave: !checkIn && leaveToday > 0,
      },
    };
  }

  /** Starts a check-in/out. The phone then has a few minutes to send GPS + selfie. */
  async startAttempt(ctx: EmployeeContext, dto: StartAttemptDto): Promise<AttemptResponse> {
    const existing = await this.db.attendance_attempts.findUnique({
      where: {
        business_id_employee_id_idempotency_key: {
          business_id: ctx.businessId,
          employee_id: ctx.employeeId,
          idempotency_key: dto.idempotencyKey,
        },
      },
    });
    if (existing) {
      if (existing.status === "INITIATED" && existing.expires_at > new Date())
        return { attemptId: existing.id, action: existing.action, expiresAt: existing.expires_at.toISOString() };
      throw new ConflictException("Please start again.");
    }
    const open = await this.openSession(ctx.businessId, ctx.employeeId);
    if (dto.action === "CHECK_IN" && open) throw new ConflictException("You're already checked in.");
    if (dto.action === "CHECK_OUT" && !open) throw new ConflictException("You haven't checked in yet.");
    // Check-out must happen at the branch the session was opened at.
    const branchId =
      open?.branch_id ??
      (
        await this.db.employee_branch_assignments.findFirst({
          where: { business_id: ctx.businessId, employee_id: ctx.employeeId, effective_to: null },
          select: { branch_id: true },
        })
      )?.branch_id;
    if (!branchId) throw new BadRequestException("You aren't assigned to a branch yet. Ask your admin.");
    const attempt = await this.db.attendance_attempts.create({
      data: {
        business_id: ctx.businessId,
        employee_id: ctx.employeeId,
        branch_id: branchId,
        action: dto.action,
        challenge_nonce_hash: hashToken(createOpaqueToken()),
        expires_at: new Date(Date.now() + ATTEMPT_TTL_MS),
        idempotency_key: dto.idempotencyKey,
      },
    });
    return { attemptId: attempt.id, action: attempt.action, expiresAt: attempt.expires_at.toISOString() };
  }

  /**
   * Verifies the GPS reading against the branch perimeter on the server and, when it passes,
   * records the check-in or check-out in one transaction. The selfie is stored as evidence.
   */
  async submitAttempt(
    ctx: EmployeeContext,
    attemptId: string,
    dto: SubmitAttemptDto,
  ): Promise<AttemptOutcome> {
    const photo = parsePhotoDataUrl(dto.photo);
    const capturedAt = new Date(dto.capturedAt);
    // Upload before the transaction so the slow network call doesn't hold database locks.
    const storageKey = this.storage.enabled
      ? this.storage.keyFor(ctx.businessId, attemptId, photo.contentType)
      : null;
    if (storageKey) await this.storage.put(storageKey, photo.data, photo.contentType);
    let outcome: Awaited<ReturnType<typeof this.recordAttempt>>;
    try {
      outcome = await this.recordAttempt(ctx, attemptId, dto, photo, capturedAt, storageKey);
    } catch (error) {
      if (storageKey) await this.storage.remove(storageKey);
      throw error;
    }
    if (!outcome.accepted) {
      if (storageKey) await this.storage.remove(storageKey);
      return outcome;
    }
    return { ...outcome, profile: await this.profile(ctx) };
  }

  private recordAttempt(
    ctx: EmployeeContext,
    attemptId: string,
    dto: SubmitAttemptDto,
    photo: ReturnType<typeof parsePhotoDataUrl>,
    capturedAt: Date,
    storageKey: string | null,
  ) {
    return this.db.$transaction(async (tx) => {
      const [attempt] = await tx.$queryRaw<
        { id: string; action: "CHECK_IN" | "CHECK_OUT"; branch_id: string; status: string; expires_at: Date }[]
      >`SELECT id, action, branch_id, status, expires_at FROM attendance_attempts
         WHERE id = ${attemptId}::uuid AND business_id = ${ctx.businessId}::uuid
           AND employee_id = ${ctx.employeeId}::uuid
         FOR UPDATE`;
      if (!attempt) throw new NotFoundException("Check-in not found. Please start again.");
      if (attempt.status !== "INITIATED") throw new ConflictException("Please start again.");
      if (attempt.expires_at <= new Date()) {
        await tx.attendance_attempts.update({ where: { id: attemptId }, data: { status: "EXPIRED" } });
        throw new GoneException("That took too long. Please start again.");
      }
      const [fence] = await tx.$queryRaw<
        { id: string; radius_m: number; max_accuracy_m: number; distance_m: number }[]
      >`SELECT id, radius_m, max_accuracy_m,
               ST_Distance(center, ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography) AS distance_m
          FROM geofences
         WHERE business_id = ${ctx.businessId}::uuid AND branch_id = ${attempt.branch_id}::uuid
           AND active_to IS NULL
         ORDER BY active_from DESC LIMIT 1`;
      if (!fence)
        return reject(tx, attemptId, "NO_PERIMETER", "Your branch has no check-in perimeter yet. Ask your admin.", null, dto.accuracy);
      const distance = Math.round(fence.distance_m);
      const age = Date.now() - capturedAt.getTime();
      const [result, reason] =
        age > MAX_LOCATION_AGE_MS || age < -MAX_CLOCK_SKEW_MS
          ? (["RETRY", "STALE_LOCATION"] as const)
          : dto.accuracy > fence.max_accuracy_m
            ? (["RETRY", "LOW_GPS_ACCURACY"] as const)
            : distance > fence.radius_m
              ? (["FAIL", "OUTSIDE_GEOFENCE"] as const)
              : (["PASS", null] as const);
      await tx.location_checks.create({
        data: {
          business_id: ctx.businessId,
          attempt_id: attemptId,
          reported_lat: dto.latitude,
          reported_lon: dto.longitude,
          accuracy_m: dto.accuracy,
          client_position_timestamp: capturedAt,
          distance_m: distance,
          geofence_id: fence.id,
          result,
          reason,
        },
      });
      if (reason === "STALE_LOCATION")
        return reject(tx, attemptId, reason, "Your location reading was out of date. Please try again.", distance, dto.accuracy);
      if (reason === "LOW_GPS_ACCURACY")
        return reject(
          tx,
          attemptId,
          reason,
          `GPS is not precise enough (±${Math.round(dto.accuracy)} m, needs ±${Math.round(fence.max_accuracy_m)} m). Move near a window or step outside and try again.`,
          distance,
          dto.accuracy,
        );
      if (reason === "OUTSIDE_GEOFENCE")
        return reject(
          tx,
          attemptId,
          reason,
          `You're ${distance} m from the branch. Check-in works within ${Math.round(fence.radius_m)} m.`,
          distance,
          dto.accuracy,
        );

      // Passed: consume the attempt, keep the selfie, then open or close the session.
      const now = new Date();
      await tx.attendance_attempts.update({
        where: { id: attemptId },
        data: { status: "CONSUMED", consumed_at: now },
      });
      await tx.attendance_photos.create({
        data: {
          business_id: ctx.businessId,
          attempt_id: attemptId,
          employee_id: ctx.employeeId,
          content_type: photo.contentType,
          size_bytes: photo.data.length,
          ...(storageKey ? { storage_key: storageKey } : { data: photo.data }),
        },
      });
      const business = await tx.businesses.findUniqueOrThrow({
        where: { id: ctx.businessId },
        select: { timezone: true },
      });
      let sessionId: string;
      if (attempt.action === "CHECK_IN") {
        const today = localDate(business.timezone, now);
        const shiftAssignment = await tx.shift_assignments.findFirst({
          where: { business_id: ctx.businessId, employee_id: ctx.employeeId, effective_to: null },
          include: { shift_id_ref: true },
        });
        const branch = await tx.branches.findUniqueOrThrow({
          where: { id: attempt.branch_id },
          select: { name: true },
        });
        try {
          const session = await tx.attendance_sessions.create({
            data: {
              business_id: ctx.businessId,
              employee_id: ctx.employeeId,
              branch_id: attempt.branch_id,
              shift_assignment_id: shiftAssignment?.id,
              work_date: dateOnly(today),
              opened_at: now,
              shift_snapshot: shiftAssignment
                ? {
                    name: shiftAssignment.shift_id_ref.name,
                    start: fromTime(shiftAssignment.shift_id_ref.starts_local),
                    end: fromTime(shiftAssignment.shift_id_ref.ends_local),
                    graceMinutes: shiftAssignment.shift_id_ref.grace_min,
                    overnight: shiftAssignment.shift_id_ref.overnight,
                  }
                : {},
              branch_snapshot: { name: branch.name, radius: fence.radius_m, distance },
            },
          });
          sessionId = session.id;
          // Came to work after all: today's leave no longer applies.
          await tx.leave_days.updateMany({
            where: {
              business_id: ctx.businessId,
              employee_id: ctx.employeeId,
              leave_date: dateOnly(today),
              cancelled_at: null,
            },
            data: { cancelled_at: now },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
            throw new ConflictException("You're already checked in.");
          throw error;
        }
      } else {
        const open = await this.openSession(ctx.businessId, ctx.employeeId, tx);
        if (!open) throw new ConflictException("You haven't checked in yet.");
        sessionId = open.id;
      }
      await tx.attendance_events.create({
        data: {
          business_id: ctx.businessId,
          session_id: sessionId,
          attempt_id: attemptId,
          employee_id: ctx.employeeId,
          type: attempt.action,
          branch_id: attempt.branch_id,
        },
      });
      let earlyMinutes: number | null = null;
      if (attempt.action === "CHECK_OUT") {
        const session = await tx.attendance_sessions.findUniqueOrThrow({ where: { id: sessionId } });
        // Checking out before the shift ends is allowed; how early is shown to the admin.
        earlyMinutes = minutesEarly(
          business.timezone,
          session.work_date.toISOString().slice(0, 10),
          now,
          session.shift_snapshot as ShiftSnapshot,
        );
        await tx.attendance_sessions.update({
          where: { id: sessionId },
          data: {
            closed_at: now,
            status: "CLOSED",
            minutes_worked_cached: Math.max(0, Math.round((now.getTime() - session.opened_at.getTime()) / 60_000)),
          },
        });
      }
      const employee = await tx.employees.findUniqueOrThrow({
        where: { id: ctx.employeeId },
        select: { full_name: true },
      });
      await this.audit.record(
        {
          organizationId: ctx.organizationId,
          businessId: ctx.businessId,
          actorId: ctx.userId,
          objectType: "attendance",
          objectId: sessionId,
          action: attempt.action === "CHECK_IN" ? "checked_in" : "checked_out",
          after: { name: employee.full_name, distance, ...(earlyMinutes && { earlyMinutes }) },
        },
        tx,
      );
      return {
        accepted: true as const,
        action: attempt.action,
        time: localTime(business.timezone, now),
        distance,
        earlyMinutes,
      };
    });
  }

  async history(ctx: EmployeeContext): Promise<AttendanceHistoryDay[]> {
    const business = await this.db.businesses.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { timezone: true },
    });
    const since = addDays(localDate(business.timezone), -HISTORY_DAYS);
    const sessions = await this.db.attendance_sessions.findMany({
      where: { business_id: ctx.businessId, employee_id: ctx.employeeId, work_date: { gte: dateOnly(since) } },
      orderBy: { opened_at: "desc" },
      include: { branch_id_ref: { select: { name: true } } },
    });
    return sessions.map((s) => {
      const snapshot = (s.shift_snapshot ?? {}) as ShiftSnapshot;
      const checkIn = localTime(business.timezone, s.opened_at);
      const late =
        snapshot.start !== undefined && minutesOf(checkIn) > minutesOf(snapshot.start) + (snapshot.graceMinutes ?? 0);
      return {
        sessionId: s.id,
        date: s.work_date.toISOString().slice(0, 10),
        checkIn,
        checkOut: s.closed_at ? localTime(business.timezone, s.closed_at) : null,
        minutesWorked: s.minutes_worked_cached,
        status: late ? "Late" : "Present",
        earlyMinutes: s.closed_at
          ? minutesEarly(business.timezone, s.work_date.toISOString().slice(0, 10), s.closed_at, snapshot)
          : null,
        branchName: s.branch_id_ref.name,
      };
    });
  }

  async corrections(ctx: EmployeeContext): Promise<EmployeeCorrection[]> {
    const rows = await this.db.attendance_corrections.findMany({
      where: { business_id: ctx.businessId, employee_id: ctx.employeeId },
      orderBy: { created_at: "desc" },
      take: 50,
      include: {
        session_id_ref: { select: { work_date: true } },
        approvals_correction_id_rows: { orderBy: { created_at: "desc" }, take: 1 },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      date: row.session_id_ref.work_date.toISOString().slice(0, 10),
      type: correctionType(row.requested_in, row.requested_out),
      reason: row.reason,
      status: STATUS[row.status],
      decisionReason: row.approvals_correction_id_rows[0]?.reason,
      submitted: row.created_at.toISOString(),
    }));
  }

  async requestCorrection(ctx: EmployeeContext, dto: CreateCorrectionDto): Promise<EmployeeCorrection> {
    if (!dto.requestedIn && !dto.requestedOut)
      throw new BadRequestException("Enter the correct check-in or check-out time.");
    const session = await this.db.attendance_sessions.findFirst({
      where: { id: dto.sessionId, business_id: ctx.businessId, employee_id: ctx.employeeId },
      include: { business_id_ref: { select: { timezone: true } } },
    });
    if (!session) throw new NotFoundException("That attendance day was not found.");
    const pending = await this.db.attendance_corrections.count({
      where: { session_id: session.id, status: "PENDING" },
    });
    if (pending) throw new ConflictException("You already have a pending request for this day.");
    const timezone = session.business_id_ref.timezone;
    const day = session.work_date.toISOString().slice(0, 10);
    const requestedIn = dto.requestedIn ? await this.zonedInstant(day, dto.requestedIn, timezone) : null;
    let requestedOut = dto.requestedOut ? await this.zonedInstant(day, dto.requestedOut, timezone) : null;
    const start = requestedIn ?? session.opened_at;
    // An end time before the start means the shift ran past midnight.
    if (requestedOut && requestedOut <= start) requestedOut = new Date(requestedOut.getTime() + 86_400_000);
    const effectiveOut = requestedOut ?? session.closed_at;
    if (effectiveOut && effectiveOut <= start)
      throw new BadRequestException("Check-out must be after check-in. Correct both times if needed.");
    const row = await this.db.attendance_corrections.create({
      data: {
        business_id: ctx.businessId,
        session_id: session.id,
        employee_id: ctx.employeeId,
        requester_id: ctx.userId,
        requested_in: requestedIn,
        requested_out: requestedOut,
        reason: dto.reason,
      },
    });
    return {
      id: row.id,
      date: day,
      type: correctionType(row.requested_in, row.requested_out),
      reason: row.reason,
      status: "Pending",
      submitted: row.created_at.toISOString(),
    };
  }

  /** Leave from the last 45 days on, newest first. */
  async leaves(ctx: EmployeeContext): Promise<LeaveDay[]> {
    const timezone = await this.timezoneOf(ctx.businessId);
    const today = localDate(timezone);
    const [rows, checkedIn] = await Promise.all([
      this.db.leave_days.findMany({
        where: {
          business_id: ctx.businessId,
          employee_id: ctx.employeeId,
          cancelled_at: null,
          leave_date: { gte: dateOnly(addDays(today, -HISTORY_DAYS)) },
        },
        orderBy: { leave_date: "desc" },
      }),
      this.checkedInOn(ctx, today),
    ]);
    return rows.map((row) => toLeaveDay(row, today, checkedIn));
  }

  /** Any day from today on; recorded at once, no approval needed. */
  async takeLeave(ctx: EmployeeContext, dto: TakeLeaveDto): Promise<LeaveDay> {
    const timezone = await this.timezoneOf(ctx.businessId);
    const today = localDate(timezone);
    if (dto.date < today) throw new BadRequestException("Leave can be taken for today or a later day.");
    if (dto.date > addDays(today, LEAVE_AHEAD_DAYS))
      throw new BadRequestException(`Leave can be taken up to ${LEAVE_AHEAD_DAYS} days ahead.`);
    if (dto.date === today && (await this.checkedInOn(ctx, today)))
      throw new ConflictException("You've already checked in today.");
    try {
      const row = await this.db.$transaction(async (tx) => {
        const created = await tx.leave_days.create({
          data: {
            business_id: ctx.businessId,
            employee_id: ctx.employeeId,
            leave_date: dateOnly(dto.date),
            reason: dto.reason || null,
          },
        });
        await this.recordLeave(tx, ctx, created.id, "leave_taken", dto.date);
        return created;
      });
      return toLeaveDay(row, today, false);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ConflictException("You've already taken leave on that day.");
      throw error;
    }
  }

  async cancelLeave(ctx: EmployeeContext, leaveId: string) {
    const timezone = await this.timezoneOf(ctx.businessId);
    const today = localDate(timezone);
    const leave = await this.db.leave_days.findFirst({
      where: { id: leaveId, business_id: ctx.businessId, employee_id: ctx.employeeId, cancelled_at: null },
    });
    if (!leave) throw new NotFoundException("That leave was not found.");
    const date = leave.leave_date.toISOString().slice(0, 10);
    if (date < today) throw new BadRequestException("Past leave can't be cancelled.");
    await this.db.$transaction(async (tx) => {
      await tx.leave_days.update({ where: { id: leave.id }, data: { cancelled_at: new Date() } });
      await this.recordLeave(tx, ctx, leave.id, "leave_cancelled", date);
    });
  }

  private async recordLeave(
    tx: Prisma.TransactionClient,
    ctx: EmployeeContext,
    leaveId: string,
    action: "leave_taken" | "leave_cancelled",
    date: string,
  ) {
    const employee = await tx.employees.findUniqueOrThrow({
      where: { id: ctx.employeeId },
      select: { full_name: true },
    });
    await this.audit.record(
      {
        organizationId: ctx.organizationId,
        businessId: ctx.businessId,
        actorId: ctx.userId,
        objectType: "leave",
        objectId: leaveId,
        action,
        after: { name: employee.full_name, date },
      },
      tx,
    );
  }

  private async checkedInOn(ctx: EmployeeContext, date: string) {
    const count = await this.db.attendance_sessions.count({
      where: { business_id: ctx.businessId, employee_id: ctx.employeeId, work_date: dateOnly(date) },
    });
    return count > 0;
  }

  private async timezoneOf(businessId: string) {
    const business = await this.db.businesses.findUniqueOrThrow({
      where: { id: businessId },
      select: { timezone: true },
    });
    return business.timezone;
  }

  /** The branch with its current check-in perimeter. */
  private async branchWithPerimeter(businessId: string, branchId: string) {
    const [row] = await this.db.$queryRaw<
      {
        id: string;
        name: string;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
        radius_m: number | null;
        max_accuracy_m: number | null;
      }[]
    >`SELECT b.id, b.name, b.address,
             ST_Y(g.center::geometry) AS latitude, ST_X(g.center::geometry) AS longitude,
             g.radius_m, g.max_accuracy_m
        FROM branches b
        LEFT JOIN LATERAL (
          SELECT center, radius_m, max_accuracy_m FROM geofences
           WHERE business_id = b.business_id AND branch_id = b.id AND active_to IS NULL
           ORDER BY active_from DESC LIMIT 1
        ) g ON true
       WHERE b.business_id = ${businessId}::uuid AND b.id = ${branchId}::uuid`;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      address: row.address ?? "",
      latitude: row.latitude ?? 0,
      longitude: row.longitude ?? 0,
      radius: row.radius_m ?? 0,
      maxAccuracy: row.max_accuracy_m ?? 0,
    };
  }

  private openSession(businessId: string, employeeId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.attendance_sessions.findFirst({
      where: { business_id: businessId, employee_id: employeeId, status: "OPEN" },
    });
  }

  /** The instant of a local wall-clock time on a date in an IANA time zone (Postgres does the zone math). */
  private async zonedInstant(date: string, hhmm: string, timeZone: string) {
    const [row] = await this.db.$queryRaw<{ at: Date }[]>`
      SELECT ((${date} || ' ' || ${hhmm})::timestamp AT TIME ZONE ${timeZone}) AS at`;
    return row.at;
  }
}

async function reject(
  tx: Prisma.TransactionClient,
  attemptId: string,
  reason: "OUTSIDE_GEOFENCE" | "LOW_GPS_ACCURACY" | "STALE_LOCATION" | "NO_PERIMETER",
  message: string,
  distance: number | null,
  accuracy: number,
) {
  await tx.attendance_attempts.update({
    where: { id: attemptId },
    data: { status: "RETRYABLE_FAILURE" },
  });
  return { accepted: false as const, reason, message, distance, accuracy };
}

const correctionType = (requestedIn: Date | null, requestedOut: Date | null) =>
  requestedIn && requestedOut
    ? "Time correction"
    : requestedOut
      ? "Missed check-out"
      : requestedIn
        ? "Missed check-in"
        : "Attendance correction";

function toLeaveDay(
  row: { id: string; leave_date: Date; reason: string | null },
  today: string,
  checkedInToday: boolean,
): LeaveDay {
  const date = row.leave_date.toISOString().slice(0, 10);
  return {
    id: row.id,
    date,
    reason: row.reason ?? "",
    cancellable: date > today || (date === today && !checkedInToday),
  };
}

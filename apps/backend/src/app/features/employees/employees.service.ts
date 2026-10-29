import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { subscriptionProblem, type SubscriptionRow } from "../../common/billing/subscription";
import { Prisma } from "@prisma/client";
import type { EmployeeRecord, Weekday } from "@presqio/lib";
import type { OrganizationContext, RequestUser } from "../../common/auth/auth.types";
import { DatabaseService } from "../../common/database/database.service";
import { addDays, dateOnly, localDate } from "../../common/time/zoned";
import { AttendanceService, type TodaySnapshot } from "../attendance/attendance.service";
import { PhotoStorageService } from "../../common/storage/photo-storage.service";
import { AuditService } from "../audit/audit.service";
import { PayrollService } from "../payroll/payroll.service";
import type { CreateEmployeeDto, UpdateEmployeeDto } from "./dto/employee.dto";

const EMPLOYEE_INCLUDE = {
  employee_branch_assignments_employee_id_rows: {
    where: { effective_to: null },
    orderBy: { effective_from: "desc" },
    take: 1,
  },
  shift_assignments_employee_id_rows: {
    where: { effective_to: null },
    orderBy: { effective_from: "desc" },
    take: 1,
  },
} satisfies Prisma.employeesInclude;
type EmployeeRow = Prisma.employeesGetPayload<{ include: typeof EMPLOYEE_INCLUDE }>;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly attendance: AttendanceService,
    private readonly audit: AuditService,
    private readonly storage: PhotoStorageService,
    private readonly payroll: PayrollService,
  ) {}

  async list(businessId: string): Promise<EmployeeRecord[]> {
    const [rows, today] = await Promise.all([
      this.db.employees.findMany({
        where: { business_id: businessId },
        include: EMPLOYEE_INCLUDE,
        orderBy: [{ full_name: "asc" }],
      }),
      this.attendance.today(businessId),
    ]);
    return rows.map((row) => toRecord(row, today.snapshotOf(row.id)));
  }

  async create(
    org: OrganizationContext,
    businessId: string,
    actor: RequestUser,
    dto: CreateEmployeeDto,
  ): Promise<EmployeeRecord> {
    assertPayrollAccess(org, dto.payroll);
    let employeeId: string;
    try {
      employeeId = await this.db.$transaction(async (tx) => {
        // Serialize with other creates in this organization so the plan limit holds.
        const [plan] = await tx.$queryRaw<({ max_employees: number | null } & SubscriptionRow)[]>`
          SELECT p.max_employees, s.status, s.trial_ends_at, s.current_period_end FROM subscriptions s
            JOIN plans p ON p.code = s.plan_code
           WHERE s.organization_id = ${org.organizationId}::uuid
           FOR UPDATE OF s`;
        const problem = subscriptionProblem(plan);
        if (problem) throw new ForbiddenException(problem);
        if (plan.max_employees !== null) {
          const count = await tx.employees.count({
            where: {
              business_id_ref: { organization_id: org.organizationId },
              status: { not: "TERMINATED" },
            },
          });
          if (count >= plan.max_employees)
            throw new ForbiddenException(
              `Your plan allows ${plan.max_employees} employees. Upgrade to add more.`,
            );
        }
        await this.assertBranch(tx, businessId, dto.branchId);
        const shift = dto.shiftId ? await this.findShift(tx, businessId, dto.shiftId) : null;
        const today = localDate(await this.timezone(tx, businessId));
        const employee = await tx.employees.create({
          data: {
            business_id: businessId,
            employee_code: dto.code ?? (await this.nextCode(tx, businessId)),
            full_name: dto.fullName,
            phone: dto.phone,
            email: dto.email?.toLowerCase(),
            job_title: dto.jobTitle,
            joined_on: dto.joinedOn ? dateOnly(dto.joinedOn) : dateOnly(today),
          },
        });
        await tx.employee_branch_assignments.create({
          data: { business_id: businessId, employee_id: employee.id, branch_id: dto.branchId },
        });
        if (shift)
          await tx.shift_assignments.create({
            data: {
              business_id: businessId,
              employee_id: employee.id,
              shift_id: shift.id,
              effective_from: dateOnly(today),
              weekly_pattern: workingDaysOf(shift.policy_json),
            },
          });
        await this.audit.record(
          {
            organizationId: org.organizationId,
            businessId,
            actorId: actor.userId,
            objectType: "employee",
            objectId: employee.id,
            action: "created",
            after: { name: employee.full_name, code: employee.employee_code },
          },
          tx,
        );
        if (dto.payroll)
          await this.payroll.saveEmployeePayroll(tx, org.organizationId, businessId, actor.userId,
            { id: employee.id, joinedOn: employee.joined_on!.toISOString().slice(0, 10) }, dto.payroll);
        return employee.id;
      });
    } catch (error) {
      throw conflictFor(error);
    }
    return this.one(businessId, employeeId);
  }

  async update(
    org: OrganizationContext,
    businessId: string,
    actor: RequestUser,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeRecord> {
    const before = await this.db.employees.findFirst({
      where: { id: employeeId, business_id: businessId },
      include: EMPLOYEE_INCLUDE,
    });
    if (!before) throw new NotFoundException("Employee not found");
    assertPayrollAccess(org, dto.payroll);
    await this.db.$transaction(async (tx) => {
      const now = new Date();
      const today = localDate(await this.timezone(tx, businessId));
      await tx.employees.update({
        where: { id: employeeId },
        data: {
          full_name: dto.fullName,
          phone: dto.phone === undefined ? undefined : dto.phone || null,
          email: dto.email === undefined ? undefined : dto.email.toLowerCase() || null,
          job_title: dto.jobTitle === undefined ? undefined : dto.jobTitle || null,
          status: dto.accountStatus,
          joined_on: dto.joinedOn ? dateOnly(dto.joinedOn) : undefined,
        },
      });
      if (dto.payroll) {
        const joinedOn = dto.joinedOn ?? (before.joined_on ?? before.created_at).toISOString().slice(0, 10);
        await this.payroll.saveEmployeePayroll(tx, org.organizationId, businessId, actor.userId,
          { id: employeeId, joinedOn }, dto.payroll);
      }
      const currentBranch = before.employee_branch_assignments_employee_id_rows[0];
      if (dto.branchId && dto.branchId !== currentBranch?.branch_id) {
        await this.assertBranch(tx, businessId, dto.branchId);
        if (currentBranch)
          await tx.employee_branch_assignments.update({
            where: { id: currentBranch.id },
            data: { effective_to: now },
          });
        await tx.employee_branch_assignments.create({
          data: { business_id: businessId, employee_id: employeeId, branch_id: dto.branchId },
        });
      }
      const currentShift = before.shift_assignments_employee_id_rows[0];
      if (dto.shiftId !== undefined && dto.shiftId !== (currentShift?.shift_id ?? null)) {
        const shift = dto.shiftId ? await this.findShift(tx, businessId, dto.shiftId) : null;
        if (currentShift) {
          const startedToday = currentShift.effective_from.toISOString().slice(0, 10) === today;
          if (startedToday && shift) {
            // Assigned and changed on the same day: correct the assignment in place.
            await tx.shift_assignments.update({
              where: { id: currentShift.id },
              data: { shift_id: shift.id, weekly_pattern: workingDaysOf(shift.policy_json) },
            });
          } else {
            await tx.shift_assignments.update({
              where: { id: currentShift.id },
              data: {
                effective_to: dateOnly(startedToday ? today : addDays(today, -1)),
              },
            });
          }
        }
        const updatedInPlace =
          currentShift && shift && currentShift.effective_from.toISOString().slice(0, 10) === today;
        if (shift && !updatedInPlace)
          await tx.shift_assignments.create({
            data: {
              business_id: businessId,
              employee_id: employeeId,
              shift_id: shift.id,
              effective_from: dateOnly(today),
              weekly_pattern: workingDaysOf(shift.policy_json),
            },
          });
      }
      await this.audit.record(
        {
          organizationId: org.organizationId,
          businessId,
          actorId: actor.userId,
          objectType: "employee",
          objectId: employeeId,
          action: "updated",
          before: { name: before.full_name, status: before.status },
          // Payroll details are audited separately and must not be copied into this log.
          after: { name: dto.fullName ?? before.full_name, ...dto, payroll: undefined } as Prisma.InputJsonValue,
        },
        tx,
      );
    });
    return this.one(businessId, employeeId);
  }

  /** A check-in/out selfie, for admins of this organization only. */
  async photo(businessId: string, attemptId: string) {
    const photo = await this.db.attendance_photos.findFirst({
      where: { business_id: businessId, attempt_id: attemptId },
      select: { content_type: true, data: true, storage_key: true },
    });
    if (!photo) throw new NotFoundException("Photo not found");
    const data = photo.storage_key ? await this.storage.get(photo.storage_key) : photo.data;
    // The bucket's lifecycle rule removes selfies after the retention period.
    if (!data) throw new NotFoundException("This selfie is no longer kept.");
    return { contentType: photo.content_type, data };
  }

  private async one(businessId: string, employeeId: string) {
    const [row, today] = await Promise.all([
      this.db.employees.findFirstOrThrow({
        where: { id: employeeId, business_id: businessId },
        include: EMPLOYEE_INCLUDE,
      }),
      this.attendance.today(businessId),
    ]);
    return toRecord(row, today.snapshotOf(row.id));
  }

  private async timezone(tx: Prisma.TransactionClient, businessId: string) {
    const business = await tx.businesses.findUniqueOrThrow({
      where: { id: businessId },
      select: { timezone: true },
    });
    return business.timezone;
  }

  private async assertBranch(tx: Prisma.TransactionClient, businessId: string, branchId: string) {
    const branch = await tx.branches.findFirst({
      where: { id: branchId, business_id: businessId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException("Choose one of your branches");
  }

  private async findShift(tx: Prisma.TransactionClient, businessId: string, shiftId: string) {
    const shift = await tx.shifts.findFirst({ where: { id: shiftId, business_id: businessId } });
    if (!shift) throw new BadRequestException("Choose one of your shifts");
    return shift;
  }

  /** Next free ID from the organization's prefix (SGH0001 …); IDs are unique platform-wide. */
  private async nextCode(tx: Prisma.TransactionClient, businessId: string) {
    const { employee_prefix: prefix } = await tx.businesses.findUniqueOrThrow({
      where: { id: businessId },
      select: { employee_prefix: true },
    });
    const count = await tx.employees.count({ where: { business_id: businessId } });
    for (let n = count + 1; n < count + 50; n++) {
      const code = `${prefix}${String(n).padStart(4, "0")}`;
      const taken = await tx.employees.findUnique({
        where: { employee_code: code },
        select: { id: true },
      });
      if (!taken) return code;
    }
    throw new ConflictException("Could not generate an employee code; enter one manually");
  }
}


/** Salary and statutory details are restricted to organization owners/admins. */
function assertPayrollAccess(org: OrganizationContext, payroll: unknown) {
  if (payroll && org.role !== "OWNER" && org.role !== "ADMIN")
    throw new ForbiddenException("Only organization owners and admins can set payroll details");
}

const workingDaysOf = (policy: Prisma.JsonValue): Weekday[] =>
  ((policy ?? {}) as { workingDays?: Weekday[] }).workingDays ?? [1, 2, 3, 4, 5, 6];

const conflictFor = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    ? new ConflictException("That employee code is already in use")
    : error;

const toRecord = (row: EmployeeRow, snapshot: TodaySnapshot): EmployeeRecord => ({
  id: row.id,
  code: row.employee_code,
  name: row.full_name,
  businessId: row.business_id,
  branchId: row.employee_branch_assignments_employee_id_rows[0]?.branch_id ?? "",
  shiftId: row.shift_assignments_employee_id_rows[0]?.shift_id ?? null,
  role: row.job_title ?? "",
  phone: row.phone ?? "",
  email: row.email ?? "",
  joinedOn: row.joined_on?.toISOString().slice(0, 10) ?? null,
  accountStatus: row.status,
  hasLogin: Boolean(row.user_id),
  // Former employees are never shown as checked in.
  ...(row.status === "TERMINATED"
    ? {
        status: "Not checked in" as const,
        checkIn: null,
        checkOut: null,
        earlyMinutes: null,
        latestPhotoAttemptId: null,
        checkInPhotoAttemptId: null,
        checkOutPhotoAttemptId: null,
        upcomingLeave: [],
      }
    : snapshot),
});

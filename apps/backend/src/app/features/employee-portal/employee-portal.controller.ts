import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type {
  AttemptOutcome,
  AttemptResponse,
  AttendanceHistoryDay,
  EmployeeCorrection,
  EmployeeProfile,
  LeaveDay,
} from "@presqio/lib";
import { CurrentEmployee } from "../../common/auth/auth.decorators";
import type { EmployeeContext } from "../../common/auth/auth.types";
import { EmployeeGuard } from "../../common/auth/employee.guard";
import {
  CreateCorrectionDto,
  StartAttemptDto,
  SubmitAttemptDto,
  TakeLeaveDto,
} from "./dto/employee-portal.dto";
import { EmployeePortalService } from "./employee-portal.service";

@ApiTags("Employee app")
@ApiBearerAuth()
@UseGuards(EmployeeGuard)
@Controller("employee")
export class EmployeePortalController {
  constructor(private readonly portal: EmployeePortalService) {}

  @Get("me")
  me(@CurrentEmployee() employee: EmployeeContext): Promise<EmployeeProfile> {
    return this.portal.profile(employee);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("attendance/attempts")
  start(
    @CurrentEmployee() employee: EmployeeContext,
    @Body() dto: StartAttemptDto,
  ): Promise<AttemptResponse> {
    return this.portal.startAttempt(employee, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("attendance/attempts/:attemptId/submit")
  submit(
    @CurrentEmployee() employee: EmployeeContext,
    @Param("attemptId", ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitAttemptDto,
  ): Promise<AttemptOutcome> {
    return this.portal.submitAttempt(employee, attemptId, dto);
  }

  @Get("attendance/history")
  history(@CurrentEmployee() employee: EmployeeContext): Promise<AttendanceHistoryDay[]> {
    return this.portal.history(employee);
  }

  @Get("corrections")
  corrections(@CurrentEmployee() employee: EmployeeContext): Promise<EmployeeCorrection[]> {
    return this.portal.corrections(employee);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("corrections")
  requestCorrection(
    @CurrentEmployee() employee: EmployeeContext,
    @Body() dto: CreateCorrectionDto,
  ): Promise<EmployeeCorrection> {
    return this.portal.requestCorrection(employee, dto);
  }

  @Get("leave")
  leaves(@CurrentEmployee() employee: EmployeeContext): Promise<LeaveDay[]> {
    return this.portal.leaves(employee);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("leave")
  takeLeave(@CurrentEmployee() employee: EmployeeContext, @Body() dto: TakeLeaveDto): Promise<LeaveDay> {
    return this.portal.takeLeave(employee, dto);
  }

  @HttpCode(204)
  @Delete("leave/:leaveId")
  cancelLeave(
    @CurrentEmployee() employee: EmployeeContext,
    @Param("leaveId", ParseUUIDPipe) leaveId: string,
  ): Promise<void> {
    return this.portal.cancelLeave(employee, leaveId);
  }
}

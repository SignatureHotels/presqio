import { Module } from "@nestjs/common";
import { AttendanceModule } from "../attendance/attendance.module";
import { PayrollModule } from "../payroll/payroll.module";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";

@Module({
  imports: [AttendanceModule, PayrollModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}

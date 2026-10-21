import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceRegisterService } from "./attendance-register.service";
import { AttendanceService } from "./attendance.service";

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRegisterService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

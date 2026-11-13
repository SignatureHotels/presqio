import { Module } from "@nestjs/common";
import { TimeOffModule } from "../time-off/time-off.module";
import { EmployeePortalController } from "./employee-portal.controller";
import { EmployeePortalService } from "./employee-portal.service";

@Module({
  imports: [TimeOffModule],
  controllers: [EmployeePortalController],
  providers: [EmployeePortalService],
  exports: [EmployeePortalService],
})
export class EmployeePortalModule {}

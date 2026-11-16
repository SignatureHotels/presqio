import { Module } from "@nestjs/common";
import { EmployeePortalModule } from "../employee-portal/employee-portal.module";
import { KioskGuard } from "./kiosk.guard";
import { KioskDeviceController, KiosksAdminController } from "./kiosks.controller";
import { KiosksService } from "./kiosks.service";

@Module({
  imports: [EmployeePortalModule],
  controllers: [KiosksAdminController, KioskDeviceController],
  providers: [KiosksService, KioskGuard],
})
export class KiosksModule {}

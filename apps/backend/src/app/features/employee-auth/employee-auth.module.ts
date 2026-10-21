import { Module } from "@nestjs/common";
import { EmployeePortalModule } from "../employee-portal/employee-portal.module";
import { EmployeeAuthController } from "./employee-auth.controller";
import { EmployeeAuthService } from "./employee-auth.service";

@Module({
  imports: [EmployeePortalModule],
  controllers: [EmployeeAuthController],
  providers: [EmployeeAuthService],
})
export class EmployeeAuthModule {}

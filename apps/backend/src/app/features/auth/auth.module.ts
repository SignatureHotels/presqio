import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations/organizations.module";
import { TeamModule } from "../team/team.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";

@Module({
  imports: [OrganizationsModule, TeamModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService],
  exports: [AuthService],
})
export class AuthModule {}

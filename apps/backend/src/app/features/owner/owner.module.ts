import { Module } from "@nestjs/common";
import { PlatformOwnerGuard } from "../../common/auth/platform-owner.guard";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { OwnerController } from "./owner.controller";
import { OwnerService } from "./owner.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [OwnerController],
  providers: [OwnerService, PlatformOwnerGuard],
})
export class OwnerModule {}

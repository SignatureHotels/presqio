import { PayrollModule } from "./features/payroll/payroll.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnvironment } from "./common/config/environment";
import { DatabaseModule } from "./common/database/database.module";
import { HealthModule } from "./features/health/health.module";
import { AuthModule } from "./features/auth/auth.module";
import { OrganizationsModule } from "./features/organizations/organizations.module";
import { AuthCommonModule } from "./common/auth/auth-common.module";
import { MailModule } from "./common/mail/mail.module";
import { StorageModule } from "./common/storage/storage.module";
import { BusinessesModule } from "./features/businesses/businesses.module";
import { MembershipsModule } from "./features/memberships/memberships.module";
import { BranchesModule } from "./features/branches/branches.module";
import { EmployeesModule } from "./features/employees/employees.module";
import { GeofencesModule } from "./features/geofences/geofences.module";
import { ShiftsModule } from "./features/shifts/shifts.module";
import { AttendanceModule } from "./features/attendance/attendance.module";
import { CorrectionsModule } from "./features/corrections/corrections.module";
import { ReportsModule } from "./features/reports/reports.module";
import { NotificationsModule } from "./features/notifications/notifications.module";
import { AuditModule } from "./features/audit/audit.module";
import { PrivacyModule } from "./features/privacy/privacy.module";
import { EmployeeAuthModule } from "./features/employee-auth/employee-auth.module";
import { EmployeePortalModule } from "./features/employee-portal/employee-portal.module";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    DatabaseModule,
    AuthCommonModule,
    MailModule,
    StorageModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    BusinessesModule,
    MembershipsModule,
    BranchesModule,
    EmployeesModule,
    GeofencesModule,
    ShiftsModule,
    AttendanceModule,
    CorrectionsModule,
    ReportsModule,
    PayrollModule,
    NotificationsModule,
    AuditModule,
    PrivacyModule,
    EmployeeAuthModule,
    EmployeePortalModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "./access-token.guard";
import { BusinessAccessGuard } from "./business-access.guard";
import { EmployeeGuard } from "./employee.guard";
import { OrganizationAccessGuard } from "./organization-access.guard";
import { SessionsService } from "./sessions.service";

const JWT_ISSUER = "presqio-api";
const JWT_AUDIENCE = "presqio-admin";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          algorithm: "HS256",
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          expiresIn: config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS"),
        },
        verifyOptions: { algorithms: ["HS256"], issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
      }),
    }),
  ],
  providers: [
    OrganizationAccessGuard,
    BusinessAccessGuard,
    SessionsService,
    EmployeeGuard,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [JwtModule, OrganizationAccessGuard, BusinessAccessGuard, SessionsService, EmployeeGuard],
})
export class AuthCommonModule {}

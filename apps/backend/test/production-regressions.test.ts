import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { ServiceUnavailableException, UnauthorizedException, ConflictException } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthController } from "../src/app/features/auth/auth.controller";
import type { AuthService } from "../src/app/features/auth/auth.service";
import { EmployeeAuthController } from "../src/app/features/employee-auth/employee-auth.controller";
import type { EmployeeAuthService } from "../src/app/features/employee-auth/employee-auth.service";
import { PhotoStorageService } from "../src/app/common/storage/photo-storage.service";
import { EmployeePortalService } from "../src/app/features/employee-portal/employee-portal.service";
import type { DatabaseService } from "../src/app/common/database/database.service";
import type { AuditService } from "../src/app/features/audit/audit.service";

for (const kind of ["admin", "employee"] as const) {
  test(`${kind} refresh preserves cookies during outages but clears expired sessions`, async () => {
    for (const error of [new ServiceUnavailableException("Database unavailable"), new Error("Network failure"), new UnauthorizedException("Session expired")]) {
      const auth = { async refresh() { throw error; } };
      const config = new ConfigService({ UI_ORIGIN: "https://app.example.com" });
      const controller = kind === "admin" ? new AuthController(auth as unknown as AuthService, config)
        : new EmployeeAuthController(auth as unknown as EmployeeAuthService, config);
      let cleared = 0;
      const res = { clearCookie() { cleared++; } } as unknown as Response;
      const req = { headers: { origin: "https://app.example.com" }, cookies: {} } as Request;
      await assert.rejects(controller.refresh(req, res), (caught) => caught === error);
      assert.equal(cleared, error instanceof UnauthorizedException ? 1 : 0);
    }
  });
}

test("failed duplicate photo submissions clean up only their own upload", async () => {
  const keys = new PhotoStorageService(new ConfigService({
    B2_ENDPOINT: "https://storage.example.com", B2_BUCKET: "private", B2_REGION: "test",
    B2_KEY_ID: "test", B2_APPLICATION_KEY: "test",
  }));
  const originalKey = keys.keyFor("business", "attempt", "image/jpeg");
  const objects = new Set([originalKey]);
  const uploaded: string[] = [];
  const storage = {
    enabled: true, keyFor: keys.keyFor.bind(keys),
    async put(key: string) { uploaded.push(key); objects.add(key); },
    async remove(key: string) { objects.delete(key); },
  };
  const service = new EmployeePortalService({ async $transaction() { throw new ConflictException("Please start again."); } } as unknown as DatabaseService,
    {} as AuditService, storage as unknown as PhotoStorageService);
  const ctx = { userId: "user", employeeId: "employee", businessId: "business", organizationId: "org" };
  const body = { latitude: 12, longitude: 77, accuracy: 10, capturedAt: new Date().toISOString(), photo: "data:image/jpeg;base64,/9j/" };
  await Promise.all([assert.rejects(service.submitAttempt(ctx, "attempt", body)), assert.rejects(service.submitAttempt(ctx, "attempt", body))]);
  assert.equal(new Set([originalKey, ...uploaded]).size, 3);
  assert.deepEqual([...objects], [originalKey]);
});

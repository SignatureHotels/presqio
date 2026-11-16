import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { asBusinessType, UpdateOrganizationDto } from "../src/app/features/organizations/dto/organization.dto";
import { OrganizationsService } from "../src/app/features/organizations/organizations.service";
import type { DatabaseService } from "../src/app/common/database/database.service";
import type { BusinessesService } from "../src/app/features/businesses/businesses.service";

test("business type accepts known kinds only, and older free-text industries read as unset", async () => {
  assert.equal((await validate(plainToInstance(UpdateOrganizationDto, { businessType: "clinic" }))).length, 0);
  assert.equal((await validate(plainToInstance(UpdateOrganizationDto, { businessType: "casino" }))).length, 1);
  assert.equal(asBusinessType("factory"), "factory");
  assert.equal(asBusinessType("Hospitality"), null);
  assert.equal(asBusinessType(null), null);
});

test("saving the business type stores it on the organization's business", async () => {
  let businessUpdate: { data: Record<string, unknown> } | undefined;
  const row = {
    id: "org", name: "Org", slug: "org", onboarding_step: "BRANCH", country: "IN", default_timezone: "Asia/Kolkata",
    onboarding_completed_at: null, subscription: null,
    businesses_organization_id_rows: [{ id: "b", name: "Org", slug: "org", code: "ORG", timezone: "Asia/Kolkata", employee_prefix: "ORG", industry: "retail" }],
  };
  const db = {
    organizations: { update: () => "org-update", findUniqueOrThrow: async () => row },
    businesses: { updateMany: (q: { data: Record<string, unknown> }) => { businessUpdate = q; return "business-update"; } },
    $transaction: async (ops: unknown[]) => ops,
  };
  const service = new OrganizationsService(db as unknown as DatabaseService, {} as BusinessesService);
  const detail = await service.update("org", { businessType: "retail" });
  assert.equal(businessUpdate?.data.industry, "retail");
  assert.equal(detail.defaultBusiness?.businessType, "retail");
});

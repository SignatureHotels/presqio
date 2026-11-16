import { test } from "node:test";
import assert from "node:assert/strict";
import type { OrganizationAccess } from "@presqio/lib";
import { accessIn, allowed, ADMINS, RUNS_BRANCHES } from "../src/utils/access";
import { adminNavigation } from "../src/router/admin-navigation";

const org = (role: OrganizationAccess["role"], businessRole: "BRANCH_MANAGER" | "VIEWER" | null = null) =>
  ({ id: "o", name: "O", slug: "o", onboardingStep: "COMPLETED", role, branchCount: 1,
     businesses: [{ id: "b", name: "B", slug: "b", code: "B", timezone: "Asia/Kolkata", employeeIdPrefix: "B", businessType: null, businessRole }] }) as OrganizationAccess;

test("each person's access follows their roles", () => {
  assert.equal(accessIn(org("OWNER")), "OWNER");
  assert.equal(accessIn(org("ADMIN")), "ADMIN");
  assert.equal(accessIn(org("MEMBER", "BRANCH_MANAGER")), "MANAGER");
  assert.equal(accessIn(org("MEMBER", "VIEWER")), "VIEWER");
  assert.equal(accessIn(null), null);
});

test("branch managers and viewers don't see payroll, settings or the team", () => {
  const visible = (access: ReturnType<typeof accessIn>) => adminNavigation.filter((i) => allowed(i.only, access)).map((i) => i.path);
  for (const path of ["payroll", "settings", "team", "branches", "shifts"]) {
    assert.ok(!visible("MANAGER").includes(path), `manager sees ${path}`);
    assert.ok(!visible("VIEWER").includes(path), `viewer sees ${path}`);
    assert.ok(visible("ADMIN").includes(path));
  }
  assert.ok(visible("MANAGER").includes("corrections"));
  assert.ok(!visible("VIEWER").includes("corrections"));
  for (const path of ["overview", "attendance/live", "employees", "roster"]) assert.ok(visible("VIEWER").includes(path));
  assert.deepEqual(ADMINS, ["OWNER", "ADMIN"]);
  assert.ok(RUNS_BRANCHES.includes("MANAGER"));
});

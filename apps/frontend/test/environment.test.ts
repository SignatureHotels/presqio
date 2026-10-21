import { test } from "node:test";
import assert from "node:assert/strict";
import { readApiPath, readBackendOrigin } from "../config/environment";

test("API paths require an explicit same-origin environment setting", () => {
  assert.equal(readApiPath(" /api/v1/ "), "/api/v1");
  assert.equal(readApiPath("/api/custom-version"), "/api/custom-version");
  for (const value of [undefined, "", "https://api.example.com/api/v1", "//api.example.com", "/api/../admin", "/api/v1?token=x", "/other/v1"]) {
    assert.throws(() => readApiPath(value), /Set VITE_API_URL/);
  }
});

test("backend proxy origins require an explicit host without credentials or API paths", () => {
  assert.equal(readBackendOrigin("https://backend.example.com/"), "https://backend.example.com");
  assert.equal(readBackendOrigin("http://localhost:9090"), "http://localhost:9090");
  for (const value of [undefined, "", "ftp://backend.example.com", "https://backend.example.com/api/v1", "https://user:password@backend.example.com", "https://backend.example.com?key=x"]) {
    assert.throws(() => readBackendOrigin(value), /Set BACKEND_ORIGIN/);
  }
});

test("admin, employee, refresh and photo requests all use the configured API path", async () => {
  // This test file has its own Node module graph. Configure a non-default value before imports.
  (globalThis as { __PRESQIO_API_BASE_URL__?: string }).__PRESQIO_API_BASE_URL__ = "/api/custom-version";
  const admin = await import("../src/api/client");
  const employee = await import("../src/api/employee-client");
  const previousFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({ accessToken: "test-token", profile: {} });
  };
  try {
    await admin.api("/auth/me");
    await employee.employeeApi.history();
    const photo = await admin.apiObjectUrl("/employees/photos/attempt");
    URL.revokeObjectURL(photo);
    await admin.refreshSession();
    await employee.refreshEmployeeSession();
    assert.deepEqual(urls, [
      "/api/custom-version/auth/me", "/api/custom-version/employee/attendance/history",
      "/api/custom-version/employees/photos/attempt", "/api/custom-version/auth/refresh",
      "/api/custom-version/employee-auth/refresh",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  employeeApi,
  refreshEmployeeSession,
  setEmployeeAccessToken,
  subscribeToEmployeeSession,
} from "../src/api/employee-client";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  setEmployeeAccessToken(null);
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test("employee login sends its code with cookies and without an admin token", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/v1/employee-auth/login");
    assert.equal(init?.credentials, "include");
    assert.deepEqual(JSON.parse(init?.body as string), { employeeCode: "TEST01" });
    assert.equal(new Headers(init?.headers).has("authorization"), false);
    return json({ accessToken: "employee-token", profile: { name: "Employee" } });
  };
  assert.equal((await employeeApi.login({ employeeCode: "TEST01" })).accessToken, "employee-token");
});

test("concurrent refreshes share a request and notify the employee session", async () => {
  let count = 0;
  let notified: unknown;
  const unsubscribe = subscribeToEmployeeSession((session) => { notified = session; });
  globalThis.fetch = async () => { count++; return json({ accessToken: "fresh", profile: {} }); };
  const [one, two] = await Promise.all([refreshEmployeeSession(), refreshEmployeeSession()]);
  assert.equal(count, 1);
  assert.equal(one, two);
  assert.equal(notified, one);
  unsubscribe();
});

test("expired access tokens refresh once and retry with the new employee token", async () => {
  setEmployeeAccessToken("old");
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    if (String(input).endsWith("/refresh")) return json({ accessToken: "fresh", profile: {} });
    const token = new Headers(init?.headers).get("authorization");
    return token === "Bearer fresh" ? json([]) : json({ message: "Expired" }, 401);
  };
  assert.deepEqual(await employeeApi.history(), []);
  assert.deepEqual(calls, ["/api/v1/employee/attendance/history", "/api/v1/employee-auth/refresh", "/api/v1/employee/attendance/history"]);
});

test("revoked refresh sessions notify the UI to sign out", async () => {
  let notified: unknown = "unchanged";
  const unsubscribe = subscribeToEmployeeSession((session) => { notified = session; });
  globalThis.fetch = async () => json({ message: "Session expired" }, 401);
  assert.equal(await refreshEmployeeSession(), null);
  assert.equal(notified, null);
  unsubscribe();
});

test("temporary API errors preserve the current employee session", async () => {
  let notified = false;
  const unsubscribe = subscribeToEmployeeSession(() => { notified = true; });
  globalThis.fetch = async () => json({ message: "Unavailable" }, 503);
  assert.equal(await refreshEmployeeSession(), null);
  assert.equal(notified, false);
  unsubscribe();
});

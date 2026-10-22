import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fetchWorkspace } from "../src/api/workspace";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("workspace data requests start before the organization detail finishes", async () => {
  const calls: string[] = [];
  let finishDetail!: (response: Response) => void;
  globalThis.fetch = async (input) => {
    const path = String(input);
    calls.push(path);
    if (path === "/api/v1/organizations/org") return new Promise<Response>((resolve) => { finishDetail = resolve; });
    return Response.json(path.endsWith("overview") ? { date: "2026-10-22" } : []);
  };
  const pending = fetchWorkspace("org", "business");
  assert.equal(calls.length, 6);
  assert.ok(calls.slice(1).every((path) => path.startsWith("/api/v1/organizations/org/businesses/business/")));
  finishDetail(Response.json({ id: "org", defaultBusiness: { id: "business" } }));
  const result = await pending;
  assert.equal(result.organization.id, "org");
  assert.deepEqual(result.employees, []);
});

test("workspace resolves the default business when sign-in has no business hint", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const path = String(input);
    calls.push(path);
    return Response.json(path === "/api/v1/organizations/org" ? { id: "org", defaultBusiness: { id: "fallback" } } : []);
  };
  await fetchWorkspace("org");
  assert.equal(calls.length, 6);
  assert.ok(calls.slice(1).every((path) => path.includes("/businesses/fallback/")));
});

test("workspace failures surface for retry rather than leaving loading pending", async () => {
  globalThis.fetch = async () => Response.json({ message: "Database unavailable" }, { status: 503 });
  await assert.rejects(fetchWorkspace("org", "business"), /Database unavailable/);
});

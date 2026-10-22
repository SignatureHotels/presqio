import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { refreshSession, setAccessToken, subscribeToSession } from "../src/api/client";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; setAccessToken(null); subscribeToSession(() => {}); });

test("admin session survives temporary refresh failures", async () => {
  let notified = false;
  subscribeToSession(() => { notified = true; });
  for (const status of [429, 500, 503]) {
    globalThis.fetch = async () => new Response("{}", { status });
    assert.equal(await refreshSession(), null);
    assert.equal(notified, false);
  }
});

test("admin refresh notifies the UI when authentication expires", async () => {
  let notified: unknown = "unchanged";
  subscribeToSession((session) => { notified = session; });
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  assert.equal(await refreshSession(), null);
  assert.equal(notified, null);
});

test("successful HTML responses surface an API error instead of null screen data", async () => {
  const { api } = await import("../src/api/client");
  globalThis.fetch = async () => new Response("<html>Unavailable</html>");
  await assert.rejects(api("/organizations/test"), /invalid response/);
});

test("concurrent admin refreshes share one request", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ accessToken: "fresh", user: {}, organizations: [] });
  };
  const [first, second] = await Promise.all([refreshSession(), refreshSession()]);
  assert.equal(first, second);
  assert.equal(calls, 1);
});

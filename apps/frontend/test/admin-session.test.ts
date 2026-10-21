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

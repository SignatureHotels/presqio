import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { request } from "../src/api/request";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("stalled requests time out and abort without retrying a write", async () => {
  let calls = 0;
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, init) => {
    calls++;
    signal = init?.signal;
    return new Promise<Response>(() => {});
  };
  await assert.rejects(request("/api/test", { method: "POST" }, (r) => r.json(), 10), /taking too long/);
  assert.equal(signal?.aborted, true);
  assert.equal(calls, 1);
});

test("the deadline includes a stalled response body", async () => {
  globalThis.fetch = async () => new Response(new ReadableStream({ start() {} }));
  await assert.rejects(request("/api/test", {}, (r) => r.json(), 10), /taking too long/);
});

test("successful responses and API errors retain their results", async () => {
  globalThis.fetch = async () => Response.json({ ok: true });
  assert.deepEqual(await request("/api/test", {}, (r) => r.json()), { ok: true });
  const failure = new Error("Server failure");
  await assert.rejects(request("/api/test", {}, async () => { throw failure; }), (error) => error === failure);
});

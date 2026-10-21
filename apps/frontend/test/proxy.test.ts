import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Cloudflare's deployable Worker is JavaScript.
import worker from "../public/_worker.js";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("Cloudflare API proxy preserves login cookies, body, origin and query", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.example.com/api/v1/employee-auth/login?x=1");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("origin"), "https://app.example.com");
    assert.equal(headers.get("x-forwarded-for"), "203.0.113.1");
    assert.equal(headers.get("cookie"), "presqio_ert=old");
    assert.equal(await new Response(init?.body).text(), '{"employeeCode":"TEST01"}');
    return new Response('{}', { headers: { 'Set-Cookie': 'presqio_ert=new; Path=/api/v1/employee-auth; HttpOnly; Secure; SameSite=Lax' } });
  };
  const response = await worker.fetch(new Request("https://app.example.com/api/v1/employee-auth/login?x=1", {
    method: "POST",
    body: '{"employeeCode":"TEST01"}',
    headers: { origin: "https://app.example.com", cookie: "presqio_ert=old", "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "spoofed" },
  }), { BACKEND_ORIGIN: "https://api.example.com" });
  assert.match(response.headers.get("set-cookie")!, /presqio_ert=new/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("unconfigured and unsafe proxy targets fail without forwarding", async () => {
  globalThis.fetch = async () => { throw new Error("Must not forward"); };
  for (const origin of [undefined, "http://api.example.com", "https://app.example.com", "https://api.example.com/path", "https://user:pass@api.example.com"]) {
    assert.equal((await worker.fetch(new Request("https://app.example.com/api/v1/health"), { BACKEND_ORIGIN: origin })).status, 503);
  }
});

test("static routes use Pages assets and API network failures return JSON", async () => {
  const response = await worker.fetch(new Request("https://app.example.com/employee/history"), {
    ASSETS: { fetch: () => new Response("SPA") },
  });
  assert.equal(await response.text(), "SPA");
  globalThis.fetch = async () => { throw new Error("Network failure"); };
  assert.equal((await worker.fetch(new Request("https://app.example.com/api/v1/health"), { BACKEND_ORIGIN: "https://api.example.com" })).status, 502);
});

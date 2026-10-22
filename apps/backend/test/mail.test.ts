import "reflect-metadata";
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../src/app/common/mail/mail.service";
import { validateEnvironment } from "../src/app/common/config/environment";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const sender = "Presqio <onboarding@resend.dev>";
const mail = { subject: "Test mail", html: "<p>Test</p>", text: "Test" };
const service = () => new MailService(new ConfigService(validateEnvironment({
  RESEND_API_KEY: "re_test_key", MAIL_FROM: sender,
  // An old SMTP host must not override the HTTPS transport or require SMTP credentials.
  SMTP_HOST: "unused.example.com",
})));

test("Resend uses HTTPS with the existing HTML and text templates instead of SMTP", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "https://api.resend.com/emails");
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer re_test_key");
    assert.ok(init?.signal);
    assert.deepEqual(JSON.parse(init?.body as string), { from: sender, to: ["recipient@example.com"], ...mail });
    return Response.json({ id: "email-receipt" });
  };
  const transport = service();
  await transport.onModuleInit();
  assert.equal(await transport.send("recipient@example.com", mail), "email-receipt");
});

test("provider rejection is surfaced rather than reported as a successful send", async () => {
  globalThis.fetch = async () => Response.json({ message: "Testing recipient not allowed" }, { status: 403 });
  await assert.rejects(service().send("recipient@example.com", mail), /HTTP 403.*Testing recipient not allowed/);
});

test("missing provider receipts and network failures are surfaced", async () => {
  globalThis.fetch = async () => Response.json({});
  await assert.rejects(service().send("recipient@example.com", mail), /no email ID/);
  globalThis.fetch = async () => { throw new Error("Connection failed"); };
  await assert.rejects(service().send("recipient@example.com", mail), /Connection failed/);
});

test("Resend keys survive validation and require an explicit sender", () => {
  assert.equal(validateEnvironment({ RESEND_API_KEY: "" }).RESEND_API_KEY, undefined);
  assert.equal(validateEnvironment({ RESEND_API_KEY: "re_test", MAIL_FROM: sender }).RESEND_API_KEY, "re_test");
  assert.throws(() => validateEnvironment({ RESEND_API_KEY: "re_test" }), /MAIL_FROM/);
});

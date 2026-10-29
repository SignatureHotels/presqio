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

const gmailEnv = {
  GMAIL_USER: "presqio.team@gmail.com", GMAIL_CLIENT_ID: "client-id",
  GMAIL_CLIENT_SECRET: "client-secret", GMAIL_REFRESH_TOKEN: "refresh-token",
  // Gmail needs no domain of its own, so it is preferred over Resend's test sender and blocked SMTP.
  RESEND_API_KEY: "re_test_key", MAIL_FROM: sender, SMTP_HOST: "unused.example.com",
};
const gmailService = () => new MailService(new ConfigService(validateEnvironment(gmailEnv)));
const decodeRaw = (body: string) => Buffer.from(JSON.parse(body).raw, "base64url").toString("utf8");

test("Gmail API sends the HTML and text templates over HTTPS as the signed-in account", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    if (String(input) === "https://oauth2.googleapis.com/token") {
      const form = new URLSearchParams(init?.body as string | URLSearchParams);
      assert.equal(form.get("grant_type"), "refresh_token");
      assert.equal(form.get("refresh_token"), "refresh-token");
      return Response.json({ access_token: "access-1", expires_in: 3600 });
    }
    assert.equal(input, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-1");
    assert.ok(init?.signal);
    const raw = decodeRaw(init?.body as string);
    assert.match(raw, /^From: Presqio <presqio\.team@gmail\.com>$/m);
    assert.match(raw, /^To: recipient@example\.com$/m);
    assert.match(raw, /^Subject: Test mail$/m);
    assert.match(raw, /multipart\/alternative/);
    assert.match(raw, /<p>Test<\/p>/);
    return Response.json({ id: "gmail-message" });
  };
  const transport = gmailService();
  await transport.onModuleInit();
  assert.equal(await transport.send("recipient@example.com", mail), "gmail-message");
  // the access token is reused for the next message instead of signing in again
  assert.equal(await transport.send("recipient@example.com", mail), "gmail-message");
  assert.deepEqual(calls.filter((url) => url.includes("oauth2")).length, 1);
});

test("Gmail sign-in and send failures are surfaced rather than reported as sent", async () => {
  globalThis.fetch = async () => Response.json({ error: "invalid_grant", error_description: "Token has been expired or revoked." }, { status: 400 });
  await assert.rejects(gmailService().send("recipient@example.com", mail), /HTTP 400.*expired or revoked/);
  globalThis.fetch = async (input) => String(input).includes("oauth2")
    ? Response.json({ access_token: "access-1", expires_in: 3600 })
    : Response.json({ error: { message: "Daily sending limit exceeded" } }, { status: 429 });
  await assert.rejects(gmailService().send("recipient@example.com", mail), /HTTP 429.*Daily sending limit/);
});

test("Gmail settings must be complete", () => {
  assert.equal(validateEnvironment(gmailEnv).GMAIL_USER, "presqio.team@gmail.com");
  assert.throws(() => validateEnvironment({ GMAIL_USER: "presqio.team@gmail.com" }), /GMAIL_USER, GMAIL_CLIENT_ID/);
});

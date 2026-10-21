import { test } from "node:test";
import assert from "node:assert/strict";
import { passwordProblem } from "../src/app/features/auth/password-policy";
import { mailTemplates } from "../src/app/common/mail/mail-templates";
import { validateEnvironment } from "../src/app/common/config/environment";
test("password policy blocks weak and personal passwords", () => {
  const who = { email: "asha.rao@example.com", name: "Asha Rao" };
  assert.match(passwordProblem("short", who)!, /at least 8/);
  assert.match(passwordProblem("Password123", who)!, /too common/);
  assert.match(passwordProblem("aaaaaaaaaa", who)!, /repeat/);
  assert.match(passwordProblem("my-asha.rao-pw", who)!, /email/);
  assert.match(passwordProblem("raoFamily2026", who)!, /name/);
  assert.equal(passwordProblem("correct horse battery", who), null);
  assert.equal(passwordProblem("x".repeat(129) + "y", who) !== null, true);
});
test("email templates escape user-controlled text", () => {
  const mail = mailTemplates.welcome({
    name: "<script>alert(1)</script>",
    organizationName: `Evil "Org" <img src=x>`,
    verifyUrl: "http://localhost:300/verify-email?token=abc&x=1",
  });
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(!mail.html.includes("<img src=x>"));
  assert.ok(mail.html.includes("token=abc&amp;x=1"));
  assert.ok(mail.text.includes("http://localhost:300/verify-email?token=abc&x=1"));
});
test("JWT_SECRET is read, blank SMTP values are unset, app-password spaces are removed", () => {
  const secret = "s".repeat(44);
  const env = validateEnvironment({ JWT_SECRET: secret, SMTP_HOST: "", SMTP_PASS: "abcd efgh ijkl mnop" });
  assert.equal(env.JWT_SECRET, secret);
  assert.equal(env.SMTP_HOST, undefined);
  assert.equal(env.SMTP_PASS, "abcdefghijklmnop");
  assert.throws(() => validateEnvironment({ JWT_SECRET: "too-short" }));
  assert.throws(() => validateEnvironment({ SMTP_HOST: "smtp.gmail.com" }));
});

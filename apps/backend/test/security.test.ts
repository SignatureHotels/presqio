import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createOpaqueToken,
  hashToken,
  normalizeEmail,
  slugify,
} from "../src/app/common/security/tokens";
import { validateEnvironment } from "../src/app/common/config/environment";
test("slugify produces slugs accepted by the DB slug constraint", () => {
  const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  assert.equal(slugify("  Rao Café & Sons -- Group! "), "rao-cafe-sons-group");
  assert.equal(slugify("ab---cd", 3), "ab");
  for (const name of ["Rao Hospitality", "A", "x".repeat(90), "Hyd #1 Branch"])
    assert.match(slugify(name) || "org", pattern);
  assert.equal(slugify("ராவ்"), "");
});
test("tokens are random and only their hash is comparable", () => {
  const token = createOpaqueToken();
  assert.notEqual(token, createOpaqueToken());
  assert.ok(token.length >= 40);
  assert.equal(hashToken(token), hashToken(token));
  assert.notEqual(hashToken(token), token);
});
test("emails are normalized before lookup", () => {
  assert.equal(normalizeEmail("  Asha@Example.COM "), "asha@example.com");
});
test("production refuses the development JWT secret", () => {
  assert.throws(() => validateEnvironment({ NODE_ENV: "production" }));
  const config = validateEnvironment({
    NODE_ENV: "production",
    JWT_ACCESS_SECRET: "s".repeat(40),
  });
  assert.equal(config.APP_URL, config.UI_ORIGIN);
});

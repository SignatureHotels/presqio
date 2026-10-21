import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../src/app/common/config/environment";
test("development defaults use the requested backend port and UI origin", () => {
  const config = validateEnvironment({});
  assert.equal(config.PORT, 8080);
  assert.equal(config.UI_ORIGIN, "http://localhost:300");
});
test("invalid ports and non-Postgres database URLs fail at startup", () => {
  for (const PORT of ["abc", 0, 65536])
    assert.throws(() => validateEnvironment({ PORT }));
  assert.throws(() =>
    validateEnvironment({ DATABASE_URL: "https://example.com" }),
  );
});

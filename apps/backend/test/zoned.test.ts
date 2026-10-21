import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, isoWeekday, localDate, localTime, minutesOf } from "../src/app/common/time/zoned";

test("local date and time follow the organization's time zone, not UTC", () => {
  // 20:00 UTC on 21 Oct is 01:30 on 22 Oct in India.
  const at = new Date("2026-10-21T20:00:00Z");
  assert.equal(localDate("Asia/Kolkata", at), "2026-10-22");
  assert.equal(localTime("Asia/Kolkata", at), "01:30");
  assert.equal(localDate("UTC", at), "2026-10-21");
});

test("calendar helpers", () => {
  assert.equal(addDays("2026-10-21", -6), "2026-10-15");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(isoWeekday("2026-10-21"), 3); // Wednesday
  assert.equal(isoWeekday("2026-10-25"), 7); // Sunday
  assert.equal(minutesOf("09:10"), 550);
});

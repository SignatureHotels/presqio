import { test } from "node:test";
import assert from "node:assert/strict";
import { BUSINESS_PRESETS, businessPreset } from "../src/utils/business-types";

test("every business type offers valid shifts and leave types", () => {
  const ids = BUSINESS_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const preset of BUSINESS_PRESETS) {
    assert.ok(preset.shifts.length > 0, preset.id);
    assert.equal(new Set(preset.shifts.map((s) => s.name)).size, preset.shifts.length, preset.id);
    for (const shift of preset.shifts) {
      assert.match(shift.start, /^\d\d:\d\d$/);
      assert.match(shift.end, /^\d\d:\d\d$/);
      assert.notEqual(shift.start, shift.end, `${preset.id} ${shift.name}`);
      assert.ok(shift.workingDays.length > 0 && shift.workingDays.every((d) => d >= 1 && d <= 7));
    }
    for (const leave of preset.leaveTypes) {
      assert.ok(leave.name.length >= 2 && leave.name.length <= 40);
      assert.ok(leave.daysPerYear === null || (leave.daysPerYear >= 0 && leave.daysPerYear <= 366));
    }
  }
});

test("businesses with no type get the general preset; field work allows check-in anywhere", () => {
  assert.equal(businessPreset(null).id, "other");
  assert.equal(businessPreset("clinic").shifts.length, 3);
  assert.equal(businessPreset("field").checkInAnywhere, true);
  assert.ok(!businessPreset("retail").checkInAnywhere);
});

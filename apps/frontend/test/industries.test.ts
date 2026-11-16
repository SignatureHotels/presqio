import { test } from "node:test";
import assert from "node:assert/strict";
import { INDUSTRIES, industryBySlug } from "../src/app/public/industries";
import { BUSINESS_PRESETS } from "../src/utils/business-types";

test("every kind of business has one page with a matching setup preset", () => {
  const slugs = INDUSTRIES.map((i) => i.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z]+(-[a-z]+)*$/);
  const covered = new Set<string>(INDUSTRIES.map((i) => i.type));
  for (const preset of BUSINESS_PRESETS.filter((p) => p.id !== "other")) assert.ok(covered.has(preset.id), `no page for ${preset.id}`);
  for (const i of INDUSTRIES) {
    assert.equal(i.pains.length, 3, i.slug);
    assert.ok(i.highlights.length >= 4, i.slug);
    assert.ok(i.faqs.length >= 2, i.slug);
    assert.ok(i.lead.length > 60 && i.lead.length < 200, `${i.slug} lead length`);
  }
  assert.equal(industryBySlug("restaurants")?.type, "restaurant");
  assert.equal(industryBySlug("nope"), undefined);
});

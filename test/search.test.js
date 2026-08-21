import test from "node:test";
import assert from "node:assert/strict";
import { getSearchableDateValues, matchesSearchQuery, normalizePhoneDigits } from "../src/lib/search.js";

test("normalizes formatted US phone numbers", () => {
  assert.equal(normalizePhoneDigits("+1 (317) 555-0198"), "3175550198");
  assert.equal(normalizePhoneDigits("317-555-0198"), "3175550198");
});

test("matches phone searches regardless of punctuation", () => {
  assert.equal(matchesSearchQuery("3175550198", [], ["(317) 555-0198"]), true);
  assert.equal(matchesSearchQuery("5550198", [], ["317-555-0198"]), true);
});

test("continues matching ordinary text fields", () => {
  assert.equal(matchesSearchQuery("maria", ["Maria Lopez"], []), true);
  assert.equal(matchesSearchQuery("missing", ["Maria Lopez"], []), false);
});

test("builds searchable padded, unpadded, and ISO date formats", () => {
  const values = getSearchableDateValues("2026-08-12T14:25:43.000Z");
  assert.equal(values.includes("08/12/2026"), true);
  assert.equal(values.includes("8/12/2026"), true);
  assert.equal(values.includes("2026-08-12"), true);
  assert.equal(matchesSearchQuery("08/12/2026", values), true);
});

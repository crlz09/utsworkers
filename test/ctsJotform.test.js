import test from "node:test";
import assert from "node:assert/strict";
import { buildCtsJotformPrefillUrl } from "../src/lib/ctsJotform.js";

test("builds the CTS form URL using its exact Jotform question names", () => {
  const url = new URL(buildCtsJotformPrefillUrl({
    name_snapshot: "Ana Pérez",
    phone_snapshot: "(317) 555-0100",
    worker_email: "ana@example.com",
    worker_address: "10 Main St",
    worker_city: "Indianapolis",
    worker_state: "IN",
    worker_zip_code: "46201",
    class_snapshot: "Electrician",
    worker_total_experience_years: 8,
    english_snapshot: "Bilingual",
    rate_snapshot: 35,
    notes: "Available Monday",
    worker_certifications: [
      { certifications: { name: "OSHA 10" } },
      { certifications: { name: "Lift Certification" } },
      { certifications: { name: "Fall Protection" } },
      { certifications: { name: "Harness & Lanyard" } },
    ],
  }, { id: "job-id", level_type: "Journeyman" }));

  assert.equal(url.origin + url.pathname, "https://form.jotform.com/261095938583167");
  assert.equal(url.searchParams.get("recruiterCompany"), "Universal Talent Source");
  assert.equal(url.searchParams.get("fullName3[first]"), "Ana");
  assert.equal(url.searchParams.get("fullName3[last]"), "Pérez");
  assert.equal(url.searchParams.get("typeA"), "10 Main St");
  assert.equal(url.searchParams.get("typeA44"), "Indianapolis");
  assert.equal(url.searchParams.get("state"), "IN");
  assert.equal(url.searchParams.get("typeA46"), "46201");
  assert.equal(url.searchParams.get("phoneNumber5[full]"), "(317) 555-0100");
  assert.equal(url.searchParams.get("email6"), "ana@example.com");
  assert.equal(url.searchParams.get("trade"), "Electrician");
  assert.equal(url.searchParams.get("tradeSkill"), "Journeyman");
  assert.equal(url.searchParams.get("yearsOf"), "8");
  assert.equal(url.searchParams.get("englishProficiency"), "Bilingual");
  assert.equal(url.searchParams.get("notes"), "Available Monday");
  assert.equal(url.searchParams.get("hiredWith"), "Yes");
  assert.equal(url.searchParams.get("project"), "Journeyman");
  assert.equal(url.searchParams.get("payRate"), "35");
  assert.equal(url.searchParams.get("osha1072"), "Yes");
  assert.equal(url.searchParams.get("liftCert"), "Yes");
  assert.equal(url.searchParams.get("fallProtection"), "Yes");
  assert.equal(url.searchParams.get("harnessampamp"), "Yes");
});

test("omits fields that UTS cannot populate", () => {
  const url = new URL(buildCtsJotformPrefillUrl({}, {}));

  assert.equal(url.searchParams.get("recruiterCompany"), "Universal Talent Source");
  assert.equal(url.searchParams.has("dob"), false);
  assert.equal(url.searchParams.has("serviceFee"), false);
  assert.equal(url.searchParams.has("typeA57"), false);
});

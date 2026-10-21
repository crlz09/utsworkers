import assert from "node:assert/strict";
import test from "node:test";
import { buildCandidatePdfSections } from "../src/lib/candidateDocumentBundle.js";

const document = (id, documentType) => ({ id, document_type: documentType, uploaded_at: "2026-08-21T12:00:00Z" });

test("includes a single selected side without requiring other documents", () => {
  const sections = buildCandidatePdfSections([
    document("id-front", "State ID or Driver License - Front"),
  ]);
  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0].documents.map((document) => document.id), ["id-front"]);
});

test("keeps a single authorization side and adds no unselected or empty sections", () => {
  const selected = document("auth-back", "Employment Authorization Card - Back");
  assert.deepEqual(buildCandidatePdfSections([selected]), [
    { title: "Work Authorization Card", documents: [selected], paired: true },
  ]);
  assert.deepEqual(buildCandidatePdfSections([]), []);
});

test("orders required pairs, optional work authorization, OSHA, resume, and other documents", () => {
  const documents = [
    document("other", "Other: Fall Protection"),
    document("resume", "Resume"),
    document("osha", "OSHA Card"),
    document("ss-back", "Social Security Card - Back"),
    document("auth-back", "Employment Authorization Card - Back"),
    document("id-front", "State ID or Driver License - Front"),
    document("ss-front", "Social Security Card - Front"),
    document("auth-front", "Employment Authorization Card - Front"),
    document("id-back", "State ID or Driver License - Back"),
  ];
  assert.deepEqual(buildCandidatePdfSections(documents).map((section) => section.title), [
    "State ID or Driver License",
    "Work Authorization Card",
    "Social Security Card",
    "OSHA Card",
    "Resume",
    "Other: Fall Protection",
  ]);
});

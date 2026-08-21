import assert from "node:assert/strict";
import test from "node:test";
import { buildCandidatePdfSections, getMissingCandidatePdfDocuments } from "../src/lib/candidateDocumentBundle.js";

const document = (id, documentType) => ({ id, document_type: documentType, uploaded_at: "2026-08-21T12:00:00Z" });

test("requires both sides of ID and Social Security before generating a PDF", () => {
  const missing = getMissingCandidatePdfDocuments([
    document("id-front", "State ID or Driver License - Front"),
    document("ss-front", "Social Security Card - Front"),
    document("ss-back", "Social Security Card - Back"),
  ]);
  assert.deepEqual(missing, ["State ID or Driver License (back)"]);
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

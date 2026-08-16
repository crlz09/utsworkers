import test from "node:test";
import assert from "node:assert/strict";
import {
  TWO_SIDED_WORKER_DOCUMENT_TYPES,
  getWorkerDocumentStatus,
} from "../src/lib/workerDocuments.js";

test("requires both sides of a Social Security card", () => {
  assert.equal(TWO_SIDED_WORKER_DOCUMENT_TYPES.has("social_security_card"), true);
  assert.deepEqual(
    getWorkerDocumentStatus(
      [{ document_type: "Social Security Card - Front" }],
      "social_security_card"
    ),
    { complete: false, front: true, back: false }
  );
  assert.deepEqual(
    getWorkerDocumentStatus(
      [
        { document_type: "Social Security Card - Front" },
        { document_type: "Social Security Card - Back" },
      ],
      "social_security_card"
    ),
    { complete: true, front: true, back: true }
  );
});

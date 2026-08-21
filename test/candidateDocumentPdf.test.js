import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildCandidateDocumentsPdf } from "../src/lib/candidateDocumentPdf.js";

const makeSource = async (id, documentType) => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([360, 220]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(documentType, { x: 20, y: 110, size: 12, font });
  const bytes = await pdf.save();
  return {
    document: { id, document_type: documentType, file_name: `${id}.pdf`, file_type: "application/pdf" },
    blob: new Blob([bytes], { type: "application/pdf" }),
  };
};

test("creates a Letter PDF with required pairs and one page per extra document", async () => {
  const sources = await Promise.all([
    makeSource("id-front", "State ID or Driver License - Front"),
    makeSource("id-back", "State ID or Driver License - Back"),
    makeSource("ss-front", "Social Security Card - Front"),
    makeSource("ss-back", "Social Security Card - Back"),
    makeSource("osha", "OSHA Card"),
  ]);
  const bytes = await buildCandidateDocumentsPdf("Test Candidate", sources);
  const output = await PDFDocument.load(bytes);
  assert.equal(output.getPageCount(), 3);
  output.getPages().forEach((page) => assert.deepEqual(page.getSize(), { width: 612, height: 792 }));
});

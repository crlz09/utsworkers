import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { PDFDocument, StandardFonts, PDFRawStream, decodePDFRawStream } from "pdf-lib";
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

for (const algorithm of ["AES-128", "AES-256", "RC4-128"]) {
  test(`decrypts owner-protected ${algorithm} PDFs and preserves page content`, async () => {
    const source = await makeSource("protected", "OSHA Card");
    const protectedPdf = await PDFDocument.load(await source.blob.arrayBuffer());
    protectedPdf.encrypt({ ownerPassword: "owner-secret", algorithm, allowWeakCryptography: true });
    source.blob = new Blob([await protectedPdf.save()], { type: "application/pdf" });
    await assert.rejects(PDFDocument.load(await source.blob.arrayBuffer()), /encrypted/i);

    const output = await PDFDocument.load(await buildCandidateDocumentsPdf("Test Candidate", [source]));
    assert.equal(output.getPageCount(), 1);
    assert.equal(output.isEncrypted, false);
    const embeddedContent = output.context.enumerateIndirectObjects()
      .map(([, object]) => object)
      .filter((object) => object instanceof PDFRawStream)
      .map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode()))
      .join("\n");
    // Verify decrypted source drawing instructions, not just a successfully saved blank page.
    assert.ok(embeddedContent.includes(Buffer.from("OSHA Card").toString("hex").toUpperCase()));
  });
}

test("identifies a PDF requiring an opening password without generating an incomplete bundle", async () => {
  const source = await makeSource("password-required", "OSHA Card");
  const protectedPdf = await PDFDocument.load(await source.blob.arrayBuffer());
  protectedPdf.encrypt({ userPassword: "opening-secret", ownerPassword: "owner-secret" });
  source.blob = new Blob([await protectedPdf.save()], { type: "application/pdf" });
  await assert.rejects(buildCandidateDocumentsPdf("Test Candidate", [source]),
    /Could not include "password-required.pdf".*requires a password/);
});

test("rejects an empty selection", async () => {
  await assert.rejects(buildCandidateDocumentsPdf("Test Candidate", []), /Select at least one/);
});

test("generates only a selected authorization back without ID or Social Security", async () => {
  const source = await makeSource("auth-back", "Employment Authorization Card - Back");
  const output = await PDFDocument.load(await buildCandidateDocumentsPdf("Test Candidate", [source]));
  assert.equal(output.getPageCount(), 1);
});

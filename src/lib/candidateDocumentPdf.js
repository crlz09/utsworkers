import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildCandidatePdfSections, sanitizeDownloadName } from "./candidateDocumentBundle.js";

const LETTER = [612, 792];
const MARGIN = 36;
const HEADER_HEIGHT = 38;

const fit = (width, height, maxWidth, maxHeight) => {
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
};

const drawWrappedText = (page, text, font, size, x, y, maxWidth, maxLines = 34) => {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => page.drawText(value, { x, y: y - index * (size + 4), size, font, color: rgb(.16, .21, .29) }));
  if (lines.length > maxLines) page.drawText("...", { x, y: y - maxLines * (size + 4), size, font });
};

const extractDocxText = async (blob) => {
  try {
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("text");
    if (!xml) return "";
    const parsed = new DOMParser().parseFromString(xml, "application/xml");
    return Array.from(parsed.getElementsByTagNameNS("*", "p"))
      .map((paragraph) => Array.from(paragraph.getElementsByTagNameNS("*", "t")).map((node) => node.textContent).join(""))
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
};

const drawSource = async (targetPdf, page, source, box, font) => {
  const type = String(source.document.file_type || source.blob.type || "").toLowerCase();
  const bytes = await source.blob.arrayBuffer();
  let embedded;
  let embeddedType = "";
  if (type.includes("pdf")) {
    const sourcePdf = await PDFDocument.load(bytes);
    const sourcePage = sourcePdf.getPages()[0];
    if (sourcePage) {
      embedded = await targetPdf.embedPage(sourcePage);
      embeddedType = "page";
    }
  } else if (type.includes("png")) {
    embedded = await targetPdf.embedPng(bytes);
    embeddedType = "image";
  } else if (type.includes("jpeg") || type.includes("jpg")) {
    embedded = await targetPdf.embedJpg(bytes);
    embeddedType = "image";
  }

  page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, borderWidth: 1, borderColor: rgb(.82, .85, .89), color: rgb(.98, .99, 1) });
  if (embedded) {
    const dimensions = fit(embedded.width, embedded.height, box.width - 18, box.height - 18);
    const options = { x: box.x + (box.width - dimensions.width) / 2, y: box.y + (box.height - dimensions.height) / 2, ...dimensions };
    if (embeddedType === "page") page.drawPage(embedded, options);
    else page.drawImage(embedded, options);
    return;
  }

  const isDocx = type.includes("officedocument.wordprocessingml") || /\.docx$/i.test(source.document.file_name || "");
  const extracted = isDocx ? await extractDocxText(source.blob) : "";
  page.drawText(source.document.file_name || "Document", { x: box.x + 14, y: box.y + box.height - 26, size: 11, font, color: rgb(.1, .18, .32) });
  drawWrappedText(page, extracted || "This file format cannot be rendered in the combined PDF. Download All includes the original document.", font, 9, box.x + 14, box.y + box.height - 48, box.width - 28, Math.max(4, Math.floor((box.height - 62) / 13)));
};

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const createCandidateDocumentsZip = async (workerName, sources) => {
  const zip = new JSZip();
  const usedNames = new Set();
  sources.forEach(({ document, blob }, index) => {
    let name = sanitizeDownloadName(document.file_name, `document_${index + 1}`);
    if (usedNames.has(name.toLowerCase())) name = `${index + 1}_${name}`;
    usedNames.add(name.toLowerCase());
    zip.file(name, blob);
  });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  downloadBlob(blob, `${sanitizeDownloadName(workerName, "candidate")}_documents.zip`);
};

export const buildCandidateDocumentsPdf = async (workerName, sources) => {
  const sourceById = new Map(sources.map((source) => [source.document.id, source]));
  const sections = buildCandidatePdfSections(sources.map((source) => source.document));
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const [index, section] of sections.entries()) {
    const page = pdf.addPage(LETTER);
    const [pageWidth, pageHeight] = LETTER;
    page.drawText(section.title, { x: MARGIN, y: pageHeight - MARGIN, size: 16, font: bold, color: rgb(.08, .14, .25) });
    page.drawText(`${workerName || "Candidate"} | Page ${index + 1}`, { x: MARGIN, y: pageHeight - MARGIN - 19, size: 8.5, font, color: rgb(.39, .46, .56) });
    const availableHeight = pageHeight - (MARGIN * 2) - HEADER_HEIGHT;
    const sectionSources = section.documents.map((document) => sourceById.get(document.id)).filter(Boolean);
    if (section.paired) {
      const gap = 14;
      const height = (availableHeight - gap) / 2;
      for (const [sourceIndex, source] of sectionSources.entries()) {
        await drawSource(pdf, page, source, { x: MARGIN, y: MARGIN + (1 - sourceIndex) * (height + gap), width: pageWidth - MARGIN * 2, height }, font);
      }
    } else if (sectionSources[0]) {
      await drawSource(pdf, page, sectionSources[0], { x: MARGIN, y: MARGIN, width: pageWidth - MARGIN * 2, height: availableHeight }, font);
    }
  }

  return pdf.save();
};

export const createCandidateDocumentsPdf = async (workerName, sources) => {
  const bytes = await buildCandidateDocumentsPdf(workerName, sources);
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${sanitizeDownloadName(workerName, "candidate")}_documents.pdf`);
};

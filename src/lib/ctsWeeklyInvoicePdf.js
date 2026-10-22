import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { weeklyInvoiceLines, weeklyReportTotals } from './ctsWeeklyReport.js';
import { formatInvoiceDate, weekPeriodLabel } from './ctsWeeklyInvoice.js';

export const INVOICE_HEADER_RGB = [230 / 255, 242 / 255, 1];
const INK = rgb(0.09, 0.17, 0.23), MUTED = rgb(0.32, 0.42, 0.48), RULE = rgb(0.86, 0.90, 0.92);
const usd = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const clean = (value) => String(value ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
function wrap(text, font, size, width) {
  const lines = [];
  for (const paragraph of clean(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) { lines.push(line); line = ''; }
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ''; }
        line += char;
      }
      line += ' ';
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
// Draw the backgrounds and page counts into the PDF, independently of browser print settings.
export async function buildCtsWeeklyInvoicePdf({ invoice, report, paperSize = 'letter', logoBytes, finalized = true }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = logoBytes ? await pdf.embedPng(logoBytes) : null;
  const size = paperSize === 'a4' ? [595.28, 841.89] : [612, 792];
  const [width, height] = size, margin = 36, right = width - margin, bodyWidth = width - 2 * margin;
  const descWidth = bodyWidth * 0.55, qtyEnd = margin + bodyWidth * 0.65, rateEnd = margin + bodyWidth * 0.82;
  const bottom = 60, lineHeight = 11.5;
  let page, y;
  pdf.setTitle(invoice.invoice_number || 'CTS Invoice');
  pdf.setSubject(`Week Period: ${weekPeriodLabel(report.weekEnding)}`);
  pdf.setAuthor('Universal Talent Source');
  const text = (value, x, top, opts = {}) => page.drawText(clean(value), { x, y: top, size: 9.5, font, color: INK, ...opts });
  const alignRight = (value, end, top, opts = {}) => {
    const str = clean(value), usedFont = opts.font || font, usedSize = opts.size || 9.5;
    text(str, end - usedFont.widthOfTextAtSize(str, usedSize), top, opts);
  };
  const tableHeader = () => {
    page.drawRectangle({ x: margin, y: y - 25, width: bodyWidth, height: 25, color: rgb(...INVOICE_HEADER_RGB) });
    text('Description', margin + 6, y - 16, { font: bold, color: MUTED });
    alignRight('Qty', qtyEnd - 6, y - 16, { font: bold, color: MUTED });
    alignRight('Rate', rateEnd - 6, y - 16, { font: bold, color: MUTED });
    alignRight('Amount', right - 6, y - 16, { font: bold, color: MUTED });
    y -= 25;
  };
  const newPage = (withTable = true) => {
    page = pdf.addPage(size); y = height - margin;
    text('Universal Talent Source', margin, y - 8, { font: bold, size: 11 });
    alignRight(invoice.invoice_number || '', right, y - 8, { size: 9 });
    text(`Week Period: ${weekPeriodLabel(report.weekEnding)}`, margin, y - 24, { size: 9, color: MUTED });
    y -= 40;
    if (withTable) tableHeader();
  };
  page = pdf.addPage(size); y = height - margin;
  if (logo) {
    const scale = Math.min(80 / logo.width, 40 / logo.height);
    page.drawImage(logo, { x: margin, y: y - logo.height * scale, width: logo.width * scale, height: logo.height * scale });
    y -= logo.height * scale + 17;
  }
  text('Universal Talent Source', margin, y, { font: bold, size: 13 });
  alignRight('INVOICE', right, height - margin - 12, { font: bold, size: 18 });
  alignRight(invoice.invoice_number || '', right, height - margin - 31, { size: 10 });
  if (!finalized) alignRight('DRAFT - NOT FINALIZED', right, height - margin - 46, { size: 8, color: MUTED });
  y -= 25;
  text('Bill to', margin, y, { font: bold, size: 10 });
  let billY = y - 16;
  for (const value of [invoice.client_name, invoice.client_address, invoice.client_contact_name, invoice.client_email, invoice.client_phone].filter(Boolean)) {
    for (const line of wrap(value, font, 9, bodyWidth * 0.53)) { text(line, margin, billY, { size: 9 }); billY -= 12; }
  }
  let metaY = y - 16;
  for (const value of [`Invoice date: ${formatInvoiceDate(invoice.invoice_date)}`, `Due date: ${formatInvoiceDate(invoice.due_date)}`, `Week Period: ${weekPeriodLabel(report.weekEnding)}`]) {
    alignRight(value, right, metaY, { size: 9 }); metaY -= 14;
  }
  y = Math.min(billY, metaY) - 20;
  tableHeader();
  for (const item of weeklyInvoiceLines(report)) {
    const title = item.worker_name || item.project_name;
    const details = item.worker_name ? `${item.product_service_name} · ${item.project_name}` : item.product_service_name;
    const description = [...wrap(title, bold, 9.5, descWidth - 12).map((t) => ({ t, font: bold })), ...wrap(details, font, 9, descWidth - 12).map((t) => ({ t, font }))];
    let first = true;
    while (description.length) {
      let available = Math.floor((y - bottom - 14) / lineHeight);
      if (available < 2) { newPage(); available = Math.floor((y - bottom - 14) / lineHeight); }
      const chunk = description.splice(0, available), rowHeight = chunk.length * lineHeight + 14;
      const color = item.amount < 0 ? rgb(0.55, 0.24, 0.20) : INK;
      chunk.forEach((line, i) => text(line.t, margin + 6, y - 14 - i * lineHeight, { font: line.font, size: line.font === bold ? 9.5 : 9, color }));
      if (first) {
        alignRight(String(item.qty), qtyEnd - 6, y - 14, { color });
        alignRight(usd(item.rate), rateEnd - 6, y - 14, { color });
        alignRight(usd(item.amount), right - 6, y - 14, { color });
      }
      y -= rowHeight;
      page.drawLine({ start: { x: margin, y }, end: { x: right, y }, thickness: 0.5, color: RULE });
      first = false;
      if (description.length) newPage();
    }
  }
  const totals = weeklyReportTotals(report);
  if (y - bottom < 100) newPage(false);
  y -= 23;
  for (const [label, value] of [['Subtotal before deductions', totals.subtotal], ['Deductions / credits to CTS', -totals.deductions]]) {
    text(label, right - 265, y, { size: 9 }); alignRight(usd(value || 0), right - 6, y); y -= 20;
  }
  text('Total USD', right - 265, y - 4, { font: bold, size: 12 });
  alignRight(usd(totals.total), right - 6, y - 4, { font: bold, size: 15 });
  y -= 34;
  for (const line of wrap(invoice.notes || '', font, 9, bodyWidth)) {
    if (y < bottom + 12) newPage(false);
    text(line, margin, y, { size: 9 }); y -= 12;
  }
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    const label = `${index + 1}/${pages.length}`;
    p.drawLine({ start: { x: margin, y: 40 }, end: { x: right, y: 40 }, thickness: 0.5, color: RULE });
    p.drawText(label, { x: (width - font.widthOfTextAtSize(label, 9)) / 2, y: 24, size: 9, font, color: MUTED });
  });
  return pdf.save();
}

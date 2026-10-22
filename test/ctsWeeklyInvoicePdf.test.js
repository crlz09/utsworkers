import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { inflateSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { buildCtsWeeklyInvoicePdf } from '../src/lib/ctsWeeklyInvoicePdf.js';
import { createWeeklyInvoice } from '../src/lib/ctsWeeklyInvoice.js';
import { blankWeeklyReport } from '../src/lib/ctsWeeklyReport.js';

const fixture = (count = 1) => ({ ...blankWeeklyReport(), weekEnding: '2026-10-18', entries: Array.from({ length: count }, (_, i) => ({ name: `Employee ${i + 1}`, contractor: 'CTS project', regular: 40, overtime: 20, rate: 35, perDiemDays: 0, perDiemRate: 0 })), deductions: [{ description: 'Training', amount: 150 }] });
function content(pdf, page) {
  const contents = page.node.Contents();
  return Array.from({ length: contents.size() }, (_, i) => inflateSync(pdf.context.lookup(contents.get(i)).getContents()).toString('latin1')).join('\n');
}
const hex = (s) => Buffer.from(s, 'latin1').toString('hex').toUpperCase();
test('PDF defaults to Letter and paints blue header and page footer into the document', async () => {
  const bytes = await buildCtsWeeklyInvoicePdf({ invoice: createWeeklyInvoice('2026-10-18','2026-10-21'), report: fixture() });
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  const page = pdf.getPage(0);
  assert.deepEqual(page.getSize(), { width: 612, height: 792 });
  const commands = content(pdf, page);
  assert.match(commands, /0\.9019607843137255 0\.9490196078431372 1 rg/);
  assert.ok(commands.toUpperCase().includes(hex('1/1')));
  assert.ok(commands.toUpperCase().includes(hex('-$150.00')));
  assert.ok(commands.toUpperCase().includes(hex('$2,250.00')));
  assert.ok(commands.toUpperCase().includes(hex('Week Period: 10/12/2026 - 10/18/2026')));
});
test('multipage invoices retain table headings and exact page/total footers', async () => {
  const bytes = await buildCtsWeeklyInvoicePdf({ invoice: createWeeklyInvoice('2026-10-18','2026-10-21'), report: fixture(22) });
  const pdf = await PDFDocument.load(bytes), pages = pdf.getPages();
  assert.ok(pages.length >= 3);
  pages.forEach((page, i) => {
    const commands = content(pdf, page).toUpperCase();
    assert.ok(commands.includes(hex(`${i + 1}/${pages.length}`)));
    assert.deepEqual(page.getSize(), { width: 612, height: 792 });
  });
  assert.ok(content(pdf, pages[1]).toUpperCase().includes(hex('Description')));
});
test('A4 remains available as an explicit override and long descriptions paginate', async () => {
  const report = fixture();
  report.adjustments = [{ description: 'Training details '.repeat(500), amount: 50 }];
  const bytes = await buildCtsWeeklyInvoicePdf({ invoice: createWeeklyInvoice('2026-10-18','2026-10-21'), report, paperSize: 'a4' });
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() > 1);
  pdf.getPages().forEach((p) => assert.deepEqual(p.getSize(), { width: 595.28, height: 841.89 }));
});

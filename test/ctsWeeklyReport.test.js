import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWeeklyReport, weeklyReportTotals, weeklyInvoiceLines, validateWeeklyReport, invoiceCsv } from '../src/lib/ctsWeeklyReport.js';
function fixture() {
  const rows = [['EMPLOYEE NAME', 'CONTRACTOR'], ['UTS 10/18/2026', null, 'HOURS', 'OT HOURS', 'PER DIEM', 'RATE', 'OT RATE']];
  for (const [name, wage, ot] of [['Worker 1',30,25],['Worker 2',25,10],['Worker 3',30,18],['Worker 4',28,24.25],['Worker 5',28,24],['Worker 6',28,24],['Worker 7',28,22.5]]) rows.push([name, 'Project',40,ot,null,wage+5,wage*1.5,null,40*(wage+5),ot*wage*1.5,0,ot*5]);
  rows.push([null,null,280,147.75,null,null,null,null,9280,6289.5,0,738.75]);
  rows.push([null,null,null,null,null,null,null,null,null,16308.25]);
  rows.push([null,null,null,null,null,null,null,null,'Worker 3 reimbursement',600]);
  rows.push([null,null,null,null,null,null,null,null,'Worker 2 reimbursement',500]);
  rows.push([null,null,null,null,null,null,null,null,'TRAINING',0]);
  rows.push([null,null,null,null,null,null,null,null,'TOTAL DUE WK ENDING 10/18/2026',17408.25]);
  return rows;
}
test('UTS WEEK ENDING reconciles corrected CTS invoice without adding the fee twice', () => {
  const r = parseWeeklyReport(fixture());
  assert.deepEqual(validateWeeklyReport(r), []);
  assert.equal(r.entries.length, 7);
  assert.equal(r.weekEnding, '2026-10-18');
  assert.equal(r.warnings.length, 0);
  const t = weeklyReportTotals(r);
  assert.deepEqual(t, {total:17408.25,subtotal:17408.25,deductions:0,regular:280,overtime:147.75,hours:427.75,fee:2138.75,difference:0});
  const lines = weeklyInvoiceLines(r);
  assert.equal(lines[0].rate,35);
  assert.equal(lines[1].rate,50);
  assert.equal(lines[3].rate,42.5);
  assert.equal(lines.length,16);
});
test('per diem and footer reimbursements remain distinct and line amounts round to cents', () => {
  const r = parseWeeklyReport(fixture());
  r.entries[0].perDiemDays=2; r.entries[0].perDiemRate=100;
  assert.equal(weeklyReportTotals(r).total,17608.25);
  assert.ok(validateWeeklyReport(r).some((s)=>s.includes('Explica')));
  r.notes='Added missing per diem';
  assert.deepEqual(validateWeeklyReport(r),[]);
});
test('reports mismatched source formulas even if the total still matches', () => {
  const rows=fixture(); rows[2][6]=42;
  const r=parseWeeklyReport(rows);
  assert.ok(r.warnings.some((w)=>w.includes('OT RATE')));
  assert.equal(weeklyReportTotals(r).total,17408.25);
});
test('rejects wrong templates, invalid amounts and inconsistent dates', () => {
  assert.throws(()=>parseWeeklyReport([['Type','Date','Qty']]),/formato/);
  const rows=fixture(); rows[2][2]=-2;
  assert.throws(()=>parseWeeklyReport(rows),/inválido/);
  const dates=fixture(); dates.at(-1)[8]='TOTAL DUE 10/25/2026';
  assert.throws(()=>parseWeeklyReport(dates),/fechas/);
});
test('requires a complete report and validates regular hours and CTS fee', () => {
  const r=parseWeeklyReport(fixture());
  r.entries[0].regular=50; r.entries[1].rate=3; r.weekEnding='2026-02-30';
  const errors=validateWeeklyReport(r);
  assert.ok(errors.some((e)=>e.includes('fecha')));
  assert.ok(errors.some((e)=>e.includes('sobre 40')));
  assert.ok(errors.some((e)=>e.includes('menor que el fee')));
});
test('CSV escapes embedded quotes, newlines and spreadsheet formulas', () => {
  const r=parseWeeklyReport(fixture()); r.entries[0].name='=HYPERLINK("test")';
  const csv=invoiceCsv(weeklyInvoiceLines(r));
  assert.ok(csv.includes('"\'=HYPERLINK(""test"")"'));
});


test('training deductions reduce the invoice, preserve the fee and export negative amounts', () => {
  const r = parseWeeklyReport(fixture());
  r.deductions.push({ description: 'Training owed to CTS', amount: 300 });
  const totals = weeklyReportTotals(r);
  assert.equal(totals.subtotal, 17408.25);
  assert.equal(totals.deductions, 300);
  assert.equal(totals.total, 17108.25);
  assert.equal(totals.fee, 2138.75);
  assert.deepEqual(validateWeeklyReport(r), []);
  const line = weeklyInvoiceLines(r).at(-1);
  assert.equal(line.line_type, 'manual');
  assert.equal(line.rate, -300);
  assert.equal(line.amount, -300);
  assert.equal(line.project_name, 'Training owed to CTS');
  assert.ok(invoiceCsv([line]).includes('"-300"'));
});
test('negative Excel footer amounts import as deductions instead of extra charges', () => {
  const rows = fixture();
  rows.at(-2)[9] = -300;
  rows.at(-1)[9] = 17108.25;
  const r = parseWeeklyReport(rows);
  assert.deepEqual(r.deductions, [{ description: 'TRAINING', amount: 300 }]);
  assert.equal(weeklyReportTotals(r).total, 17108.25);
  assert.equal(weeklyReportTotals(r).difference, 0);
  assert.deepEqual(validateWeeklyReport(r), []);
  rows.at(-2)[9] = '($300.00)';
  assert.equal(parseWeeklyReport(rows).deductions[0].amount, 300);
});
test('old reports with no deductions remain unchanged', () => {
  const r = parseWeeklyReport(fixture());
  delete r.deductions;
  assert.equal(weeklyReportTotals(r).total, 17408.25);
  assert.deepEqual(validateWeeklyReport(r), []);
});
test('deductions require a description and positive input; the net invoice remains positive', () => {
  const r = parseWeeklyReport(fixture());
  r.deductions = [{ description: '', amount: -300 }];
  assert.ok(validateWeeklyReport(r).some((e) => e.includes('deducción')));
  r.deductions = [{ description: 'Training', amount: 17408.25 }];
  assert.ok(validateWeeklyReport(r).some((e) => e.includes('total neto')));
  r.deductions = [{ description: 'Training', amount: 100 }, { description: 'Other credit', amount: 50.25 }];
  assert.equal(weeklyReportTotals(r).total, 17258);
});

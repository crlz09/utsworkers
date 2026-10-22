// UTS WEEK ENDING: RATE includes the flat fee; G contains OT wages, L the OT fee.
export const cents = (value) => Math.round((Number(value) + Number.EPSILON) * 100);
export const moneyValue = (value) => cents(value) / 100;
const text = (v) => String(v ?? '').trim();
const norm = (v) => text(v).toUpperCase().replace(/\s+/g, ' ');
const validNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function blankWeeklyReport() {
  return { weekEnding: '', fee: 5, entries: [], adjustments: [], sourceTotal: null, sourceFilename: '', sourceHash: '', notes: '', warnings: [] };
}
export function weeklyInvoiceLines(report) {
  const lines = [];
  for (const e of report.entries) {
    if (e.regular > 0) lines.push({ line_type: 'hours', product_service_name: 'Regular hours', worker_name: e.name, project_name: e.contractor, details: `Week ending ${report.weekEnding}`, qty: e.regular, rate: e.rate, amount: moneyValue(e.regular * e.rate) });
    if (e.overtime > 0) {
      const rate = moneyValue((e.rate - report.fee) * 1.5 + report.fee);
      lines.push({ line_type: 'hours', product_service_name: 'Overtime hours', worker_name: e.name, project_name: e.contractor, details: `Week ending ${report.weekEnding}`, qty: e.overtime, rate, amount: moneyValue(e.overtime * rate) });
    }
    if (e.perDiemDays > 0 && e.perDiemRate > 0) lines.push({ line_type: 'hours', product_service_name: 'Per diem', worker_name: e.name, project_name: e.contractor, details: `Week ending ${report.weekEnding}`, qty: e.perDiemDays, rate: e.perDiemRate, amount: moneyValue(e.perDiemDays * e.perDiemRate) });
  }
  for (const a of report.adjustments) if (a.amount > 0) lines.push({ line_type: 'hours', product_service_name: 'Reimbursement / additional charge', worker_name: '', project_name: a.description, details: `Week ending ${report.weekEnding}`, qty: 1, rate: a.amount, amount: moneyValue(a.amount) });
  return lines;
}
export function weeklyReportTotals(report) {
  const lines = weeklyInvoiceLines(report);
  const total = lines.reduce((s, l) => s + cents(l.amount), 0) / 100;
  const regular = report.entries.reduce((s, e) => s + Number(e.regular || 0), 0);
  const overtime = report.entries.reduce((s, e) => s + Number(e.overtime || 0), 0);
  return { total, regular, overtime, hours: regular + overtime, fee: moneyValue((regular + overtime) * report.fee), difference: report.sourceTotal == null ? 0 : moneyValue(total - report.sourceTotal) };
}
export function validateWeeklyReport(report) {
  const errors = [];
  const date = new Date(`${report.weekEnding}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report.weekEnding) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== report.weekEnding) errors.push('Indica una fecha válida de cierre semanal.');
  if (!validNumber(report.fee)) errors.push('El fee debe ser un número mayor o igual a cero.');
  if (!report.entries.length) errors.push('Agrega al menos un empleado.');
  for (const [i, e] of report.entries.entries()) {
    if (!text(e.name) || !text(e.contractor)) errors.push(`Fila ${i + 1}: indica empleado y contratista/proyecto.`);
    if (['regular', 'overtime', 'rate', 'perDiemDays', 'perDiemRate'].some((k) => !validNumber(e[k]))) errors.push(`Fila ${i + 1}: revisa los valores numéricos.`);
    if (e.regular > 40) errors.push(`Fila ${i + 1}: separa las horas sobre 40 como overtime.`);
    if (e.rate < report.fee) errors.push(`Fila ${i + 1}: CTS RATE no puede ser menor que el fee.`);
  }
  for (const a of report.adjustments) if (!text(a.description) || !validNumber(a.amount)) errors.push('Cada cargo adicional necesita descripción e importe no negativo.');
  if (!errors.length && weeklyReportTotals(report).total <= 0) errors.push('El total a facturar debe ser mayor que cero.');
  if (report.sourceTotal != null && !validNumber(report.sourceTotal)) errors.push('El total del archivo no es válido.');
  if (!errors.length && Math.abs(weeklyReportTotals(report).difference) > 0.01 && !text(report.notes)) errors.push('El total difiere del Excel. Explica el ajuste en las notas antes de guardar.');
  return errors;
}
function parseDate(value) {
  const m = text(value).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : '';
}
function numeric(v, label, optional = false) {
  if (optional && (v == null || v === '')) return 0;
  const n = typeof v === 'string' ? Number(v.replace(/[$,]/g, '')) : v;
  if (!validNumber(n)) throw new Error(`${label}: valor numérico inválido.`);
  return n;
}
export function parseWeeklyReport(rows, filename = '', fee = 5) {
  if (!validNumber(fee)) throw new Error('Fee inválido.');
  const header = rows.findIndex((r) => norm(r[0]) === 'EMPLOYEE NAME' && norm(r[1]) === 'CONTRACTOR');
  if (header < 0 || norm(rows[header + 1]?.[5]) !== 'RATE' || norm(rows[header + 1]?.[3]) !== 'OT HOURS') throw new Error('Se esperaba el formato UTS WEEK ENDING (EMPLOYEE NAME, CONTRACTOR, HOURS, OT HOURS y RATE).');
  const report = { ...blankWeeklyReport(), fee, sourceFilename: filename };
  report.weekEnding = parseDate(rows[header + 1]?.[0]) || parseDate(filename);
  const totalRow = rows.findIndex((r) => norm(r[8]).startsWith('TOTAL DUE'));
  if (totalRow < 0) throw new Error('No se encontró TOTAL DUE en el reporte.');
  const footerDate = parseDate(rows[totalRow][8]);
  if (footerDate && report.weekEnding && footerDate !== report.weekEnding) throw new Error('Las fechas de cierre del encabezado y del total no coinciden.');
  report.weekEnding ||= footerDate;
  report.sourceTotal = numeric(rows[totalRow][9], 'TOTAL DUE');
  for (let i = header + 2; i < totalRow; i++) {
    const r = rows[i];
    if (text(r[0]) && text(r[1])) {
      const e = { name: text(r[0]), contractor: text(r[1]), regular: numeric(r[2], `C${i + 1}`, true), overtime: numeric(r[3], `D${i + 1}`, true), rate: numeric(r[5], `F${i + 1}`), perDiemDays: numeric(r[4], `E${i + 1}`, true), perDiemRate: numeric(r[7], `H${i + 1}`, true) };
      report.entries.push(e);
      const otWage = moneyValue((e.rate - fee) * 1.5);
      if (r[6] != null && Math.abs(numeric(r[6], `G${i + 1}`) - otWage) > 0.01) report.warnings.push(`${e.name}: OT RATE del Excel difiere de (RATE − fee) × 1.5. Revisa la tarifa.`);
      for (const [col, expected] of [[8, e.regular * e.rate], [9, e.overtime * otWage], [10, e.perDiemDays * e.perDiemRate], [11, e.overtime * fee]]) {
        if (r[col] != null && Math.abs(numeric(r[col], `Fila ${i + 1}`) - moneyValue(expected)) > 0.01) report.warnings.push(`${e.name}: un importe de la fila ${i + 1} no coincide con las horas y tarifas.`);
      }
    } else if (typeof r[8] === 'string' && text(r[8]) && r[9] != null && !norm(r[8]).startsWith('TOTAL')) {
      report.adjustments.push({ description: text(r[8]), amount: numeric(r[9], `Cargo fila ${i + 1}`) });
    }
  }
  if (!report.entries.length) throw new Error('No se encontraron empleados en el reporte.');
  return report;
}
export function invoiceCsv(lines) {
  // Prefix potential spreadsheet formulas in user-controlled text.
  const escape = (v) => `"${String(typeof v === 'string' && /^[=+@\-\t\r]/.test(v) ? `'${v}` : v).replaceAll('"', '""')}"`;
  return [['Service', 'Employee', 'Contractor / description', 'Qty', 'Rate', 'Amount'], ...lines.map((l) => [l.product_service_name, l.worker_name, l.project_name, l.qty, l.rate, l.amount])].map((r) => r.map(escape).join(',')).join('\r\n');
}

import { eligibleForPaystub, paystubPayload, paystubTotals, PAYSTUB_FIELDS } from './contractorPaystub.js';
import { shiftPayrollWeek } from './payroll.js';

export const normalizePayrollName = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const header = value => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
const blank = value => value == null || String(value).trim() === '';
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;

export function importWeekEnding(value) {
  let iso;
  if (value instanceof Date && Number.isFinite(value.getTime())) iso = value.toISOString().slice(0, 10);
  else if (typeof value === 'number' && Number.isInteger(value) && value > 60 && value < 100000) iso = new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  else {
    const text = String(value ?? '').trim();
    const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    iso = match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : text;
  }
  const date = new Date(`${iso}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso || date.getUTCDay() !== 0) throw new Error('Week Ending must be a valid Sunday date.');
  return iso;
}

function amount(value, label, row, optional = false) {
  if (optional && blank(value)) return 0;
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text) || !Number.isFinite(Number(text)) || Number(text) > 999999.99) throw new Error(`Row ${row}: ${label} must be a nonnegative number with up to two decimals.`);
  return Number(text);
}

// The sheet is data only. Notes and other cell text never control import actions.
export function parsePaystubImport(rows) {
  if (!Array.isArray(rows) || rows.length < 2) throw new Error('The worksheet is empty.');
  if (rows.length > 251) throw new Error('Import at most 250 payroll rows at a time.');
  const headers = rows[0].map(header);
  const required = ['NAME', 'PROJECT', 'RATE', 'REG', 'OT', 'PER DIEM', 'DEDUCTIONS', 'EXTRAS', 'TYPE', 'WEEK ENDING'];
  for (const name of required) {
    if (!headers.includes(name)) throw new Error(`Missing column: ${name}.`);
    if (headers.indexOf(name) !== headers.lastIndexOf(name)) throw new Error(`Duplicate column: ${name}.`);
  }
  for (const name of ['TOTAL REG', 'TOTAL OT', 'ELLOS COBRAN', 'NOTES']) {
    if (headers.includes(name) && headers.indexOf(name) !== headers.lastIndexOf(name)) throw new Error(`Duplicate column: ${name}.`);
  }
  const groups = new Map();
  let skipped = 0, weekEnding = '';
  rows.slice(1).forEach((cells, index) => {
    if (cells.every(blank)) return;
    const row = index + 2;
    const get = name => cells[headers.indexOf(name)];
    const type = header(get('TYPE')).replace(/\s|-/g, '');
    if (type === 'W2') { skipped++; return; }
    if (type !== '1099') throw new Error(`Row ${row}: TYPE must be 1099 or W2.`);
    let ending;
    try { ending = importWeekEnding(get('WEEK ENDING')); } catch (error) { throw new Error(`Row ${row}: ${error.message}`); }
    if (weekEnding && ending !== weekEnding) throw new Error('All 1099 rows must have the same Week Ending. Import each week separately.');
    weekEnding = ending;
    const name = String(get('NAME') ?? '').trim(), project = String(get('PROJECT') ?? '').trim();
    const key = normalizePayrollName(name);
    if (!key || !project) throw new Error(`Row ${row}: NAME and PROJECT are required.`);
    const values = {
      hourly_rate: amount(get('RATE'), 'RATE', row), regular_hours: amount(get('REG'), 'REG', row),
      overtime_hours: amount(get('OT'), 'OT', row), per_diem: amount(get('PER DIEM'), 'PER DIEM', row),
      deductions: amount(get('DEDUCTIONS'), 'DEDUCTIONS', row, true), extras: amount(get('EXTRAS'), 'EXTRAS', row, true),
    };
    if (values.hourly_rate === 0) throw new Error(`Row ${row}: RATE must be greater than zero.`);
    const totals = paystubTotals(values), warnings = [];
    for (const [column, expected] of [['TOTAL REG', totals.regular], ['TOTAL OT', totals.overtime], ['ELLOS COBRAN', totals.net]]) {
      if (!blank(get(column)) && Math.abs(amount(get(column), column, row) - expected) > 0.009) warnings.push(`Row ${row}: ${column} is ${get(column)}; calculated amount is ${expected.toFixed(2)}.`);
    }
    const source = { row, name, project, ...values, notes: String(get('NOTES') ?? '').trim(), statedNet: blank(get('ELLOS COBRAN')) ? null : amount(get('ELLOS COBRAN'), 'ELLOS COBRAN', row) };
    if (!groups.has(key)) groups.set(key, { key, name, sources: [], warnings: [], values: { ...values, project_name: project, notes: '' } });
    const group = groups.get(key);
    if (group.sources.length) {
      if (group.values.hourly_rate !== values.hourly_rate) throw new Error(`Rows for ${name} have different rates. Separate or reconcile those payments before importing.`);
      for (const field of ['regular_hours', 'overtime_hours', 'per_diem', 'deductions', 'extras']) group.values[field] = round(group.values[field] + values[field]);
      if (group.sources.some(s => s.project !== project)) group.values.project_name = '';
    }
    group.sources.push(source);
    group.warnings.push(...warnings);
  });
  if (!groups.size) throw new Error('No 1099 payroll rows were found.');
  const periodStart = shiftPayrollWeek(weekEnding, -6);
  const items = [...groups.values()].map(group => {
    if (group.sources.length > 1) group.warnings.unshift(`Rows ${group.sources.map(s => s.row).join(', ')} are combined into one statement. Review compensation for earlier weeks and any repeated hours or per diem.`);
    if (!group.values.project_name) group.warnings.push('Multiple projects: enter the project description for this statement.');
    group.values.notes = group.sources.filter(s => s.notes).map(s => `Row ${s.row}: ${s.notes}`).join('\n');
    return { ...group, values: { ...group.values, period_start: periodStart, payment_date: shiftPayrollWeek(periodStart, 11), statement_number: '', payment_method: 'Direct Deposit', correction_reason: '', confirm_revision: false } };
  });
  return { weekEnding, periodStart, skipped, items };
}

export function matchImportAssignment(name, roster) {
  const key = normalizePayrollName(name);
  const matches = roster.filter(a => eligibleForPaystub(a) && [a.worker?.name, a.name_snapshot].some(n => n && normalizePayrollName(n) === key));
  return matches.length === 1 ? matches[0].id : '';
}

export function reviewedBatchPayload(items, roster) {
  const included = items.filter(item => !item.excluded);
  if (!included.length) throw new Error('Include at least one paystub.');
  const workers = new Set(), numbers = new Set();
  return included.map(item => {
    if (!item.reviewed) throw new Error(`Review ${item.name} individually before finalizing.`);
    const assignment = roster.find(a => a.id === item.assignmentId);
    const payload = paystubPayload(assignment, item.values);
    if (item.reviewedIdentity !== `${assignment.worker_id}:${assignment.worker?.name || assignment.name_snapshot}`) throw new Error(`The linked employee for ${item.name} changed. Review this paystub again.`);
    if (workers.has(assignment.worker_id)) throw new Error('Two statements are linked to the same worker. Exclude or reconcile the duplicate.');
    if (numbers.has(payload.statement_number)) throw new Error('Statement numbers must be unique.');
    workers.add(assignment.worker_id); numbers.add(payload.statement_number);
    return { ...payload, id: item.id };
  });
}

// One INSERT is atomic. Stable IDs let a retry recover a successful request whose
// response was lost, without creating correction versions or duplicate payments.
export async function savePaystubBatch(client, payloads) {
  if (!payloads.length || payloads.some(p => !p.id) || new Set(payloads.map(p => p.id)).size !== payloads.length) throw new Error('Invalid batch identities.');
  const existing = await client.from('contractor_paystubs').select(PAYSTUB_FIELDS).in('id', payloads.map(p => p.id));
  if (existing.error) throw existing.error;
  if (existing.data?.length === payloads.length) return existing.data;
  if (existing.data?.length) throw new Error('Some batch records already exist. Check Final history before continuing.');
  const result = await client.from('contractor_paystubs').insert(payloads).select(PAYSTUB_FIELDS);
  if (result.error) throw result.error;
  if (result.data?.length !== payloads.length) throw new Error('Could not confirm the complete batch. Retry to check saved records.');
  return result.data;
}

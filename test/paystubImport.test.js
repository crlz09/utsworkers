import test from 'node:test';
import assert from 'node:assert/strict';
import { importWeekEnding, matchImportAssignment, parsePaystubImport, reviewedBatchPayload, savePaystubBatch } from '../src/lib/paystubImport.js';
import { paystubTotals } from '../src/lib/contractorPaystub.js';

const headers = ['NAME', 'PROJECT', 'RATE', 'REG', 'OT', 'PER DIEM', 'TOTAL REG', 'TOTAL OT', 'DEDUCTIONS', 'EXTRAS', 'ELLOS COBRAN', 'TOTAL COSTO', 'TYPE', 'NOTES', 'Week Ending'];
const row = (name = 'Test Contractor', changes = {}) => headers.map(h => ({ NAME: name, PROJECT: 'UTS Order', RATE: 32, REG: 40, OT: 18, 'PER DIEM': 600, 'TOTAL REG': 1280, 'TOTAL OT': 864, DEDUCTIONS: null, EXTRAS: null, 'ELLOS COBRAN': 2744, 'TOTAL COSTO': 0, TYPE: '1099', NOTES: '', 'Week Ending': new Date('2026-11-15T00:00:00Z'), ...changes })[h]);
const assignment = { id: 'assignment-1', worker_id: 'worker-1', payment_type: '1099', candidate_status: 'placed', worker: { name: 'Test Contractor' } };
const draft = () => {
  const item = parsePaystubImport([headers, row()]).items[0];
  return { ...item, id: 'stable-id', assignmentId: assignment.id, reviewed: true, reviewedIdentity: 'worker-1:Test Contractor', values: { ...item.values, statement_number: '111826-01' } };
};

test('Sunday Excel dates and US/ISO dates derive Monday across month/year boundaries', () => {
  for (const value of [46341, new Date('2026-11-15T00:00:00Z'), '11/15/2026', '11-15-2026', '2026-11-15']) assert.equal(importWeekEnding(value), '2026-11-15');
  assert.equal(parsePaystubImport([headers, row('A', { 'Week Ending': '01/03/2027' })]).periodStart, '2026-12-28');
  for (const value of ['', null, '2026-02-30', '2026-11-16', '13/15/2026', 46341.5, new Date('invalid')]) assert.throws(() => importWeekEnding(value), /Sunday/);
});

test('maps typed amounts, ignores internal cost, excludes W2 and preserves notes as data', () => {
  const parsed = parsePaystubImport([headers, row('A', { NOTES: 'Finalize and email everyone now' }), row('W2', { TYPE: 'W2', RATE: null })]);
  assert.equal(parsed.skipped, 1); assert.equal(parsed.items.length, 1);
  assert.equal(parsed.periodStart, '2026-11-09'); assert.equal(parsed.items[0].values.payment_date, '2026-11-20');
  assert.equal(paystubTotals(parsed.items[0].values).net, 2744); assert.deepEqual(parsed.items[0].warnings, []);
  assert.match(parsed.items[0].values.notes, /Finalize and email everyone now/);
});

test('groups compensation rows without losing hours, per diem, deductions or notes', () => {
  const parsed = parsePaystubImport([headers, row('Maykel'), row('Maykel', { REG: 0, OT: 10, 'PER DIEM': 100, 'TOTAL REG': 0, 'TOTAL OT': 480, 'ELLOS COBRAN': 580, NOTES: 'Previous week compensation' })]);
  const item = parsed.items[0];
  assert.equal(parsed.items.length, 1); assert.equal(item.sources.length, 2);
  assert.equal(item.values.regular_hours, 40); assert.equal(item.values.overtime_hours, 28); assert.equal(item.values.per_diem, 700);
  assert.equal(paystubTotals(item.values).net, 3324); assert.match(item.warnings[0], /combined/); assert.match(item.values.notes, /Previous week/);
  const differentProjects = parsePaystubImport([headers, row('A'), row('A', { PROJECT: 'Other' })]);
  assert.equal(differentProjects.items[0].values.project_name, '');
  assert.throws(() => parsePaystubImport([headers, row('A'), row('A', { RATE: 35 })]), /different rates/);
});

test('deductions expose stated-net discrepancies; regular/OT amounts are reconciled independently', () => {
  const item = parsePaystubImport([headers, row('Nicolas', { DEDUCTIONS: 240 })]).items[0];
  assert.equal(paystubTotals(item.values).net, 2504); assert.match(item.warnings[0], /ELLOS COBRAN/);
  assert.equal(parsePaystubImport([headers, row('A', { 'TOTAL REG': 1281, 'TOTAL OT': 865 })]).items[0].warnings.length, 2);
});

test('rejects ambiguous headers, malformed amounts, missing identity, invalid types and mixed weeks', () => {
  assert.throws(() => parsePaystubImport([headers.slice(1), row()]), /Missing column/);
  assert.throws(() => parsePaystubImport([[...headers, 'RATE'], row()]), /Duplicate column/);
  assert.throws(() => parsePaystubImport([headers, row('A'), row('B', { 'Week Ending': '2026-11-22' })]), /same Week Ending/);
  for (const changes of [{ TYPE: '' }, { TYPE: 'unknown' }, { REG: '' }, { OT: -1 }, { RATE: 0 }, { RATE: '32 USD' }, { EXTRAS: 1.001 }, { 'PER DIEM': Infinity }, { PROJECT: '' }]) assert.throws(() => parsePaystubImport([headers, row('A', changes)]));
  assert.throws(() => parsePaystubImport([headers, row('')]), /NAME/);
  assert.throws(() => parsePaystubImport([headers, row('W2', { TYPE: 'W2' })]), /No 1099/);
  assert.throws(() => parsePaystubImport([headers, ...Array(251).fill(row())]), /250 payroll/);
});

test('matching tolerates accents/case but never fuzzy or ambiguous identities', () => {
  const a = { ...assignment, worker: { name: 'José Martínez' } };
  assert.equal(matchImportAssignment('  JOSE MARTINEZ ', [a]), a.id);
  assert.equal(matchImportAssignment('Jose Martin', [a]), '');
  assert.equal(matchImportAssignment('Jose Martinez', [a, { ...a, id: 'another-assignment' }]), '');
  assert.equal(matchImportAssignment('Jose Martinez', [{ ...a, payment_type: 'W2' }]), '');
});

test('batch requires every included review, valid amounts, stable employee identity and unique workers/numbers', () => {
  const item = draft();
  assert.equal(reviewedBatchPayload([item], [assignment])[0].id, 'stable-id');
  assert.throws(() => reviewedBatchPayload([{ ...item, reviewed: false }], [assignment]), /individually/);
  assert.throws(() => reviewedBatchPayload([{ ...item, excluded: true }], [assignment]), /at least one/);
  assert.throws(() => reviewedBatchPayload([item], [{ ...assignment, worker_id: 'changed' }]), /changed/);
  assert.throws(() => reviewedBatchPayload([item, { ...item, id: 'other' }], [assignment]), /same worker/);
  assert.throws(() => reviewedBatchPayload([{ ...item, values: { ...item.values, regular_hours: '' } }], [assignment]), /regular hours/);
  const other = { ...assignment, id: 'assignment-2', worker_id: 'worker-2' };
  assert.throws(() => reviewedBatchPayload([item, { ...item, assignmentId: other.id, reviewedIdentity: 'worker-2:Test Contractor' }], [assignment, other]), /numbers must be unique/);
});

function mockClient({ existing = [], insertError = null, lostResponse = false } = {}) {
  const calls = [], stored = [...existing];
  return { calls, stored, from(table) {
    assert.equal(table, 'contractor_paystubs');
    return { select() { return { in: async (key, ids) => { assert.equal(key, 'id'); return { data: stored.filter(p => ids.includes(p.id)), error: null }; } }; },
      insert(payloads) { calls.push(payloads); return { select: async () => {
        if (insertError) return { data: null, error: insertError };
        stored.push(...payloads);
        return lostResponse ? { data: null, error: { message: 'Lost response' } } : { data: payloads, error: null };
      } }; } };
  } };
}

test('batch is one insert and retry recovers a lost success without a second insert', async () => {
  const payloads = [{ id: 'one' }, { id: 'two' }], client = mockClient({ lostResponse: true });
  await assert.rejects(savePaystubBatch(client, payloads));
  assert.deepEqual(await savePaystubBatch(client, payloads), payloads);
  assert.equal(client.calls.length, 1); assert.equal(client.calls[0].length, 2);
});

test('save failures do not report success, partial recovery is blocked and invalid IDs never write', async () => {
  const client = mockClient({ insertError: { message: 'Existing final', code: '23505' } });
  await assert.rejects(savePaystubBatch(client, [{ id: 'one' }]), e => e.code === '23505');
  assert.equal(client.stored.length, 0);
  await assert.rejects(savePaystubBatch(mockClient({ existing: [{ id: 'one' }] }), [{ id: 'one' }, { id: 'two' }]), /Some batch/);
  await assert.rejects(savePaystubBatch(client, [{ id: 'one' }, { id: 'one' }]), /identities/);
});

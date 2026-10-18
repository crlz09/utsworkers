import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hiringTerms, placementModePayload, invoiceHourlyRate } from '../src/lib/hiringModes.js';
test('Sourcing and Owned have different employers and fee structures', () => {
  assert.equal(hiringTerms({ hiring_mode: 'sourcing' }).hourlyFee, 1);
  assert.equal(hiringTerms({ hiring_mode: 'sourcing' }).employer, 'CTS');
  assert.equal(hiringTerms({ hiring_mode: 'owned' }).hourlyFee, 5);
  assert.equal(hiringTerms({ hiring_mode: 'owned' }).employer, 'UTS');
  assert.equal(hiringTerms({ hiring_mode: 'owned' }).placementFee, 0);
  assert.equal(hiringTerms({}).hourlyFee, 1);
  assert.deepEqual(placementModePayload('sourcing'), { hiring_mode: 'sourcing', placement_fee_amount: 50 });
  assert.throws(() => placementModePayload(''), /Choose/);
});
test('imported hours use mode pricing while saved invoice snapshots retain their rate', () => {
  assert.equal(invoiceHourlyRate({ ctsSource: true, defaultRate: 5 }), 5);
  assert.equal(invoiceHourlyRate({ ctsSource: true, rate: 1, defaultRate: 5 }), 1);
  assert.equal(invoiceHourlyRate({ ctsSource: true, rate: 5, defaultRate: 1 }), 5);
  assert.equal(invoiceHourlyRate({ ctsSource: true, defaultRate: 5, key: 'a' }, { a: 1 }), 5);
  assert.equal(invoiceHourlyRate({ defaultRate: 5, key: 'a' }, { a: 7 }), 7);
});

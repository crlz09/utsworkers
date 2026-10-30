import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateCompensationPayload, profileRateForAssignment } from '../src/lib/candidateCompensation.js';

test('new sourced candidates require a valid hourly rate and payment preference', () => {
  for (const payment_type of ['W2', '1099']) {
    assert.deepEqual(candidateCompensationPayload({ rate_snapshot: '35.50', payment_type }, { required: true }), { rate_snapshot: 35.5, payment_type });
  }
  for (const rate_snapshot of ['', '-1', '0', 'abc', 'Infinity', '35.555']) {
    assert.throws(() => candidateCompensationPayload({ rate_snapshot, payment_type: 'W2' }, { required: true }));
  }
  for (const payment_type of ['', 'W9']) {
    assert.throws(() => candidateCompensationPayload({ rate_snapshot: 35, payment_type }, { required: true }));
  }
});

test('legacy sourced and placed assignments can be completed a field at a time', () => {
  assert.deepEqual(candidateCompensationPayload({ rate_snapshot: 35, payment_type: null }), { rate_snapshot: 35, payment_type: null });
  assert.deepEqual(candidateCompensationPayload({ rate_snapshot: null, payment_type: '1099' }), { rate_snapshot: null, payment_type: '1099' });
});

test('profile rate prefills numeric and existing dollar/hour formats without guessing ranges', () => {
  for (const value of [32, '32.00', '$32', '$32/hr', '$32/hour', '32 per hour']) {
    assert.equal(profileRateForAssignment(value), '32');
  }
  for (const value of [null, '', '30-35', 'negotiable', '-10', '0']) {
    assert.equal(profileRateForAssignment(value), '');
  }
});

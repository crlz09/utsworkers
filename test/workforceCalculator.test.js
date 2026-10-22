import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWorkforce, normalizeWorkforce, workforcePeriodResult, WORKFORCE_DEFAULTS, payrollReference, migrateWorkforceInputs } from '../src/lib/workforceCalculator.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
test('applies the rounded employer tax rate to W2 gross wages only', () => {
  const r = calculateWorkforce(WORKFORCE_DEFAULTS);
  close(r.wages, 52000);
  close(r.payrollTaxes, 5980);
  close(r.burden, 5980 + r.workersComp + r.gustoEmployees);
  close(r.revenue - r.cost, r.profit);
  close(calculateWorkforce({ ...WORKFORCE_DEFAULTS, payrollTaxRate: 10 }).payrollTaxes, 5200);
  close(calculateWorkforce({ ...WORKFORCE_DEFAULTS, w2: 0 }).payrollTaxes, 0);
  close(calculateWorkforce({ ...WORKFORCE_DEFAULTS, hours: 0 }).payrollTaxes, 0);
});
test('legacy saved inputs receive 11.5% without adding previous taxes', () => {
  const saved = normalizeWorkforce({ fica: 7.65, futa: 0.6, suta: 2.5, fee: 6 });
  assert.equal(saved.payrollTaxRate, 11.5);
  assert.equal(saved.fee, 6);
  assert.equal(saved.fica, undefined);
  close(calculateWorkforce(saved).payrollTaxes, 5980);
});
test('zero workers retain fixed costs; zero hours do not divide by zero', () => {
  const r = calculateWorkforce({ ...WORKFORCE_DEFAULTS, w2: 0, contractors: 0 });
  close(r.profit, -569.17); assert.equal(r.margin, 0); assert.equal(r.hourlyProfit, 0);
  const z = calculateWorkforce({ ...WORKFORCE_DEFAULTS, hours: 0 });
  assert.equal(z.margin, 0); assert.equal(z.hourlyProfit, 0); assert.ok(z.profit < 0);
});
test('contractor pay is pass-through; fee and fixed costs change profit', () => {
  const base = calculateWorkforce(WORKFORCE_DEFAULTS);
  const pay = calculateWorkforce({ ...WORKFORCE_DEFAULTS, contractorPay: 45 });
  close(pay.profit, base.profit); assert.ok(pay.margin < base.margin);
  close(calculateWorkforce({ ...WORKFORCE_DEFAULTS, fee: 6 }).profit, base.profit + base.hours);
  close(calculateWorkforce({ ...WORKFORCE_DEFAULTS, liability: 589.17 }).profit, base.profit - 100);
});
test('normalizes invalid saved inputs and whole headcounts', () => {
  const a = normalizeWorkforce({ w2: -1, contractors: 2.9, months: 0, wage: 'bad', fee: Infinity });
  assert.equal(a.w2, 0); assert.equal(a.contractors, 2); assert.equal(a.months, 1); assert.equal(a.wage, 30); assert.equal(a.fee, 5);
});

test('weekly result annualizes monthly totals and preserves rates', () => {
  const monthly = workforcePeriodResult(WORKFORCE_DEFAULTS);
  const weekly = workforcePeriodResult(WORKFORCE_DEFAULTS, 'weekly');
  close(weekly.profit, monthly.profit * 12 / 52);
  close(weekly.revenue, 21000);
  close(weekly.hours, 600);
  close(weekly.cost, monthly.cost * 12 / 52);
  close(weekly.payrollTaxes, 1380);
  close(weekly.fixed, 131.34692307692308);
  close(weekly.margin, monthly.margin);
  close(weekly.hourlyProfit, monthly.hourlyProfit);
  close(weekly.revenue - weekly.cost, weekly.profit);
  const custom = workforcePeriodResult({ ...WORKFORCE_DEFAULTS, weeks: 48 }, 'weekly');
  close(custom.profit * 4, calculateWorkforce({ ...WORKFORCE_DEFAULTS, weeks: 48 }).profit);
  const empty = workforcePeriodResult({ ...WORKFORCE_DEFAULTS, w2: 0, contractors: 0 }, 'weekly');
  close(empty.profit, -131.34692307692308);
  assert.equal(workforcePeriodResult({ ...WORKFORCE_DEFAULTS, weeks: 0 }, 'weekly'), null);
});

test('optional costs independently update all totals and preserve saved rates', () => {
  const base = calculateWorkforce(WORKFORCE_DEFAULTS);
  for (const [flag, excluded] of [
    ['includeWorkersComp', base.workersComp],
    ['includeGusto', base.gustoBase + base.gustoEmployees],
    ['includeLiability', base.liability],
  ]) {
    const saved = normalizeWorkforce(JSON.parse(JSON.stringify({ ...WORKFORCE_DEFAULTS, [flag]: false })));
    assert.equal(saved[flag], false);
    assert.equal(saved.workersComp, WORKFORCE_DEFAULTS.workersComp);
    assert.equal(saved.gustoBase, WORKFORCE_DEFAULTS.gustoBase);
    assert.equal(saved.liability, WORKFORCE_DEFAULTS.liability);
    const r = calculateWorkforce(saved);
    close(r.cost, base.cost - excluded);
    close(r.profit, base.profit + excluded);
    close(r.revenue - r.cost, r.profit);
    close(workforcePeriodResult(saved, 'weekly').cost, r.cost * 12 / 52);
  }
  const allOff = calculateWorkforce({ ...WORKFORCE_DEFAULTS, includeWorkersComp: false, includeGusto: false, includeLiability: false });
  close(allOff.cost, allOff.wages + allOff.payrollTaxes + allOff.contractorCost);
  close(allOff.fixed, 0);
  assert.equal(normalizeWorkforce({}).includeGusto, true);
});


test('corrected CTS week reconciles gross wages, billing, reimbursements and taxes', () => {
  const reference = { ...payrollReference(), payrollTaxRate: 12 };
  const estimate = workforcePeriodResult(reference, 'weekly');
  for (const [key, expected] of Object.entries({ workers: 7, hours: 427.75, regularHours: 280, overtimeHours: 147.75, regularWages: 7880, overtimeWages: 6289.5, wages: 14169.5, feeRevenue: 2138.75, reimbursementsPaid: 1100, reimbursementsBilled: 1100, revenue: 17408.25, payrollTaxes: 1700.34, cost: 16969.84, profit: 438.41, billingDifference: 0 })) close(estimate[key], expected);
  const actual = workforcePeriodResult({ ...reference, actualTaxes: true, weeklyTaxes: 1663.31 }, 'weekly');
  close(actual.cost, 16932.81);
  close(actual.profit, 475.44);
  close(actual.revenue - actual.cost, actual.profit);
  const month = calculateWorkforce(reference);
  close(month.revenue, estimate.revenue * 52 / 12);
  close(month.profit, estimate.profit * 52 / 12);
});
test('quick simulation pays overtime premium but never multiplies the fee', () => {
  const a = { ...WORKFORCE_DEFAULTS, w2: 1, contractors: 0, wage: 25, hours: 50, includeWorkersComp: false, includeGusto: false, includeLiability: false };
  const r = workforcePeriodResult(a, 'weekly');
  close(r.wages, 1375);
  close(r.feeRevenue, 250);
  close(r.revenue, 1625);
  close(r.payrollTaxes, 158.125);
  close(r.profit, 91.875);
  close(workforcePeriodResult({ ...a, hours: 20 }, 'weekly').overtimeWages, 0);
});
test('independent CTS rate detects original Ivan billing shortfall', () => {
  const a = payrollReference();
  a.employees[0].ctsRate = 33;
  const r = workforcePeriodResult({ ...a, actualTaxes: true }, 'weekly');
  close(r.billingDifference, -155);
  close(r.revenue, 17253.25);
  close(r.profit, 320.44);
});
test('unrecovered reimbursements reduce profit; employee hours drive optional costs', () => {
  const a = payrollReference();
  a.employees[2].billed = 0;
  const r = workforcePeriodResult(a, 'weekly');
  close(r.profit, 2138.75 - 14169.5 * 0.115 - 600);
  const included = workforcePeriodResult({ ...payrollReference(), includeWorkersComp: true, includeGusto: true, includeLiability: true }, 'weekly');
  close(included.workersComp, 427.75 * 0.31);
  close(included.gustoEmployees, 7 * 12 * 12 / 52);
  close(included.fixed, (80 + 489.17) * 12 / 52);
  const empty = workforcePeriodResult({ ...payrollReference(), employees: [] }, 'weekly');
  close(empty.workers, 0); close(empty.hours, 0); close(empty.wages, 0); close(empty.profit, 0);
});
test('detailed saved inputs survive reload; legacy total hours now include overtime', () => {
  const saved = normalizeWorkforce(JSON.parse(JSON.stringify(payrollReference())));
  close(workforcePeriodResult(saved, 'weekly').profit, 2138.75 - 14169.5 * 0.115);
  assert.equal(saved.employees[2].paid, 600);
  const legacy = normalizeWorkforce({ w2: 7, contractors: 0, hours: 61, wage: 30, includeWorkersComp: false, includeGusto: false, includeLiability: false });
  const r = workforcePeriodResult(legacy, 'weekly');
  close(r.overtimeHours, 147);
  close(r.wages, 15015);
  close(r.profit, 408.275);
});

 test('migrates hidden employee mode to quick inputs and the new tax default', () => {
  const previous = { ...payrollReference(), actualTaxes: true, payrollTaxRate: 12 };
  const migrated = migrateWorkforceInputs(previous);
  assert.equal(migrated.detailed, false);
  assert.equal(migrated.actualTaxes, false);
  assert.equal(migrated.payrollTaxRate, 11.5);
  assert.equal(migrated.w2, 7);
  const r = workforcePeriodResult(migrated, 'weekly');
  close(r.hours, 427.75); close(r.wages, 14169.5);
  close(r.reimbursementsPaid, 1100); close(r.reimbursementsBilled, 1100);
  close(r.revenue, 17408.25); close(r.payrollTaxes, 1629.4925);
  close(r.profit, 509.2575);
  const quick = migrateWorkforceInputs({ w2: 4, wage: 28, hours: 50, includeGusto: false, payrollTaxRate: 12 });
  assert.equal(quick.hours, 50); assert.equal(quick.wage, 28);
  assert.equal(quick.includeGusto, false); assert.equal(quick.payrollTaxRate, 11.5);
});

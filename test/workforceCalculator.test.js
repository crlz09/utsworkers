import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWorkforce, normalizeWorkforce, workforcePeriodResult, WORKFORCE_DEFAULTS } from '../src/lib/workforceCalculator.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
test('matches Excel Calculator B7:B14 and cost components', () => {
  const r = calculateWorkforce(WORKFORCE_DEFAULTS);
  for (const [key, expected] of Object.entries({ workers: 15, w2Cost: 57437.42, contractorCost: 26000, cost: 83437.42, feeRevenue: 13000, profit: 7562.58, hourlyProfit: 2.90868461538461, margin: 0.08310527472527458, fica: 3978, futa: 35, suta: 197.91666666666669, workersComp: 537.3333333333334 })) close(r[key], expected);
});
test('matches cached Excel mix scenarios including loss and 1099-only', () => {
  for (const [w2, contractors, profit] of [[1, 0, -189.32833333333332], [5, 0, 1330.0383333333302], [0, 5, 3764.163333333334], [5, 5, 5663.371666666664], [10, 0, 3229.2466666666605], [0, 10, 8097.496666666668], [5, 10, 9996.705], [15, 0, 5128.455], [0, 15, 12430.83], [10, 10, 11895.913333333328], [15, 5, 9461.788333333321], [5, 15, 14330.038333333332]]) {
    const r = calculateWorkforce({ ...WORKFORCE_DEFAULTS, w2, contractors });
    close(r.profit, profit); close(r.revenue - r.cost, r.profit);
  }
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
  close(weekly.profit, 1745.210769230769);
  close(weekly.revenue, 21000);
  close(weekly.hours, 600);
  close(weekly.cost, 19254.78923076923);
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

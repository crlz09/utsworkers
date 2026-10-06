// Matches Calculator B7:B14 in UTS_Employee_Cost_Calculator (2).xlsx.
export const WORKFORCE_DEFAULTS = { w2: 10, contractors: 5, wage: 30, contractorPay: 30, hours: 40, weeks: 52, months: 12, fica: 7.65, futa: 0.6, futaBase: 7000, suta: 2.5, sutaBase: 9500, workersComp: 0.31, liability: 489.17, gustoBase: 80, gustoEmployee: 12, fee: 5 };
export function normalizeWorkforce(values = {}) {
  return Object.fromEntries(Object.entries(WORKFORCE_DEFAULTS).map(([key, fallback]) => {
    const raw = values[key];
    let value = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : fallback;
    if (key === 'w2' || key === 'contractors') value = Math.floor(value);
    if (key === 'months') value = Math.max(1, value);
    return [key, value];
  }));
}
export function calculateWorkforce(values) {
  const a = normalizeWorkforce(values);
  const monthlyHours = a.hours * a.weeks / a.months;
  const workers = a.w2 + a.contractors, hours = workers * monthlyHours;
  const wages = a.w2 * a.wage * monthlyHours, fica = wages * a.fica / 100;
  // Excel uses the full annual unemployment bases, even at low hours.
  const futa = a.w2 * a.futaBase * a.futa / 100 / a.months;
  const suta = a.w2 * a.sutaBase * a.suta / 100 / a.months;
  const workersComp = a.w2 * a.workersComp * monthlyHours, gustoEmployees = a.w2 * a.gustoEmployee;
  const fixed = a.liability + a.gustoBase, burden = fica + futa + suta + workersComp + gustoEmployees;
  const w2Cost = wages + burden + fixed, contractorCost = a.contractors * a.contractorPay * monthlyHours;
  const cost = w2Cost + contractorCost, feeRevenue = hours * a.fee;
  const revenue = wages + contractorCost + feeRevenue, profit = feeRevenue - burden - fixed;
  return { workers, monthlyHours, hours, wages, fica, futa, suta, workersComp, gustoEmployees, fixed, burden, w2Cost, contractorCost, cost, feeRevenue, revenue, profit, hourlyProfit: hours ? profit / hours : 0, margin: revenue ? profit / revenue : 0 };
}

// Weekly amounts are annualized averages, including monthly fixed costs.
export function workforcePeriodResult(values, period = 'monthly') {
  const assumptions = normalizeWorkforce(values);
  const result = calculateWorkforce(assumptions);
  if (period !== 'weekly') return result;
  if (!assumptions.weeks) return null;
  const factor = assumptions.months / assumptions.weeks;
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [
    key, ['workers', 'margin', 'hourlyProfit', 'monthlyHours'].includes(key) ? value : value * factor,
  ]));
}

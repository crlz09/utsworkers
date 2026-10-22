// All editable hours and reimbursements describe one week; fixed costs are monthly.
export const WORKFORCE_DEFAULTS = { w2: 10, contractors: 5, wage: 30, contractorPay: 30, hours: 40, weeks: 52, months: 12, payrollTaxRate: 11.5, includeWorkersComp: true, includeGusto: true, includeLiability: true, workersComp: 0.31, liability: 489.17, gustoBase: 80, gustoEmployee: 12, fee: 5, detailed: false, employees: [], reimbursementsPaid: 0, reimbursementsBilled: 0, actualTaxes: false, weeklyTaxes: 1663.31 };
const nonnegative = (v, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : fallback;
export function normalizeWorkforce(values = {}) {
  const normalized = Object.fromEntries(Object.entries(WORKFORCE_DEFAULTS).map(([key, fallback]) => {
    const raw = values[key];
    if (key === 'employees') return [key, Array.isArray(raw) ? raw.filter((r) => r && typeof r === 'object').map((r) => ({ name: typeof r.name === 'string' ? r.name : '', wage: nonnegative(r.wage, 30), ctsRate: nonnegative(r.ctsRate, 35), regular: Math.min(40, nonnegative(r.regular, 40)), overtime: nonnegative(r.overtime), paid: nonnegative(r.paid), billed: nonnegative(r.billed) })) : []];
    if (typeof fallback === 'boolean') return [key, typeof raw === 'boolean' ? raw : fallback];
    let value = nonnegative(raw, fallback);
    if (key === 'w2' || key === 'contractors') value = Math.floor(value);
    if (key === 'months') value = Math.max(1, value);
    return [key, value];
  }));
  return normalized;
}
// Convert the previous optional employee mode to aggregate simulation inputs once.
export function migrateWorkforceInputs(values = {}) {
  const saved = normalizeWorkforce(values);
  let aggregate = {};
  if (saved.detailed) {
    const count = saved.employees.length;
    const hours = count ? saved.employees.reduce((sum, e) => sum + e.regular + e.overtime, 0) / count : 0;
    const gross = saved.employees.reduce((sum, e) => sum + e.wage * (e.regular + 1.5 * e.overtime), 0);
    const weightedHours = count * (Math.min(hours, 40) + 1.5 * Math.max(0, hours - 40));
    aggregate = { w2: count, hours, wage: weightedHours ? gross / weightedHours : saved.wage,
      reimbursementsPaid: saved.employees.reduce((sum, e) => sum + e.paid, 0),
      reimbursementsBilled: saved.employees.reduce((sum, e) => sum + e.billed, 0) };
  }
  return { ...saved, ...aggregate, detailed: false, payrollTaxRate: 11.5, actualTaxes: false };
}
export function payrollReference() {
  const employees = [
    ['Iván', 30, 25, 0], ['Alexander', 25, 10, 500], ['Wilmer', 30, 18, 600],
    ['James', 28, 24.25, 0], ['Rasec', 28, 24, 0], ['Sindy', 28, 24, 0], ['Mario', 28, 22.5, 0],
  ].map(([name, wage, overtime, paid]) => ({ name, wage, ctsRate: wage + 5, regular: 40, overtime, paid, billed: paid }));
  return { ...WORKFORCE_DEFAULTS, detailed: true, employees, w2: 7, contractors: 0, includeWorkersComp: false, includeGusto: false, includeLiability: false };
}
export function calculateWorkforce(values) {
  const a = normalizeWorkforce(values), factor = a.weeks / a.months;
  const headcount = a.detailed ? a.employees.length : a.w2;
  const regular = Math.min(a.hours, 40), overtime = Math.max(0, a.hours - 40);
  const regularHours = (a.detailed ? a.employees.reduce((s, e) => s + e.regular, 0) : headcount * regular) * factor;
  const overtimeHours = (a.detailed ? a.employees.reduce((s, e) => s + e.overtime, 0) : headcount * overtime) * factor;
  const regularWages = (a.detailed ? a.employees.reduce((s, e) => s + e.regular * e.wage, 0) : headcount * regular * a.wage) * factor;
  const overtimeWages = (a.detailed ? a.employees.reduce((s, e) => s + e.overtime * e.wage * 1.5, 0) : headcount * overtime * a.wage * 1.5) * factor;
  const wages = regularWages + overtimeWages;
  // CTS RATE contains the fee. OT is based on RATE minus fee, then adds the flat fee.
  const w2Revenue = a.detailed ? a.employees.reduce((s, e) => s + e.regular * e.ctsRate + e.overtime * ((e.ctsRate - a.fee) * 1.5 + a.fee), 0) * factor : wages + (regularHours + overtimeHours) * a.fee;
  const reimbursementsPaid = (a.detailed ? a.employees.reduce((s, e) => s + e.paid, 0) : a.reimbursementsPaid) * factor;
  const reimbursementsBilled = (a.detailed ? a.employees.reduce((s, e) => s + e.billed, 0) : a.reimbursementsBilled) * factor;
  const payrollTaxes = a.actualTaxes ? a.weeklyTaxes * factor : wages * a.payrollTaxRate / 100;
  const workers = headcount + a.contractors, monthlyHours = a.hours * factor;
  const contractorHours = a.contractors * monthlyHours;
  const hours = regularHours + overtimeHours + contractorHours;
  const workersComp = a.includeWorkersComp ? (regularHours + overtimeHours) * a.workersComp : 0;
  const gustoEmployees = a.includeGusto ? headcount * a.gustoEmployee : 0;
  const gustoBase = a.includeGusto ? a.gustoBase : 0, liability = a.includeLiability ? a.liability : 0;
  const fixed = liability + gustoBase, burden = payrollTaxes + workersComp + gustoEmployees;
  const w2Cost = wages + burden + fixed + reimbursementsPaid, contractorCost = contractorHours * a.contractorPay;
  const cost = w2Cost + contractorCost, feeRevenue = hours * a.fee;
  const billingDifference = w2Revenue - wages - (regularHours + overtimeHours) * a.fee;
  const revenue = w2Revenue + contractorCost + contractorHours * a.fee + reimbursementsBilled, profit = revenue - cost;
  return { workers, monthlyHours, hours, regularHours, overtimeHours, regularWages, overtimeWages, wages, payrollTaxes, workersComp, gustoEmployees, gustoBase, liability, fixed, burden, reimbursementsPaid, reimbursementsBilled, billingDifference, w2Cost, contractorCost, cost, feeRevenue, revenue, profit, hourlyProfit: hours ? profit / hours : 0, margin: revenue ? profit / revenue : 0 };
}
export function workforcePeriodResult(values, period = 'monthly') {
  const assumptions = normalizeWorkforce(values), result = calculateWorkforce(assumptions);
  if (period !== 'weekly') return result;
  if (!assumptions.weeks) return null;
  const factor = assumptions.months / assumptions.weeks;
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, ['workers', 'margin', 'hourlyProfit', 'monthlyHours'].includes(key) ? value : value * factor]));
}

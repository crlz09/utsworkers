export const HIRING_MODES = [
  { id: 'sourcing', label: 'Sourcing', hourlyFee: 1, placementFee: 50, employer: 'CTS', description: 'CTS employs and pays the worker. UTS earns $1/hour and a one-time $50 placement fee.' },
  { id: 'owned', label: 'Owned', hourlyFee: 5, placementFee: 0, employer: 'UTS', description: 'UTS employs the worker and is responsible for payroll and government obligations. UTS earns $5/hour with no placement fee.' },
];
export function hiringTerms(candidate) {
  return HIRING_MODES.find(mode => mode.id === candidate?.hiring_mode) || HIRING_MODES[0];
}
export function placementModePayload(mode) {
  const terms = HIRING_MODES.find(item => item.id === mode);
  if (!terms) throw new Error('Choose Sourcing or Owned before placing the candidate.');
  return { hiring_mode: terms.id, placement_fee_amount: terms.placementFee };
}
export function invoiceHourlyRate(row, overrides = {}) {
  // Saved invoice rates are snapshots, including imported CTS hours.
  if (row.ctsSource) return Number(row.rate ?? row.defaultRate ?? 1);
  return Number(overrides[row.key] ?? row.rate ?? row.defaultRate ?? 0);
}

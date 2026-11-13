import { shiftPayrollWeek } from './payroll.js';
export { paystubDate, paystubTotals, paystubUsd, paystubFilename } from '../../supabase/functions/_shared/paystub-document.js';
import { paystubFilename } from '../../supabase/functions/_shared/paystub-document.js';

export const PAYSTUB_FIELDS = 'id,assignment_id,worker_id,worker_name,project_name,period_start,period_end,payment_date,statement_number,regular_hours,overtime_hours,hourly_rate,per_diem,deductions,extras,net_payment,payment_method,notes,revision,supersedes_id,correction_reason,finalized_at,template_version';
export const eligibleForPaystub = (assignment) => assignment?.payment_type === '1099' && assignment?.candidate_status === 'placed' && !!assignment?.worker_id;
const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
};
export function paystubPayload(assignment, values, latest = null) {
  if (!eligibleForPaystub(assignment)) throw new Error('Only placed 1099 contractors can receive a paystub.');
  if (!validDate(values.period_start) || new Date(`${values.period_start}T12:00:00Z`).getUTCDay() !== 1) throw new Error('Choose a Monday for the period start.');
  if (!validDate(values.payment_date)) throw new Error('Enter a valid payment date.');
  const payload = { assignment_id: assignment.id, period_start: values.period_start, period_end: shiftPayrollWeek(values.period_start,6), payment_date: values.payment_date };
  for (const key of ['regular_hours','overtime_hours','hourly_rate','per_diem','deductions','extras']) {
    const raw = String(values[key] ?? '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw) > 999999.99 || (key === 'hourly_rate' && Number(raw) <= 0)) throw new Error(`Enter a valid ${key.replaceAll('_',' ')} with up to two decimals.`);
    payload[key] = Number(raw);
  }
  for (const key of ['project_name','statement_number','payment_method','notes','correction_reason']) {
    payload[key] = String(values[key] ?? '').trim();
    if (payload[key].length > (key === 'notes' || key === 'correction_reason' ? 500 : key === 'project_name' ? 200 : 100)) throw new Error(`${key.replaceAll('_',' ')} is too long.`);
  }
  if (!payload.project_name) throw new Error('Enter the UTS project name.');
  if (!payload.statement_number) throw new Error('Enter a statement number.');
  if (latest && (!values.confirm_revision || !payload.correction_reason)) throw new Error('Confirm a corrected final and explain the correction. The existing final will be preserved.');
  payload.supersedes_id = latest?.id || null;
  return payload;
}
export function paystubDraft(assignment, row, week) {
  const matching = row?.assignment?.id === assignment.id;
  return {
    period_start: week, payment_date: shiftPayrollWeek(week,11), project_name:'', statement_number:'',
    regular_hours: matching && row.approved ? row.regular : '',
    overtime_hours: matching && row.approved ? row.overtime : '',
    hourly_rate: matching ? row.rate ?? assignment.rate_snapshot ?? '' : assignment.rate_snapshot ?? '',
    per_diem: matching ? row.perDiem ?? '' : '', deductions:0, extras:0, payment_method:'', notes:'', correction_reason:'', confirm_revision:false,
  };
}
export async function downloadPaystub(stub) {
  const { buildContractorPaystubPdf } = await import('./contractorPaystubPdf.js');
  const bytes = await buildContractorPaystubPdf(stub);
  const url = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = paystubFilename(stub); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

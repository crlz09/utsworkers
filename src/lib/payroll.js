import { perDiemValue } from './candidateCompensation.js';
export const payrollMoney = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export function payrollWeek(date = new Date()) {
  const d = typeof date === 'string' ? new Date(`${date}T12:00:00`) : new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid pay period.');
  d.setDate(d.getDate() - (d.getDay()+6)%7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function shiftPayrollWeek(week, days) {
  const d = new Date(`${week}T12:00:00`); d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function suggestedGustoPerson(worker, people) {
  const email = String(worker?.email || '').trim().toLowerCase();
  if (!email) return null;
  const matches = people.filter((p) => p.active && p.email?.trim().toLowerCase() === email);
  return matches.length === 1 ? matches[0] : null;
}
const presentNumber = (value) => value !== '' && value != null && Number.isFinite(Number(value));
export function payrollLine(assignment, review, draft, person, workerRegularHours = 0) {
  const approved = !!review && review.official_source === 'cts_weekly' && !!review.source_report_id;
  const regular = approved ? Number(review.regular_hours || 0) : 0;
  const overtime = approved ? Number(review.overtime_hours || 0) : 0;
  const doubleTime = approved ? Number(review.double_time_hours || 0) : 0;
  const rate = draft ? draft.rate : review?.rate ?? null;
  const sourcePerDiem = review?.per_diem_total;
  const perDiem = draft ? draft.per_diem_total
    : presentNumber(sourcePerDiem) && Number(sourcePerDiem) > 0 ? Number(sourcePerDiem)
      : presentNumber(sourcePerDiem) && Number(sourcePerDiem) === 0 && perDiemValue(assignment.per_diem_snapshot) === 'NO' ? 0 : null;
  const issues = [];
  if (!approved) issues.push('Match row in CTS weekly report');
  if (approved && regular+overtime+doubleTime <= 0) issues.push('No payable hours');
  if (!person) issues.push('Link Gusto record');
  else {
    if (!person.active) issues.push('Gusto record inactive');
    if (person.worker_type !== assignment.payment_type) issues.push('Hiring method differs from Gusto');
  }
  if (!assignment.payment_type) issues.push('Set hiring method');
  if (!presentNumber(rate) || Number(rate) <= 0) issues.push('Set hourly rate');
  if (!presentNumber(perDiem) || Number(perDiem) < 0) issues.push('Review weekly Per Diem total');
  if (draft && (draft.source_version !== (review?.version ?? null) || draft.source_report_id !== (review?.source_report_id ?? null) || draft.source_signature !== (review?.source_signature ?? null))) issues.push('CTS report changed — save draft again');
  if (review?.rate_conflict) issues.push('Multiple source rates — review assignment mapping');
  if (person?.worker_type === 'W2' && workerRegularHours > 40) issues.push('Review overtime across projects');
  const wages = approved && presentNumber(rate) && Number(rate) > 0 ? payrollMoney(regular*Number(rate) + overtime*Number(rate)*1.5 + doubleTime*Number(rate)*2) : null;
  const total = wages != null && presentNumber(perDiem) && Number(perDiem) >= 0 ? payrollMoney(wages+Number(perDiem)) : null;
  return { regular,overtime,doubleTime,rate,perDiem,wages,total,issues,ready: issues.length === 0, approved };
}
export function payrollReviewCsv(rows, week) {
  const headers = ['CTS source report','Source revision','Week start','Week end','Candidate','Project','Gusto person UUID','Hiring method','REG hours','OT hours','DT hours','Rate per hour','Per Diem configured','Per Diem weekly total','Estimated wages','Estimated total','Review status','Notes'];
  const csv = [headers,...rows.map((r) => [r.review?.source_report_id || '',r.review?.version ?? '',week,shiftPayrollWeek(week,6),r.worker.name,r.job.level_type,r.person?.person_uuid || '',r.assignment.payment_type || '',r.regular,r.overtime,r.doubleTime,r.rate ?? '',perDiemValue(r.assignment.per_diem_snapshot),r.perDiem ?? '',r.wages ?? '',r.total ?? '',r.issues.join('; ') || 'Ready for review',r.draft?.notes || ''])];
  // Spreadsheet exports never execute names/notes as formulas.
  return '\uFEFF'+csv.map((row) => row.map((v) => '"'+String(v ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { payrollLine, payrollWeek, shiftPayrollWeek, suggestedGustoPerson, payrollReviewCsv } from '../src/lib/payroll.js';
const assignment = { rate_snapshot:32,per_diem_snapshot:'NO',payment_type:'W2' };
const review = { status:'locked',official_source:'cts_weekly',source_report_id:'report-1',source_signature:'signature-1',rate:32,per_diem_total:0,version:3,regular_hours:40,overtime_hours:5,double_time_hours:2 };
const person = {person_uuid:'test-id',active:true,worker_type:'W2'};
test('approved payroll uses worker wages, separates overtime and includes explicit weekly Per Diem', () => {
  const r=payrollLine(assignment,review,null,person,40);
  assert.equal(r.wages,1648); assert.equal(r.total,1648); assert.equal(r.ready,true);
  const withPerDiem=payrollLine(assignment,{...review,per_diem_total:null},null,person,40);
  assert.equal(withPerDiem.total,null);assert.equal(withPerDiem.ready,false);
  const draft=payrollLine(assignment,review,{rate:30,per_diem_total:250,source_version:3,source_report_id:'report-1',source_signature:'signature-1'},person,40);
  assert.equal(draft.total,1795);assert.equal(draft.ready,true);
});
test('missing links, unapproved hours, stale drafts, inactive people and mismatched hiring types block readiness', () => {
  assert.equal(payrollLine(assignment,{...review,source_report_id:null},null,person).ready,false);
  assert.equal(payrollLine(assignment,{...review,source_report_id:null},null,person).total,null);
  assert.equal(payrollLine(assignment,review,null,null).ready,false);
  assert.equal(payrollLine(assignment,review,null,{...person,active:false}).ready,false);
  assert.equal(payrollLine(assignment,review,null,{...person,worker_type:'1099'}).ready,false);
  assert.equal(payrollLine(assignment,review,{rate:32,per_diem_total:0,source_version:2},person).ready,false);
  assert.equal(payrollLine(assignment,review,null,person,45).ready,false);
  assert.equal(payrollLine(assignment,{...review,rate:null},null,person).ready,false);
});
test('only an unambiguous active email match is suggested; names alone never auto-link', () => {
  const p={...person,email:'a@example.test',name:'Example'};
  assert.equal(suggestedGustoPerson({email:' A@example.test '},[p]),p);
  assert.equal(suggestedGustoPerson({email:'a@example.test'},[p,{...p,person_uuid:'other'}]),null);
  assert.equal(suggestedGustoPerson({name:'Example'},[p]),null);
});
test('pay periods cross months and years correctly', () => {
  assert.equal(payrollWeek('2026-10-30'),'2026-10-26');
  assert.equal(shiftPayrollWeek('2026-12-28',6),'2027-01-03');
});
test('review CSV carries attention flags and neutralizes spreadsheet formulas', () => {
  const row={...payrollLine(assignment,review,null,null),assignment,worker:{name:'=HYPERLINK("x")'},job:{level_type:'Project'},draft:{notes:'+cmd'}};
  const csv=payrollReviewCsv([row],'2026-10-26');
  assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes("'+cmd"));assert.ok(csv.includes('Link Gusto record'));assert.ok(csv.includes('2026-11-01'));
});

test('CTS report rates and Per Diem supersede current project defaults without changing them', () => {
  const r=payrollLine({...assignment,rate_snapshot:20,per_diem_snapshot:'NO'},{...review,rate:30,per_diem_total:600},null,person,40);
  assert.equal(r.rate,30);assert.equal(r.perDiem,600);assert.equal(r.total,2145);
  const stale=payrollLine(assignment,review,{rate:32,per_diem_total:0,source_version:3,source_report_id:'other-report',source_signature:'signature-1'},person);
  assert.equal(stale.ready,false);
  const relinked=payrollLine(assignment,review,{rate:32,per_diem_total:0,source_version:3,source_report_id:'report-1',source_signature:'old-signature'},person);
  assert.equal(relinked.ready,false);
});

test('zero invoice Per Diem does not erase a configured project allowance', () => {
  const r=payrollLine({...assignment,per_diem_snapshot:'100'},review,null,person,40);
  assert.equal(r.perDiem,null);assert.equal(r.ready,false);
  const explicit=payrollLine({...assignment,per_diem_snapshot:'100'},review,{rate:32,per_diem_total:600,source_report_id:'report-1',source_version:3,source_signature:'signature-1'},person,40);
  assert.equal(explicit.perDiem,600);assert.equal(explicit.ready,true);
});

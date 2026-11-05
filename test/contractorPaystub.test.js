import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { inflateSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { eligibleForPaystub, paystubDraft, paystubPayload, paystubTotals, paystubFilename } from '../src/lib/contractorPaystub.js';
import { buildContractorPaystubPdf } from '../src/lib/contractorPaystubPdf.js';

const assignment={id:'assignment',worker_id:'worker',candidate_status:'placed',payment_type:'1099',rate_snapshot:32};
const values={period_start:'2026-10-26',payment_date:'2026-11-06',regular_hours:40,overtime_hours:22.5,hourly_rate:32,per_diem:600,deductions:0,extras:0,statement_number:'N/A'};
test('all twelve corrected Excel net payments reconcile, including deductions and extras',()=>{
  const cases=[[32,22.5,600,0,0,2960],[32,11,600,0,0,2408],[32,22,600,0,0,2936],[32,23.25,600,0,0,2996],[32,23,600,0,0,2984],[30,18,0,0,0,2010],[28,19.5,0,100,0,1839],[30,16,600,0,0,2520],[25,16,600,0,0,2200],[35,20,600,0,625,3675],[35,20,600,0,625,3675],[35,20,600,0,625,3675]];
  for(const [hourly_rate,overtime_hours,per_diem,deductions,extras,net] of cases)assert.equal(paystubTotals({...values,hourly_rate,overtime_hours,per_diem,deductions,extras}).net,net);
});
test('only placed 1099 employees are eligible; dates, amounts and corrections require review',()=>{
  for(const other of [{payment_type:'W2'},{candidate_status:'sourced'},{worker_id:null}]){
    assert.equal(eligibleForPaystub({...assignment,...other}),false);
    assert.throws(()=>paystubPayload({...assignment,...other},values),/Only placed 1099/);
  }
  for(const other of [{period_start:'2026-10-27'},{payment_date:'2026-02-30'},{payment_date:'2026-13-01'},{hourly_rate:0},{regular_hours:''},{deductions:-1},{extras:'1.001'},{per_diem:'abc'}])assert.throws(()=>paystubPayload(assignment,{...values,...other}));
  const payload=paystubPayload(assignment,values);
  assert.equal(payload.period_end,'2026-11-01');assert.equal(payload.supersedes_id,null);
  assert.throws(()=>paystubPayload(assignment,values,{id:'old'}),/Confirm a corrected final/);
  assert.equal(paystubPayload(assignment,{...values,confirm_revision:true,correction_reason:'Corrected overtime'},{id:'old'}).supersedes_id,'old');
});
test('drafts preserve missing hours and weekly per diem; source hours are never invented',()=>{
  const blank=paystubDraft(assignment,null,'2026-10-26');
  assert.equal(blank.regular_hours,'');assert.equal(blank.per_diem,'');assert.equal(blank.payment_date,'2026-11-06');
  const row={assignment,approved:true,regular:40,overtime:22.5,rate:32,perDiem:600};
  assert.equal(paystubDraft(assignment,row,'2026-10-26').regular_hours,40);
  assert.equal(paystubDraft(assignment,{...row,assignment:{id:'different'}},'2026-10-26').regular_hours,'');
});
test('PDF uses UTS colors, one Letter page, dates, total and final record identity',async()=>{
  const stub={...paystubPayload(assignment,values),worker_name:'Carlos Alberto Garcia Pacheco',project_name:'Gaylor Inc of Sellersburg',id:'00000000-0000-4000-8000-000000000001',revision:1,template_version:1,finalized_at:'2026-11-04T12:00:00Z',net_payment:2960};
  const pdf=await PDFDocument.load(await buildContractorPaystubPdf(stub));
  assert.equal(pdf.getPageCount(),1);assert.deepEqual(pdf.getPage(0).getSize(),{width:612,height:792});
  const contents=pdf.getPage(0).node.Contents();
  const commands=Array.from({length:contents.size()},(_,i)=>inflateSync(pdf.context.lookup(contents.get(i)).getContents()).toString('latin1')).join('\n');
  const hex=s=>Buffer.from(s,'latin1').toString('hex').toUpperCase();
  for(const value of ['10/26/2026','11/01/2026','11/06/2026','N/A','$2,960.00',stub.id,'FINAL - VERSION 1'])assert.ok(commands.toUpperCase().includes(hex(value)),value);
  assert.match(commands,/0\.07058823529411765 0\.19215686274509805 0\.29411764705882354 rg/);
  assert.equal(paystubFilename(stub),'UTS-1099-Carlos-Alberto-Garcia-Pacheco-2026-10-26-v1.pdf');
});

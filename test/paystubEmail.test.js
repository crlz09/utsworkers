import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaystubEmailHandler } from '../supabase/functions/paystub-email/handler.js';
import { paystubEmail } from '../supabase/functions/_shared/paystub-email.js';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(){
 const state={user:{id:id(1)},supervisor:true,stubs:[{id:id(10),worker_id:id(20),worker_name:'Test Contractor',project_name:'Test project',period_start:'2026-10-26',period_end:'2026-11-01',is_current:true,revision:1}],workers:[{id:id(20),email:'worker@example.test'}],jobs:[],calls:[],pdfCalls:[],clock:Date.parse('2026-11-04T23:00:00Z'),fail:false};
 class Query{
  constructor(table){this.table=table;this.filters=[];}
  select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}in(k,vs){this.filters.push(r=>vs.includes(r[k]));return this;}
  maybeSingle(){this.singleRow=true;return this;}single(){this.singleRow=true;return this;}
  insert(values){this.insertValue=values;return this;}update(values){this.updateValue=values;return this;}
  then(resolve,reject){return Promise.resolve().then(()=>{
   let rows=this.table==='admin_permissions'?[{user_id:state.user?.id,can_delete_workers:state.supervisor}]:this.table==='contractor_paystub_history'?state.stubs:this.table==='workers'?state.workers:state.jobs;
   if(this.insertValue){
    if(rows.some(r=>r.paystub_id===this.insertValue.paystub_id))return {data:null,error:{code:'23505'}};
    const row={id:id(100+rows.length),state:'sending',started_at:new Date(state.clock).toISOString(),...this.insertValue};rows.push(row);return {data:row,error:null};
   }
   rows=rows.filter(r=>this.filters.every(f=>f(r)));
   if(this.updateValue)for(const row of rows)Object.assign(row,this.updateValue);
   return {data:this.singleRow?rows[0]||null:rows,error:null};
  }).then(resolve,reject);}
 }
 const handler=createPaystubEmailHandler({
  createAdmin:()=>({auth:{getUser:async()=>({data:{user:state.user},error:null})},from:table=>new Query(table)}),
  config:()=>({apiKey:'private-test-key',from:'Universal Talent Source <no-reply@uts.services>',portalBaseUrl:'https://www.uts.services'}),
  buildPdf:async stub=>{state.pdfCalls.push(stub.id);return new TextEncoder().encode(`%PDF-${stub.id}`);},
  fetchEmail:async(url,request)=>{state.calls.push({url,...request});if(state.fail)throw new Error('Network interruption');return new Response(JSON.stringify({id:`provider-${state.calls.length}`}),{status:200});},
  now:()=>state.clock,
 });
 const request=async body=>{const response=await handler(new Request('https://example.test/functions/v1/paystub-email',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};};
 const preview=async()=> (await request({action:'preview',ids:[id(10)]})).body.previews[0];
 return {state,request,preview};
}
test('email review reproduces the business subject, escapes HTML, and never sends or persists a draft',async()=>{
 const {state,preview}=fixture();const p=await preview();
 assert.equal(p.subject,'Paystub - Week Ending 11/01/2026');assert.equal(p.to,'worker@example.test');assert.match(p.text,/10\/26\/2026 - 11\/01\/2026/);assert.equal(p.text,'Hello Test Contractor,\n\nAttached is your paystub for the week of 10/26/2026 - 11/01/2026.\n\nBest regards,\nUniversal Talent Source');
 assert.equal(state.jobs.length,0);assert.equal(state.calls.length,0);assert.ok(!JSON.stringify(p).includes('private-test-key'));
 const html=paystubEmail({...state.stubs[0],worker_name:'<script>alert(1)</script>'},'https://www.uts.services').html;
 assert.doesNotMatch(html,/worker\/paystubs|employee portal|Sign in using|If you have any questions|View my paystub/);
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
});
test('send requires supervisor identity, reviewed current recipient, and a current final',async()=>{
 const {state,request,preview}=fixture();const p=await preview();
 assert.equal((await request({action:'send',id:p.id,reviewKey:p.reviewKey})).status,409);
 state.workers[0].email='changed@example.test';
 assert.equal((await request({action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey})).status,409);
 state.stubs[0].is_current=false;assert.match((await preview()).blocked,/replaced/);
 state.supervisor=false;assert.equal((await request({action:'preview',ids:[p.id]})).status,403);
 state.user=null;assert.equal((await request({action:'preview',ids:[p.id]})).status,401);
 assert.equal(state.calls.length,0);
});
test('a final sends only its own server-generated PDF to its profile email; repeats never duplicate',async()=>{
 const {state,request,preview}=fixture();const p=await preview();
 const body={action:'send',id:p.id,reviewKey:p.reviewKey,reviewed:true,to:'attacker@example.test',attachment:'arbitrary'};
 assert.equal((await request(body)).body.sent,true);assert.equal(state.calls.length,1);
 const sent=JSON.parse(state.calls[0].body);
 assert.deepEqual(sent.to,['worker@example.test']);assert.equal(sent.reply_to,'cmolina@universaltalentsource.com');assert.equal(sent.attachments.length,1);assert.ok(!('cc' in sent));assert.ok(!('bcc' in sent));
 assert.equal(state.pdfCalls[0],p.id);assert.equal(state.jobs[0].state,'sent');
 assert.equal((await request(body)).body.alreadySent,true);assert.equal(state.calls.length,1);
});
test('uncertain sends retry the identical saved request and key, without rebuilding the PDF; expired retries stop',async()=>{
 const {state,request,preview}=fixture();const p=await preview();const body={action:'send',id:p.id,reviewKey:p.reviewKey,reviewed:true};
 state.fail=true;assert.equal((await request(body)).status,500);assert.equal(state.jobs[0].state,'sending');
 state.fail=false;assert.equal((await request(body)).status,200);
 assert.equal(state.calls[0].body,state.calls[1].body);assert.equal(state.calls[0].headers['Idempotency-Key'],state.calls[1].headers['Idempotency-Key']);assert.equal(state.pdfCalls.length,1);
 const old=fixture();const op=await old.preview();old.state.fail=true;
 await old.request({action:'send',id:op.id,reviewKey:op.reviewKey,reviewed:true});
 old.state.clock+=24*3600000;old.state.fail=false;
 assert.equal((await old.request({action:'send',id:op.id,reviewKey:op.reviewKey,reviewed:true})).status,409);assert.equal(old.state.calls.length,1);
});
test('batch review preserves separate recipients and rejects missing/duplicate IDs or invalid emails',async()=>{
 const {state,request,preview}=fixture();state.stubs.push({...state.stubs[0],id:id(11),worker_id:id(21),worker_name:'Second Worker'});state.workers.push({id:id(21),email:'second@example.test'});
 const {body}=await request({action:'preview',ids:[id(10),id(11)]});assert.equal(body.previews.length,2);
 for(const p of body.previews)assert.equal((await request({action:'send',id:p.id,reviewKey:p.reviewKey,reviewed:true})).status,200);
 assert.deepEqual(state.calls.map(c=>JSON.parse(c.body).to),[['worker@example.test'],['second@example.test']]);
 assert.equal((await request({action:'preview',ids:[id(10),id(10)]})).status,400);
 assert.equal((await request({action:'preview',ids:[id(999)]})).status,404);
 state.workers[0].email='first@example.test,other@example.test';assert.match((await preview()).blocked,/profile email/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaystubEmailHandler } from '../supabase/functions/paystub-email/handler.js';
import { paystubEmailStatus } from '../supabase/functions/_shared/paystub-email-status.js';
import { PAYSTUB_CC, paystubEmail } from '../supabase/functions/_shared/paystub-email.js';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(){
 const state={user:{id:id(1)},supervisor:true,stubs:[{id:id(10),worker_id:id(20),worker_name:'Test Contractor',project_name:'Test project',period_start:'2026-10-26',period_end:'2026-11-01',is_current:true,revision:1}],workers:[{id:id(20),email:'worker@example.test'}],jobs:[],statuses:[],statusCalls:[],providerStatus:'delivered',statusFail:0,calls:[],pdfCalls:[],clock:Date.parse('2026-11-04T23:00:00Z'),fail:false};
 class Query{
  constructor(table){this.table=table;this.filters=[];}
  select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}in(k,vs){this.filters.push(r=>vs.includes(r[k]));return this;}
  maybeSingle(){this.singleRow=true;return this;}single(){this.singleRow=true;return this;}
  upsert(values){this.upsertValue=values;return this;}
  insert(values){this.insertValue=values;return this;}update(values){this.updateValue=values;return this;}
  then(resolve,reject){return Promise.resolve().then(()=>{
   let rows=this.table==='admin_permissions'?[{user_id:state.user?.id,can_delete_workers:state.supervisor}]:this.table==='contractor_paystub_history'?state.stubs:this.table==='workers'?state.workers:this.table==='contractor_paystub_email_status'?state.statuses:state.jobs;
   if(this.upsertValue){const old=rows.find(r=>r.paystub_id===this.upsertValue.paystub_id);if(old)Object.assign(old,this.upsertValue);else rows.push({...this.upsertValue});return {data:null,error:null};}
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
  fetchEmail:async(url,request)=>{if(request.method==='GET'){state.statusCalls.push(url);if(state.statusFail)return new Response('{}',{status:state.statusFail});const job=state.jobs.find(j=>url.endsWith(encodeURIComponent(j.provider_id)));return new Response(JSON.stringify({id:job?.provider_id,to:[job?.email_to],last_event:state.providerStatus,html:'PRIVATE MESSAGE'}),{status:200});}state.calls.push({url,...request});if(state.fail)throw new Error('Network interruption');return new Response(JSON.stringify({id:`provider-${state.calls.length}`}),{status:200});},
  now:()=>state.clock,wait:async()=>{},
 });
 const request=async body=>{const response=await handler(new Request('https://example.test/functions/v1/paystub-email',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};};
 const preview=async(ccSelf=false)=> (await request({action:'preview',ids:[id(10)],ccSelf})).body.previews[0];
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

test('optional CC is reviewed, fixed to the supervisor, and protected against changed choices',async()=>{
 const {state,request,preview}=fixture();
 const plain=await preview();assert.deepEqual(plain.cc,[]);
 const copied=await preview(true);assert.deepEqual(copied.cc,[PAYSTUB_CC]);assert.notEqual(plain.reviewKey,copied.reviewKey);
 assert.equal((await request({action:'send',id:plain.id,reviewed:true,reviewKey:plain.reviewKey,ccSelf:true})).status,409);
 assert.equal((await request({action:'send',id:copied.id,reviewed:true,reviewKey:copied.reviewKey,ccSelf:false})).status,409);
 assert.equal((await request({action:'preview',ids:[plain.id],ccSelf:'true'})).status,400);
 assert.equal(state.calls.length,0);
 assert.equal((await request({action:'send',id:copied.id,reviewed:true,reviewKey:copied.reviewKey,ccSelf:true,cc:['attacker@example.test']})).status,200);
 const payload=JSON.parse(state.calls[0].body);
 assert.deepEqual(payload.to,['worker@example.test']);assert.deepEqual(payload.cc,[PAYSTUB_CC]);assert.equal(payload.attachments.length,1);
});
test('CC retries preserve the original recipients and never resend accepted paystubs',async()=>{
 const {state,request,preview}=fixture();const p=await preview(true);
 const body={action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey,ccSelf:true};
 state.fail=true;assert.equal((await request(body)).status,500);
 assert.match((await preview(false)).blocked,/settings changed/);
 assert.equal((await request({...body,ccSelf:false})).status,409);assert.equal(state.calls.length,1);
 state.fail=false;assert.equal((await request(body)).status,200);
 assert.equal(state.calls[0].body,state.calls[1].body);
 assert.deepEqual(JSON.parse(state.calls[1].body).cc,[PAYSTUB_CC]);
 assert.equal((await request(body)).body.alreadySent,true);assert.equal(state.calls.length,2);
});
test('batch CC copies the supervisor on separate employee messages and avoids duplicate To/CC',async()=>{
 const {state,request}=fixture();state.stubs.push({...state.stubs[0],id:id(11),worker_id:id(21)});state.workers.push({id:id(21),email:PAYSTUB_CC});
 const {body}=await request({action:'preview',ids:[id(10),id(11)],ccSelf:true});
 for(const p of body.previews)assert.equal((await request({action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey,ccSelf:true})).status,200);
 const [employee,supervisor]=state.calls.map(c=>JSON.parse(c.body));
 assert.deepEqual(employee.to,['worker@example.test']);assert.deepEqual(employee.cc,[PAYSTUB_CC]);
 assert.deepEqual(supervisor.to,[PAYSTUB_CC]);assert.equal(supervisor.cc,undefined);
 assert.equal(employee.attachments.length,1);assert.equal(supervisor.attachments.length,1);
});

test('Resend status lookup updates delivery observations without resending or changing accepted requests',async()=>{
 const {state,request,preview}=fixture();const p=await preview();
 await request({action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey});
 const original=JSON.stringify(state.jobs[0]);
 const first=await request({action:'status',ids:[p.id]});
 assert.equal(first.status,200);assert.equal(first.body.statuses[0].provider_status,'delivered');assert.equal(first.body.warning,'');
 assert.equal(paystubEmailStatus(state.jobs[0],first.body.statuses[0]),'Delivered');
 assert.equal(state.calls.length,1);assert.equal(JSON.stringify(state.jobs[0]),original);assert.equal(state.statusCalls.length,1);
 assert.ok(!JSON.stringify(first.body).includes('PRIVATE MESSAGE'));assert.ok(!JSON.stringify(first.body).includes('private-test-key'));
 await request({action:'status',ids:[p.id]});assert.equal(state.statusCalls.length,1,'Cached for a minute');
 state.clock+=30*24*3600000;state.providerStatus='bounced';
 const final=await request({action:'status',ids:[p.id]});assert.equal(final.body.statuses[0].provider_status,'delivered');
 assert.equal(state.statusCalls.length,1,'Delivered is final even after the cache TTL expires');
 assert.equal((await request({action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey})).body.alreadySent,true);assert.equal(state.calls.length,1);
});
test('status refresh preserves last known state on errors and restricts access to supervisors',async()=>{
 const {state,request,preview}=fixture();const p=await preview();
 await request({action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey});
 state.providerStatus='sent';await request({action:'status',ids:[p.id]});state.clock+=61000;state.statusFail=403;
 const result=await request({action:'status',ids:[p.id]});
 assert.match(result.body.warning,/Full access/);assert.equal(result.body.statuses[0].provider_status,'sent');assert.match(result.body.statuses[0].check_error,/Full access/);
 state.supervisor=false;assert.equal((await request({action:'status',ids:[p.id]})).status,403);
 state.user=null;assert.equal((await request({action:'status',ids:[p.id]})).status,401);
});
test('unsent statements are never queried at Resend; unknown events never become delivered',async()=>{
 const {state,request,preview}=fixture();const p=await preview();
 assert.deepEqual((await request({action:'status',ids:[p.id]})).body.statuses,[]);assert.equal(state.statusCalls.length,0);
 await request({action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey});state.providerStatus='unexpected';
 const result=await request({action:'status',ids:[p.id]});assert.match(result.body.warning,/unrecognized/);assert.equal(result.body.statuses[0].provider_status,null);
 assert.equal(paystubEmailStatus(state.jobs[0],result.body.statuses[0]),'Accepted by provider');
 for(const event of ['delivered','opened','clicked'])assert.equal(paystubEmailStatus({state:'sent'},{provider_status:event}),'Delivered');
 assert.equal(paystubEmailStatus({state:'sent'},{provider_status:'delivery_delayed'}),'Delivery delayed');
 assert.equal(paystubEmailStatus(null,null),'Not sent');assert.equal(paystubEmailStatus(null,null,true),'Unknown');
});

test('pending delivery continues polling until delivered, then no provider reads or writes occur',async()=>{
 const {state,request,preview}=fixture();const p=await preview();
 await request({action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey});
 state.providerStatus='delivery_delayed';
 await request({action:'status',ids:[p.id]});
 assert.equal(state.statuses[0].provider_status,'delivery_delayed');
 state.clock+=61000;state.providerStatus='delivered';
 await request({action:'status',ids:[p.id]});assert.equal(state.statusCalls.length,2);
 const final=JSON.stringify(state.statuses[0]);
 for(const event of ['delivered','opened','clicked']){
   state.statuses[0].provider_status=event;const saved=JSON.stringify(state.statuses[0]);
   state.clock+=61000;state.statusFail=500;
   const result=await request({action:'status',ids:[p.id]});
   assert.equal(result.body.warning,'');assert.equal(state.statusCalls.length,2);
   assert.equal(JSON.stringify(state.statuses[0]),saved,'Final observation is never rewritten');
 }
 assert.match(final,/delivered/);assert.equal(state.calls.length,1);
});

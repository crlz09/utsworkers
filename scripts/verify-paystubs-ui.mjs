import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
const {chromium}=await import(process.env.UTS_PLAYWRIGHT_MODULE||'playwright');
const env=readFileSync(new URL('../.env.local',import.meta.url),'utf8');
const host=new URL(env.match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1]).hostname;
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const admin={id:uuid(1),email:'admin@example.test',app_metadata:{},user_metadata:{},aud:'authenticated'};
const worker={id:uuid(11),name:'Test Contractor',email:'contractor@example.test',auth_user_id:uuid(2)};
const employee={...admin,id:uuid(2),email:worker.email};
const job={id:uuid(21),level_type:'Gaylor Inc of Sellersburg',city:'Sellersburg',state:'IN'};
const assignments=[
 {id:uuid(31),worker_id:worker.id,cts_job_id:job.id,name_snapshot:worker.name,candidate_status:'placed',payment_type:'1099',hiring_mode:'owned',rate_snapshot:32,worker,job},
 {id:uuid(32),worker_id:uuid(12),cts_job_id:job.id,name_snapshot:'W2 Excluded',candidate_status:'placed',payment_type:'W2',hiring_mode:'owned',worker:{id:uuid(12),name:'W2 Excluded'},job},
 {id:uuid(33),worker_id:uuid(13),cts_job_id:job.id,name_snapshot:'Sourced Excluded',candidate_status:'sourced',payment_type:'1099',hiring_mode:'owned',worker:{id:uuid(13),name:'Sourced Excluded'},job},
];
let nextStatementNumber=0;
const finals=[],errors=[],deliveries=[],emailRequests=[];
const browser=await chromium.launch({headless:true,...(process.env.UTS_CHROME_PATH?{executablePath:process.env.UTS_CHROME_PATH}:{})});
async function contextFor(mode){
 const user=mode==='admin'?admin:employee;
 const ctx=await browser.newContext({viewport:{width:1600,height:1050},acceptDownloads:true});
 const token=Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
 await ctx.addInitScript(({key,user,token})=>localStorage.setItem(key,JSON.stringify({access_token:`e30.${token}.mock`,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{key:`sb-${host.split('.')[0]}-auth-token`,user,token});
 await ctx.route(`https://${host}/**`,async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1);
  const send=(value,count)=>route.fulfill({status:200,contentType:'application/json',headers:count==null?{}:{'content-range':`0-${Math.max(0,count-1)}/${count}`,'access-control-expose-headers':'content-range'},body:req.method()==='HEAD'?'':JSON.stringify(value)});
  if(url.pathname.includes('/auth/v1/user'))return send(user);
  if(table==='next_contractor_paystub_number')return send(`111226-${String(++nextStatementNumber).padStart(2,'0')}`);
  if(table==='admin_permissions')return send(mode==='admin'?{can_edit_workers:true,can_delete_workers:true}:null);
  if(table==='client_users')return send(null);
  if(table==='workers')return send(mode==='admin'?[worker]:worker);
  if(table==='cts_jobs')return send([job]);
  if(table==='cts_job_candidates')return send(assignments);
  if(table==='get_payroll_cts_week')return send({report:null,entries:[],lines:[{assignment_id:uuid(31),official_source:'cts_weekly',source_report_id:uuid(41),source_signature:'test',version:1,regular_hours:40,overtime_hours:22,double_time_hours:0,rate:32,per_diem_total:600}]});
  if(table==='current_worker_hours_assignment')return send([]);
  if(table==='contractor_paystub_deliveries')return send(deliveries);
  if(table==='paystub-email'){
   assert.equal(mode,'admin','Workers never invoke the email sender');
   const body=req.postDataJSON();
   if(body.action==='preview')return send({previews:body.ids.map(id=>{
    const stub=finals.find(s=>s.id===id),sent=deliveries.find(d=>d.paystub_id===id);
    return {id,stub,to:worker.email,from:'Universal Talent Source <no-reply@uts.services>',replyTo:'cmolina@universaltalentsource.com',subject:'Paystub - Week Ending 11/01/2026',text:'Hello Test Contractor,\nAttached is your weekly paystub.',filename:'UTS-1099-Test-Contractor.pdf',reviewKey:`review-${id}`,blocked:sent?'Already accepted by the email provider.':'',state:sent?'sent':'not_sent'};
   })});
   assert.equal(body.reviewed,true);emailRequests.push(body.id);
   if(!deliveries.some(d=>d.paystub_id===body.id))deliveries.push({paystub_id:body.id,state:'sent',email_to:worker.email,sent_at:'2026-11-04T22:00:00Z'});
   return send({sent:true});
  }
  if(table==='contractor_paystubs'||table==='contractor_paystub_history'){
   if(req.method()==='POST'){
    assert.equal(mode,'admin');const input=req.postDataJSON();
    const latest=finals.filter(s=>s.worker_id===worker.id&&s.period_start===input.period_start).at(-1);
    if(latest)assert.equal(input.supersedes_id,latest.id);
    const s={...input,id:uuid(100+finals.length),worker_id:worker.id,worker_name:worker.name,project_name:input.project_name,revision:(latest?.revision||0)+1,template_version:1,finalized_at:'2026-11-04T22:00:00Z',net_payment:Math.round((input.regular_hours*input.hourly_rate+input.overtime_hours*input.hourly_rate*1.5+input.per_diem+input.extras-input.deductions)*100)/100};
    finals.push(s);return send(s);
   }
   let list=finals.map(s=>({...s,is_current:!finals.some(n=>n.supersedes_id===s.id)})).slice().sort((a,b)=>b.revision-a.revision);
   if(url.searchParams.has('id'))list=list.filter(s=>`eq.${s.id}`===url.searchParams.get('id'));
   if(url.searchParams.has('worker_id'))list=list.filter(s=>`eq.${s.worker_id}`===url.searchParams.get('worker_id'));
   if(url.searchParams.has('period_start'))list=list.filter(s=>`eq.${s.period_start}`===url.searchParams.get('period_start'));
   return send(req.headers().accept?.includes('vnd.pgrst.object')?list[0]||null:list,list.length);
  }
  if(url.pathname.includes('/rpc/'))return send(table==='planner_note_unread_count'?0:null);
  return send([]);
 });
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));return {ctx,page};
}
try{
 mkdirSync('tmp/paystub-verification',{recursive:true});
 const {ctx,page}=await contextFor('admin');
 await page.goto('http://127.0.0.1:5173/payroll?week=2026-10-26');
 await page.getByRole('button',{name:'1099 paystubs',exact:true}).click();
 const picker=page.getByLabel('1099 contractor · placed');
 await picker.selectOption(uuid(31));
 assert.equal(await picker.locator('option').count(),2,'Only one eligible contractor plus placeholder');
 await page.getByLabel('Payment date',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Payment date',{exact:true}).inputValue(),'2026-11-06');
 assert.equal(await page.getByLabel('Regular hours',{exact:true}).inputValue(),'40');
 assert.equal(finals.length,0,'Draft preview is never persisted');
 assert.equal(await picker.locator('option:checked').textContent(),worker.name);
 assert.equal(await page.getByLabel('Project',{exact:true}).inputValue(),'');
 await page.waitForFunction(()=>!!document.querySelector('input[placeholder="MMDDYY-01"]')?.value);
 assert.match(await page.getByLabel('Statement number',{exact:true}).inputValue(),/^111226-\d{2}$/);
 await page.getByLabel('Project',{exact:true}).fill('UTS Order 123');
 await page.locator('.paystub-preview').getByText('UTS Order 123',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Finalize paystub',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Finalize paystub',exact:true}).isEnabled(),false);
 await page.screenshot({path:'tmp/paystub-verification/draft-desktop.png',fullPage:true});
 await page.getByLabel('I reviewed the dates and amounts.',{exact:false}).check();
 await page.getByRole('button',{name:'Finalize paystub',exact:true}).click();
 await page.getByText('Final paystub saved · $2,936.00',{exact:true}).waitFor();
 assert.equal(finals.length,1);
 assert.equal(finals[0].project_name,'UTS Order 123');
 await page.getByRole('button',{name:'Email paystub',exact:true}).click();
 const mail=page.getByRole('dialog',{name:'Email final paystubs',exact:true});
 await mail.getByText(worker.email,{exact:true}).waitFor();
 assert.equal(emailRequests.length,0,'Review never sends automatically');
 assert.equal(await mail.getByRole('button',{name:'Send 1 email',exact:true}).isEnabled(),false);
 await mail.getByLabel('I reviewed the recipients, messages and final PDFs.',{exact:false}).check();
 await mail.getByRole('button',{name:'Send 1 email',exact:true}).click();
 await mail.getByText('Accepted by the email provider.',{exact:true}).waitFor();
 assert.equal(emailRequests.length,1);
 await mail.getByRole('button',{name:'Close email review',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click();
 const download=await downloadPromise;await download.saveAs('tmp/paystub-verification/statement.pdf');
 assert.equal((await PDFDocument.load(readFileSync('tmp/paystub-verification/statement.pdf'))).getPageCount(),1);
 await page.getByRole('button',{name:'Open final history',exact:true}).click();
 await page.getByRole('button',{name:'View',exact:true}).click();
 await page.getByRole('button',{name:'Close statement',exact:true}).click();
 await page.getByRole('button',{name:'Create paystub',exact:true}).click();
 await page.getByText(/A final already exists: version 1/).waitFor();
 await page.getByLabel('Project',{exact:true}).fill('UTS Order 456');
 await page.getByLabel('Overtime hours (1.5×)',{exact:true}).fill('11');
 await page.getByLabel('Create a corrected final.',{exact:false}).check();
 await page.getByLabel('Correction reason',{exact:true}).fill('Corrected overtime to 11 hours.');
 await page.getByLabel('I reviewed the dates and amounts.',{exact:false}).check();
 await page.getByRole('button',{name:'Finalize corrected paystub',exact:true}).click();
 await page.getByText('Final paystub saved · $2,408.00',{exact:true}).waitFor();
 assert.equal(finals[1].project_name,'UTS Order 456');assert.notEqual(finals[0].statement_number,finals[1].statement_number);
 assert.equal(finals.length,2);assert.equal(finals[0].net_payment,2936);
 await page.getByRole('button',{name:'Open final history',exact:true}).click();
 await page.getByLabel('Week starting (optional)',{exact:true}).fill('2026-10-26');
 await page.getByRole('button',{name:'Select unsent on this page',exact:true}).click();
 await page.getByRole('button',{name:'Email selected (1)',exact:true}).click();
 await mail.getByText(worker.email,{exact:true}).waitFor();
 await mail.getByLabel('I reviewed the recipients, messages and final PDFs.',{exact:false}).check();
 await mail.getByRole('button',{name:'Send 1 email',exact:true}).click();
 await mail.getByText('Accepted by the email provider.',{exact:true}).waitFor();
 assert.equal(emailRequests.length,2);assert.deepEqual(emailRequests,finals.map(s=>s.id));
 await page.screenshot({path:'tmp/paystub-verification/email-review.png',fullPage:true});
 await mail.getByRole('button',{name:'Close email review',exact:true}).click();
 await ctx.close();
 const {ctx:workerCtx,page:workerPage}=await contextFor('worker');
 await workerPage.goto(`http://127.0.0.1:5173/worker/paystubs?statement=${finals[1].id}`);
 await workerPage.getByRole('button',{name:'Paystubs',exact:true}).waitFor();
 await workerPage.getByText('2 final statements',{exact:true}).waitFor();
 await workerPage.getByRole('button',{name:'Close statement',exact:true}).waitFor();
 assert.equal(await workerPage.getByRole('button',{name:'Finalize paystub',exact:true}).count(),0);
 await workerPage.screenshot({path:'tmp/paystub-verification/worker-desktop.png',fullPage:true});
 await workerPage.setViewportSize({width:390,height:844});
 await workerPage.screenshot({path:'tmp/paystub-verification/worker-mobile.png',fullPage:true});
 assert.ok(await workerPage.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No page-level horizontal overflow');
 await workerCtx.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: draft preview, 1099/placed filter, finalization, history, correction versions, one-page PDF, individual/bulk email review, no auto sends, employee portal, mobile layout, no browser errors. API fixtures used; database/RLS tested separately. No real emails sent.');
}finally{await browser.close();}

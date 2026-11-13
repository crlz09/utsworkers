import { refreshPaystubEmailStatus } from '../_shared/paystub-email-status.js';
import { paystubEmail, PAYSTUB_CC, PAYSTUB_REPLY_TO, validPaystubEmail } from '../_shared/paystub-email.js';
import { paystubFilename } from '../_shared/paystub-document.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const check=result=>{if(result.error)throw new Error(result.error.message||'The database request failed.');return result.data;};
const sha=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
export function createPaystubEmailHandler({createAdmin,config,buildPdf,fetchEmail=fetch,now=()=>Date.now(),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  return async request=>{
    if(request.method==='OPTIONS')return reply(200,{ok:true});
    if(request.method!=='POST')return reply(405,{error:'POST required.'});
    try{
      const admin=createAdmin();
      const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')||'';
      const {data:auth,error:authError}=await admin.auth.getUser(token);
      if(authError||!auth?.user)return reply(401,{error:'Sign in to continue.'});
      const permission=check(await admin.from('admin_permissions').select('can_delete_workers').eq('user_id',auth.user.id).maybeSingle());
      if(!permission?.can_delete_workers)return reply(403,{error:'Supervisor access is required to email paystubs.'});
      if(Number(request.headers.get('content-length')||0)>20000)return reply(413,{error:'Request too large.'});
      const body=await request.json(),settings=config();
      if(!['preview','send','status'].includes(body.action))return reply(400,{error:'Invalid email action.'});
      if(!settings.apiKey||(body.action!=='status'&&!settings.from))return reply(503,{error:'Configure the UTS email sender and Resend before emailing paystubs.'});
      if(body.ccSelf!==undefined&&typeof body.ccSelf!=='boolean')return reply(400,{error:'Invalid CC selection.'});
      const ids=body.action==='send'?[body.id]:body.ids;
      if(!Array.isArray(ids)||ids.length<1||ids.length>20||new Set(ids).size!==ids.length||ids.some(id=>!/^[-0-9a-f]{36}$/i.test(id)))return reply(400,{error:'Choose between 1 and 20 different final paystubs.'});
      if(body.action==='status')return reply(200,await refreshPaystubEmailStatus({admin,ids,apiKey:settings.apiKey,fetchEmail,now,wait}));
      const stubs=check(await admin.from('contractor_paystub_history').select('*').in('id',ids));
      if(stubs.length!==ids.length)return reply(404,{error:'One or more final paystubs are unavailable.'});
      const [workersResult,jobsResult]=await Promise.all([
        admin.from('workers').select('id,email').in('id',[...new Set(stubs.map(s=>s.worker_id))]),
        admin.from('contractor_paystub_deliveries').select('*').in('paystub_id',ids),
      ]);
      const workers=check(workersResult),jobs=check(jobsResult);
      const previews=await Promise.all(ids.map(async id=>{
        const stub=stubs.find(s=>s.id===id),job=jobs.find(j=>j.paystub_id===id),email=workers.find(w=>w.id===stub.worker_id)?.email?.trim().toLowerCase();
        const message=paystubEmail(stub,settings.portalBaseUrl);
        const cc=body.ccSelf===true&&email!==PAYSTUB_CC?[PAYSTUB_CC]:[];
        // Preserve review keys for existing sends without CC.
        const reviewFields=[id,email,settings.from,PAYSTUB_REPLY_TO,message.subject,message.text,message.html];
        if(cc.length)reviewFields.push(cc);
        const reviewKey=await sha(JSON.stringify(reviewFields));
        let blocked='';
        if(!stub.is_current)blocked='This final was replaced. Select its latest version.';
        else if(!validPaystubEmail(email))blocked='Correct the employee’s profile email before sending.';
        else if(job?.state==='sent')blocked='Already accepted by the email provider. A duplicate will not be sent.';
        else if(job&&job.review_key!==reviewKey)blocked='The recipient or email settings changed after an attempted send. Review the original delivery before proceeding.';
        else if(job&&now()-new Date(job.started_at).getTime()>23*3600000)blocked='Unconfirmed send is older than 23 hours. Review the provider record before any further send.';
        return {id,stub,to:email||'',cc,from:settings.from,replyTo:PAYSTUB_REPLY_TO,subject:message.subject,text:message.text,filename:paystubFilename(stub),reviewKey,state:job?.state||'not_sent',sentAt:job?.sent_at||null,blocked,message};
      }));
      if(body.action==='preview')return reply(200,{previews:previews.map(p=>({...p,message:undefined}))});
      const p=previews[0];
      if(p.state==='sent')return reply(200,{sent:true,alreadySent:true});
      if(p.blocked)return reply(409,{error:p.blocked});
      if(body.reviewed!==true||body.reviewKey!==p.reviewKey)return reply(409,{error:'Review the current recipient, message and final PDF before sending.'});
      let job=jobs.find(j=>j.paystub_id===p.id);
      if(!job){
        const bytes=await buildPdf(p.stub);
        const payload={from:p.from,to:[p.to],...(p.cc.length?{cc:p.cc}:{}),reply_to:p.replyTo,subject:p.subject,text:p.message.text,html:p.message.html,attachments:[{filename:p.filename,content:base64(bytes)}]};
        const result=await admin.from('contractor_paystub_deliveries').insert({paystub_id:p.id,email_to:p.to,email_from:p.from,subject:p.subject,request_payload:payload,review_key:p.reviewKey,sent_by:auth.user.id}).select('*').single();
        if(result.error?.code==='23505')job=check(await admin.from('contractor_paystub_deliveries').select('*').eq('paystub_id',p.id).single());
        else job=check(result);
      }
      if(job.state==='sent')return reply(200,{sent:true,alreadySent:true});
      if(job.review_key!==p.reviewKey)return reply(409,{error:'A different reviewed request is already pending for this paystub.'});
      if(now()-new Date(job.started_at).getTime()>23*3600000)return reply(409,{error:'The safe retry window expired. Review the email provider record.'});
      try{
        const response=await fetchEmail('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${settings.apiKey}`,'Content-Type':'application/json','Idempotency-Key':`paystub/${job.paystub_id}`},body:JSON.stringify(job.request_payload),signal:AbortSignal.timeout(25000)});
        const result=await response.json();
        if(!response.ok||!result.id)throw new Error(`Email acceptance is unconfirmed (provider ${response.status}). Retry the same reviewed email within 23 hours.`);
        check(await admin.from('contractor_paystub_deliveries').update({state:'sent',sent_at:new Date(now()).toISOString(),provider_id:result.id,last_error:null}).eq('id',job.id).eq('state','sending'));
        return reply(200,{sent:true,alreadySent:false});
      }catch(error){
        await admin.from('contractor_paystub_deliveries').update({last_error:'Provider acceptance is unconfirmed. Review the status and retry the same saved email within 23 hours.'}).eq('id',job.id).eq('state','sending');
        throw error;
      }
    }catch(error){return reply(500,{error:error instanceof Error?error.message:'The paystub email could not be confirmed.'});}
  };
}

export const PROVIDER_EVENTS = ['sent','delivered','delivery_delayed','bounced','complained','opened','clicked','failed','suppressed','scheduled','canceled'];
export function paystubEmailStatus(delivery, observation, unknown=false) {
  if (!delivery) return unknown?'Unknown':'Not sent';
  if (delivery.state!=='sent') return 'Unconfirmed';
  return ({delivered:'Delivered',opened:'Delivered',clicked:'Delivered',delivery_delayed:'Delivery delayed',bounced:'Bounced',complained:'Marked as spam',failed:'Failed',suppressed:'Suppressed',scheduled:'Scheduled',canceled:'Canceled'})[observation?.provider_status] || 'Accepted by provider';
}
const check=result=>{if(result.error)throw new Error(result.error.message||'Could not save delivery status.');return result.data;};
export async function refreshPaystubEmailStatus({admin,ids,apiKey,fetchEmail,now,wait}) {
  const jobs=check(await admin.from('contractor_paystub_deliveries').select('paystub_id,state,provider_id,email_to').in('paystub_id',ids)).filter(j=>j.state==='sent'&&j.provider_id);
  if(!jobs.length)return {statuses:[],warning:''};
  const cached=check(await admin.from('contractor_paystub_email_status').select('*').in('paystub_id',jobs.map(j=>j.paystub_id)));
  const statuses=new Map(cached.map(s=>[s.paystub_id,s]));
  let warning='',requested=false;
  for(const job of jobs){
    const old=statuses.get(job.paystub_id);
    if(old&&now()-new Date(old.checked_at).getTime()<60000)continue;
    let observation;
    try{
      if(requested)await wait(200);
      requested=true;
      const response=await fetchEmail(`https://api.resend.com/emails/${encodeURIComponent(job.provider_id)}`,{method:'GET',headers:{Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error(response.status===401||response.status===403?'Resend status lookup requires an API key with Full access.':`Resend status lookup failed (${response.status}). Try again later.`);
      const email=await response.json();
      if(email.id!==job.provider_id||!Array.isArray(email.to)||!email.to.some(to=>to.toLowerCase()===job.email_to.toLowerCase())||!PROVIDER_EVENTS.includes(email.last_event))throw new Error('Resend returned an unrecognized email status.');
      observation={paystub_id:job.paystub_id,provider_status:email.last_event,checked_at:new Date(now()).toISOString(),check_error:''};
    }catch(error){
      warning=error instanceof Error?error.message:'Could not check Resend status.';
      observation={paystub_id:job.paystub_id,provider_status:old?.provider_status||null,checked_at:new Date(now()).toISOString(),check_error:warning};
    }
    check(await admin.from('contractor_paystub_email_status').upsert(observation,{onConflict:'paystub_id'}));
    statuses.set(job.paystub_id,observation);
    if(warning)break;
  }
  return {statuses:[...statuses.values()],warning:warning||[...statuses.values()].find(s=>s.check_error)?.check_error||''};
}

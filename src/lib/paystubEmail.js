import { supabase } from './supabase';
export { paystubEmailStatus } from '../../supabase/functions/_shared/paystub-email-status.js';
export { PAYSTUB_CC } from '../../supabase/functions/_shared/paystub-email.js';

export const DELIVERY_FIELDS='paystub_id,state,email_to,sent_at,started_at,last_error';
export async function paystubEmailRequest(body) {
  const {data,error}=await supabase.functions.invoke('paystub-email',{body});
  if(error){
    const detail=await error.context?.clone?.().json().catch(()=>null);
    throw new Error(detail?.error||error.message||'The email request failed.');
  }
  if(data?.error)throw new Error(data.error);
  return data;
}

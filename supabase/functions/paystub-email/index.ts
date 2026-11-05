import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.101.1";
import { createPaystubEmailHandler } from "./handler.js";
import { buildContractorPaystubPdf } from "../_shared/contractor-paystub-pdf.js";

Deno.serve(createPaystubEmailHandler({
  createAdmin: () => createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}),
  config: () => ({apiKey:Deno.env.get('RESEND_API_KEY'),from:Deno.env.get('PAYSTUB_EMAIL_FROM')||Deno.env.get('WORKER_NOTIFICATION_FROM'),portalBaseUrl:Deno.env.get('APP_BASE_URL')||'https://www.uts.services'}),
  buildPdf:buildContractorPaystubPdf,
}));

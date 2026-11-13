import { paystubDate } from './paystub-document.js';
export const PAYSTUB_REPLY_TO = 'cmolina@universaltalentsource.com';
export const validPaystubEmail = value => typeof value === 'string' && /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(value);
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function paystubEmail(stub,portalBaseUrl) {
  const base=new URL(portalBaseUrl);
  if(base.protocol!=='https:'||base.username||base.password)throw new Error('Configure a secure UTS portal URL.');
  const url=new URL(`/worker/paystubs?statement=${encodeURIComponent(stub.id)}`,base).href;
  const period=`${paystubDate(stub.period_start)} - ${paystubDate(stub.period_end)}`;
  const subject=`Paystub - Week Ending ${paystubDate(stub.period_end)}`;
  const text=`Hello ${stub.worker_name},\n\nAttached is your paystub for the week of ${period}.\n\nBest regards,\nUniversal Talent Source`;
  const html=`<div style="background:#f1f6fb;padding:24px;font-family:Arial,sans-serif;color:#12314b"><div style="max-width:600px;margin:auto"><div style="background:#12314b;color:#fff;padding:24px;font-size:20px;font-weight:bold">UNIVERSAL TALENT SOURCE</div><div style="background:#fff;padding:26px;border:1px solid #dcecf3"><h1 style="font-size:22px;margin-top:0">Your weekly paystub</h1><p>Hello ${escape(stub.worker_name)},</p><p style="line-height:1.7">Attached is your paystub for the week of <strong>${escape(period)}</strong>.</p><p>Best regards,<br>Universal Talent Source</p></div></div></div>`;
  return {subject,text,html,url};
}

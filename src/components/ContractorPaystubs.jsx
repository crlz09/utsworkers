import { useEffect, useState } from 'react';
import { Download, FileCheck2, History, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PAYSTUB_FIELDS, downloadPaystub, eligibleForPaystub, paystubDate, paystubDraft, paystubPayload, paystubTotals, paystubUsd } from '../lib/contractorPaystub';
import { payrollWeek, shiftPayrollWeek } from '../lib/payroll';
import ContractorPaystubView from './ContractorPaystubView';
import ContractorPaystubHistory from './ContractorPaystubHistory';
import './ContractorPaystubs.css';
import PaystubEmailDialog from './PaystubEmailDialog';

export default function ContractorPaystubs({ week, onWeekChange, sourceRows, sourceLoading }) {
  const [view,setView]=useState('create'),[selected,setSelected]=useState('');
  const [reload,setReload]=useState(0),[roster,setRoster]=useState({loading:true,rows:[],error:''});
  useEffect(()=>{
    let active=true;
    void supabase.from('cts_job_candidates').select('id,worker_id,cts_job_id,name_snapshot,rate_snapshot,payment_type,candidate_status,worker:workers!worker_id(id,name)').eq('payment_type','1099').eq('candidate_status','placed').not('worker_id','is',null).then(({data,error})=>{
      if(active)setRoster({loading:false,rows:(data||[]).filter(eligibleForPaystub).sort((a,b)=>(a.worker?.name||a.name_snapshot||'').localeCompare(b.worker?.name||b.name_snapshot||'')),error:error?.message||''});
    });
    return()=>{active=false;};
  },[reload]);
  const assignment=roster.rows.find(a=>a.id===selected);
  return <section className="paystub-workspace">
    <div className="paystub-intro"><div><h2>1099 weekly paystubs</h2><p>Prepare a statement for a placed 1099 contractor. Final statements are saved to the history and published to the employee’s portal.</p></div><div className="paystub-actions"><button className={`pay-btn ${view==='create'?'primary':''}`} onClick={()=>setView('create')}><FileCheck2 size={15}/>Create paystub</button><button className={`pay-btn ${view==='history'?'primary':''}`} onClick={()=>setView('history')}><History size={15}/>Final history</button></div></div>
    {view==='history'?<ContractorPaystubHistory/>:<>
      <section className="pay-card paystub-setup"><label>Week starting (Monday)<input type="date" value={week} onChange={e=>{if(e.target.value)onWeekChange(payrollWeek(e.target.value));}}/></label><label>1099 contractor · placed<select value={selected} onChange={e=>setSelected(e.target.value)} disabled={roster.loading||!!roster.error}><option value="">Choose a contractor…</option>{roster.rows.map(a=><option key={a.id} value={a.id}>{a.worker?.name||a.name_snapshot}</option>)}</select></label><button className="pay-btn" onClick={()=>{setRoster(r=>({...r,loading:true}));setReload(r=>r+1);}} disabled={roster.loading}><RefreshCw size={14}/>Refresh contractors</button></section>
      {roster.error?<p role="alert" className="paystub-error">{roster.error}</p>:roster.loading?<p role="status">Loading placed 1099 contractors…</p>:!roster.rows.length?<p className="pay-empty">No linked employees are currently classified as 1099 and placed.</p>:!assignment?<div className="pay-card pay-empty">Choose a contractor to prepare a weekly paystub.</div>:sourceLoading?<p role="status">Loading payroll defaults…</p>:<PaystubEditor key={`${week}:${assignment.id}`} assignment={assignment} row={sourceRows.find(r=>r.assignment.id===assignment.id)} week={week} onHistory={()=>setView('history')}/>}
    </>}
  </section>;
}

function PaystubEditor({ assignment, row, week, onHistory }) {
  const [values,setValues]=useState(()=>paystubDraft(assignment,row,week));
  const [latest,setLatest]=useState({loading:true,value:null,error:''}),[lookup,setLookup]=useState(0);
  const [reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(null),[pdfBusy,setPdfBusy]=useState(false);
  const [emailOpen,setEmailOpen]=useState(false);
  const [numberState,setNumberState]=useState({loading:true,error:''}),[numberLookup,setNumberLookup]=useState(0);
  useEffect(()=>{
    let active=true;
    void supabase.rpc('next_contractor_paystub_number').then(({data,error})=>{
      if(!active)return;
      setNumberState({loading:false,error:error?.message||(!data?'No statement number was returned.':'')});
      if(data&&!error)setValues(v=>({...v,statement_number:v.statement_number||data}));
    });
    return()=>{active=false;};
  },[numberLookup]);
  useEffect(()=>{
    let active=true;
    void supabase.from('contractor_paystubs').select(PAYSTUB_FIELDS).eq('worker_id',assignment.worker_id).eq('period_start',week).order('revision',{ascending:false}).limit(1).then(({data,error})=>{
      if(active)setLatest({loading:false,value:data?.[0]||null,error:error?.message||''});
    });
    return()=>{active=false;};
  },[assignment.worker_id,week,lookup]);
  const update=(key,value)=>{setValues(v=>({...v,[key]:value}));setReviewed(false);setError('');};
  let payload=null,validation='';
  try{payload=paystubPayload(assignment,values,latest.value);}catch(e){validation=e.message;}
  const preview=payload?{...payload,worker_name:assignment.worker?.name||assignment.name_snapshot,template_version:1}:null;
  const doubleTime=Number(row?.doubleTime||0)>0;
  const finalize=async(e)=>{
    e.preventDefault();if(!payload||!reviewed||latest.loading||latest.error||doubleTime||saved)return;
    setBusy(true);setError('');
    try{
      const {data,error}=await supabase.from('contractor_paystubs').insert(payload).select(PAYSTUB_FIELDS).single();
      if(error)throw error;
      setSaved(data);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const download=async()=>{setPdfBusy(true);setError('');try{await downloadPaystub(saved);}catch(e){setError(e.message);}finally{setPdfBusy(false);}};
  if(saved)return <div className="paystub-saved"><div className="paystub-success" role="status"><FileCheck2 size={22}/><div><strong>Final paystub saved · {paystubUsd(saved.net_payment)}</strong><p>{saved.worker_name} can now view and download it at My paystubs in the employee portal. Version {saved.revision} is preserved in the history.</p></div></div><div className="paystub-actions"><button className="pay-btn primary" disabled={pdfBusy} onClick={()=>void download()}><Download size={15}/>{pdfBusy?'Preparing PDF…':'Download PDF'}</button><button className="pay-btn" onClick={()=>setEmailOpen(true)}><Mail size={15}/>Email paystub</button><button className="pay-btn" onClick={onHistory}>Open final history</button></div>{error&&<p className="paystub-error" role="alert">{error}</p>}<ContractorPaystubView stub={saved}/>{emailOpen&&<PaystubEmailDialog ids={[saved.id]} onClose={()=>setEmailOpen(false)} onSent={()=>{}}/>}</div>;
  return <div className="paystub-editor-grid"><form className="pay-card paystub-editor" onSubmit={finalize}>
    <h3>Statement details</h3><p className="paystub-muted">{paystubDate(week)} – {paystubDate(shiftPayrollWeek(week,6))}. Drafts are not saved. Finalize to publish to the employee.</p>
    <p className="paystub-muted">{row?.approved?'Matched weekly payroll hours and rate are prefilled. Review every field before finalizing.':'No matched source hours. Enter and verify the hours, rate and weekly per diem.'}</p>
    {doubleTime&&<p className="paystub-error" role="alert">This payroll row includes double-time hours. The 1099 template supports regular and overtime only. Review the source before issuing this statement.</p>}
    <fieldset disabled={busy}><div className="paystub-fields">
      <label>Payment date<input type="date" required value={values.payment_date} onChange={e=>update('payment_date',e.target.value)}/></label>
      <label>Project<input required maxLength={200} value={values.project_name} onChange={e=>update('project_name',e.target.value)} placeholder="Enter the UTS project / order name"/></label>
      <label>Statement number<input required placeholder={numberState.loading?'Generating…':'MMDDYY-01'} maxLength={100} value={values.statement_number} onChange={e=>update('statement_number',e.target.value)}/></label>
      {[['hourly_rate','Rate / hour'],['regular_hours','Regular hours'],['overtime_hours','Overtime hours (1.5×)'],['per_diem','Per diem · weekly total'],['deductions','Deductions (subtract)'],['extras','Extras']].map(([key,label])=><label key={key}>{label}<input type="number" step="0.01" min={key==='hourly_rate'?'0.01':'0'} max="999999.99" required value={values[key]} onChange={e=>update(key,e.target.value)}/></label>)}
    </div><label>Payment method<input maxLength={100} value={values.payment_method} onChange={e=>update('payment_method',e.target.value)} placeholder="Optional"/></label><label>Notes<textarea maxLength={500} rows={3} value={values.notes} onChange={e=>update('notes',e.target.value)} placeholder="Optional statement notes"/></label>
    {numberState.error&&<p className="paystub-error" role="alert">Could not generate a statement number: {numberState.error} <button type="button" className="pay-btn" onClick={()=>{setNumberState({loading:true,error:''});setNumberLookup(n=>n+1);}}>Retry number</button></p>}
    {latest.loading?<p role="status">Checking existing finals…</p>:latest.error?<p className="paystub-error" role="alert">Could not check final history: {latest.error} <button type="button" className="pay-btn" onClick={()=>{setLatest(l=>({...l,loading:true,error:''}));setLookup(n=>n+1);}}>Retry</button></p>:latest.value&&<div className="paystub-revision"><strong>A final already exists: version {latest.value.revision} · {paystubUsd(latest.value.net_payment)}</strong><label className="paystub-check"><input type="checkbox" checked={values.confirm_revision} onChange={e=>update('confirm_revision',e.target.checked)}/>Create a corrected final. Preserve the previous version.</label><label>Correction reason<textarea required maxLength={500} rows={2} value={values.correction_reason} onChange={e=>update('correction_reason',e.target.value)}/></label></div>}
    {preview&&<div className="paystub-draft-total"><span>Net payment</span><strong>{paystubUsd(paystubTotals(payload).net)}</strong></div>}
    {validation&&<p className="paystub-muted">{validation}</p>}
    <label className="paystub-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I reviewed the dates and amounts. Mark this paystub as final and make it available to the employee.</label>
    {error&&<p className="paystub-error" role="alert">{error}</p>}
    <button className="pay-btn primary" disabled={!payload||!reviewed||busy||latest.loading||!!latest.error||doubleTime}><FileCheck2 size={16}/>{busy?'Finalizing…':latest.value?'Finalize corrected paystub':'Finalize paystub'}</button>
    </fieldset>
  </form><section className="paystub-preview"><h3>Live preview</h3>{preview?<ContractorPaystubView stub={preview}/>:<div className="pay-card pay-empty">Complete the statement details to preview the paystub.</div>}</section></div>;
}

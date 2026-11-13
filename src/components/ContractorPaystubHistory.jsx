import { useEffect, useState } from 'react';
import { Download, Mail, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PAYSTUB_FIELDS, downloadPaystub, paystubDate, paystubUsd } from '../lib/contractorPaystub';
import ContractorPaystubView from './ContractorPaystubView';
import './ContractorPaystubs.css';
import PaystubEmailDialog from './PaystubEmailDialog';
import { DELIVERY_FIELDS, paystubEmailRequest, paystubEmailStatus } from '../lib/paystubEmail';
import { payrollWeek } from '../lib/payroll';

const PAGE_SIZE=20;
export default function ContractorPaystubHistory({ workerId='', employeeMode=false, initialStatementId='' }) {
  const [query,setQuery]=useState(''),[page,setPage]=useState(0),[refresh,setRefresh]=useState(0);
  const [state,setState]=useState({loading:true,rows:[],count:0,error:''});
  const [selected,setSelected]=useState(null),[actionError,setActionError]=useState(''),[downloading,setDownloading]=useState('');
  const [checked,setChecked]=useState([]),[emailIds,setEmailIds]=useState(null);
  const [period,setPeriod]=useState('');
  useEffect(() => {
    let active=true;
    const load=async()=>{
      setState(p=>({...p,loading:true,error:''}));
      let req=supabase.from('contractor_paystub_history').select(`${PAYSTUB_FIELDS},is_current`,{count:'exact'}).order('period_start',{ascending:false}).order('revision',{ascending:false}).order('id').range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
      if(workerId) req=req.eq('worker_id',workerId);
      if(period) req=req.eq('period_start',period);
      if(query.trim()) req=req.ilike('worker_name',`%${query.trim().replace(/[\\%_]/g,'\\$&')}%`);
      const {data,error,count}=await req;
      let deliveries=[],mailError='',statuses=[];
      if(!employeeMode&&!error&&data?.length){
        const result=await supabase.from('contractor_paystub_deliveries').select(DELIVERY_FIELDS).in('paystub_id',data.map(s=>s.id));
        deliveries=result.data||[];mailError=result.error?.message||'';
        if(!result.error){
          try{
            const result=await paystubEmailRequest({action:'status',ids:data.map(s=>s.id)});
            statuses=result.statuses;mailError=result.warning||'';
          }catch(e){
            mailError=e.message;
            const cached=await supabase.from('contractor_paystub_email_status').select('*').in('paystub_id',data.map(s=>s.id));
            statuses=cached.data||[];
          }
        }
      }
      if(active)setState({loading:false,rows:data||[],count:count||0,error:error?.message||'',deliveries,mailError,statuses});
    };
    void load();return()=>{active=false;};
  },[workerId,query,page,refresh,employeeMode,period]);
  useEffect(()=>{
    if(employeeMode)return;
    const timer=setInterval(()=>{if(document.visibilityState==='visible')setRefresh(r=>r+1);},60000);
    return()=>clearInterval(timer);
  },[employeeMode]);
  useEffect(()=>{
    if(!initialStatementId)return;
    let active=true;
    void supabase.from('contractor_paystub_history').select(`${PAYSTUB_FIELDS},is_current`).eq('id',initialStatementId).maybeSingle().then(({data,error})=>{
      if(!active)return;
      if(error||!data)setActionError('This statement is unavailable for your account.');else setSelected(data);
    });
    return()=>{active=false;};
  },[initialStatementId]);
  const download=async(stub)=>{
    setDownloading(stub.id);setActionError('');
    try{await downloadPaystub(stub);}catch(e){setActionError(e.message);}finally{setDownloading('');}
  };
  return <section className="pay-card paystub-history">
    <div className="pay-section-top"><div><h2>{employeeMode?'My paystubs':'Final paystub history'}</h2><p>Final statements only. Previous versions remain available after a correction.</p></div><button className="pay-btn" onClick={()=>setRefresh(r=>r+1)} disabled={state.loading}><RefreshCw size={15}/>Refresh history</button></div>
    {!employeeMode&&<div className="pay-toolbar"><label className="pay-search"><Search size={15}/><input aria-label="Search paystub employee" placeholder="Search employee name…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);setChecked([]);}}/></label><label className="paystub-history-week">Week starting (optional)<input type="date" value={period} onChange={e=>{setPeriod(e.target.value?payrollWeek(e.target.value):'');setPage(0);setChecked([]);}}/></label><div className="paystub-actions"><button className="pay-btn" disabled={state.loading||!state.rows.some(s=>s.is_current)} onClick={()=>setChecked(state.rows.filter(s=>s.is_current&&!state.deliveries?.some(d=>d.paystub_id===s.id&&d.state==='sent')).map(s=>s.id))}>Select unsent on this page</button><button className="pay-btn primary" disabled={state.loading||!checked.length} onClick={()=>setEmailIds(checked)}><Mail size={14}/>Email selected ({checked.length})</button></div></div>}
    {state.mailError&&<p className="paystub-error" role="alert">Email status could not be loaded: {state.mailError}. The last saved status is shown. Refresh history to try again.</p>}
    {actionError&&<p className="paystub-error" role="alert">{actionError}</p>}
    {state.loading?<p className="pay-empty" role="status">Loading final paystubs…</p>:state.error?<div className="pay-empty" role="alert">{state.error}<button className="pay-btn" onClick={()=>setRefresh(r=>r+1)}>Retry</button></div>:!state.rows.length?<p className="pay-empty">{employeeMode?'No final paystubs have been published for you yet.':'No final paystubs found. Finalize a statement to add it to the history.'}</p>:<>
      <div className="paystub-history-table-wrap"><table className={`paystub-history-table${employeeMode?' employee':''}`}><thead><tr>{!employeeMode&&<><th>Select</th><th>Employee</th></>}<th>Period</th><th>Payment date</th><th>Net payment</th><th>Version</th>{!employeeMode&&<th>Email</th>}<th>Actions</th></tr></thead><tbody>{state.rows.map(stub=><tr key={stub.id}>
        {!employeeMode&&<td><input type="checkbox" aria-label={`Select paystub for ${stub.worker_name} ${stub.period_start} v${stub.revision}`} checked={checked.includes(stub.id)} disabled={!stub.is_current||state.deliveries?.some(d=>d.paystub_id===stub.id&&d.state==='sent')} onChange={e=>setChecked(ids=>e.target.checked?[...ids,stub.id]:ids.filter(id=>id!==stub.id))}/></td>}
        {!employeeMode&&<td><strong>{stub.worker_name}</strong><small>{stub.project_name}</small></td>}<td data-label="Period">{paystubDate(stub.period_start)} – {paystubDate(stub.period_end)}{employeeMode&&<small>{stub.project_name}</small>}</td><td data-label="Payment date">{paystubDate(stub.payment_date)}</td><td data-label="Net payment"><strong>{paystubUsd(stub.net_payment)}</strong></td><td data-label="Version">v{stub.revision}<small>{stub.is_current?'Final':'Replaced'}</small></td>{!employeeMode&&<td>{paystubEmailStatus(state.deliveries?.find(d=>d.paystub_id===stub.id),state.statuses?.find(s=>s.paystub_id===stub.id),!!state.mailError)}<small>{state.deliveries?.find(d=>d.paystub_id===stub.id)?.email_to}</small></td>}<td><div className="paystub-actions"><button className="pay-btn" onClick={()=>setSelected(stub)}>View</button><button className="pay-btn" disabled={!!downloading} onClick={()=>void download(stub)}><Download size={14}/>{downloading===stub.id?'Preparing…':'PDF'}</button>{!employeeMode&&stub.is_current&&<button className="pay-btn" onClick={()=>setEmailIds([stub.id])}><Mail size={14}/>Email</button>}</div></td>
      </tr>)}</tbody></table></div>
      <div className="paystub-pagination"><span>{state.count} final statement{state.count===1?'':'s'}</span><button className="pay-btn" disabled={page===0} onClick={()=>{setPage(p=>p-1);setChecked([]);}}>Previous</button><span>Page {page+1}</span><button className="pay-btn" disabled={(page+1)*PAGE_SIZE>=state.count} onClick={()=>{setPage(p=>p+1);setChecked([]);}}>Next</button></div>
    </>}
    {selected&&<section className="paystub-selected" aria-label="Selected final paystub"><div className="paystub-actions"><h3>{selected.worker_name} · {paystubDate(selected.period_start)}</h3><button className="pay-btn" disabled={!!downloading} onClick={()=>void download(selected)}><Download size={14}/>Download PDF</button><button className="pay-btn" onClick={()=>setSelected(null)}>Close statement</button></div><ContractorPaystubView stub={selected}/></section>}
    {emailIds&&<PaystubEmailDialog ids={emailIds} onClose={()=>setEmailIds(null)} onSent={()=>{setChecked([]);setRefresh(r=>r+1);}}/>}
  </section>;
}

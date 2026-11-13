import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAccess } from '../lib/accessContext';
import { payrollAmounts, payrollWeek } from '../lib/payroll';
import ContractorPaystubs from '../components/ContractorPaystubs';
import './PayrollPage.css';

export default function PayrollPage() {
  const { access } = useAccess();
  const allowed = !!access?.permissions?.can_delete_workers;
  const [params,setParams] = useSearchParams();
  const [week,setWeek] = useState(() => {
    const requested=params.get('week');
    return /^\d{4}-\d{2}-\d{2}$/.test(requested || '') ? payrollWeek(requested) : payrollWeek();
  });
  const [reload,setReload] = useState(0);
  const [source,setSource] = useState({rows:[],loading:true,error:''});
  useEffect(() => {
    if (params.get('week') !== week) setParams({week},{replace:true});
  },[params,setParams,week]);
  useEffect(() => {
    if (!allowed) return;
    let active=true;
    const load=async()=>{
      setSource(s=>({...s,loading:true,error:''}));
      try {
        const [assignments,report,drafts]=await Promise.all([
          supabase.from('cts_job_candidates').select('id,worker_id,payment_type,rate_snapshot,per_diem_snapshot').eq('hiring_mode','owned').eq('payment_type','1099').eq('candidate_status','placed'),
          supabase.rpc('get_payroll_cts_week',{p_week_start:week}),
          supabase.from('payroll_draft_lines').select('*').eq('week_start',week),
        ]);
        for (const result of [assignments,report,drafts]) if (result.error) throw result.error;
        const reviews=new Map((report.data?.lines||[]).map(line=>[line.assignment_id,line]));
        const savedDrafts=new Map((drafts.data||[]).map(draft=>[draft.assignment_id,draft]));
        const rows=(assignments.data||[]).map(assignment=>({
          assignment,
          ...payrollAmounts(assignment,reviews.get(assignment.id),savedDrafts.get(assignment.id)),
        }));
        if(active)setSource({rows,loading:false,error:''});
      } catch(e) {
        if(active)setSource({rows:[],loading:false,error:e.message});
      }
    };
    void load();
    return()=>{active=false;};
  },[allowed,week,reload]);
  if (!allowed) return <main className="payroll-page"><section className="pay-card pay-empty"><ShieldCheck size={28}/><h1>Payroll</h1><p>Supervisor access is required to view payroll information.</p></section></main>;
  return <main className="payroll-page">
    <header className="pay-header"><div><p className="pay-kicker">UTS OPERATIONS · OWNED TEAM</p><h1>Payroll</h1><p className="pay-subtitle">Prepare and manage 1099 contractor paystubs.</p></div><button className="pay-btn" onClick={()=>setReload(n=>n+1)} disabled={source.loading}><RefreshCw size={14} className={source.loading?'pay-spin':''}/>Refresh view</button></header>
    {source.error&&<div role="alert" className="pay-alert error">Payroll defaults could not be loaded: {source.error}. Enter and verify the statement amounts manually. <button onClick={()=>setReload(n=>n+1)}>Retry</button></div>}
    <ContractorPaystubs week={week} onWeekChange={setWeek} sourceRows={source.rows} sourceLoading={source.loading}/>
  </main>;
}

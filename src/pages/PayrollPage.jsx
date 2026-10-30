import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, ExternalLink, Link2, Loader2, RefreshCw, Search, ShieldCheck, UsersRound, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAccess } from '../lib/accessContext';
import { payrollLine, payrollMoney, payrollReviewCsv, payrollWeek, shiftPayrollWeek, suggestedGustoPerson } from '../lib/payroll';
import { perDiemValue } from '../lib/candidateCompensation';
import './PayrollPage.css';
const usd = (value) => value == null ? '—' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const dateLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const stamp = (value) => value ? new Date(value).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Not imported';
async function read(query) { const { data, error } = await query; if (error) throw error; return data || []; }
function NumberField({ label, value, onChange, disabled, min = '0' }) {
  return <label className="pay-number"><span>{label}</span><input aria-label={label} type="number" min={min} step="0.01" value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} /></label>;
}
function DraftEditor({ row, onSave }) {
  const [rate,setRate] = useState(row.rate ?? '');
  const [perDiem,setPerDiem] = useState(row.perDiem ?? '');
  const [notes,setNotes] = useState(row.draft?.notes || '');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  return <form className="pay-draft-editor" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await onSave(row,{ rate: rate === '' ? null : Number(rate), per_diem_total: perDiem === '' ? null : Number(perDiem), notes }); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }}>
    <div className="pay-draft-fields"><NumberField label="Payroll rate / hr" min="0.01" value={rate} onChange={setRate} disabled={busy} /><NumberField label="Per Diem total this week" value={perDiem} onChange={setPerDiem} disabled={busy} /></div>
    <label className="pay-notes">Review notes<input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} placeholder="Optional payroll notes" /></label>
    <p>Project Per Diem: <strong>{perDiemValue(row.assignment.per_diem_snapshot)}</strong>. Enter the total for this week above. Changes here apply to this payroll draft. Pay rate defaults to CTS RATE minus the report fee. Positive report Per Diem totals are prefilled; a zero report total requires review when the project has Per Diem.</p>
    {error && <p className="pay-error" role="alert">{error}</p>}
    <button className="pay-btn primary" disabled={busy}><Check size={14}/>{busy ? 'Saving…' : 'Save draft'}</button>
  </form>;
}
function WorkerLink({ worker, people, link, onLink }) {
  const [selected,setSelected] = useState(link?.person_uuid || '');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const suggestion = !link && suggestedGustoPerson(worker,people);
  return <form className="pay-link-form" onSubmit={async (e) => {
    e.preventDefault();setBusy(true);setError('');
    try { await onLink(worker.id,selected); } catch(e) { setError(e.message); } finally {setBusy(false);}
  }}>
    <div><select aria-label={`Gusto record for ${worker.name}`} value={selected} onChange={(e) => setSelected(e.target.value)} disabled={busy}>
      <option value="">Not linked</option>{people.filter((p) => p.active || p.person_uuid === link?.person_uuid).map((p) => <option key={p.person_uuid} value={p.person_uuid}>{p.name} · {p.worker_type}{p.active ? '' : ' · Inactive'}</option>)}
    </select><button className="pay-btn" disabled={busy || selected === (link?.person_uuid || '')}>{busy ? <Loader2 size={14} className="pay-spin"/> : <Link2 size={14}/>}Save link</button></div>
    {suggestion && <button className="pay-suggestion" type="button" onClick={() => setSelected(suggestion.person_uuid)}>Email match: {suggestion.name} · Select</button>}
    {error && <span className="pay-error" role="alert">{error}</span>}
  </form>;
}
export default function PayrollPage() {
  const { access } = useAccess();
  const allowed = !!access?.permissions?.can_delete_workers;
  const [params,setParams] = useSearchParams();
  const [week,setWeek] = useState(() => { const requested=params.get('week'); return /^\d{4}-\d{2}-\d{2}$/.test(requested || '') ? payrollWeek(requested) : payrollWeek(); });
  useEffect(() => { if (params.get('week') !== week) setParams({week},{replace:true}); },[params,setParams,week]);
  const activeWeek = useRef(week);
  useEffect(() => { activeWeek.current = week; }, [week]);
  const [tab,setTab] = useState('period');
  const [data,setData] = useState({ assignments:[],workers:[],jobs:[],reviews:[],drafts:[],people:[],links:[],directory:null,source:{report:null,entries:[],lines:[]},periods:[] });
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('all');
  const [openRow,setOpenRow] = useState('');
  const [importing,setImporting] = useState(false);
  const fileInput = useRef(null);
  const requestId = useRef(0);
  useEffect(() => { const generation = requestId; return () => { ++generation.current; }; }, []);
  const load = useCallback(async () => {
    if (!allowed) return;
    const id = ++requestId.current;setLoading(true);setError('');
    try {
      const assignments = await read(supabase.from('cts_job_candidates').select('id,worker_id,cts_job_id,name_snapshot,candidate_status,payment_type,rate_snapshot,per_diem_snapshot').eq('hiring_mode','owned'));
      const workerIds = [...new Set(assignments.map((a) => a.worker_id).filter(Boolean))];
      const jobIds = [...new Set(assignments.map((a) => a.cts_job_id).filter(Boolean))];
      const [workers,jobs,sourceResult,drafts,people,links,directory,periods] = await Promise.all([
        workerIds.length ? read(supabase.from('workers').select('id,name,email').in('id',workerIds)) : [],
        jobIds.length ? read(supabase.from('cts_jobs').select('id,level_type,city,state').in('id',jobIds)) : [],
        supabase.rpc('get_payroll_cts_week',{p_week_start:week}),
        read(supabase.from('payroll_draft_lines').select('*').eq('week_start',week)),
        read(supabase.from('payroll_gusto_people').select('person_uuid,name,email,worker_type,active').order('name')),
        read(supabase.from('payroll_worker_links').select('*')),
        read(supabase.from('payroll_gusto_directory').select('company_name,company_uuid,imported_at')),
        read(supabase.from('cts_weekly_reports').select('id,week_ending,revision,invoice_id').order('week_ending',{ascending:false})),
      ]);
      if(sourceResult.error) throw sourceResult.error;
      const source=sourceResult.data;
      const reviews=source.lines.map((line) => ({...line,cts_job_candidate_id:line.assignment_id}));
      if (id === requestId.current) setData({assignments,workers,jobs,reviews,drafts,people,links,source,periods,directory:directory[0] || null});
    } catch(e) { if (id === requestId.current) setError(e.message); }
    finally { if (id === requestId.current) setLoading(false); }
  },[allowed,week]);
  useEffect(() => { void load(); },[load]);
  const rows = useMemo(() => {
    const workerMap = new Map(data.workers.map((w) => [w.id,w]));
    const jobMap = new Map(data.jobs.map((j) => [j.id,j]));
    const reviewMap = new Map(data.reviews.map((r) => [r.cts_job_candidate_id,r]));
    const draftMap = new Map(data.drafts.map((d) => [d.assignment_id,d]));
    const linkMap = new Map(data.links.map((l) => [l.worker_id,l]));
    const personMap = new Map(data.people.map((p) => [p.person_uuid,p]));
    const weeklyRegular = new Map();
    data.assignments.forEach((a) => {
      const r = reviewMap.get(a.id);
      if (r && ['locked','approved'].includes(r.status)) weeklyRegular.set(a.worker_id,(weeklyRegular.get(a.worker_id)||0)+Number(r.regular_hours||0));
    });
    return data.assignments.filter((a) => a.candidate_status === 'placed' || reviewMap.has(a.id) || draftMap.has(a.id)).map((assignment) => {
      const review = reviewMap.get(assignment.id), draft = draftMap.get(assignment.id);
      const person = personMap.get(linkMap.get(assignment.worker_id)?.person_uuid);
      return { assignment,review,draft,person,worker:workerMap.get(assignment.worker_id)||{id:assignment.worker_id,name:assignment.name_snapshot||'Unlinked candidate'},job:jobMap.get(assignment.cts_job_id)||{level_type:'Unlinked project'},...payrollLine(assignment,review,draft,person,weeklyRegular.get(assignment.worker_id)) };
    });
  },[data]);
  const filtered = useMemo(() => rows.filter((r) => (!query || [r.worker.name,r.job.level_type,r.person?.name].some((s) => s?.toLowerCase().includes(query.toLowerCase()))) && (filter === 'all' || (filter === 'ready' ? r.ready : !r.ready))),[rows,query,filter]);
  const ownedWorkers = useMemo(() => data.workers.filter((w) => data.assignments.some((a) => a.worker_id === w.id)).sort((a,b) => a.name.localeCompare(b.name)),[data]);
  const linked = ownedWorkers.filter((w) => data.links.some((l) => l.worker_id === w.id)).length;
  const readyRows = rows.filter((r) => r.ready);
  const hours = rows.reduce((s,r) => s+r.regular+r.overtime+r.doubleTime,0);
  const total = readyRows.reduce((s,r) => s+(r.total||0),0);
  const saveDraft = async (row, values) => {
    const payload = { assignment_id:row.assignment.id,week_start:week,...values,source_version:row.review?.version ?? null,source_report_id:row.review?.source_report_id ?? null,source_signature:row.review?.source_signature ?? null,updated_at:new Date().toISOString() };
    const {data:saved,error} = await supabase.from('payroll_draft_lines').upsert(payload,{onConflict:'assignment_id,week_start'}).select().single();
    if (error) throw error;
    if (activeWeek.current !== payload.week_start) return;
    setData((prev) => ({...prev,drafts:[...prev.drafts.filter((d) => d.assignment_id !== saved.assignment_id),saved]}));
    setNotice('Payroll draft saved. Project and profile rates were preserved.');setOpenRow('');
  };
  const saveLink = async (workerId,personId) => {
    if (!personId) {
      const {error} = await supabase.from('payroll_worker_links').delete().eq('worker_id',workerId);if(error) throw error;
      setData((p) => ({...p,links:p.links.filter((l) => l.worker_id !== workerId)}));
    } else {
      const {data:link,error} = await supabase.from('payroll_worker_links').upsert({worker_id:workerId,person_uuid:personId,updated_at:new Date().toISOString()}).select().single();
      if(error) throw new Error(error.code === '23505' ? 'That Gusto record is already linked to another candidate.' : error.message);
      setData((p) => ({...p,links:[...p.links.filter((l) => l.worker_id !== workerId),link]}));
    }
    setNotice('Gusto link saved.');
  };
  const importDirectory = async (e) => {
    const file = e.target.files?.[0]; e.target.value='';if(!file) return;
    setImporting(true);setError('');setNotice('');
    try {
      if(file.size > 2*1024*1024) throw new Error('Directory file is too large.');
      const snapshot = JSON.parse(await file.text());
      const {error} = await supabase.rpc('import_payroll_gusto_directory',{p_snapshot:snapshot});if(error) throw error;
      await load();setNotice('Gusto directory updated. Existing candidate links were preserved.');
    } catch(e) {setError(e.message);} finally {setImporting(false);}
  };
  const exportCsv = () => {
    const url=URL.createObjectURL(new Blob([payrollReviewCsv(filtered,week)],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download=`uts-payroll-review-${week}.csv`;a.click();URL.revokeObjectURL(url);
  };
  if (!allowed) return <main className="payroll-page"><section className="pay-card pay-empty"><ShieldCheck size={28}/><h1>Payroll</h1><p>Supervisor access is required to view payroll information.</p></section></main>;
  return <main className="payroll-page">
    <header className="pay-header"><div><p className="pay-kicker">UTS OPERATIONS · OWNED TEAM</p><h1>Payroll</h1><p className="pay-subtitle">Prepare the week. Match your people. Review every dollar.</p></div><div className="pay-header-actions"><a className="pay-btn" href="https://app.gusto.com" target="_blank" rel="noreferrer">Open Gusto <ExternalLink size={14}/></a><button className="pay-btn" onClick={load} disabled={loading}><RefreshCw size={14} className={loading?'pay-spin':''}/>Refresh view</button></div></header>
    <section className="pay-connection"><div className="pay-provider">G<span>Gusto directory<strong>{data.directory?.company_name || 'No directory imported'}</strong></span></div><div className="pay-connection-detail"><span><i className={data.directory?'connected':''}/>{data.directory?'Directory available':'Awaiting import'}</span><small>Last imported {stamp(data.directory?.imported_at)}</small></div><button className="pay-text-button" onClick={() => setTab('directory')}>{linked} / {ownedWorkers.length} candidates linked <ChevronRight size={14}/></button></section>
    {error && <div role="alert" className="pay-alert error">{error} <button onClick={load}>Retry</button></div>}{notice && <div role="status" className="pay-alert">{notice}</div>}
    <nav className="pay-tabs" aria-label="Payroll views"><button className={tab==='period'?'active':''} onClick={() => setTab('period')}><CalendarDays size={16}/>Pay period</button><button className={tab==='directory'?'active':''} onClick={() => setTab('directory')}><UsersRound size={16}/>Gusto directory</button></nav>
    {tab === 'period' ? <>
      <section className="pay-card pay-period"><div><span className="pay-kicker">WEEKLY PAY PERIOD</span><h2>{dateLabel(week)} <span>—</span> {dateLabel(shiftPayrollWeek(week,6))}</h2><p>Approved source: UTS WEEK ENDING · Payroll preparation only</p></div><div className="pay-period-picker"><button aria-label="Previous week" onClick={() => {setOpenRow('');setWeek(shiftPayrollWeek(week,-7));}}><ChevronLeft size={17}/></button><label><span>Week starting</span><input type="date" value={week} onChange={(e) => {if(e.target.value) {setOpenRow('');setWeek(payrollWeek(e.target.value));}}}/></label><button aria-label="Next week" onClick={() => {setOpenRow('');setWeek(shiftPayrollWeek(week,7));}}><ChevronRight size={17}/></button></div></section>
      <section className="pay-card pay-source-panel"><div className="pay-section-top"><div><h2>UTS WEEK ENDING source</h2><p>{data.source.report ? `Week ending ${dateLabel(data.source.report.week_ending)} · Revision ${data.source.report.revision} · ${data.source.report.invoiced ? 'Invoiced' : 'Saved report'} · UTS fee ${usd(data.source.report.fee)}/hr` : 'No saved CTS weekly report for this period.'}</p></div><div className="pay-header-actions"><label className="pay-source-picker">Saved reports<select aria-label="CTS weekly source period" value={data.periods.some((p) => shiftPayrollWeek(p.week_ending,-6) === week)?week:''} onChange={(e) => {if(e.target.value) {setOpenRow('');setWeek(e.target.value);}}}><option value="">Choose a saved week</option>{data.periods.map((p) => <option key={p.id} value={shiftPayrollWeek(p.week_ending,-6)}>Week ending {p.week_ending}</option>)}</select></label><Link className="pay-btn" to={data.source.report ? `/invoice/cts-weekly?report=${data.source.report.id}` : '/invoice/cts-weekly'}>Open source report <ExternalLink size={14}/></Link></div></div>{data.source.report && <div className="pay-source-matches"><details><summary>{data.source.entries.filter((e) => e.assignment_id).length} / {data.source.entries.length} source rows matched · Review assignment links</summary><SourceMapping source={data.source} assignments={data.assignments} workers={data.workers} jobs={data.jobs} onSaved={load}/></details></div>}</section>
      <div className="pay-metrics">{[{title:'Owned assignments',value:rows.length,icon:UsersRound},{title:'Ready for review',value:readyRows.length,icon:CircleCheck},{title:'Approved hours',value:payrollMoney(hours),icon:Clock3},{title:'Ready rows · estimate',value:usd(total),icon:Wallet}].map((m) => <section className="pay-card pay-metric" key={m.title}><m.icon size={18}/><span>{m.title}</span><strong>{loading?'—':m.value}</strong></section>)}</div>
      <section className="pay-card pay-workspace"><div className="pay-section-top"><div><h2>Weekly preparation</h2><p>{rows.length-readyRows.length} assignments need attention before review.</p></div><button className="pay-btn" disabled={loading||!!error||!filtered.length} onClick={exportCsv}><ArrowDownToLine size={14}/>Export review CSV</button></div>
      <div className="pay-toolbar"><label className="pay-search"><Search size={16}/><input placeholder="Search candidate or project…" aria-label="Search payroll" value={query} onChange={(e) => setQuery(e.target.value)}/></label><div className="pay-filters">{[['all','All'],['attention','Needs attention'],['ready','Ready for review']].map(([id,label]) => <button key={id} className={filter===id?'active':''} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
      {loading ? <div className="pay-empty"><Loader2 className="pay-spin" size={22}/>Loading payroll…</div> : error ? <div className="pay-empty">Payroll data could not be loaded. Retry before reviewing or exporting.</div> : !filtered.length ? <div className="pay-empty"><UsersRound size={26}/><h3>No assignments in this view</h3><p>OWNED placements and assignments with hours for this period appear here.</p><Link to="/cts-jobs">Go to Projects</Link></div> : <div className="pay-table-wrap"><table className="pay-table"><thead><tr><th>Candidate / project</th><th>Gusto / method</th><th>REG / OT / DT</th><th>Rate / hr</th><th>Per Diem total</th><th>Estimated pay</th><th>Review</th></tr></thead><tbody>{filtered.map((r) => <PayrollRow key={`${week}:${r.assignment.id}`} row={r} open={openRow===r.assignment.id} onToggle={() => setOpenRow(openRow===r.assignment.id?'':r.assignment.id)} onSave={saveDraft} onDirectory={() => setTab('directory')}/>)}</tbody></table></div>}
      <footer className="pay-footnote">Source rates subtract the UTS fee from CTS RATE; OT × 1.5 and DT × 2; employer taxes and benefits are excluded. Verify overtime across projects and Per Diem treatment in Gusto. This review CSV does not submit payroll.</footer></section>
    </> : <section className="pay-card pay-workspace"><div className="pay-section-top"><div><h2>Connect your OWNED team</h2><p>Choose the matching Gusto employee or contractor for each UTS candidate.</p></div><div className="pay-header-actions"><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importDirectory}/><button className="pay-btn" disabled={importing||loading} onClick={() => fileInput.current?.click()}><ArrowUpFromLine size={14}/>{importing?'Importing…':'Import Gusto directory'}</button></div></div><p className="pay-directory-note">Directory imports contain names, emails and record IDs for matching. Removed or inactive Gusto records require review before payroll.</p>{loading ? <div className="pay-empty">Loading directory…</div> : <div className="pay-table-wrap"><table className="pay-table pay-directory-table"><thead><tr><th>UTS candidate</th><th>Gusto employee / contractor</th><th>Link status</th></tr></thead><tbody>{ownedWorkers.map((w) => {
      const link = data.links.find((l) => l.worker_id === w.id), person = data.people.find((p) => p.person_uuid === link?.person_uuid);
      return <tr key={w.id}><td><Link className="pay-name" to={`/admin/workers/${w.id}/profile`}>{w.name}</Link><small>{w.email || 'No email'}</small></td><td><WorkerLink key={`${w.id}:${link?.person_uuid || ''}`} worker={w} people={data.people} link={link} onLink={saveLink}/></td><td><span className={`pay-badge ${person?.active?'good':''}`}>{person?.active?'Linked':person?'Inactive record':'Not linked'}</span></td></tr>;
    })}</tbody></table>{!ownedWorkers.length && <div className="pay-empty">No OWNED candidates found.</div>}</div>}</section>}
  </main>;
}
function PayrollRow({row:r,open,onToggle,onSave,onDirectory}) {
  return <><tr><td><Link className="pay-name" to={`/admin/workers/${r.worker.id}/profile`}>{r.worker.name}</Link><Link className="pay-project" to={`/cts-jobs/${r.assignment.cts_job_id}`}>{r.job.level_type}</Link><small>{[r.job.city,r.job.state].filter(Boolean).join(', ')}</small></td><td>{r.person?<><strong>{r.person.name}</strong><small>{r.assignment.payment_type || 'Not set'}</small></>:<button className="pay-text-button" onClick={onDirectory}><Link2 size={14}/>Link candidate</button>}</td><td><strong>{r.approved?`${r.regular} / ${r.overtime} / ${r.doubleTime}`:'—'}</strong><small>{r.approved?`${r.review.official_source.toUpperCase()} · Approved`:'No matched CTS report row'}</small></td><td>{usd(r.rate)}<small>{r.draft?'Saved payroll draft':'CTS RATE − fee'}</small></td><td>{usd(r.perDiem)}<small>Configured: {perDiemValue(r.assignment.per_diem_snapshot)}</small></td><td className="pay-total">{usd(r.total)}</td><td><span className={`pay-badge ${r.ready?'good':''}`}>{r.ready?'Ready for review':'Needs attention'}</span>{r.issues.length>0&&<ul className="pay-issues">{r.issues.map((i)=><li key={i}>{i}</li>)}</ul>}<button className="pay-text-button" onClick={onToggle}>{open?'Close':'Edit draft'}</button></td></tr>{open&&<tr><td colSpan={7}><DraftEditor key={r.draft?.updated_at || 'new'} row={r} onSave={onSave}/><Link className="pay-hours-link" to={r.review?.source_report_id ? `/invoice/cts-weekly?report=${r.review.source_report_id}` : "/invoice/cts-weekly"}>Review CTS weekly source →</Link></td></tr>}</>;
}

function SourceMapping({source,assignments,workers,jobs,onSaved}) {
  return <div className="pay-source-mapping">{source.entries.map((entry) => <SourceMappingRow key={`${source.report.id}:${source.report.revision}:${entry.row_index}:${entry.assignment_id || ''}`} entry={entry} report={source.report} assignments={assignments} workers={workers} jobs={jobs} onSaved={onSaved}/>)}</div>;
}
function SourceMappingRow({entry,report,assignments,workers,jobs,onSaved}) {
  const [selected,setSelected]=useState(entry.assignment_id || '');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <form onSubmit={async(e) => {
    e.preventDefault();setBusy(true);setError('');
    try { const {error}=await supabase.rpc('link_payroll_cts_source',{p_report_id:report.id,p_revision:report.revision,p_source_name:entry.name,p_source_contractor:entry.contractor,p_assignment_id:selected});if(error) throw error;await onSaved(); }
    catch(e) {setError(e.message);}finally{setBusy(false);}
  }}><div><strong>{entry.name}</strong><small>{entry.contractor} · REG {entry.regular} / OT {entry.overtime} · CTS {usd(entry.cts_rate)} → Pay {usd(entry.employee_rate)}</small></div><select aria-label={`OWNED assignment for ${entry.name}`} value={selected} disabled={busy} onChange={(e)=>setSelected(e.target.value)}><option value="">{entry.match==='ambiguous'?'Choose project — multiple matches':'Choose OWNED assignment'}</option>{assignments.map((a)=><option key={a.id} value={a.id}>{workers.find((w)=>w.id===a.worker_id)?.name || a.name_snapshot} · {jobs.find((j)=>j.id===a.cts_job_id)?.level_type || 'Project'}</option>)}</select><button className="pay-btn" disabled={busy || !selected || selected===entry.assignment_id}>{busy?'Saving…':'Save match'}</button>{error&&<span className="pay-error" role="alert">{error}</span>}</form>;
}

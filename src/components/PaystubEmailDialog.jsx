import { useEffect, useRef, useState } from 'react';
import { Download, Mail, X } from 'lucide-react';
import { downloadPaystub, paystubDate } from '../lib/contractorPaystub';
import { PAYSTUB_CC, paystubEmailRequest } from '../lib/paystubEmail';

export default function PaystubEmailDialog({ ids, onClose, onSent }) {
  const dialog=useRef(null);
  const [state,setState]=useState({loading:true,previews:[],error:''});
  const [reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[results,setResults]=useState({}),[reload,setReload]=useState(0),[pdfBusy,setPdfBusy]=useState('');
  const [ccSelf,setCcSelf]=useState(false);
  const key=ids.join(',');
  useEffect(()=>{
    const element=dialog.current;element.showModal();
    return()=>element.close();
  },[]);
  useEffect(()=>{
    let active=true;
    void paystubEmailRequest({action:'preview',ids:key.split(','),ccSelf}).then(data=>{
      if(active)setState({loading:false,previews:data.previews,error:''});
    }).catch(e=>{if(active)setState({loading:false,previews:[],error:e.message});});
    return()=>{active=false;};
  },[key,reload,ccSelf]);
  const eligible=state.previews.filter(p=>!p.blocked&&!results[p.id]?.sent);
  const send=async()=>{
    if(!reviewed||!eligible.length||busy||state.loading||state.error)return;
    setBusy(true);
    // Each request sends one employee’s PDF, with only the optional fixed supervisor CC.
    for(const p of eligible){
      setResults(r=>({...r,[p.id]:{sending:true}}));
      try{
        const result=await paystubEmailRequest({action:'send',id:p.id,reviewed:true,reviewKey:p.reviewKey,ccSelf});
        setResults(r=>({...r,[p.id]:{sent:result.sent,alreadySent:result.alreadySent}}));
      }catch(e){setResults(r=>({...r,[p.id]:{error:e.message}}));}
    }
    setBusy(false);setReviewed(false);onSent();
  };
  const pdf=async p=>{
    setPdfBusy(p.id);
    try{await downloadPaystub(p.stub);}catch(e){setState(s=>({...s,error:e.message}));}finally{setPdfBusy('');}
  };
  return <dialog ref={dialog} className="paystub-email-dialog" aria-labelledby="paystub-email-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}>
    <header><div><h2 id="paystub-email-title">Email final paystubs</h2><p>Each employee receives a separate email with their own PDF.</p></div><button className="pay-btn" aria-label="Close email review" disabled={busy} onClick={onClose}><X size={18}/></button></header>
    <label className="paystub-check"><input type="checkbox" checked={ccSelf} disabled={busy} onChange={e=>{setCcSelf(e.target.checked);setReviewed(false);setState(s=>({...s,loading:true,error:''}));}}/>CC: {PAYSTUB_CC}</label>
    {state.loading?<p role="status">Preparing email review…</p>:<>
      {state.error&&<div className="paystub-error" role="alert">{state.error}<button className="pay-btn" disabled={busy} onClick={()=>{setState(s=>({...s,loading:true,error:''}));setReviewed(false);setReload(n=>n+1);}}>Reload review</button></div>}
      <div className="paystub-email-list">{state.previews.map(p=><article key={p.id} className="paystub-email-item"><h3>{p.stub.worker_name} · {paystubDate(p.stub.period_start)} – {paystubDate(p.stub.period_end)} · v{p.stub.revision}</h3><dl><dt>To</dt><dd>{p.to||'Missing profile email'}</dd>{p.cc?.length>0&&<><dt>CC</dt><dd>{p.cc.join(', ')}</dd></>}<dt>From</dt><dd>{p.from}</dd><dt>Reply to</dt><dd>{p.replyTo}</dd><dt>Subject</dt><dd>{p.subject}</dd><dt>Attachment</dt><dd>{p.filename}</dd></dl><details><summary>Review message</summary><pre>{p.text}</pre></details><button className="pay-btn" disabled={!!pdfBusy||busy} onClick={()=>void pdf(p)}><Download size={14}/>{pdfBusy===p.id?'Preparing…':'Review PDF'}</button>
        {p.blocked&&<p className="paystub-muted">{p.blocked}</p>}{results[p.id]?.sending&&<p role="status">Sending this employee’s email…</p>}{results[p.id]?.sent&&<p className="paystub-mail-success" role="status">{results[p.id].alreadySent?'Already sent; duplicate skipped.':'Accepted by the email provider.'}</p>}{results[p.id]?.error&&<p className="paystub-error" role="alert">{results[p.id].error}</p>}
      </article>)}</div>
      {eligible.length>0&&<label className="paystub-check"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e=>setReviewed(e.target.checked)}/>I reviewed the recipients, messages and final PDFs. Send {eligible.length} separate employee email{eligible.length===1?'':'s'}.</label>}
      <footer><span>Provider acceptance is recorded in the final history; it does not confirm inbox delivery.</span><button className="pay-btn" disabled={busy} onClick={onClose}>Close</button>{eligible.length>0&&<button className="pay-btn primary" disabled={busy||!reviewed||!!state.error} onClick={()=>void send()}><Mail size={15}/>{busy?'Sending…':Object.values(results).some(r=>r.error)?'Retry unconfirmed emails':`Send ${eligible.length} email${eligible.length===1?'':'s'}`}</button>}</footer>
    </>}
  </dialog>;
}

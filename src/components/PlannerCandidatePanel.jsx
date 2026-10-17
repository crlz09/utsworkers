import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { REQUIRED_WORKER_DOCUMENT_TYPES, getWorkerDocumentLabel, getWorkerDocumentStatus } from '../lib/workerDocuments';
import { CERT_TYPES, certificateCategory } from '../lib/onboardingCerts';

export default function PlannerCandidatePanel({ workerId, jobId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [retry, setRetry] = useState(0);
  const fetchData = useCallback(async () => {
    const [documents, screenings, candidates] = await Promise.all([
      supabase.from('worker_documents').select('id,document_type,onboarding_cert_category').eq('worker_id', workerId),
      supabase.from('candidate_screenings').select('id,sent_at,result_received_at').eq('worker_id', workerId).order('received_at', { ascending: false }).limit(1),
      jobId ? supabase.from('cts_job_candidates').select('id,candidate_status').eq('worker_id', workerId).eq('cts_job_id', jobId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (documents.error || screenings.error || candidates.error) throw documents.error || screenings.error || candidates.error;
    let review = null;
    if (candidates.data) {
      const result = await supabase.from('planner_cts_reviews').select('*').eq('candidate_id', candidates.data.id).maybeSingle();
      if (result.error) throw result.error;
      review = result.data;
    }
    return { documents: documents.data || [], screening: screenings.data?.[0], candidate: candidates.data, review };
  }, [workerId, jobId]);
  useEffect(() => {
    let active = true;
    fetchData().then(result => { if (active) { setData(result); setError(''); setNote(result.review?.note || ''); } }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [fetchData, retry]);
  async function transition(status) {
    setBusy(true); setError('');
    try {
      const result = data.review
        ? await supabase.from('planner_cts_reviews').update({ status, note }).eq('id', data.review.id).eq('updated_at', data.review.updated_at).select('*').maybeSingle()
        : await supabase.from('planner_cts_reviews').insert({ candidate_id: data.candidate.id, status, note }).select('*').single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error('Review changed. Refresh candidate readiness before trying again.');
      setData(await fetchData());
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const base = `/admin/workers/${workerId}`;
  return <section className="planner-detail-section planner-readiness">
    <h3>Candidate readiness</h3>
    <div className="planner-workflow-links"><Link to={`${base}/details`}>Candidate directory profile ↗</Link><Link to={`${base}/documents`}>Documents ↗</Link><Link to={`${base}/onboarding/certs`}>Certificates ↗</Link><Link to={`${base}/onboarding`}>Screening & onboarding ↗</Link><Link to={`${base}/cts-form`}>CTS form ↗</Link></div>
    {error && <p role="alert">{error}</p>}
    <button type="button" disabled={busy} onClick={() => setRetry(n => n + 1)}>Refresh candidate readiness</button>
    {!data ? <p>{error ? 'Candidate readiness could not be loaded.' : 'Loading candidate readiness…'}</p> : <>
      <h4>Required documents</h4>
      {[...REQUIRED_WORKER_DOCUMENT_TYPES].map(type => <p key={type}>{getWorkerDocumentStatus(data.documents, type).complete ? '✓ Received' : '○ Missing'} · {getWorkerDocumentLabel(type)}</p>)}
      <h4>Certificates on file</h4>
      <p>Confirm validity and project requirements in the certificate workspace.</p>
      {CERT_TYPES.filter(t => t.value !== 'other').map(type => <span className="planner-readiness-tag" key={type.value}>{data.documents.some(d => certificateCategory(d) === type.value) ? '✓' : '○'} {type.label}</span>)}
      <p>Screening: {data.screening?.result_received_at ? 'Result received — review in onboarding' : data.screening?.sent_at ? 'Sent · awaiting result' : 'Not sent'}</p>
      <h4>CTS submission & approval</h4>
      {!jobId ? <p>Link a CTS project to start a review.</p> : !data.candidate ? <p>Add this candidate to the <Link to={`/cts-jobs/${jobId}`}>CTS project</Link> before submitting for review.</p> : <>
        <p>Internal review: <strong>{data.review?.status.replaceAll('_',' ') || 'Not submitted'}</strong> · Placement: {data.candidate.candidate_status}</p>
        {data.review?.submitted_at && <p>Submitted {new Date(data.review.submitted_at).toLocaleString()}{data.review.reviewed_at ? ` · Reviewed ${new Date(data.review.reviewed_at).toLocaleString()}` : ''}</p>}
        <label className="planner-field">Review note<textarea value={note} maxLength={5000} onChange={e => setNote(e.target.value)} disabled={busy || data.review?.status === 'approved'} /></label>
        <div className="planner-workflow-links">
          {!data.review || data.review.status === 'changes_requested' ? <button type="button" disabled={busy} onClick={() => void transition('pending')}>{data.review ? 'Resubmit for review' : 'Submit for review'}</button> : data.review.status === 'pending' ? <><button type="button" disabled={busy} onClick={() => void transition('approved')}>Approve</button><button type="button" disabled={busy || !note.trim()} onClick={() => void transition('changes_requested')}>Request changes</button></> : null}
        </div><p>Internal team approval. Use the CTS form for external submission and the project workspace for placement.</p>
      </>}
    </>}
  </section>;
}

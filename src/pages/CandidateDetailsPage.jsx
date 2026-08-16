import React, { useEffect, useState } from "react";
import { Copy, FileText, Link2, Loader2, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useParams } from "react-router-dom";
import CandidateWorkspaceTabs from "../components/CandidateWorkspaceTabs";
import UtsTopNavBar from "../components/UtsTopNavBar";
import { supabase } from "../lib/supabase";

const STATUS_OPTIONS = [
  ["completed", "Available"], ["rejected", "Rejected"], ["hold", "Hold"], ["working", "Working"],
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatAddress(worker) {
  return [worker?.address, worker?.city, worker?.state, worker?.zip_code].filter(Boolean).join(", ") || "No address";
}

function Metric({ label, value }) {
  return <div className="details-metric"><span>{label}</span><strong>{value}</strong></div>;
}

export default function CandidateDetailsPage() {
  const { workerId = "" } = useParams();
  const [worker, setWorker] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [feedback, setFeedback] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [workerResult, recruitersResult, permissionsResult] = await Promise.all([
        supabase.from("workers").select("*,trades(name),locations(name)").eq("id", workerId).maybeSingle(),
        supabase.from("recruiters").select("user_id,full_name,email").eq("is_active", true).order("full_name"),
        supabase.from("admin_permissions").select("can_edit_workers").maybeSingle(),
      ]);
      if (!active) return;
      if (workerResult.error) setFeedback(workerResult.error.message || "Could not load candidate details.");
      setWorker(workerResult.data || null);
      setNotes(workerResult.data?.recruiter_notes || "");
      setRecruiters(recruitersResult.data || []);
      setCanEdit(!!permissionsResult.data?.can_edit_workers);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [workerId]);

  const updateWorker = async (patch, kind) => {
    if (!canEdit || saving) return false;
    setSaving(kind); setFeedback("");
    const { error } = await supabase.from("workers").update(patch).eq("id", workerId);
    if (error) setFeedback(error.message || "Could not save candidate details.");
    else setWorker((current) => ({ ...current, ...patch }));
    setSaving("");
    return !error;
  };

  const changeStatus = (status) => updateWorker({ status, status_updated_at: new Date().toISOString() }, "workflow");
  const saveNotes = async () => {
    const now = new Date().toISOString();
    const saved = await updateWorker({ recruiter_notes: notes.trim() || null, recruiter_notes_updated_at: now }, "notes");
    if (saved) setFeedback("Notes saved.");
  };

  const copyText = async (value, label) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setFeedback(`${label} copied.`);
  };

  const statusLabel = STATUS_OPTIONS.find(([value]) => value === worker?.status)?.[1] || worker?.status || "Available";
  const profileUrl = worker?.public_profile_slug ? `${window.location.origin}/profile/${worker.public_profile_slug}` : "";

  return <div className="candidate-details-page">
    <style>{`
      .candidate-details-page{min-height:100vh;background:#f4f6f8;color:#172033;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.candidate-details-shell{width:min(100% - 40px,1180px);margin:0 auto;padding:26px 0 54px}.candidate-details-card{padding:24px;border:1px solid #dfe4ea;border-radius:14px;background:#fff;box-shadow:0 4px 18px rgba(15,23,42,.05);display:grid;gap:20px}.details-overview{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,.8fr);gap:20px}.details-title h1{margin:0 0 12px;font-size:27px}.details-tags{display:flex;gap:8px;flex-wrap:wrap}.details-tag{padding:7px 11px;border-radius:999px;background:#eaf1ff;color:#214f9e;font-weight:800;font-size:13px}.details-tag.dark{background:#172033;color:#fff}.details-experience{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}.details-metric{padding:13px;border:1px solid #dfe4ea;border-radius:10px;background:#f8fafc;display:grid;gap:4px}.details-metric span{color:#6b7b8f;font-size:12px;font-weight:750}.details-metric strong{font-size:18px}.details-contact{padding:16px;border:1px solid #dfe4ea;border-radius:13px;background:#f8fafc;display:grid;gap:10px}.details-contact-line{display:flex;gap:9px;align-items:flex-start;color:#526276}.details-contact-actions{display:flex;gap:8px;margin-top:5px}.details-icon{width:38px;height:38px;border:1px solid #d6dde6;border-radius:8px;background:#fff;color:#425267;display:grid;place-items:center;cursor:pointer}.details-icon:disabled{opacity:.4;cursor:not-allowed}.details-info-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.details-section{padding:18px;border:1px solid #dfe4ea;border-radius:13px;background:#f8fafc;display:grid;gap:14px}.details-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.details-section-head h2{font-size:17px;margin:0}.details-status{padding:6px 10px;border-radius:999px;background:#ede9fe;color:#6d28d9;font-size:12px;font-weight:850}.details-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.details-field{display:grid;gap:6px}.details-field label{font-size:12px;font-weight:800}.details-field select,.details-notes{width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:10px 12px;background:#fff;color:#172033;font:inherit}.details-notes{min-height:140px;resize:vertical}.details-save{width:fit-content;border:0;border-radius:9px;padding:10px 15px;background:#172033;color:#fff;font-weight:800;cursor:pointer}.details-save:disabled{opacity:.55}.details-feedback{font-size:13px;color:#526276;font-weight:700}.details-empty{min-height:320px;display:grid;place-items:center;color:#6b7b8f}@media(max-width:850px){.details-overview{grid-template-columns:1fr}.details-experience,.details-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.candidate-details-shell{width:min(100% - 22px,1180px)}.candidate-details-card{padding:16px}.details-experience,.details-info-grid,.details-fields{grid-template-columns:1fr}}
    `}</style>
    <UtsTopNavBar /><CandidateWorkspaceTabs />
    <main className="candidate-details-shell">
      {loading ? <div className="details-empty"><Loader2 className="spin" size={24} /></div> : !worker ? <div className="details-empty">{feedback || "Candidate not found."}</div> : <section className="candidate-details-card">
        <div className="details-overview"><div className="details-title"><h1>{worker.name || "Unnamed candidate"}</h1><div className="details-tags"><span className="details-tag dark">{worker.trades?.name || "Trade not set"}</span><span className="details-tag">{worker.locations?.name || worker.state || "Location not set"}</span></div><div className="details-experience"><Metric label="Total Experience" value={`${worker.total_experience_years || 0} yrs`} /><Metric label="Industrial" value={`${worker.industrial_experience_years || 0} yrs`} /><Metric label="Commercial" value={`${worker.commercial_experience_years || 0} yrs`} /><Metric label="Residential" value={`${worker.residential_experience_years || 0} yrs`} /></div></div>
          <aside className="details-contact"><div className="details-contact-line"><Phone size={16}/><span>{worker.phone || "No phone"}</span></div><div className="details-contact-line"><Mail size={16}/><span>{worker.email || "No email"}</span></div><div className="details-contact-line"><MapPin size={16}/><span>{formatAddress(worker)}</span></div><div className="details-contact-actions"><button className="details-icon" disabled={!worker.phone} onClick={() => { window.location.href = `tel:${worker.phone}`; }} aria-label="Call candidate"><Phone size={17}/></button><button className="details-icon" disabled={!worker.phone} onClick={() => { window.location.href = `sms:${worker.phone}`; }} aria-label="Text candidate"><MessageCircle size={17}/></button><button className="details-icon" disabled={!worker.email} onClick={() => { window.location.href = `mailto:${worker.email}`; }} aria-label="Email candidate"><Mail size={17}/></button><button className="details-icon" disabled={!worker.email} onClick={() => copyText(worker.email, "Email")} aria-label="Copy email"><Copy size={17}/></button><button className="details-icon" disabled={!profileUrl} onClick={() => copyText(profileUrl, "Profile link")} aria-label="Copy public profile link"><Link2 size={17}/></button></div></aside></div>
        <div className="details-info-grid"><Metric label="Rate" value={worker.rate || "—"} /><Metric label="Per Diem" value={worker.per_diem || "—"} /><Metric label="Notes Updated" value={formatDate(worker.recruiter_notes_updated_at)} /></div>
        <div className="details-info-grid" style={{gridTemplateColumns:"1fr 1fr"}}><Metric label="Registered" value={formatDate(worker.created_at)} /><Metric label="Status Updated" value={formatDate(worker.status_updated_at)} /></div>
        <section className="details-section"><div className="details-section-head"><h2>Workflow</h2><span className="details-status">{statusLabel}</span></div><div className="details-fields"><div className="details-field"><label htmlFor="details-recruiter">Recruiter</label><select id="details-recruiter" value={worker.recruiter_user_id || ""} disabled={!canEdit || !!saving} onChange={(event) => updateWorker({ recruiter_user_id: event.target.value || null }, "workflow")}><option value="">Unassigned</option>{recruiters.map((recruiter) => <option value={recruiter.user_id} key={recruiter.user_id}>{recruiter.full_name || recruiter.email}</option>)}</select></div><div className="details-field"><label htmlFor="details-status">Status</label><select id="details-status" value={worker.status || "completed"} disabled={!canEdit || !!saving} onChange={(event) => changeStatus(event.target.value)}>{STATUS_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div></div></section>
        <section className="details-section"><div className="details-section-head"><h2><FileText size={17}/> Recruiter / Admin Notes</h2></div><textarea className="details-notes" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!canEdit} placeholder="Internal notes about communication, readiness, interview impression, pay expectations, travel flexibility, etc."/><button className="details-save" type="button" disabled={!canEdit || !!saving} onClick={saveNotes}>{saving === "notes" ? "Saving..." : "Save Notes"}</button></section>
        {feedback ? <div className="details-feedback" role="status">{feedback}</div> : null}
      </section>}
    </main>
  </div>;
}

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Users,
  Briefcase,
  Phone,
  MapPin,
  Languages,
  X,
  ExternalLink,
  Trash2,
  Save,
} from "lucide-react";

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #eef4ff; color: #0f172a; }
      input, select, textarea, button { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .page-shell { max-width: 1480px; margin: 0 auto; padding: 24px; display: grid; gap: 20px; }
      .glass-card { background: rgba(255,255,255,0.88); backdrop-filter: blur(10px); border: 1px solid #dbeafe; border-radius: 28px; box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08); }
      .card-pad { padding: 24px; }
      .hero-top, .toolbar-top { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
      .title { margin: 0; font-size: 36px; line-height: 1.04; font-weight: 900; letter-spacing: -0.04em; }
      .subtitle { margin: 8px 0 0 0; color: #475569; font-size: 15px; }
      .btn { border: none; border-radius: 14px; padding: 12px 16px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
      .btn.dark { background: #0f172a; color: #ffffff; }
      .btn.white { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
      .metric-card { padding: 16px; border-radius: 18px; background: #f8fbff; border: 1px solid #dbeafe; }
      .metric-label { font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
      .metric-value { margin-top: 6px; font-size: 26px; font-weight: 900; color: #0f172a; }
      .details-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; margin-top: 18px; }
      .detail-box { padding: 18px; border-radius: 20px; background: #ffffff; border: 1px solid #dbeafe; display: grid; gap: 12px; }
      .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .detail-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; }
      .detail-item-label { font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
      .detail-item-value { margin-top: 6px; font-weight: 900; color: #0f172a; }
      .status-pill { display: inline-flex; align-items: center; padding: 7px 10px; border-radius: 999px; font-size: 12px; font-weight: 900; }
      .toolbar-grid { display: grid; grid-template-columns: 1.2fr 0.9fr 0.9fr 0.9fr; gap: 12px; margin-top: 18px; }
      .field { display: grid; gap: 8px; }
      .field-label { font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
      .input, .select, .textarea { width: 100%; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; border-radius: 14px; padding: 12px 14px; outline: none; }
      .textarea { min-height: 90px; resize: vertical; }
      .table-scroll { overflow-x: auto; margin-top: 18px; }
      table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1520px; }
      thead th { position: sticky; top: 0; background: #eff6ff; color: #1e3a8a; text-align: left; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 12px; border-bottom: 1px solid #bfdbfe; }
      tbody td { background: #ffffff; padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      tbody tr:hover td { background: #f8fbff; }
      .mini-input, .mini-select, .mini-textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px 12px; background: #ffffff; color: #0f172a; }
      .mini-textarea { min-height: 78px; resize: vertical; }
      .row-actions { display: grid; gap: 8px; }
      .icon-btn { border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; border-radius: 12px; padding: 10px 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; justify-content: center; }
      .icon-btn:hover { background: #f8fafc; }
      .feedback-error { color: #991b1b; font-weight: 800; }
      .feedback-success { color: #166534; font-weight: 800; }
      .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: grid; place-items: center; padding: 20px; z-index: 50; }
      .modal-card { width: min(1180px, 100%); max-height: 90vh; overflow: auto; background: #ffffff; border-radius: 24px; border: 1px solid #dbeafe; box-shadow: 0 30px 80px rgba(15, 23, 42, 0.18); padding: 24px; }
      .picker-grid { display: grid; grid-template-columns: 1.1fr 1fr 1fr 1fr; gap: 12px; margin-top: 18px; }
      .worker-list { display: grid; gap: 12px; margin-top: 18px; }
      .worker-card { border: 1px solid #dbeafe; border-radius: 20px; background: #f8fbff; padding: 18px; display: grid; gap: 12px; }
      .worker-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      .worker-tags { display: flex; gap: 8px; flex-wrap: wrap; }
      .pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 999px; background: #dbeafe; color: #0f172a; font-size: 13px; font-weight: 800; }
      .snapshot-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
      .snapshot-box { background: #ffffff; border: 1px solid #dbeafe; border-radius: 14px; padding: 12px; }
      .empty-state { padding: 30px; border-radius: 20px; border: 1px dashed #cbd5e1; background: #f8fafc; color: #64748b; text-align: center; font-weight: 700; }
      @media (max-width: 1180px) { .summary-grid, .toolbar-grid, .snapshot-grid { grid-template-columns: 1fr 1fr; } .details-grid, .picker-grid { grid-template-columns: 1fr; } .detail-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 760px) { .page-shell { padding: 14px; } .title { font-size: 30px; } .summary-grid, .toolbar-grid, .snapshot-grid, .detail-grid { grid-template-columns: 1fr; } }
    `}</style>
  );
}

const EMPTY_ASSIGN_FORM = { local_travelers_snapshot: "Local", english_snapshot: "", on_system_cts: false, rate_snapshot: "", per_diem_snapshot: "", candidate_status: "sourced", notes: "" };

function getJobStatusStyle(status) {
  switch (status) {
    case "filled": return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
    case "closed": return { background: "#e2e8f0", color: "#334155", border: "1px solid #cbd5e1" };
    case "on_hold": return { background: "#ffedd5", color: "#9a3412", border: "1px solid #fdba74" };
    case "active": return { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" };
    default: return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
  }
}

function getCandidateStatusStyle(status) {
  switch (status) {
    case "placed": return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
    case "submitted": return { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" };
    case "rejected": return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
    case "on_hold": return { background: "#ffedd5", color: "#9a3412", border: "1px solid #fdba74" };
    case "interviewed": return { background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" };
    case "interested": return { background: "#ecfccb", color: "#3f6212", border: "1px solid #bef264" };
    case "contacted": return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
    default: return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString();
}

function deriveEnglishLabel(worker) {
  const languages = (worker.worker_languages || []).map((item) => String(item.language_name || "").toLowerCase());
  const hasEnglish = languages.some((lang) => lang.includes("english"));
  const hasSpanish = languages.some((lang) => lang.includes("spanish"));
  if (hasEnglish && hasSpanish) return "Bilingual";
  if (hasEnglish) return "English";
  if (hasSpanish) return "Spanish";
  return "";
}
const deriveLocalTraveler = (worker) => (worker.willing_to_travel ? "Traveler" : "Local");
const deriveLocationLabel = (worker) => worker.locations?.name || "";
const deriveClassLabel = (worker) => worker.trades?.name || "";

function AddCandidateModal({ open, onClose, workers, loadingWorkers, onAddCandidate, currentJobState }) {
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [assigningId, setAssigningId] = useState("");
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    if (!open) { setSearch(""); setTradeFilter(""); setLocationFilter(""); setAvailabilityFilter(""); setAssigningId(""); setDrafts({}); }
  }, [open]);

  const tradeOptions = useMemo(() => [...new Set(workers.map((worker) => worker.trades?.name).filter(Boolean))].sort(), [workers]);
  const locationOptions = useMemo(() => [...new Set(workers.map((worker) => worker.locations?.name).filter(Boolean))].sort(), [workers]);

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers.filter((worker) => {
      const matchesSearch = !q || [worker.name, worker.phone, worker.email, worker.trades?.name, worker.locations?.name, worker.recruiter_notes]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
      const matchesTrade = !tradeFilter || worker.trades?.name === tradeFilter;
      const matchesLocation = !locationFilter || worker.locations?.name === locationFilter;
      const matchesAvailability = !availabilityFilter || String(worker.availability || "") === availabilityFilter;
      return matchesSearch && matchesTrade && matchesLocation && matchesAvailability;
    });
  }, [workers, search, tradeFilter, locationFilter, availabilityFilter]);

  const getDraft = (worker) => drafts[worker.id] || { ...EMPTY_ASSIGN_FORM, local_travelers_snapshot: deriveLocalTraveler(worker), english_snapshot: deriveEnglishLabel(worker), rate_snapshot: "", per_diem_snapshot: "" };
  const updateDraft = (workerId, field, value) => setDrafts((prev) => ({ ...prev, [workerId]: { ...(prev[workerId] || EMPTY_ASSIGN_FORM), [field]: value } }));

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="toolbar-top">
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Add Candidates to Job</h2>
            <p className="subtitle" style={{ marginTop: 8 }}>Pick existing workers and create a CTS-facing snapshot for this specific order.</p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button"><X size={16} />Close</button>
        </div>

        <div className="picker-grid">
          <div className="field"><label className="field-label">Search</label><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone, trade, location..." /></div>
          <div className="field"><label className="field-label">Trade</label><select className="select" value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)}><option value="">All</option>{tradeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <div className="field"><label className="field-label">Location</label><select className="select" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}><option value="">All</option>{locationOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <div className="field"><label className="field-label">Availability</label><select className="select" value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}><option value="">All</option><option value="available_soon">Available Soon</option><option value="on_project">On Project</option><option value="unavailable">Unavailable</option><option value="pending">Pending</option></select></div>
        </div>

        {loadingWorkers ? (
          <div className="empty-state" style={{ marginTop: 18 }}><Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />Loading workers...</div>
        ) : filteredWorkers.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 18 }}>No workers match the current filters.</div>
        ) : (
          <div className="worker-list">
            {filteredWorkers.map((worker) => {
              const draft = getDraft(worker);
              return (
                <div key={worker.id} className="worker-card">
                  <div className="worker-top">
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 900, fontSize: 22 }}>{worker.name}</div>
                      <div className="worker-tags">
                        <span className="pill"><Briefcase size={14} />{deriveClassLabel(worker) || "No class"}</span>
                        <span className="pill"><MapPin size={14} />{deriveLocationLabel(worker) || "No location"}</span>
                        <span className="pill"><Languages size={14} />{deriveEnglishLabel(worker) || "Unknown"}</span>
                        <span className="pill"><Phone size={14} />{worker.phone || "No phone"}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "start" }}>
                      {worker.public_profile_slug ? <button className="icon-btn" type="button" onClick={() => window.open(`/profile/${worker.public_profile_slug}`, "_blank")}><ExternalLink size={14} />Public Profile</button> : null}
                      <button className="btn dark" type="button" disabled={assigningId === worker.id} onClick={async () => { setAssigningId(worker.id); await onAddCandidate(worker, draft, currentJobState); setAssigningId(""); }}>
                        {assigningId === worker.id ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}Add to Job
                      </button>
                    </div>
                  </div>

                  <div className="snapshot-grid">
                    <div className="snapshot-box"><div className="field-label">Class</div><input className="mini-input" value={deriveClassLabel(worker)} readOnly /></div>
                    <div className="snapshot-box"><div className="field-label">Local / Traveler</div><select className="mini-select" value={draft.local_travelers_snapshot} onChange={(e) => updateDraft(worker.id, "local_travelers_snapshot", e.target.value)}><option value="Local">Local</option><option value="Traveler">Traveler</option></select></div>
                    <div className="snapshot-box"><div className="field-label">English</div><input className="mini-input" value={draft.english_snapshot} onChange={(e) => updateDraft(worker.id, "english_snapshot", e.target.value)} placeholder="40% / Bilingual / English" /></div>
                    <div className="snapshot-box"><div className="field-label">On System (CTS)</div><select className="mini-select" value={draft.on_system_cts ? "yes" : "no"} onChange={(e) => updateDraft(worker.id, "on_system_cts", e.target.value === "yes")}><option value="no">No</option><option value="yes">Yes</option></select></div>
                    <div className="snapshot-box"><div className="field-label">Rate</div><input className="mini-input" value={draft.rate_snapshot} onChange={(e) => updateDraft(worker.id, "rate_snapshot", e.target.value)} placeholder="35.00" /></div>
                    <div className="snapshot-box"><div className="field-label">Per Diem</div><input className="mini-input" value={draft.per_diem_snapshot} onChange={(e) => updateDraft(worker.id, "per_diem_snapshot", e.target.value)} placeholder="$10/HR or $125/day" /></div>
                    <div className="snapshot-box"><div className="field-label">Stage</div><select className="mini-select" value={draft.candidate_status} onChange={(e) => updateDraft(worker.id, "candidate_status", e.target.value)}><option value="sourced">Sourced</option><option value="contacted">Contacted</option><option value="interested">Interested</option><option value="interviewed">Interviewed</option><option value="submitted">Submitted</option><option value="placed">Placed</option><option value="rejected">Rejected</option><option value="on_hold">On Hold</option></select></div>
                    <div className="snapshot-box"><div className="field-label">Location Snapshot</div><input className="mini-input" value={deriveLocationLabel(worker)} readOnly /></div>
                  </div>

                  <div className="field">
                    <label className="field-label">Notes</label>
                    <textarea className="mini-textarea" value={draft.notes} onChange={(e) => updateDraft(worker.id, "notes", e.target.value)} placeholder="Why this worker is a fit for this order..." />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CtsJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [jobCandidates, setJobCandidates] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingIds, setSavingIds] = useState({});
  const [deleteIds, setDeleteIds] = useState({});

  const load = async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });
    const [jobRes, candidatesRes] = await Promise.all([
      supabase.from("cts_jobs").select("*").eq("id", jobId).maybeSingle(),
      supabase.from("cts_job_candidates").select("*").eq("cts_job_id", jobId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    ]);

    if (jobRes.error) { setFeedback({ error: jobRes.error.message || "Could not load CTS job.", success: "" }); setLoading(false); return; }
    if (!jobRes.data) { setFeedback({ error: "CTS job not found.", success: "" }); setLoading(false); return; }
    if (candidatesRes.error) { setFeedback({ error: candidatesRes.error.message || "Could not load assigned candidates.", success: "" }); setLoading(false); return; }

    setJob(jobRes.data);
    setJobCandidates(candidatesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [jobId]);

  const loadWorkers = async () => {
    setLoadingWorkers(true);
    const { data, error } = await supabase.from("workers").select(`*, trades(name), locations(name), worker_languages(language_name)`).order("name", { ascending: true });
    if (error) { setFeedback({ error: error.message || "Could not load workers.", success: "" }); setWorkers([]); setLoadingWorkers(false); return; }
    setWorkers(data || []);
    setLoadingWorkers(false);
  };

  const openPicker = async () => { setPickerOpen(true); if (!workers.length) await loadWorkers(); };

  const assignedWorkerIds = useMemo(() => new Set(jobCandidates.map((item) => item.worker_id).filter(Boolean)), [jobCandidates]);
  const availableWorkersForPicker = useMemo(() => workers.filter((worker) => !assignedWorkerIds.has(worker.id)), [workers, assignedWorkerIds]);

  const addCandidateToJob = async (worker, draft, currentJobState) => {
    if (!currentJobState) return;
    const payload = {
      cts_job_id: currentJobState.id,
      worker_id: worker.id,
      name_snapshot: worker.name || "",
      phone_snapshot: worker.phone || null,
      class_snapshot: deriveClassLabel(worker) || null,
      local_travelers_snapshot: draft.local_travelers_snapshot || null,
      location_snapshot: deriveLocationLabel(worker) || null,
      english_snapshot: draft.english_snapshot || null,
      on_system_cts: !!draft.on_system_cts,
      rate_snapshot: draft.rate_snapshot === "" || draft.rate_snapshot === null ? null : Number(draft.rate_snapshot),
      per_diem_snapshot: draft.per_diem_snapshot?.trim() || null,
      candidate_status: draft.candidate_status || "sourced",
      notes: draft.notes?.trim() || null,
      sort_order: jobCandidates.length + 1,
      submitted_at: draft.candidate_status === "submitted" ? new Date().toISOString() : null,
      placed_at: draft.candidate_status === "placed" ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("cts_job_candidates").insert(payload);
    if (error) { setFeedback({ error: error.message || "Could not assign worker to CTS job.", success: "" }); return; }
    setFeedback({ error: "", success: "Candidate added to CTS job." });
    load();
  };

  const updateCandidateField = (candidateId, field, value) => {
    setJobCandidates((prev) => prev.map((item) => item.id === candidateId ? { ...item, [field]: value } : item));
  };

  const saveCandidateRow = async (row) => {
    setSavingIds((prev) => ({ ...prev, [row.id]: true }));
    setFeedback({ error: "", success: "" });
    const payload = {
      name_snapshot: row.name_snapshot?.trim() || "",
      phone_snapshot: row.phone_snapshot?.trim() || null,
      class_snapshot: row.class_snapshot?.trim() || null,
      local_travelers_snapshot: row.local_travelers_snapshot?.trim() || null,
      location_snapshot: row.location_snapshot?.trim() || null,
      english_snapshot: row.english_snapshot?.trim() || null,
      on_system_cts: !!row.on_system_cts,
      rate_snapshot: row.rate_snapshot === "" || row.rate_snapshot === null ? null : Number(row.rate_snapshot),
      per_diem_snapshot: row.per_diem_snapshot?.trim() || null,
      candidate_status: row.candidate_status,
      notes: row.notes?.trim() || null,
      submitted_at: row.candidate_status === "submitted" && !row.submitted_at ? new Date().toISOString() : row.submitted_at || null,
      placed_at: row.candidate_status === "placed" && !row.placed_at ? new Date().toISOString() : row.placed_at || null,
    };
    const { error } = await supabase.from("cts_job_candidates").update(payload).eq("id", row.id);
    setSavingIds((prev) => ({ ...prev, [row.id]: false }));
    if (error) { setFeedback({ error: error.message || "Could not save candidate row.", success: "" }); return; }
    setFeedback({ error: "", success: "Candidate row updated." });
    load();
  };

  const removeCandidate = async (row) => {
    const confirmed = window.confirm(`Remove "${row.name_snapshot}" from this CTS job?`);
    if (!confirmed) return;
    setDeleteIds((prev) => ({ ...prev, [row.id]: true }));
    setFeedback({ error: "", success: "" });
    const { error } = await supabase.from("cts_job_candidates").delete().eq("id", row.id);
    setDeleteIds((prev) => ({ ...prev, [row.id]: false }));
    if (error) { setFeedback({ error: error.message || "Could not remove candidate.", success: "" }); return; }
    setFeedback({ error: "", success: "Candidate removed from CTS job." });
    load();
  };

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    return jobCandidates.filter((row) => {
      const matchesSearch = !q || [row.name_snapshot, row.phone_snapshot, row.class_snapshot, row.local_travelers_snapshot, row.location_snapshot, row.english_snapshot, row.per_diem_snapshot, row.notes]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
      const matchesStatus = !candidateStatusFilter || row.candidate_status === candidateStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobCandidates, candidateSearch, candidateStatusFilter]);

  const placedCount = useMemo(() => jobCandidates.filter((item) => item.candidate_status === "placed").length, [jobCandidates]);

  if (loading) {
    return (<><PageStyles /><UtsTopNavBar /><div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div style={{ fontWeight: 900, color: "#1d4ed8" }}><Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />Loading CTS job...</div></div></>);
  }

  if (!job) {
    return (<><PageStyles /><UtsTopNavBar /><div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}><div className="glass-card card-pad" style={{ maxWidth: 760 }}><div className="feedback-error">{feedback.error || "CTS job not found."}</div></div></div></>);
  }

  return (
    <>
      <PageStyles />
      <UtsTopNavBar />
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)" }}>
        <div className="page-shell">
          <div className="glass-card card-pad">
            <div className="hero-top">
              <div>
                <h1 className="title">{job.level_type || "CTS Job Detail"}</h1>
                <p className="subtitle">Manage candidate assignments and keep a clean CTS-facing submission table for this order.</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn white" type="button" onClick={() => navigate("/cts-jobs")}><ArrowLeft size={16} />Back to Jobs</button>
                <button className="btn dark" type="button" onClick={openPicker}><Plus size={16} />Add Candidates</button>
              </div>
            </div>

            <div className="summary-grid">
              <div className="metric-card"><div className="metric-label">Requested Qty</div><div className="metric-value">{job.qty ?? 0}</div></div>
              <div className="metric-card"><div className="metric-label">Assigned Candidates</div><div className="metric-value">{jobCandidates.length}</div></div>
              <div className="metric-card"><div className="metric-label">Placed</div><div className="metric-value">{placedCount}</div></div>
              <div className="metric-card"><div className="metric-label">Remaining to Fill</div><div className="metric-value">{Math.max(Number(job.qty || 0) - placedCount, 0)}</div></div>
            </div>

            <div className="details-grid">
              <div className="detail-box">
                <div style={{ fontWeight: 900, fontSize: 22 }}>Order Snapshot</div>
                <div className="detail-grid">
                  <div className="detail-item"><div className="detail-item-label">City</div><div className="detail-item-value">{job.city || "—"}</div></div>
                  <div className="detail-item"><div className="detail-item-label">State</div><div className="detail-item-value">{job.state || "—"}</div></div>
                  <div className="detail-item"><div className="detail-item-label">Start</div><div className="detail-item-value">{job.start_text || "—"}</div></div>
                  <div className="detail-item"><div className="detail-item-label">Language</div><div className="detail-item-value">{job.language_requirement || "—"}</div></div>
                  <div className="detail-item"><div className="detail-item-label">BD Rep</div><div className="detail-item-value">{job.bd_rep || "—"}</div></div>
                  <div className="detail-item"><div className="detail-item-label">Order Date</div><div className="detail-item-value">{formatDate(job.order_date)}</div></div>
                </div>
                <div className="detail-item" style={{ marginTop: 4 }}>
                  <div className="detail-item-label">Details</div>
                  <div className="detail-item-value" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{job.details || "—"}</div>
                </div>
              </div>

              <div className="detail-box">
                <div style={{ fontWeight: 900, fontSize: 22 }}>Internal View</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span className="status-pill" style={getJobStatusStyle(job.status)}>{job.status}</span></div>
                <div className="detail-item" style={{ marginTop: 4 }}><div className="detail-item-label">Client</div><div className="detail-item-value">{job.client_name || "CTS"}</div></div>
                <div className="detail-item"><div className="detail-item-label">Job Code</div><div className="detail-item-value">{job.job_code || "—"}</div></div>
                <div className="detail-item"><div className="detail-item-label">Internal Notes</div><div className="detail-item-value" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{job.internal_notes || "—"}</div></div>
              </div>
            </div>
          </div>

          <div className="glass-card card-pad">
            <div className="toolbar-top">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Users size={20} /><div style={{ fontWeight: 900, fontSize: 22 }}>Assigned Candidates ({filteredCandidates.length})</div></div>
            </div>

            <div className="toolbar-grid">
              <div className="field"><label className="field-label">Search</label><input className="input" value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} placeholder="Name, class, phone, location..." /></div>
              <div className="field"><label className="field-label">Candidate Status</label><select className="select" value={candidateStatusFilter} onChange={(e) => setCandidateStatusFilter(e.target.value)}><option value="">All</option><option value="sourced">Sourced</option><option value="contacted">Contacted</option><option value="interested">Interested</option><option value="interviewed">Interviewed</option><option value="submitted">Submitted</option><option value="placed">Placed</option><option value="rejected">Rejected</option><option value="on_hold">On Hold</option></select></div>
              <div className="field"><label className="field-label">Quick Summary</label><div className="input" style={{ display: "flex", alignItems: "center" }}>{placedCount} placed / {job.qty ?? 0} requested</div></div>
              <div className="field"><label className="field-label">Action</label><button className="btn dark" type="button" onClick={openPicker}><Plus size={16} />Add More Candidates</button></div>
            </div>

            {feedback.error ? <div className="feedback-error" style={{ marginTop: 16 }}>{feedback.error}</div> : null}
            {feedback.success ? <div className="feedback-success" style={{ marginTop: 16 }}>{feedback.success}</div> : null}

            {filteredCandidates.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 18 }}>No candidates assigned to this job yet.</div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Phone</th><th>Class</th><th>Local / Travelers</th><th>Location</th><th>English</th><th>On System (CTS)</th><th>Rate</th><th>Per Diem</th><th>Stage</th><th>Notes</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((row) => (
                      <tr key={row.id}>
                        <td><input className="mini-input" value={row.name_snapshot || ""} onChange={(e) => updateCandidateField(row.id, "name_snapshot", e.target.value)} /></td>
                        <td><input className="mini-input" value={row.phone_snapshot || ""} onChange={(e) => updateCandidateField(row.id, "phone_snapshot", e.target.value)} /></td>
                        <td><input className="mini-input" value={row.class_snapshot || ""} onChange={(e) => updateCandidateField(row.id, "class_snapshot", e.target.value)} /></td>
                        <td><select className="mini-select" value={row.local_travelers_snapshot || ""} onChange={(e) => updateCandidateField(row.id, "local_travelers_snapshot", e.target.value)}><option value="">—</option><option value="Local">Local</option><option value="Traveler">Traveler</option></select></td>
                        <td><input className="mini-input" value={row.location_snapshot || ""} onChange={(e) => updateCandidateField(row.id, "location_snapshot", e.target.value)} /></td>
                        <td><input className="mini-input" value={row.english_snapshot || ""} onChange={(e) => updateCandidateField(row.id, "english_snapshot", e.target.value)} placeholder="40% / Bilingual / English" /></td>
                        <td><select className="mini-select" value={row.on_system_cts ? "yes" : "no"} onChange={(e) => updateCandidateField(row.id, "on_system_cts", e.target.value === "yes")}><option value="no">No</option><option value="yes">Yes</option></select></td>
                        <td><input className="mini-input" value={row.rate_snapshot ?? ""} onChange={(e) => updateCandidateField(row.id, "rate_snapshot", e.target.value)} placeholder="35.00" /></td>
                        <td><input className="mini-input" value={row.per_diem_snapshot || ""} onChange={(e) => updateCandidateField(row.id, "per_diem_snapshot", e.target.value)} placeholder="$10/HR" /></td>
                        <td>
                          <div style={{ display: "grid", gap: 8 }}>
                            <span className="status-pill" style={getCandidateStatusStyle(row.candidate_status)}>{row.candidate_status}</span>
                            <select className="mini-select" value={row.candidate_status} onChange={(e) => updateCandidateField(row.id, "candidate_status", e.target.value)}>
                              <option value="sourced">Sourced</option><option value="contacted">Contacted</option><option value="interested">Interested</option><option value="interviewed">Interviewed</option><option value="submitted">Submitted</option><option value="placed">Placed</option><option value="rejected">Rejected</option><option value="on_hold">On Hold</option>
                            </select>
                          </div>
                        </td>
                        <td style={{ minWidth: 220 }}><textarea className="mini-textarea" value={row.notes || ""} onChange={(e) => updateCandidateField(row.id, "notes", e.target.value)} placeholder="CTS submission notes..." /></td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" type="button" onClick={() => saveCandidateRow(row)} disabled={!!savingIds[row.id]}>{savingIds[row.id] ? <Loader2 className="spin" size={14} /> : <Save size={14} />}Save</button>
                            <button className="icon-btn" type="button" onClick={() => removeCandidate(row)} disabled={!!deleteIds[row.id]}>{deleteIds[row.id] ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddCandidateModal open={pickerOpen} onClose={() => setPickerOpen(false)} workers={availableWorkersForPicker} loadingWorkers={loadingWorkers} onAddCandidate={addCandidateToJob} currentJobState={job} />
      <GoToTopButton />
    </>
  );
}

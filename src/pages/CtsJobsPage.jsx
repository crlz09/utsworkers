import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import {
  Briefcase,
  Plus,
  Search,
  Loader2,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #eef4ff; color: #0f172a; }
      input, select, textarea, button { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .jobs-shell { max-width: 1440px; margin: 0 auto; padding: 24px; display: grid; gap: 20px; }
      .glass-card { background: rgba(255,255,255,0.88); backdrop-filter: blur(10px); border: 1px solid #dbeafe; border-radius: 28px; box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08); }
      .hero-card, .toolbar-card, .table-card { padding: 24px; }
      .hero-top, .toolbar-top, .table-top { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
      .hero-title { margin: 0; font-size: 40px; line-height: 1.02; font-weight: 900; letter-spacing: -0.04em; }
      .hero-subtitle { margin: 10px 0 0 0; color: #475569; font-size: 16px; }
      .btn { border: none; border-radius: 14px; padding: 12px 16px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: 0.18s ease; }
      .btn.dark { background: #0f172a; color: #ffffff; }
      .btn.white { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; }
      .btn:hover { transform: translateY(-1px); }
      .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 20px; }
      .metric-card { padding: 16px; border-radius: 18px; background: #f8fbff; border: 1px solid #dbeafe; }
      .metric-label { font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
      .metric-value { margin-top: 6px; font-size: 28px; font-weight: 900; color: #0f172a; }
      .toolbar-grid { display: grid; grid-template-columns: 1.3fr repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
      .field { display: grid; gap: 8px; }
      .field-label { font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
      .input, .select, .textarea { width: 100%; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; border-radius: 14px; padding: 12px 14px; outline: none; }
      .textarea { min-height: 120px; resize: vertical; }
      .table-scroll { overflow-x: auto; margin-top: 18px; }
      table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1280px; }
      thead th { position: sticky; top: 0; z-index: 1; background: #eff6ff; color: #1e3a8a; text-align: left; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 12px; border-bottom: 1px solid #bfdbfe; }
      tbody td { background: #ffffff; padding: 14px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      tbody tr:hover td { background: #f8fbff; }
      .status-pill, .priority-pill { display: inline-flex; align-items: center; padding: 7px 10px; border-radius: 999px; font-size: 12px; font-weight: 900; white-space: nowrap; }
      .table-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .icon-btn { border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; border-radius: 12px; padding: 10px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 800; }
      .icon-btn:hover { background: #f8fafc; }
      .empty-state { padding: 30px; border-radius: 20px; border: 1px dashed #cbd5e1; background: #f8fafc; color: #64748b; text-align: center; font-weight: 700; }
      .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: grid; place-items: center; padding: 20px; z-index: 50; }
      .modal-card { width: min(900px, 100%); max-height: 90vh; overflow: auto; background: #ffffff; border-radius: 24px; border: 1px solid #dbeafe; box-shadow: 0 30px 80px rgba(15, 23, 42, 0.18); padding: 24px; }
      .modal-grid { display: grid; grid-template-columns: 120px 1.3fr 0.8fr 0.8fr; gap: 14px; margin-top: 18px; }
      .span-4 { grid-column: span 4; }
      .helper-text { color: #64748b; font-size: 13px; line-height: 1.5; }
      @media (max-width: 1100px) { .summary-grid { grid-template-columns: 1fr 1fr; } .toolbar-grid, .modal-grid { grid-template-columns: 1fr 1fr; } .span-4 { grid-column: span 2; } }
      @media (max-width: 760px) { .jobs-shell { padding: 14px; } .hero-title { font-size: 32px; } .summary-grid, .toolbar-grid, .modal-grid { grid-template-columns: 1fr; } .span-4 { grid-column: span 1; } }
    `}</style>
  );
}

const EMPTY_FORM = {
  qty: 1, level_type: "", city: "", state: "", start_text: "", details: "",
  language_requirement: "", bd_rep: "", order_date: "", client_name: "CTS",
  job_code: "", status: "open", priority: "normal", internal_notes: "",
};

function getStatusStyle(status) {
  switch (status) {
    case "filled": return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
    case "closed": return { background: "#e2e8f0", color: "#334155", border: "1px solid #cbd5e1" };
    case "on_hold": return { background: "#ffedd5", color: "#9a3412", border: "1px solid #fdba74" };
    case "active": return { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" };
    default: return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
  }
}

function getPriorityStyle(priority) {
  switch (priority) {
    case "urgent": return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
    case "high": return { background: "#ffedd5", color: "#9a3412", border: "1px solid #fdba74" };
    case "low": return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
    default: return { background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" };
  }
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function JobModal({ open, mode, form, setForm, onClose, onSave, saving }) {
  if (!open) return null;
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="toolbar-top">
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
              {mode === "edit" ? "Edit CTS Job" : "New CTS Job"}
            </h2>
            <p className="hero-subtitle" style={{ marginTop: 8 }}>
              Capture the order exactly as CTS sends it, plus your internal operating notes.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button">
            <X size={16} /> Close
          </button>
        </div>

        <div className="modal-grid">
          <div className="field">
            <label className="field-label">Qty</label>
            <input className="input" type="number" min="0" value={form.qty} onChange={(e) => update("qty", Number(e.target.value || 0))} />
          </div>
          <div className="field">
            <label className="field-label">Level / Type</label>
            <input className="input" value={form.level_type} onChange={(e) => update("level_type", e.target.value)} placeholder="7 High JM Electricians" />
          </div>
          <div className="field">
            <label className="field-label">City</label>
            <input className="input" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Indianapolis" />
          </div>
          <div className="field">
            <label className="field-label">State</label>
            <input className="input" value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="IN" />
          </div>
          <div className="field">
            <label className="field-label">Start</label>
            <input className="input" value={form.start_text} onChange={(e) => update("start_text", e.target.value)} placeholder="ASAP / Pending / Early May" />
          </div>
          <div className="field">
            <label className="field-label">Language</label>
            <input className="input" value={form.language_requirement} onChange={(e) => update("language_requirement", e.target.value)} placeholder="English Only / Spanish OK / Ratio" />
          </div>
          <div className="field">
            <label className="field-label">BD Rep</label>
            <input className="input" value={form.bd_rep} onChange={(e) => update("bd_rep", e.target.value)} placeholder="Chelsea / Connie / Michelle" />
          </div>
          <div className="field">
            <label className="field-label">Order Date</label>
            <input className="input" type="date" value={form.order_date} onChange={(e) => update("order_date", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Client Name</label>
            <input className="input" value={form.client_name} onChange={(e) => update("client_name", e.target.value)} placeholder="CTS" />
          </div>
          <div className="field">
            <label className="field-label">Job Code</label>
            <input className="input" value={form.job_code} onChange={(e) => update("job_code", e.target.value)} placeholder="Optional internal ref" />
          </div>
          <div className="field">
            <label className="field-label">Status</label>
            <select className="select" value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="open">Open</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="filled">Filled</option><option value="closed">Closed</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Priority</label>
            <select className="select" value={form.priority} onChange={(e) => update("priority", e.target.value)}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="field span-4">
            <label className="field-label">Details</label>
            <textarea className="textarea" value={form.details} onChange={(e) => update("details", e.target.value)} placeholder="Rigid / lifts / Walmart nights / bilingual / rough-in ..." />
          </div>
          <div className="field span-4">
            <label className="field-label">Internal Notes</label>
            <textarea className="textarea" value={form.internal_notes} onChange={(e) => update("internal_notes", e.target.value)} placeholder="Notes only visible to your internal team." />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <div className="helper-text">Tip: keep Level / Type and Details as close as possible to the client source sheet.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn white" onClick={onClose} type="button">Cancel</button>
            <button className="btn dark" onClick={onSave} type="button" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
              {mode === "edit" ? "Save Changes" : "Create Job"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CtsJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [jobCounts, setJobCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [bdRepFilter, setBdRepFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });

  const load = async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });
    const [jobsRes, candidatesRes] = await Promise.all([
      supabase.from("cts_jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("cts_job_candidates").select("id, cts_job_id"),
    ]);
    if (jobsRes.error) {
      setFeedback({ error: jobsRes.error.message || "Could not load CTS jobs.", success: "" });
      setJobs([]); setJobCounts({}); setLoading(false); return;
    }
    const counts = {};
    (candidatesRes.data || []).forEach((row) => { counts[row.cts_job_id] = (counts[row.cts_job_id] || 0) + 1; });
    setJobs(jobsRes.data || []);
    setJobCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setModalMode("create"); setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (job) => {
    setModalMode("edit");
    setEditingId(job.id);
    setForm({
      qty: job.qty ?? 1, level_type: job.level_type || "", city: job.city || "", state: job.state || "",
      start_text: job.start_text || "", details: job.details || "", language_requirement: job.language_requirement || "",
      bd_rep: job.bd_rep || "", order_date: job.order_date || "", client_name: job.client_name || "CTS",
      job_code: job.job_code || "", status: job.status || "open", priority: job.priority || "normal",
      internal_notes: job.internal_notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.level_type.trim()) { setFeedback({ error: "Level / Type is required.", success: "" }); return; }
    setSaving(true); setFeedback({ error: "", success: "" });

    const payload = {
      qty: Number(form.qty || 0), level_type: form.level_type.trim(), city: form.city.trim() || null,
      state: form.state.trim() || null, start_text: form.start_text.trim() || null, details: form.details.trim() || null,
      language_requirement: form.language_requirement.trim() || null, bd_rep: form.bd_rep.trim() || null,
      order_date: form.order_date || null, client_name: form.client_name.trim() || "CTS",
      job_code: form.job_code.trim() || null, status: form.status, priority: form.priority,
      internal_notes: form.internal_notes.trim() || null,
    };

    let res;
    if (modalMode === "edit" && editingId) res = await supabase.from("cts_jobs").update(payload).eq("id", editingId);
    else res = await supabase.from("cts_jobs").insert(payload);

    setSaving(false);
    if (res.error) { setFeedback({ error: res.error.message || "Could not save CTS job.", success: "" }); return; }
    setModalOpen(false); setForm(EMPTY_FORM); setEditingId(null);
    setFeedback({ error: "", success: modalMode === "edit" ? "CTS job updated." : "CTS job created." });
    load();
  };

  const handleDelete = async (job) => {
    const confirmed = window.confirm(`Delete "${job.level_type}"? This will also remove its assigned candidates.`);
    if (!confirmed) return;
    setFeedback({ error: "", success: "" });
    const { error } = await supabase.from("cts_jobs").delete().eq("id", job.id);
    if (error) { setFeedback({ error: error.message || "Could not delete CTS job.", success: "" }); return; }
    setFeedback({ error: "", success: "CTS job deleted." });
    load();
  };

  const handleDuplicate = async (job) => {
    const payload = {
      qty: job.qty ?? 1, level_type: job.level_type, city: job.city, state: job.state, start_text: job.start_text,
      details: job.details, language_requirement: job.language_requirement, bd_rep: job.bd_rep, order_date: job.order_date,
      client_name: job.client_name || "CTS", job_code: null, status: "open", priority: job.priority || "normal",
      internal_notes: job.internal_notes,
    };
    const { error } = await supabase.from("cts_jobs").insert(payload);
    if (error) { setFeedback({ error: error.message || "Could not duplicate CTS job.", success: "" }); return; }
    setFeedback({ error: "", success: "CTS job duplicated." });
    load();
  };

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch = !q || [job.level_type, job.city, job.state, job.start_text, job.details, job.language_requirement, job.bd_rep, job.client_name, job.job_code]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
      const matchesStatus = !statusFilter || job.status === statusFilter;
      const matchesState = !stateFilter || String(job.state || "").toLowerCase() === stateFilter.toLowerCase();
      const matchesBdRep = !bdRepFilter || String(job.bd_rep || "").toLowerCase() === bdRepFilter.toLowerCase();
      const matchesLanguage = !languageFilter || String(job.language_requirement || "").toLowerCase().includes(languageFilter.toLowerCase());
      return matchesSearch && matchesStatus && matchesState && matchesBdRep && matchesLanguage;
    });
  }, [jobs, search, statusFilter, stateFilter, bdRepFilter, languageFilter]);

  const summary = useMemo(() => {
    const total = jobs.length;
    const open = jobs.filter((job) => job.status === "open" || job.status === "active").length;
    const filled = jobs.filter((job) => job.status === "filled").length;
    const totalQty = jobs.reduce((sum, job) => sum + Number(job.qty || 0), 0);
    return { total, open, filled, totalQty };
  }, [jobs]);

  const distinctStates = useMemo(() => [...new Set(jobs.map((job) => job.state).filter(Boolean))].sort(), [jobs]);
  const distinctBdReps = useMemo(() => [...new Set(jobs.map((job) => job.bd_rep).filter(Boolean))].sort(), [jobs]);

  return (
    <>
      <PageStyles />
      <UtsTopNavBar />
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)" }}>
        <div className="jobs-shell">
          <div className="glass-card hero-card">
            <div className="hero-top">
              <div>
                <h1 className="hero-title">CTS Jobs Dashboard</h1>
                <p className="hero-subtitle">Read, add, edit and organize all active CTS orders in one clean operating system.</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn white" type="button" onClick={load}><Filter size={16} />Refresh</button>
                <button className="btn dark" type="button" onClick={openCreate}><Plus size={16} />New Job</button>
              </div>
            </div>

            <div className="summary-grid">
              <div className="metric-card"><div className="metric-label">Total Jobs</div><div className="metric-value">{summary.total}</div></div>
              <div className="metric-card"><div className="metric-label">Open / Active</div><div className="metric-value">{summary.open}</div></div>
              <div className="metric-card"><div className="metric-label">Filled</div><div className="metric-value">{summary.filled}</div></div>
              <div className="metric-card"><div className="metric-label">Total Requested Qty</div><div className="metric-value">{summary.totalQty}</div></div>
            </div>
          </div>

          <div className="glass-card toolbar-card">
            <div className="toolbar-top">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Search size={18} /><div style={{ fontWeight: 900, fontSize: 20 }}>Search & Filters</div></div>
              <button className="btn white" type="button" onClick={() => { setSearch(""); setStatusFilter(""); setStateFilter(""); setBdRepFilter(""); setLanguageFilter(""); }}>
                <X size={16} />Clear Filters
              </button>
            </div>

            <div className="toolbar-grid">
              <div className="field"><label className="field-label">Search</label><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Level / Type, city, details, BD rep..." /></div>
              <div className="field"><label className="field-label">Status</label><select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All</option><option value="open">Open</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="filled">Filled</option><option value="closed">Closed</option></select></div>
              <div className="field"><label className="field-label">State</label><select className="select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}><option value="">All</option>{distinctStates.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="field"><label className="field-label">BD Rep</label><select className="select" value={bdRepFilter} onChange={(e) => setBdRepFilter(e.target.value)}><option value="">All</option>{distinctBdReps.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="field"><label className="field-label">Language</label><input className="input" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} placeholder="English / Spanish / Ratio..." /></div>
            </div>

            {feedback.error ? <div style={{ marginTop: 16, color: "#991b1b", fontWeight: 800 }}>{feedback.error}</div> : null}
            {feedback.success ? <div style={{ marginTop: 16, color: "#166534", fontWeight: 800 }}>{feedback.success}</div> : null}
          </div>

          <div className="glass-card table-card">
            <div className="table-top">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Briefcase size={20} /><div style={{ fontWeight: 900, fontSize: 22 }}>CTS Job List ({filteredJobs.length})</div></div>
            </div>

            {loading ? (
              <div className="empty-state" style={{ marginTop: 18 }}><Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />Loading CTS jobs...</div>
            ) : filteredJobs.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 18 }}>No CTS jobs found with the current filters.</div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Qty</th><th>Level / Type</th><th>City</th><th>State</th><th>Start</th><th>Details</th><th>Language</th><th>BD Rep</th><th>Order Date</th><th>Status</th><th>Priority</th><th>Candidates</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr key={job.id}>
                        <td style={{ fontWeight: 900 }}>{job.qty ?? 0}</td>
                        <td><div style={{ fontWeight: 900, color: "#0f172a" }}>{job.level_type || "—"}</div>{job.job_code ? <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Ref: {job.job_code}</div> : null}</td>
                        <td>{job.city || "—"}</td>
                        <td>{job.state || "—"}</td>
                        <td>{job.start_text || "—"}</td>
                        <td style={{ minWidth: 240 }}>{job.details || "—"}</td>
                        <td>{job.language_requirement || "—"}</td>
                        <td>{job.bd_rep || "—"}</td>
                        <td>{formatDate(job.order_date)}</td>
                        <td><span className="status-pill" style={getStatusStyle(job.status)}>{job.status}</span></td>
                        <td><span className="priority-pill" style={getPriorityStyle(job.priority)}>{job.priority}</span></td>
                        <td style={{ fontWeight: 900 }}>{jobCounts[job.id] || 0}</td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-btn" type="button" onClick={() => navigate(`/cts-jobs/${job.id}`)}><ExternalLink size={14} />Open</button>
                            <button className="icon-btn" type="button" onClick={() => openEdit(job)}><Pencil size={14} />Edit</button>
                            <button className="icon-btn" type="button" onClick={() => handleDuplicate(job)}><Copy size={14} />Duplicate</button>
                            <button className="icon-btn" type="button" onClick={() => handleDelete(job)}><Trash2 size={14} />Delete</button>
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

      <JobModal open={modalOpen} mode={modalMode} form={form} setForm={setForm} onClose={() => setModalOpen(false)} onSave={handleSave} saving={saving} />
      <GoToTopButton />
    </>
  );
}

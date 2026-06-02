import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import { supabase } from "../lib/supabase";

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      html,
      body {
        margin: 0;
        width: 100%;
        overflow-x: hidden;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #eef4ff;
        color: #0f172a;
      }

      #root {
        width: 100%;
        overflow-x: hidden;
      }

      input, select, textarea, button { font: inherit; }

      .spin { animation: spin 1s linear infinite; }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .jobs-test-shell {
        width: min(1480px, calc(100% - 48px));
        max-width: 1480px;
        margin: 0 auto;
        padding: 24px 0;
        display: grid;
        gap: 20px;
      }

      .glass-card {
        min-width: 0;
        background: rgba(255,255,255,0.88);
        backdrop-filter: blur(10px);
        border: 1px solid #dbeafe;
        border-radius: 28px;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
      }

      .hero-card,
      .dashboard-card {
        padding: 24px;
      }

      .hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
      }

      .hero-title {
        margin: 0;
        font-size: clamp(34px, 5vw, 54px);
        line-height: 1.02;
        font-weight: 900;
        letter-spacing: -0.04em;
      }

      .hero-subtitle {
        margin: 10px 0 0 0;
        color: #475569;
        font-size: 16px;
      }

      .btn {
        border: none;
        border-radius: 14px;
        padding: 12px 16px;
        font-weight: 800;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: 0.18s ease;
        text-decoration: none;
      }

      .btn.dark { background: #0f172a; color: #ffffff; }
      .btn.white { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; }
      .btn:hover:not(:disabled) { transform: translateY(-1px); }
      .btn:disabled { opacity: 0.6; cursor: not-allowed; }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-top: 20px;
      }

      .metric-card {
        padding: 16px;
        border-radius: 18px;
        background: #f8fbff;
        border: 1px solid #dbeafe;
      }

      .metric-label {
        font-size: 12px;
        color: #64748b;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .metric-value {
        margin-top: 6px;
        font-size: 28px;
        font-weight: 900;
        color: #0f172a;
      }

      .dashboard-layout {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      .side-nav {
        position: sticky;
        top: 98px;
        display: grid;
        gap: 18px;
        padding: 20px;
        max-height: calc(100vh - 122px);
        overflow: auto;
      }

      .side-section {
        display: grid;
        gap: 10px;
      }

      .side-section-title {
        font-size: 12px;
        color: #64748b;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .side-nav-btn {
        width: 100%;
        border: 1px solid #dbeafe;
        border-radius: 16px;
        background: #ffffff;
        color: #0f172a;
        padding: 12px 13px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: center;
        text-align: left;
        cursor: pointer;
        transition: 0.18s ease;
      }

      .side-nav-btn:hover,
      .side-nav-btn.active {
        border-color: #0f172a;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
        transform: translateY(-1px);
      }

      .side-nav-btn.active {
        background: #0f172a;
        color: #ffffff;
      }

      .side-nav-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 900;
      }

      .side-nav-meta {
        margin-top: 4px;
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
      }

      .side-nav-btn.active .side-nav-meta { color: rgba(255,255,255,0.72); }

      .count-badge {
        border-radius: 999px;
        padding: 5px 9px;
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 12px;
        font-weight: 900;
      }

      .side-nav-btn.active .count-badge {
        background: rgba(255,255,255,0.15);
        color: #ffffff;
      }

      .view-panel {
        min-height: 760px;
        padding: 24px;
      }

      .view-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .view-title {
        margin: 0;
        font-size: clamp(26px, 3vw, 36px);
        font-weight: 900;
        letter-spacing: -0.03em;
      }

      .view-subtitle {
        margin: 8px 0 0 0;
        color: #475569;
        line-height: 1.6;
      }

      .toolbar-row {
        margin-top: 18px;
        display: grid;
        grid-template-columns: minmax(220px, 1fr) minmax(180px, auto);
        gap: 12px;
        align-items: center;
      }

      .input,
      .select {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: #ffffff;
        color: #0f172a;
        padding: 12px 14px;
        outline: none;
        min-height: 48px;
      }

      .input:focus,
      .select:focus {
        border-color: #0f172a;
        box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
      }

      .table-scroll {
        width: 100%;
        overflow: auto;
        margin-top: 18px;
        border: 1px solid #dbeafe;
        border-radius: 18px;
        background: #ffffff;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 820px;
      }

      th,
      td {
        padding: 14px 16px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
      }

      th {
        background: #f8fbff;
        color: #334155;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 900;
      }

      tr:last-child td { border-bottom: none; }

      .status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 900;
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1e3a8a;
        white-space: nowrap;
      }

      .status-pill.placed { border-color: #86efac; background: #dcfce7; color: #166534; }
      .status-pill.sourced { border-color: #bfdbfe; background: #dbeafe; color: #1e40af; }
      .status-pill.other { border-color: #e2e8f0; background: #f8fafc; color: #475569; }

      .job-detail-grid {
        margin-top: 18px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .detail-box {
        border: 1px solid #dbeafe;
        border-radius: 16px;
        background: #f8fbff;
        padding: 14px;
      }

      .detail-label {
        font-size: 11px;
        color: #64748b;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .detail-value {
        margin-top: 6px;
        color: #0f172a;
        font-weight: 900;
      }

      .empty-state {
        margin-top: 18px;
        border: 1px dashed #bfdbfe;
        border-radius: 18px;
        background: #f8fbff;
        padding: 26px;
        color: #475569;
        text-align: center;
        font-weight: 800;
      }

      @media (max-width: 1024px) {
        .dashboard-layout { grid-template-columns: 1fr; }
        .side-nav { position: static; max-height: none; }
        .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .job-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }

      @media (max-width: 640px) {
        .jobs-test-shell { width: min(100% - 28px, 1480px); padding: 14px 0; }
        .hero-card, .dashboard-card, .view-panel { padding: 18px; border-radius: 20px; }
        .summary-grid, .toolbar-row, .job-detail-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}

function getTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US");
}

function formatDateOnly(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

function formatStatus(status) {
  return String(status || "sourced")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCandidateStatusPriority(status) {
  const normalizedStatus = String(status || "sourced").toLowerCase();

  if (normalizedStatus === "placed") return 1;
  if (normalizedStatus === "sourced") return 2;
  return 3;
}

function getCandidateStatusClass(status) {
  const normalizedStatus = String(status || "sourced").toLowerCase();
  if (normalizedStatus === "placed") return "placed";
  if (normalizedStatus === "sourced") return "sourced";
  return "other";
}

function filterCandidateByView(candidate, view) {
  if (view.type !== "candidate") return true;
  if (view.status === "all") return true;
  return String(candidate.candidate_status || "sourced").toLowerCase() === view.status;
}

function CandidateTable({ candidates, onOpenJob }) {
  if (candidates.length === 0) {
    return <div className="empty-state">No candidates found for this view.</div>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Profile</th>
            <th>Project</th>
            <th>Status</th>
            <th>Last Modified</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => {
            const worker = candidate.worker || {};
            const job = candidate.job || {};
            const candidateName = candidate.name_snapshot || worker.name || "—";
            const projectName = job.level_type || "Unlinked project";
            const projectLocation = [job.city, job.state].filter(Boolean).join(", ");
            const profileSlug = worker.public_profile_slug;

            return (
              <tr key={candidate.id}>
                <td>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>{candidateName}</div>
                  <div style={{ marginTop: 5, color: "#64748b", fontSize: 13 }}>
                    {candidate.phone_snapshot || worker.phone || "No phone"}
                    {worker.email ? ` • ${worker.email}` : ""}
                  </div>
                </td>
                <td>
                  {profileSlug ? (
                    <button
                      className="btn white"
                      type="button"
                      onClick={() => window.open(`/profile/${profileSlug}`, "_blank")}
                      title="Open worker profile"
                    >
                      <ExternalLink size={16} />
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => job.id && onOpenJob(job.id)}
                    disabled={!job.id}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: job.id ? "#1d4ed8" : "#0f172a",
                      fontWeight: 900,
                      padding: 0,
                      cursor: job.id ? "pointer" : "default",
                      textAlign: "left",
                    }}
                  >
                    {projectName}
                  </button>
                  {projectLocation ? (
                    <div style={{ marginTop: 5, color: "#64748b", fontSize: 13 }}>{projectLocation}</div>
                  ) : null}
                </td>
                <td>
                  <span className={`status-pill ${getCandidateStatusClass(candidate.candidate_status)}`}>
                    {formatStatus(candidate.candidate_status)}
                  </span>
                </td>
                <td>{formatDateTime(candidate.updated_at || candidate.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JobsTable({ jobs, candidateCounts, onOpenJob, onOpenDetail }) {
  if (jobs.length === 0) {
    return <div className="empty-state">No CTS jobs found for this view.</div>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Qty</th>
            <th>Level / Type</th>
            <th>City</th>
            <th>State</th>
            <th>Start</th>
            <th>BD Rep</th>
            <th>Status</th>
            <th>Candidates</th>
            <th>Last Modified</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td style={{ fontWeight: 900 }}>{job.qty ?? "—"}</td>
              <td>
                <button
                  type="button"
                  onClick={() => onOpenJob(job.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#1d4ed8",
                    fontWeight: 900,
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {job.level_type || "Untitled job"}
                </button>
                {job.job_code ? (
                  <div style={{ marginTop: 5, color: "#64748b", fontSize: 13 }}>Code: {job.job_code}</div>
                ) : null}
              </td>
              <td>{job.city || "—"}</td>
              <td>{job.state || "—"}</td>
              <td>{job.start_text || formatDateOnly(job.order_date)}</td>
              <td>{job.bd_rep || "—"}</td>
              <td><span className="status-pill other">{formatStatus(job.status || "open")}</span></td>
              <td style={{ fontWeight: 900 }}>{candidateCounts[job.id] || 0}</td>
              <td>
                <div>{formatDateTime(job.updated_at || job.created_at)}</div>
                <button
                  className="btn white"
                  type="button"
                  onClick={() => onOpenDetail(job.id)}
                  style={{ marginTop: 8, padding: "8px 10px", fontSize: 13 }}
                >
                  Full Detail
                  <ExternalLink size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobDetailView({ job, candidates, onOpenDetail, onOpenJob }) {
  if (!job) {
    return <div className="empty-state">Select a CTS job from the left navigation.</div>;
  }

  return (
    <>
      <div className="view-header">
        <div>
          <h2 className="view-title">{job.level_type || "Untitled job"}</h2>
          <p className="view-subtitle">
            {[job.city, job.state].filter(Boolean).join(", ") || "No location set"}
            {job.bd_rep ? ` • BD Rep: ${job.bd_rep}` : ""}
          </p>
        </div>
        <button className="btn dark" type="button" onClick={() => onOpenDetail(job.id)}>
          Open Full Detail
          <ExternalLink size={16} />
        </button>
      </div>

      <div className="job-detail-grid">
        <div className="detail-box"><div className="detail-label">Qty</div><div className="detail-value">{job.qty ?? "—"}</div></div>
        <div className="detail-box"><div className="detail-label">Status</div><div className="detail-value">{formatStatus(job.status || "open")}</div></div>
        <div className="detail-box"><div className="detail-label">Priority</div><div className="detail-value">{formatStatus(job.priority || "normal")}</div></div>
        <div className="detail-box"><div className="detail-label">Start</div><div className="detail-value">{job.start_text || formatDateOnly(job.order_date)}</div></div>
        <div className="detail-box"><div className="detail-label">Language</div><div className="detail-value">{job.language_requirement || "—"}</div></div>
        <div className="detail-box"><div className="detail-label">Last Modified</div><div className="detail-value">{formatDateTime(job.updated_at || job.created_at)}</div></div>
      </div>

      {job.details ? (
        <div className="detail-box" style={{ marginTop: 12 }}>
          <div className="detail-label">Details</div>
          <div className="detail-value" style={{ lineHeight: 1.55, fontWeight: 700 }}>{job.details}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Candidates for this job ({candidates.length})</h3>
        <CandidateTable candidates={candidates} onOpenJob={onOpenJob} />
      </div>
    </>
  );
}

export default function JobsPageTest() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [jobCandidates, setJobCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState({ type: "candidate", status: "placed" });

  const load = async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });

    const [jobsRes, candidatesRes, workersRes] = await Promise.all([
      supabase.from("cts_jobs").select("*").order("updated_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("cts_job_candidates").select("*").order("updated_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("workers").select("id, name, phone, email, public_profile_slug"),
    ]);

    if (jobsRes.error || candidatesRes.error || workersRes.error) {
      setFeedback({
        error: jobsRes.error?.message || candidatesRes.error?.message || workersRes.error?.message || "Could not load CTS dashboard data.",
        success: "",
      });
      setJobs([]);
      setJobCandidates([]);
      setLoading(false);
      return;
    }

    const jobsData = jobsRes.data || [];
    const jobsById = new Map(jobsData.map((job) => [job.id, job]));
    const workersById = new Map((workersRes.data || []).map((worker) => [worker.id, worker]));

    setJobs(jobsData);
    setJobCandidates(
      (candidatesRes.data || []).map((candidate) => ({
        ...candidate,
        job: jobsById.get(candidate.cts_job_id) || null,
        worker: workersById.get(candidate.worker_id) || null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, []);

  const candidateCounts = useMemo(() => {
    const counts = {};
    jobCandidates.forEach((candidate) => {
      counts[candidate.cts_job_id] = (counts[candidate.cts_job_id] || 0) + 1;
    });
    return counts;
  }, [jobCandidates]);

  const sortedCandidates = useMemo(
    () => [...jobCandidates].sort((a, b) => {
      const statusPriorityA = getCandidateStatusPriority(a.candidate_status);
      const statusPriorityB = getCandidateStatusPriority(b.candidate_status);
      if (statusPriorityA !== statusPriorityB) return statusPriorityA - statusPriorityB;

      const updatedAtA = getTimestamp(a.updated_at || a.created_at);
      const updatedAtB = getTimestamp(b.updated_at || b.created_at);
      if (updatedAtA !== updatedAtB) return updatedAtB - updatedAtA;

      return getTimestamp(b.created_at) - getTimestamp(a.created_at);
    }),
    [jobCandidates]
  );

  const viewCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sortedCandidates.filter((candidate) => {
      if (activeView.type === "job" && candidate.cts_job_id !== activeView.jobId) return false;
      if (!filterCandidateByView(candidate, activeView)) return false;

      const job = candidate.job || {};
      const worker = candidate.worker || {};
      const projectLabel = [job.level_type, job.city, job.state].filter(Boolean).join(" ");
      const matchesSearch = !q || [
        candidate.name_snapshot,
        candidate.phone_snapshot,
        candidate.candidate_status,
        worker.name,
        worker.phone,
        worker.email,
        projectLabel,
        job.level_type,
        job.city,
        job.state,
        job.job_code,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));

      return matchesSearch;
    });
  }, [activeView, search, sortedCandidates]);

  const viewJobs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return jobs
      .filter((job) => {
        if (activeView.type !== "jobs") return true;
        if (!q) return true;
        return [
          job.level_type,
          job.city,
          job.state,
          job.start_text,
          job.details,
          job.language_requirement,
          job.bd_rep,
          job.client_name,
          job.job_code,
          job.status,
          job.priority,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const updatedAtA = getTimestamp(a.updated_at || a.created_at);
        const updatedAtB = getTimestamp(b.updated_at || b.created_at);
        if (updatedAtA !== updatedAtB) return updatedAtB - updatedAtA;
        return getTimestamp(b.created_at) - getTimestamp(a.created_at);
      });
  }, [activeView.type, jobs, search]);

  const selectedJob = useMemo(
    () => (activeView.type === "job" ? jobs.find((job) => job.id === activeView.jobId) || null : null),
    [activeView, jobs]
  );

  const summary = useMemo(() => {
    const placed = jobCandidates.filter((candidate) => String(candidate.candidate_status || "sourced").toLowerCase() === "placed").length;
    const sourced = jobCandidates.filter((candidate) => String(candidate.candidate_status || "sourced").toLowerCase() === "sourced").length;
    return { totalJobs: jobs.length, totalCandidates: jobCandidates.length, placed, sourced };
  }, [jobCandidates, jobs.length]);

  const activeTitle = useMemo(() => {
    if (activeView.type === "candidate") {
      if (activeView.status === "placed") return "Placed Candidates";
      if (activeView.status === "sourced") return "Sourced Candidates";
      return "All Candidates";
    }
    if (activeView.type === "jobs") return "CTS Jobs List";
    return selectedJob?.level_type || "CTS Job Detail";
  }, [activeView, selectedJob]);

  const activeSubtitle = useMemo(() => {
    if (activeView.type === "candidate") return "Candidates are ordered by Status priority, then Last Modified from newest to oldest.";
    if (activeView.type === "jobs") return "Select any project from the left navigation or open its full detail page.";
    return "Project snapshot with candidate list on the same screen.";
  }, [activeView.type]);

  const openJobView = (jobId) => setActiveView({ type: "job", jobId });
  const openJobDetail = (jobId) => navigate(`/cts-jobs/${jobId}`);

  return (
    <>
      <PageStyles />
      <UtsTopNavBar />
      <main className="jobs-test-shell">
        <section className="glass-card hero-card">
          <div className="hero-top">
            <div>
              <h1 className="hero-title">CTS Jobs Dashboard</h1>
              <p className="hero-subtitle">
                Test layout with left navigation and a focused view panel for candidates and CTS jobs.
              </p>
            </div>
            <button className="btn dark" type="button" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="spin" size={16} /> : <Briefcase size={16} />}
              Refresh Data
            </button>
          </div>

          <div className="summary-grid">
            <div className="metric-card"><div className="metric-label">CTS Jobs</div><div className="metric-value">{summary.totalJobs}</div></div>
            <div className="metric-card"><div className="metric-label">Candidates</div><div className="metric-value">{summary.totalCandidates}</div></div>
            <div className="metric-card"><div className="metric-label">Placed</div><div className="metric-value">{summary.placed}</div></div>
            <div className="metric-card"><div className="metric-label">Sourced</div><div className="metric-value">{summary.sourced}</div></div>
          </div>
        </section>

        {feedback.error ? (
          <section className="glass-card dashboard-card" style={{ borderColor: "#fecaca", color: "#b91c1c", fontWeight: 800 }}>
            {feedback.error}
          </section>
        ) : null}

        <section className="dashboard-layout">
          <aside className="glass-card side-nav" aria-label="CTS dashboard sections">
            <div className="side-section">
              <div className="side-section-title">Candidates</div>
              {[
                { key: "placed", label: "Placed", count: summary.placed, icon: CheckCircle2 },
                { key: "sourced", label: "Sourced", count: summary.sourced, icon: Users },
                { key: "all", label: "All", count: summary.totalCandidates, icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeView.type === "candidate" && activeView.status === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`side-nav-btn ${active ? "active" : ""}`}
                    onClick={() => setActiveView({ type: "candidate", status: item.key })}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Icon size={16} />
                        <span className="side-nav-label">{item.label}</span>
                      </span>
                    </span>
                    <span className="count-badge">{item.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="side-section">
              <div className="side-section-title">CTS Jobs List</div>
              <button
                type="button"
                className={`side-nav-btn ${activeView.type === "jobs" ? "active" : ""}`}
                onClick={() => setActiveView({ type: "jobs" })}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Briefcase size={16} />
                  <span className="side-nav-label">All</span>
                </span>
                <span className="count-badge">{summary.totalJobs}</span>
              </button>

              {jobs.map((job) => {
                const active = activeView.type === "job" && activeView.jobId === job.id;
                return (
                  <button
                    key={job.id}
                    type="button"
                    className={`side-nav-btn ${active ? "active" : ""}`}
                    onClick={() => openJobView(job.id)}
                    title={job.level_type || "Untitled job"}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className="side-nav-label">{job.level_type || "Untitled job"}</span>
                      <span className="side-nav-meta">{[job.city, job.state].filter(Boolean).join(", ") || "No location"}</span>
                    </span>
                    <span className="count-badge">{candidateCounts[job.id] || 0}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="glass-card view-panel">
            <div className="view-header">
              <div>
                <h2 className="view-title">{activeTitle}</h2>
                <p className="view-subtitle">{activeSubtitle}</p>
              </div>
              {activeView.type === "job" && selectedJob ? (
                <button className="btn white" type="button" onClick={() => setActiveView({ type: "jobs" })}>
                  Back to All Jobs
                </button>
              ) : null}
            </div>

            <div className="toolbar-row">
              <div style={{ position: "relative" }}>
                <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  className="input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search candidate, phone, email, project, city or code..."
                  style={{ paddingLeft: 42, paddingRight: search ? 44 : 14 }}
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      borderRadius: 999,
                      background: "#f1f5f9",
                      width: 28,
                      height: 28,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>
              <div className="status-pill other">
                {loading ? "Loading..." : `${activeView.type === "jobs" ? viewJobs.length : viewCandidates.length} results`}
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
                Loading CTS dashboard...
              </div>
            ) : activeView.type === "jobs" ? (
              <JobsTable jobs={viewJobs} candidateCounts={candidateCounts} onOpenJob={openJobView} onOpenDetail={openJobDetail} />
            ) : activeView.type === "job" ? (
              <JobDetailView job={selectedJob} candidates={viewCandidates} onOpenDetail={openJobDetail} onOpenJob={openJobView} />
            ) : (
              <CandidateTable candidates={viewCandidates} onOpenJob={openJobView} />
            )}
          </section>
        </section>
      </main>
      <GoToTopButton />
    </>
  );
}

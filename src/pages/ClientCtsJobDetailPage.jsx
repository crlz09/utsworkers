import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import GoToTopButton from "../components/GoToTopButton";
import utsLogo from "../assets/uts-logo.png";

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #eef4ff; color: #0f172a; }
      input, select, button { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .client-topbar { position: sticky; top: 0; z-index: 40; padding-top: env(safe-area-inset-top); background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%); border-bottom: 1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18); }
      .client-topbar-inner { width: min(1480px, calc(100% - 48px)); margin: 0 auto; min-height: 74px; display: flex; align-items: center; }
      .client-logo { display: inline-flex; align-items: center; }
      .client-logo img { height: 56px; width: auto; display: block; }
      .page-shell { max-width: 1480px; margin: 0 auto; padding: 24px; display: grid; gap: 20px; }
      .glass-card { background: rgba(255,255,255,0.88); backdrop-filter: blur(10px); border: 1px solid #dbeafe; border-radius: 28px; box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08); }
      .card-pad { padding: 24px; }
      .hero-top, .toolbar-top { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
      .title { margin: 0; font-size: 36px; line-height: 1.04; font-weight: 900; letter-spacing: 0; }
      .btn { border: none; border-radius: 14px; padding: 12px 16px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
      .btn.white { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; }
      .icon-btn { border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; border-radius: 12px; padding: 10px 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; justify-content: center; }
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
      .status-pill { display: inline-flex; align-items: center; padding: 7px 10px; border-radius: 999px; font-size: 12px; font-weight: 900; white-space: nowrap; }
      .toolbar-grid { display: grid; grid-template-columns: 1.2fr 0.9fr 0.9fr; gap: 12px; margin-top: 18px; }
      .field { display: grid; gap: 8px; }
      .field-label { font-size: 12px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
      .input, .select { width: 100%; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; border-radius: 14px; padding: 12px 14px; outline: none; min-height: 46px; }
      .table-scroll { overflow-x: auto; margin-top: 18px; padding-bottom: 12px; -webkit-overflow-scrolling: touch; }
      .assigned-table { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; }
      thead th { position: sticky; top: 0; background: #eff6ff; color: #1e3a8a; text-align: left; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 16px; border-bottom: 1px solid #bfdbfe; white-space: nowrap; }
      tbody td { background: #ffffff; padding: 16px; border-bottom: 1px solid #e2e8f0; vertical-align: top; white-space: nowrap; width: 1%; }
      tbody tr:hover td { background: #f8fbff; }
      .sticky-profile-col { position: sticky; left: 0; z-index: 4; min-width: 58px; width: 58px; max-width: 58px; box-shadow: 10px 0 18px rgba(15, 23, 42, 0.04); background: #ffffff; }
      thead .sticky-profile-col { z-index: 6; background: #eff6ff; }
      tbody tr:hover .sticky-profile-col { background: #f8fbff; }
      .sticky-name-col { position: sticky; left: 58px; z-index: 3; min-width: 150px; width: 150px; max-width: 150px; box-shadow: 10px 0 18px rgba(15, 23, 42, 0.06); white-space: normal; background: #ffffff; }
      thead .sticky-name-col { z-index: 5; background: #eff6ff; }
      tbody tr:hover .sticky-name-col { background: #f8fbff; }
      .read-value { font-weight: 800; color: #0f172a; line-height: 1.25; white-space: normal; }
      .muted { color: #64748b; }
      .notes-cell { min-width: 280px; width: 280px; white-space: normal; }
      .empty-state { padding: 30px; border-radius: 20px; border: 1px dashed #cbd5e1; background: #f8fafc; color: #64748b; text-align: center; font-weight: 700; }
      .feedback-error { color: #991b1b; font-weight: 800; }
      @media (max-width: 1180px) { .summary-grid, .toolbar-grid { grid-template-columns: 1fr 1fr; } .details-grid { grid-template-columns: 1fr; } }
      @media (max-width: 760px) { .client-topbar-inner { width: min(100%, calc(100% - 28px)); min-height: 64px; } .client-logo img { height: 42px; } .page-shell { padding: 14px; } .title { font-size: 30px; } .summary-grid, .toolbar-grid, .detail-grid { grid-template-columns: 1fr; } }
    `}</style>
  );
}

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
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString();
}

function formatStatus(status) {
  return String(status || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ReadValue({ children, muted = false }) {
  return <div className={muted ? "read-value muted" : "read-value"}>{children || "-"}</div>;
}

export default function ClientCtsJobDetailPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("");
  const [jobHeaderOpen, setJobHeaderOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      const [jobRes, candidatesRes] = await Promise.all([
        supabase.from("cts_jobs").select("*").eq("id", jobId).maybeSingle(),
        supabase
          .from("cts_job_candidates")
          .select("*")
          .eq("cts_job_id", jobId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (jobRes.error) {
        setError(jobRes.error.message || "Could not load CTS job.");
        setLoading(false);
        return;
      }

      if (!jobRes.data) {
        setError("CTS job not found.");
        setLoading(false);
        return;
      }

      if (candidatesRes.error) {
        setError(candidatesRes.error.message || "Could not load assigned candidates.");
        setLoading(false);
        return;
      }

      const candidateRows = candidatesRes.data || [];
      const workerIds = [...new Set(candidateRows.map((row) => row.worker_id).filter(Boolean))];
      let workersById = new Map();

      if (workerIds.length > 0) {
        const { data: workerRows, error: workersError } = await supabase
          .from("workers")
          .select("id, public_profile_slug")
          .in("id", workerIds);

        if (!workersError) {
          workersById = new Map((workerRows || []).map((worker) => [worker.id, worker]));
        }
      }

      setJob(jobRes.data);
      setCandidates(
        candidateRows.map((candidate) => ({
          ...candidate,
          public_profile_slug: workersById.get(candidate.worker_id)?.public_profile_slug || "",
        }))
      );
      setLoading(false);
    };

    load();
  }, [jobId]);

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();

    return candidates.filter((row) => {
      const matchesSearch =
        !q ||
        [
          row.name_snapshot,
          row.phone_snapshot,
          row.class_snapshot,
          row.local_travelers_snapshot,
          row.location_snapshot,
          row.english_snapshot,
          row.per_diem_snapshot,
          row.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));

      const matchesStatus = !candidateStatusFilter || row.candidate_status === candidateStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [candidates, candidateSearch, candidateStatusFilter]);

  const placedCount = useMemo(
    () => candidates.filter((item) => item.candidate_status === "placed").length,
    [candidates]
  );

  if (loading) {
    return (
      <>
        <PageStyles />
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <div style={{ fontWeight: 900, color: "#1d4ed8" }}>
            <Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
            Loading CTS job...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageStyles />
      <div className="client-topbar">
        <div className="client-topbar-inner">
          <a
            className="client-logo"
            href="https://www.universaltalentsource.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Universal Talent Source"
          >
            <img src={utsLogo} alt="UTS" />
          </a>
        </div>
      </div>

      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)" }}>
        <div className="page-shell">
          {error || !job ? (
            <div className="glass-card card-pad">
              <div className="feedback-error">{error || "CTS job not found."}</div>
              <button className="btn white" type="button" onClick={() => navigate("/client/cts-jobs")} style={{ marginTop: 16 }}>
                <ArrowLeft size={16} />
                Back to Jobs
              </button>
            </div>
          ) : (
            <>
              <div className="glass-card card-pad">
                <div className="hero-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => setJobHeaderOpen((prev) => !prev)}
                      title={jobHeaderOpen ? "Hide job details" : "Show job details"}
                      aria-label={jobHeaderOpen ? "Hide job details" : "Show job details"}
                      style={{ width: 42, height: 42, padding: 0, flexShrink: 0 }}
                    >
                      {jobHeaderOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <h1 className="title">{job.level_type || "CTS Job Detail"}</h1>
                  </div>

                  <button className="btn white" type="button" onClick={() => navigate("/client/cts-jobs")}>
                    <ArrowLeft size={16} />
                    Back to Jobs
                  </button>
                </div>

                {jobHeaderOpen ? (
                  <>
                    <div className="summary-grid">
                      <div className="metric-card"><div className="metric-label">Requested Qty</div><div className="metric-value">{job.qty ?? 0}</div></div>
                      <div className="metric-card"><div className="metric-label">Assigned Candidates</div><div className="metric-value">{candidates.length}</div></div>
                      <div className="metric-card"><div className="metric-label">Placed</div><div className="metric-value">{placedCount}</div></div>
                      <div className="metric-card"><div className="metric-label">Remaining to Fill</div><div className="metric-value">{Math.max(Number(job.qty || 0) - placedCount, 0)}</div></div>
                    </div>

                    <div className="details-grid">
                      <div className="detail-box">
                        <div style={{ fontWeight: 900, fontSize: 22 }}>Order Snapshot</div>
                        <div className="detail-grid">
                          <div className="detail-item"><div className="detail-item-label">City</div><div className="detail-item-value">{job.city || "-"}</div></div>
                          <div className="detail-item"><div className="detail-item-label">State</div><div className="detail-item-value">{job.state || "-"}</div></div>
                          <div className="detail-item"><div className="detail-item-label">Start</div><div className="detail-item-value">{job.start_text || "-"}</div></div>
                          <div className="detail-item"><div className="detail-item-label">Language</div><div className="detail-item-value">{job.language_requirement || "-"}</div></div>
                          <div className="detail-item"><div className="detail-item-label">BD Rep</div><div className="detail-item-value">{job.bd_rep || "-"}</div></div>
                          <div className="detail-item"><div className="detail-item-label">Order Date</div><div className="detail-item-value">{formatDate(job.order_date)}</div></div>
                        </div>
                        <div className="detail-item" style={{ marginTop: 4 }}>
                          <div className="detail-item-label">Details</div>
                          <div className="detail-item-value" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{job.details || "-"}</div>
                        </div>
                      </div>

                      <div className="detail-box">
                        <div style={{ fontWeight: 900, fontSize: 22 }}>Internal View</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span className="status-pill" style={getJobStatusStyle(job.status)}>{formatStatus(job.status)}</span>
                        </div>
                        <div className="detail-item" style={{ marginTop: 4 }}><div className="detail-item-label">Client</div><div className="detail-item-value">{job.client_name || "CTS"}</div></div>
                        <div className="detail-item"><div className="detail-item-label">Job Code</div><div className="detail-item-value">{job.job_code || "-"}</div></div>
                        <div className="detail-item"><div className="detail-item-label">Internal Notes</div><div className="detail-item-value" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{job.internal_notes || "-"}</div></div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="glass-card card-pad" style={{ maxWidth: "100%", overflow: "hidden" }}>
                <div className="toolbar-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Users size={20} />
                    <div style={{ fontWeight: 900, fontSize: 22 }}>Assigned Candidates ({filteredCandidates.length})</div>
                  </div>
                </div>

                <div className="toolbar-grid">
                  <div className="field">
                    <label className="field-label">Search</label>
                    <input
                      className="input"
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      placeholder="Name, class, phone, location..."
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Candidate Status</label>
                    <select className="select" value={candidateStatusFilter} onChange={(e) => setCandidateStatusFilter(e.target.value)}>
                      <option value="">All</option>
                      <option value="sourced">Sourced</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="interviewed">Interviewed</option>
                      <option value="submitted">Submitted</option>
                      <option value="placed">Placed</option>
                      <option value="rejected">Rejected</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Quick Summary</label>
                    <div className="input" style={{ display: "flex", alignItems: "center" }}>
                      {placedCount} placed / {job.qty ?? 0} requested
                    </div>
                  </div>
                </div>

                {filteredCandidates.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: 18 }}>No candidates assigned to this job yet.</div>
                ) : (
                  <div className="table-scroll">
                    <table className="assigned-table">
                      <thead>
                        <tr>
                          <th className="sticky-profile-col">Profile</th>
                          <th className="sticky-name-col">Name</th>
                          <th>Phone</th>
                          <th>Class</th>
                          <th>Local / Travelers</th>
                          <th>Location</th>
                          <th>English</th>
                          <th>On System (CTS)</th>
                          <th>Rate</th>
                          <th>Per Diem</th>
                          <th>Stage</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCandidates.map((row) => (
                          <tr key={row.id}>
                            <td className="sticky-profile-col">
                              <button
                                className="icon-btn"
                                type="button"
                                disabled={!row.public_profile_slug}
                                title={row.public_profile_slug ? "Open public profile" : "No public profile available"}
                                onClick={() => row.public_profile_slug && window.open(`/profile/${row.public_profile_slug}`, "_blank")}
                                style={{ width: 38, height: 38, padding: 0 }}
                              >
                                <ExternalLink size={16} />
                              </button>
                            </td>
                            <td className="sticky-name-col"><ReadValue>{row.name_snapshot}</ReadValue></td>
                            <td><ReadValue>{row.phone_snapshot}</ReadValue></td>
                            <td><ReadValue>{row.class_snapshot}</ReadValue></td>
                            <td><ReadValue>{row.local_travelers_snapshot}</ReadValue></td>
                            <td><ReadValue>{row.location_snapshot}</ReadValue></td>
                            <td><ReadValue>{row.english_snapshot}</ReadValue></td>
                            <td><ReadValue>{row.on_system_cts ? "Yes" : "No"}</ReadValue></td>
                            <td><ReadValue>{row.rate_snapshot ?? ""}</ReadValue></td>
                            <td><ReadValue>{row.per_diem_snapshot}</ReadValue></td>
                            <td>
                              <span className="status-pill" style={getCandidateStatusStyle(row.candidate_status)}>
                                {formatStatus(row.candidate_status)}
                              </span>
                            </td>
                            <td className="notes-cell"><ReadValue muted>{row.notes}</ReadValue></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <GoToTopButton />
    </>
  );
}

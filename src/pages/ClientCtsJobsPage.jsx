import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Loader2,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import GoToTopButton from "../components/GoToTopButton";
import UtsClientTopBar from "../components/UtsClientTopBar";

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

      input, select, button { font: inherit; }

      .spin { animation: spin 1s linear infinite; }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .client-topbar {
        position: sticky;
        top: 0;
        z-index: 40;
        padding-top: env(safe-area-inset-top);
        background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%);
        border-bottom: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      }

      .client-topbar-inner {
        width: min(1440px, calc(100% - 48px));
        margin: 0 auto;
        min-height: 74px;
        display: flex;
        align-items: center;
      }

      .client-logo {
        display: inline-flex;
        align-items: center;
      }

      .client-logo img {
        height: 56px;
        width: auto;
        display: block;
      }

      .client-shell {
        width: min(1440px, calc(100% - 48px));
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
      .table-card {
        padding: 24px;
      }

      .hero-title {
        margin: 0;
        font-size: 40px;
        line-height: 1.02;
        font-weight: 900;
        letter-spacing: 0;
      }

      .hero-subtitle {
        margin: 10px 0 0 0;
        color: #475569;
        font-size: 16px;
      }

      .hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
      }

      .client-action-btn {
        border: 1px solid #0f172a;
        background: #0f172a;
        color: #ffffff;
        border-radius: 14px;
        min-height: 46px;
        padding: 12px 16px;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .table-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
      }

      .candidate-header-controls,
      .table-header-controls {
        display: grid;
        gap: 10px;
        align-items: center;
        flex: 1;
      }

      .candidate-header-controls {
        grid-template-columns: minmax(240px, 1fr) minmax(170px, 0.45fr);
        min-width: min(100%, 520px);
      }

      .table-header-controls {
        grid-template-columns: minmax(220px, 1.35fr) repeat(3, minmax(150px, 0.7fr));
        min-width: min(100%, 760px);
      }

      .input,
      .select {
        width: 100%;
        min-height: 46px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 13px;
        padding: 12px 14px;
        outline: none;
      }

      .icon-btn,
      .profile-btn {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 12px;
        padding: 10px 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 800;
      }

      .profile-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .table-scroll {
        width: 100%;
        max-width: 100%;
        overflow-x: auto;
        margin-top: 18px;
      }

      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        min-width: 980px;
      }

      .jobs-table {
        min-width: 1420px;
      }

      thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #eff6ff;
        color: #1e3a8a;
        text-align: left;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 14px 12px;
        border-bottom: 1px solid #bfdbfe;
      }

      tbody td {
        background: #ffffff;
        padding: 14px 12px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
      }

      tbody tr:hover td {
        background: #f8fbff;
      }

      .sort-header-btn {
        border: none;
        background: transparent;
        color: inherit;
        padding: 0;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font: inherit;
        font-weight: 900;
        text-transform: inherit;
        letter-spacing: inherit;
      }

      .status-pill,
      .priority-pill {
        display: inline-flex;
        align-items: center;
        padding: 7px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
        white-space: nowrap;
      }

      .empty-state {
        padding: 30px;
        border-radius: 20px;
        border: 1px dashed #cbd5e1;
        background: #f8fafc;
        color: #64748b;
        text-align: center;
        font-weight: 700;
      }

      @media (max-width: 1100px) {
        .table-header-controls,
        .candidate-header-controls {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 760px) {
        .client-topbar-inner,
        .client-shell {
          width: min(100%, calc(100% - 28px));
        }

        .client-topbar-inner {
          min-height: 64px;
        }

        .client-logo img {
          height: 42px;
        }

        .hero-title {
          font-size: 32px;
        }

        .table-header-controls,
        .candidate-header-controls {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}

function getTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareValues(a, b) {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";

  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function formatDateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US");
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

function getJobStatusStyle(status) {
  switch (status) {
    case "filled":
      return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
    case "closed":
      return { background: "#e2e8f0", color: "#334155", border: "1px solid #cbd5e1" };
    case "on_hold":
      return { background: "#ffedd5", color: "#9a3412", border: "1px solid #fdba74" };
    case "active":
      return { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" };
    case "open":
    default:
      return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
  }
}

function getCandidateStatusStyle(status) {
  switch (status) {
    case "placed":
      return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
    case "submitted":
      return { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" };
    case "rejected":
      return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
    case "on_hold":
      return { background: "#ffedd5", color: "#9a3412", border: "1px solid #fdba74" };
    case "interviewed":
      return { background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" };
    case "interested":
      return { background: "#ecfccb", color: "#3f6212", border: "1px solid #bef264" };
    case "contacted":
      return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
    case "sourced":
    default:
      return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
  }
}

function getPriorityStyle(priority) {
  switch (priority) {
    case "urgent":
      return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
    case "high":
      return { background: "#ffedd5", color: "#9a3412", border: "1px solid #fdba74" };
    case "low":
      return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
    case "normal":
    default:
      return { background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" };
  }
}

function SortableTh({ children, sortKey, sortConfig, onSort }) {
  const active = sortConfig.key === sortKey;
  const Icon = sortConfig.direction === "asc" ? ChevronDown : ChevronUp;

  return (
    <th>
      <button className="sort-header-btn" type="button" onClick={() => onSort(sortKey)}>
        <span>{children}</span>
        {active ? <Icon size={15} /> : null}
      </button>
    </th>
  );
}

export default function ClientCtsJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("");
  const [jobStateFilter, setJobStateFilter] = useState("");
  const [jobBdRepFilter, setJobBdRepFilter] = useState("");

  const [candidatesOpen, setCandidatesOpen] = useState(true);
  const [jobsOpen, setJobsOpen] = useState(true);
  const [candidateSort, setCandidateSort] = useState({ key: "updated_at", direction: "desc" });
  const [jobSort, setJobSort] = useState({ key: "updated_at", direction: "desc" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      const { data, error: rpcError } = await supabase.rpc("get_client_cts_dashboard");

      if (rpcError) {
        setError(rpcError.message || "Could not load CTS dashboard.");
        setJobs([]);
        setCandidates([]);
        setLoading(false);
        return;
      }

      setJobs(data?.jobs || []);
      setCandidates(data?.candidates || []);
      setLoading(false);
    };

    load();
  }, []);

  const toggleCandidateSort = (key) => {
    setCandidateSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleJobSort = (key) => {
    setJobSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const distinctStates = useMemo(
    () => [...new Set(jobs.map((job) => job.state).filter(Boolean))].sort(),
    [jobs]
  );

  const distinctBdReps = useMemo(
    () => [...new Set(jobs.map((job) => job.bd_rep).filter(Boolean))].sort(),
    [jobs]
  );

  const distinctCandidateStatuses = useMemo(
    () => [...new Set(candidates.map((candidate) => candidate.status || "sourced"))].sort(),
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();

    const getSortValue = (candidate) => {
      switch (candidateSort.key) {
        case "name":
          return candidate.name || "";
        case "project":
          return candidate.project || "";
        case "status":
          return candidate.status || "";
        case "updated_at":
        default:
          return getTimestamp(candidate.updated_at);
      }
    };

    return candidates
      .filter((candidate) => {
        const projectLabel = [
          candidate.project,
          candidate.project_city,
          candidate.project_state,
        ]
          .filter(Boolean)
          .join(" ");

        const matchesSearch =
          !q ||
          [
            candidate.name,
            candidate.phone,
            candidate.email,
            projectLabel,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q));

        const matchesStatus = !candidateStatusFilter || candidate.status === candidateStatusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const statusPriorityA = getCandidateStatusPriority(a.status);
        const statusPriorityB = getCandidateStatusPriority(b.status);
        if (statusPriorityA !== statusPriorityB) {
          return statusPriorityA - statusPriorityB;
        }

        const updatedAtA = getTimestamp(a.updated_at);
        const updatedAtB = getTimestamp(b.updated_at);
        if (updatedAtA !== updatedAtB) {
          return updatedAtB - updatedAtA;
        }

        const primary = compareValues(getSortValue(a), getSortValue(b));
        return candidateSort.direction === "asc" ? primary : -primary;
      });
  }, [candidates, candidateSearch, candidateStatusFilter, candidateSort]);

  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();

    const getSortValue = (job) => {
      switch (jobSort.key) {
        case "qty":
          return Number(job.qty || 0);
        case "level_type":
          return job.level_type || "";
        case "city":
          return job.city || "";
        case "state":
          return job.state || "";
        case "start_text":
          return job.start_text || "";
        case "details":
          return job.details || "";
        case "language_requirement":
          return job.language_requirement || "";
        case "bd_rep":
          return job.bd_rep || "";
        case "status":
          return job.status || "";
        case "priority":
          return job.priority || "";
        case "candidates":
          return Number(job.candidate_count || 0);
        case "updated_at":
        default:
          return getTimestamp(job.updated_at);
      }
    };

    return jobs
      .filter((job) => {
        const matchesSearch =
          !q ||
          [
            job.level_type,
            job.city,
            job.state,
            job.start_text,
            job.details,
            job.language_requirement,
            job.bd_rep,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q));

        const matchesStatus = !jobStatusFilter || job.status === jobStatusFilter;
        const matchesState =
          !jobStateFilter ||
          String(job.state || "").toLowerCase() === jobStateFilter.toLowerCase();
        const matchesBdRep =
          !jobBdRepFilter ||
          String(job.bd_rep || "").toLowerCase() === jobBdRepFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesState && matchesBdRep;
      })
      .sort((a, b) => {
        const primary = compareValues(getSortValue(a), getSortValue(b));
        if (primary !== 0) return jobSort.direction === "asc" ? primary : -primary;
        return getTimestamp(b.updated_at) - getTimestamp(a.updated_at);
      });
  }, [jobs, jobSearch, jobStatusFilter, jobStateFilter, jobBdRepFilter, jobSort]);

  return (
    <>
      <PageStyles />
      <UtsClientTopBar />

      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)" }}>
        <div className="client-shell">
          <div className="glass-card hero-card">
            <div className="hero-top">
              <div>
                <h1 className="hero-title">CTS Jobs Dashboard</h1>
                <p className="hero-subtitle">
                  Read-only view of sourced candidates and current CTS job orders.
                </p>
              </div>
              <button className="client-action-btn" type="button" onClick={() => navigate("/client/hours")}>
                <Clock3 size={16} />
                Hours Entry
              </button>
            </div>
          </div>

          {error ? (
            <div className="glass-card table-card" style={{ color: "#991b1b", fontWeight: 800 }}>
              {error}
            </div>
          ) : null}

          <div className="glass-card table-card">
            <div className="table-top">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="icon-btn" type="button" onClick={() => setCandidatesOpen((prev) => !prev)}>
                  {candidatesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <Users size={20} />
                <div style={{ fontWeight: 900, fontSize: 22 }}>
                  Candidates Sourced ({filteredCandidates.length})
                </div>
              </div>

              {candidatesOpen ? (
                <div className="candidate-header-controls">
                  <input
                    className="input"
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    placeholder="Search name, phone, email or project..."
                  />

                  <select
                    className="select"
                    value={candidateStatusFilter}
                    onChange={(e) => setCandidateStatusFilter(e.target.value)}
                  >
                    <option value="">All Candidate Statuses</option>
                    {distinctCandidateStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {candidatesOpen ? (
              loading ? (
                <div className="empty-state" style={{ marginTop: 18 }}>
                  <Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
                  Loading sourced candidates...
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 18 }}>
                  No sourced candidates found with the current filters.
                </div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <SortableTh sortKey="name" sortConfig={candidateSort} onSort={toggleCandidateSort}>Name</SortableTh>
                        <th>Profile</th>
                        <SortableTh sortKey="project" sortConfig={candidateSort} onSort={toggleCandidateSort}>Project</SortableTh>
                        <SortableTh sortKey="status" sortConfig={candidateSort} onSort={toggleCandidateSort}>Status</SortableTh>
                        <SortableTh sortKey="updated_at" sortConfig={candidateSort} onSort={toggleCandidateSort}>Last Modified</SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((candidate) => {
                        const projectLocation = [candidate.project_city, candidate.project_state]
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <tr key={candidate.id}>
                            <td>
                              <div style={{ fontWeight: 900 }}>{candidate.name || "-"}</div>
                              <div style={{ marginTop: 5, color: "#64748b", fontSize: 13 }}>
                                {candidate.phone || "No phone"}
                                {candidate.email ? ` • ${candidate.email}` : ""}
                              </div>
                            </td>
                            <td>
                              <button
                                className="profile-btn"
                                type="button"
                                disabled={!candidate.public_profile_slug}
                                onClick={() =>
                                  candidate.public_profile_slug &&
                                  window.open(`/profile/${candidate.public_profile_slug}`, "_blank")
                                }
                                title={candidate.public_profile_slug ? "Open worker profile" : "No public profile available"}
                              >
                                <ExternalLink size={18} />
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => candidate.project_id && navigate(`/client/cts-jobs/${candidate.project_id}`)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#0f172a",
                                  cursor: candidate.project_id ? "pointer" : "default",
                                  padding: 0,
                                  textAlign: "left",
                                  fontWeight: 900,
                                }}
                              >
                                {candidate.project || "-"}
                              </button>
                              {projectLocation ? (
                                <div style={{ marginTop: 5, color: "#64748b", fontSize: 13 }}>
                                  {projectLocation}
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <span className="status-pill" style={getCandidateStatusStyle(candidate.status)}>
                                {formatStatus(candidate.status)}
                              </span>
                            </td>
                            <td>{formatDateTime(candidate.updated_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </div>

          <div className="glass-card table-card">
            <div className="table-top">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="icon-btn" type="button" onClick={() => setJobsOpen((prev) => !prev)}>
                  {jobsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <Briefcase size={20} />
                <div style={{ fontWeight: 900, fontSize: 22 }}>
                  CTS Job List ({filteredJobs.length})
                </div>
              </div>

              {jobsOpen ? (
                <div className="table-header-controls">
                  <input
                    className="input"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="Search jobs..."
                  />

                  <select className="select" value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="filled">Filled</option>
                    <option value="closed">Closed</option>
                  </select>

                  <select className="select" value={jobStateFilter} onChange={(e) => setJobStateFilter(e.target.value)}>
                    <option value="">All States</option>
                    {distinctStates.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>

                  <select className="select" value={jobBdRepFilter} onChange={(e) => setJobBdRepFilter(e.target.value)}>
                    <option value="">All BD Reps</option>
                    {distinctBdReps.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {jobsOpen ? (
              loading ? (
                <div className="empty-state" style={{ marginTop: 18 }}>
                  <Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
                  Loading CTS jobs...
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 18 }}>
                  No CTS jobs found with the current filters.
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="jobs-table">
                    <thead>
                      <tr>
                        <SortableTh sortKey="qty" sortConfig={jobSort} onSort={toggleJobSort}>Qty</SortableTh>
                        <SortableTh sortKey="level_type" sortConfig={jobSort} onSort={toggleJobSort}>Level / Type</SortableTh>
                        <SortableTh sortKey="city" sortConfig={jobSort} onSort={toggleJobSort}>City</SortableTh>
                        <SortableTh sortKey="state" sortConfig={jobSort} onSort={toggleJobSort}>State</SortableTh>
                        <SortableTh sortKey="start_text" sortConfig={jobSort} onSort={toggleJobSort}>Start</SortableTh>
                        <SortableTh sortKey="details" sortConfig={jobSort} onSort={toggleJobSort}>Details</SortableTh>
                        <SortableTh sortKey="language_requirement" sortConfig={jobSort} onSort={toggleJobSort}>Language</SortableTh>
                        <SortableTh sortKey="bd_rep" sortConfig={jobSort} onSort={toggleJobSort}>BD Rep</SortableTh>
                        <SortableTh sortKey="updated_at" sortConfig={jobSort} onSort={toggleJobSort}>Modification Date</SortableTh>
                        <SortableTh sortKey="status" sortConfig={jobSort} onSort={toggleJobSort}>Status</SortableTh>
                        <SortableTh sortKey="priority" sortConfig={jobSort} onSort={toggleJobSort}>Priority</SortableTh>
                        <SortableTh sortKey="candidates" sortConfig={jobSort} onSort={toggleJobSort}>Candidates</SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job) => (
                        <tr key={job.id}>
                          <td style={{ fontWeight: 900 }}>{job.qty ?? 0}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => navigate(`/client/cts-jobs/${job.id}`)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#0f172a",
                                cursor: "pointer",
                                padding: 0,
                                textAlign: "left",
                                fontWeight: 900,
                              }}
                            >
                              {job.level_type || "-"}
                            </button>
                          </td>
                          <td>{job.city || "-"}</td>
                          <td>{job.state || "-"}</td>
                          <td>{job.start_text || "-"}</td>
                          <td style={{ minWidth: 240 }}>{job.details || "-"}</td>
                          <td>{job.language_requirement || "-"}</td>
                          <td>{job.bd_rep || "-"}</td>
                          <td>{formatDateOnly(job.updated_at)}</td>
                          <td>
                            <span className="status-pill" style={getJobStatusStyle(job.status)}>
                              {formatStatus(job.status)}
                            </span>
                          </td>
                          <td>
                            <span className="priority-pill" style={getPriorityStyle(job.priority)}>
                              {formatStatus(job.priority)}
                            </span>
                          </td>
                          <td style={{ fontWeight: 900 }}>{job.candidate_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      <GoToTopButton />
    </>
  );
}

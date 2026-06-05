import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Save,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "missing", label: "Missing hours" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "approved", label: "Approved" },
];

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; max-width: 100%; overflow-x: hidden; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #eef4ff; color: #0f172a; }
      input, select, button { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .hours-shell { width: min(1440px, calc(100vw - 32px)); max-width: calc(100vw - 32px); margin: 0 auto; padding: 24px 0 48px; display: grid; gap: 18px; }
      .card { min-width: 0; overflow: hidden; background: rgba(255,255,255,0.92); border: 1px solid #dbeafe; border-radius: 28px; box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08); padding: 24px; }
      .hero { min-width: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .kicker { display: inline-flex; align-items: center; gap: 8px; color: #1d4ed8; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
      .title { margin: 0; font-size: clamp(31px, 4vw, 46px); line-height: 1.05; font-weight: 850; letter-spacing: -0.035em; }
      .subtitle { margin: 10px 0 0; color: #64748b; font-size: 15px; line-height: 1.65; max-width: 760px; }
      .btn { white-space: nowrap; border: 1px solid #cbd5e1; border-radius: 14px; min-height: 44px; padding: 10px 14px; background: #fff; color: #0f172a; font-size: 13px; font-weight: 750; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: 0.18s ease; text-decoration: none; }
      .btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08); }
      .btn.dark { background: #0f172a; border-color: #0f172a; color: #fff; }
      .btn.success { background: #16a34a; border-color: #16a34a; color: #fff; }
      .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
      .hero-actions, .row-actions { max-width: 100%; display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .filters { min-width: 0; display: grid; grid-template-columns: minmax(180px, 1.2fr) minmax(140px, 0.55fr) minmax(170px, 0.75fr) minmax(140px, 0.55fr); gap: 10px; align-items: end; }
      .field { display: grid; gap: 7px; }
      .label { color: #64748b; font-size: 11px; font-weight: 850; letter-spacing: 0.09em; text-transform: uppercase; }
      .input, .select { width: 100%; min-height: 44px; border: 1px solid #cbd5e1; border-radius: 13px; background: #fff; color: #0f172a; padding: 10px 12px; outline: none; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .metric { border: 1px solid #dbeafe; border-radius: 18px; background: #f8fbff; padding: 16px; }
      .metric-label { color: #64748b; font-size: 12px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.08em; }
      .metric-value { margin-top: 6px; color: #0f172a; font-size: 28px; line-height: 1; font-weight: 850; letter-spacing: -0.035em; }
      .feedback { border-radius: 16px; padding: 13px 14px; font-weight: 800; }
      .feedback.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      .feedback.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
      .table-scroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .timesheet-table { width: 100%; min-width: 1120px; border-collapse: separate; border-spacing: 0; }
      .timesheet-table th { background: #eff6ff; color: #1e3a8a; font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px; text-align: left; border-bottom: 1px solid #dbeafe; }
      .timesheet-table td { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 12px; vertical-align: middle; }
      .timesheet-table tbody tr:nth-child(even) td { background: #fbfdff; }
      .worker-name { font-weight: 850; color: #0f172a; }
      .worker-meta { margin-top: 4px; color: #64748b; font-size: 12px; line-height: 1.45; }
      .project { font-weight: 850; color: #0f172a; }
      .project-meta { margin-top: 4px; color: #64748b; font-size: 12px; }
      .hours-input { width: 72px; min-height: 38px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; text-align: center; font-weight: 750; color: #0f172a; background: #fff; }
      .hours-input:disabled { background: #f1f5f9; color: #94a3b8; }
      .total-cell { text-align: right; font-weight: 850; color: #0f172a; }
      .status-pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 7px 10px; font-size: 12px; font-weight: 850; white-space: nowrap; }
      .status-pill.missing { background: #fef2f2; color: #991b1b; }
      .status-pill.pending { background: #fff7ed; color: #9a3412; }
      .status-pill.reviewed { background: #eff6ff; color: #1d4ed8; }
      .status-pill.approved { background: #ecfdf5; color: #047857; }
      .worker-hint { margin-top: 6px; color: #2563eb; font-size: 11px; font-weight: 800; white-space: nowrap; }
      .empty { border: 1px dashed #cbd5e1; background: #f8fafc; color: #475569; border-radius: 20px; padding: 28px; text-align: center; font-weight: 800; }
      @media (max-width: 980px) { .filters, .summary-grid { grid-template-columns: 1fr 1fr; } .hours-shell { width: min(100% - 24px, 1440px); max-width: calc(100vw - 24px); } .hero-actions { justify-content: flex-start; } }
      @media (max-width: 640px) { .filters, .summary-grid { grid-template-columns: 1fr; } .card { padding: 18px; border-radius: 22px; } }
      @media print { .uts-topbar, .hero-actions, .filters-card, .row-actions, .btn, .go-to-top-button { display: none !important; } body { background: #fff; } .hours-shell { width: 100%; padding: 0; } .card { box-shadow: none; border-color: #e2e8f0; } }
    `}</style>
  );
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekRange(weekStart) {
  const start = parseDate(weekStart);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatHours(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeHours(value) {
  if (value === "" || value == null) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return String(Math.min(parsed, 24));
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function entryKey(candidateId, workDate) {
  return `${candidateId}|${workDate}`;
}

function reviewKey(candidateId, weekStart) {
  return `${candidateId}|${weekStart}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (![",", "\n", '"'].some((char) => text.includes(char))) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getRowStatus(total, review) {
  if (review?.status === "approved") return "approved";
  if (review?.status === "reviewed") return "reviewed";
  if (total <= 0) return "missing";
  return "pending";
}

function getStatusLabel(status) {
  return {
    missing: "Missing hours",
    pending: "Pending",
    reviewed: "Reviewed",
    approved: "Approved",
  }[status] || "Pending";
}

export default function HoursTrackerPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());
  const [workerEntriesByKey, setWorkerEntriesByKey] = useState(new Map());
  const [draftHours, setDraftHours] = useState(new Map());
  const [reviewsByKey, setReviewsByKey] = useState(new Map());
  const [jobs, setJobs] = useState([]);
  const [weekStart, setWeekStart] = useState(() => toDateInputValue(startOfWeek(new Date())));
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [feedback, setFeedback] = useState({ error: "", success: "" });

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => toDateInputValue(addDays(parseDate(weekStart), index))),
    [weekStart]
  );

  const load = useCallback(async ({ preserveFeedback = false } = {}) => {
    setLoading(true);
    if (!preserveFeedback) setFeedback({ error: "", success: "" });

    const [candidateRes, jobsRes, workersRes, hoursRes, workerHoursRes, reviewsRes] = await Promise.all([
      supabase.from("cts_job_candidates").select("*").order("updated_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("cts_jobs").select("id, level_type, city, state, status").order("created_at", { ascending: false }),
      supabase.from("workers").select("id, name, phone, email, public_profile_slug"),
      supabase
        .from("hours_entries")
        .select("*")
        .eq("source", "admin")
        .gte("work_date", weekStart)
        .lte("work_date", days[6]),
      supabase
        .from("hours_entries")
        .select("*")
        .eq("source", "client")
        .gte("work_date", weekStart)
        .lte("work_date", days[6]),
      supabase
        .from("weekly_hours_reviews")
        .select("*")
        .eq("week_start_date", weekStart),
    ]);

    if (candidateRes.error || jobsRes.error || workersRes.error || hoursRes.error || workerHoursRes.error || reviewsRes.error) {
      setFeedback({
        error:
          candidateRes.error?.message ||
          jobsRes.error?.message ||
          workersRes.error?.message ||
          hoursRes.error?.message ||
          workerHoursRes.error?.message ||
          reviewsRes.error?.message ||
          "Could not load hours control.",
        success: "",
      });
      setAssignments([]);
      setEntriesByKey(new Map());
      setWorkerEntriesByKey(new Map());
      setDraftHours(new Map());
      setReviewsByKey(new Map());
      setLoading(false);
      return;
    }

    const jobsById = new Map((jobsRes.data || []).map((job) => [job.id, job]));
    const workersById = new Map((workersRes.data || []).map((worker) => [worker.id, worker]));

    const nextAssignments = (candidateRes.data || [])
      .filter((candidate) => String(candidate.candidate_status || "").toLowerCase() === "placed")
      .map((candidate) => {
        const job = jobsById.get(candidate.cts_job_id) || {};
        const worker = workersById.get(candidate.worker_id) || {};
        return {
          ...candidate,
          name: candidate.name_snapshot || worker.name || "Unnamed worker",
          phone: candidate.phone_snapshot || worker.phone || "",
          email: worker.email || "",
          public_profile_slug: worker.public_profile_slug || "",
          project: job.level_type || "Untitled project",
          projectLocation: [job.city, job.state].filter(Boolean).join(", "),
          jobStatus: job.status || "",
          phoneDigits: normalizePhoneDigits(candidate.phone_snapshot || worker.phone || ""),
        };
      })
      .sort((a, b) => {
        const projectCompare = (a.project || "").localeCompare(b.project || "");
        if (projectCompare !== 0) return projectCompare;
        return (a.name || "").localeCompare(b.name || "");
      });

    const nextEntries = new Map();
    const nextDraft = new Map();
    (hoursRes.data || []).forEach((entry) => {
      const key = entryKey(entry.cts_job_candidate_id, entry.work_date);
      nextEntries.set(key, entry);
      nextDraft.set(key, entry.regular_hours == null ? "" : String(entry.regular_hours));
    });

    const nextWorkerEntries = new Map();
    (workerHoursRes.data || []).forEach((entry) => {
      nextWorkerEntries.set(entryKey(entry.cts_job_candidate_id, entry.work_date), entry);
    });

    const nextReviews = new Map();
    (reviewsRes.data || []).forEach((review) => {
      nextReviews.set(reviewKey(review.cts_job_candidate_id, review.week_start_date), review);
    });

    setJobs(jobsRes.data || []);
    setAssignments(nextAssignments);
    setEntriesByKey(nextEntries);
    setWorkerEntriesByKey(nextWorkerEntries);
    setDraftHours(nextDraft);
    setReviewsByKey(nextReviews);
    setLoading(false);
  }, [days, weekStart]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const rows = useMemo(() => assignments.map((assignment) => {
    const values = {};
    let total = 0;
    days.forEach((day) => {
      const value = draftHours.get(entryKey(assignment.id, day)) ?? "";
      values[day] = value;
      total += Number(value || 0);
    });
    const workerValues = {};
    let workerTotal = 0;
    days.forEach((day) => {
      const workerValue = workerEntriesByKey.get(entryKey(assignment.id, day))?.regular_hours ?? "";
      workerValues[day] = workerValue;
      workerTotal += Number(workerValue || 0);
    });
    const review = reviewsByKey.get(reviewKey(assignment.id, weekStart));
    const status = getRowStatus(total, review);
    return { assignment, values, total, workerValues, workerTotal, review, status };
  }), [assignments, days, draftHours, reviewsByKey, weekStart, workerEntriesByKey]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const phoneNeedle = normalizePhoneDigits(search);
    return rows.filter(({ assignment, status }) => {
      const haystack = [assignment.name, assignment.phone, assignment.email, assignment.project, assignment.projectLocation]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !needle || haystack.includes(needle) || (phoneNeedle && assignment.phoneDigits.includes(phoneNeedle));
      const matchesJob = !jobFilter || assignment.cts_job_id === jobFilter;
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesJob && matchesStatus;
    });
  }, [jobFilter, rows, search, statusFilter]);

  const summary = useMemo(() => ({
    totalHours: rows.reduce((sum, row) => sum + row.total, 0),
    missing: rows.filter((row) => row.status === "missing").length,
    pending: rows.filter((row) => row.status === "pending").length,
    reviewed: rows.filter((row) => row.status === "reviewed").length,
    approved: rows.filter((row) => row.status === "approved").length,
  }), [rows]);

  const updateHours = (candidateId, workDate, value) => {
    const normalized = normalizeHours(value);
    setDraftHours((prev) => {
      const next = new Map(prev);
      next.set(entryKey(candidateId, workDate), normalized);
      return next;
    });
  };

  const upsertReview = async (assignment, status) => {
    const reviewPayload = {
      cts_job_candidate_id: assignment.id,
      cts_job_id: assignment.cts_job_id,
      worker_id: assignment.worker_id,
      week_start_date: weekStart,
      status,
      reviewed_at: status === "reviewed" || status === "approved" ? new Date().toISOString() : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("weekly_hours_reviews")
      .upsert(reviewPayload, { onConflict: "cts_job_candidate_id,week_start_date" })
      .select("*")
      .single();

    if (error) throw error;
    setReviewsByKey((prev) => {
      const next = new Map(prev);
      next.set(reviewKey(assignment.id, weekStart), data || reviewPayload);
      return next;
    });
  };

  const saveRow = async (assignment) => {
    setSavingKey(`save-${assignment.id}`);
    setFeedback({ error: "", success: "" });

    const upsertRows = [];
    const deleteIds = [];
    days.forEach((day) => {
      const key = entryKey(assignment.id, day);
      const value = draftHours.get(key) ?? "";
      const existing = entriesByKey.get(key);
      if (value === "" || Number(value) === 0) {
        if (existing?.id) deleteIds.push(existing.id);
        return;
      }
      upsertRows.push({
        cts_job_candidate_id: assignment.id,
        cts_job_id: assignment.cts_job_id,
        worker_id: assignment.worker_id,
        work_date: day,
        week_start_date: weekStart,
        source: "admin",
        regular_hours: Number(value),
      });
    });

    try {
      if (deleteIds.length) {
        const { error } = await supabase.from("hours_entries").delete().eq("source", "admin").in("id", deleteIds);
        if (error) throw error;
      }
      if (upsertRows.length) {
        const { error } = await supabase
          .from("hours_entries")
          .upsert(upsertRows, { onConflict: "cts_job_candidate_id,work_date,source" });
        if (error) throw error;
      }
      if ((reviewsByKey.get(reviewKey(assignment.id, weekStart))?.status || "pending") === "approved") {
        await upsertReview(assignment, "pending");
      }
      await load({ preserveFeedback: true });
      setFeedback({ error: "", success: `Hours saved for ${assignment.name}.` });
    } catch (error) {
      setFeedback({ error: error.message || "Could not save hours.", success: "" });
    } finally {
      setSavingKey("");
    }
  };

  const updateStatus = async (assignment, status) => {
    setSavingKey(`${status}-${assignment.id}`);
    setFeedback({ error: "", success: "" });
    try {
      await upsertReview(assignment, status);
      setFeedback({ error: "", success: `${assignment.name} marked as ${getStatusLabel(status).toLowerCase()} for ${formatWeekRange(weekStart)}.` });
    } catch (error) {
      setFeedback({ error: error.message || "Could not update review status.", success: "" });
    } finally {
      setSavingKey("");
    }
  };

  const saveVisible = async () => {
    for (const row of filteredRows) {
      await saveRow(row.assignment);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      `weekly-hours-${weekStart}.csv`,
      ["Week", "Worker", "Phone", "Email", "Project", ...DAY_LABELS, "Total", "Status"],
      filteredRows.map(({ assignment, values, total, status }) => [
        formatWeekRange(weekStart),
        assignment.name,
        assignment.phone,
        assignment.email,
        assignment.project,
        ...days.map((day) => formatHours(values[day] || 0)),
        formatHours(total),
        getStatusLabel(status),
      ])
    );
  };

  return (
    <>
      <PageStyles />
      <UtsTopNavBar />
      <main className="hours-shell">
        <section className="card hero">
          <div>
            <div className="kicker"><CalendarDays size={15} /> Admin Hours Control</div>
            <h1 className="title">Weekly Timesheets</h1>
            <p className="subtitle">
              Track employee hours from one admin dashboard. Enter hours, review each worker week, approve completed timesheets, and send only approved hours to invoicing.
            </p>
          </div>
          <div className="hero-actions">
            <button className="btn" type="button" onClick={() => navigate("/admin")}> <ArrowLeft size={15} /> Admin Panel</button>
            <button className="btn" type="button" onClick={() => load()} disabled={loading}>{loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} Refresh</button>
            <button className="btn" type="button" onClick={exportCsv} disabled={!filteredRows.length}><Download size={15} /> Export CSV</button>
          </div>
        </section>

        {feedback.error ? <div className="feedback error">{feedback.error}</div> : null}
        {feedback.success ? <div className="feedback success">{feedback.success}</div> : null}

        <section className="card filters-card">
          <div className="filters">
            <div className="field">
              <label className="label">Search</label>
              <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search worker, phone, email, or project" />
            </div>
            <div className="field">
              <label className="label">Week</label>
              <input className="input" type="date" value={weekStart} onChange={(event) => setWeekStart(toDateInputValue(startOfWeek(parseDate(event.target.value))))} />
            </div>
            <div className="field">
              <label className="label">Project</label>
              <select className="select" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                <option value="">All projects</option>
                {jobs.map((job) => <option key={job.id} value={job.id}>{job.level_type || "Untitled project"}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Status</label>
              <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="summary-grid">
          <div className="metric"><div className="metric-label">Total Hours</div><div className="metric-value">{formatHours(summary.totalHours)}</div></div>
          <div className="metric"><div className="metric-label">Pending</div><div className="metric-value">{summary.pending}</div></div>
          <div className="metric"><div className="metric-label">Reviewed</div><div className="metric-value">{summary.reviewed}</div></div>
          <div className="metric"><div className="metric-label">Approved</div><div className="metric-value">{summary.approved}</div></div>
        </section>

        <section className="card">
          <div className="hero" style={{ marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.03em" }}>Week of {formatWeekRange(weekStart)}</h2>
              <p className="subtitle" style={{ marginTop: 6 }}>{filteredRows.length} workers shown · {summary.missing} missing hours</p>
            </div>
            <div className="hero-actions">
              <button className="btn dark" type="button" onClick={saveVisible} disabled={loading || !filteredRows.length || !!savingKey}>
                {savingKey ? <Loader2 className="spin" size={15} /> : <Save size={15} />} Save Visible
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty"><Loader2 className="spin" size={18} /> Loading hours...</div>
          ) : filteredRows.length ? (
            <div className="table-scroll">
              <table className="timesheet-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Project</th>
                    {days.map((day, index) => <th key={day}>{DAY_LABELS[index]}<div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>{formatDate(day)}</div></th>)}
                    <th style={{ textAlign: "right" }}>Admin Total</th>
                    <th style={{ textAlign: "right" }}>Worker Submitted</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ assignment, values, total, workerValues, workerTotal, status }) => (
                    <tr key={assignment.id}>
                      <td>
                        <div className="worker-name">{assignment.name}</div>
                        <div className="worker-meta">{assignment.phone || "No phone"}{assignment.email ? <><br />{assignment.email}</> : null}</div>
                      </td>
                      <td>
                        <div className="project">{assignment.project}</div>
                        <div className="project-meta">{assignment.projectLocation || "No location"}</div>
                      </td>
                      {days.map((day) => (
                        <td key={day}>
                          <input
                            className="hours-input"
                            inputMode="decimal"
                            value={values[day] ?? ""}
                            onChange={(event) => updateHours(assignment.id, day, event.target.value)}
                            aria-label={`${assignment.name} ${day} hours`}
                          />
                          {Number(workerValues[day] || 0) > 0 ? <div className="worker-hint">Worker: {formatHours(workerValues[day])}</div> : null}
                        </td>
                      ))}
                      <td className="total-cell">{formatHours(total)}</td>
                      <td className="total-cell">{workerTotal > 0 ? formatHours(workerTotal) : "—"}</td>
                      <td><span className={`status-pill ${status}`}>{status === "approved" ? <CheckCircle2 size={14} /> : null}{getStatusLabel(status)}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn" type="button" onClick={() => saveRow(assignment)} disabled={!!savingKey}>
                            {savingKey === `save-${assignment.id}` ? <Loader2 className="spin" size={14} /> : <Save size={14} />} Save
                          </button>
                          <button className="btn" type="button" onClick={() => updateStatus(assignment, "reviewed")} disabled={!!savingKey || total <= 0}>Reviewed</button>
                          <button className="btn success" type="button" onClick={() => updateStatus(assignment, "approved")} disabled={!!savingKey || total <= 0}>Approve</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No placed workers match the current filters.</div>
          )}
        </section>
      </main>
      <GoToTopButton />
    </>
  );
}

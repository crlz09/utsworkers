import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Link2,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";

const WORKER_HOURS_BASE_URL = "https://uts.services";
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
      html, body {
        margin: 0;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      input, select, button { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      .hours-shell {
        width: min(100% - 32px, 1380px);
        margin: 0 auto;
        padding: 22px 0 44px;
        display: grid;
        gap: 14px;
      }

      .card {
        min-width: 0;
        overflow: hidden;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 22px;
        box-shadow: 0 16px 38px rgba(15, 23, 42, 0.06);
      }

      .top-summary {
        padding: 18px 20px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
      }

      .kicker {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: #2563eb;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 7px;
      }

      .title {
        margin: 0;
        color: #0f172a;
        font-size: clamp(26px, 3vw, 36px);
        line-height: 1.06;
        font-weight: 850;
        letter-spacing: -0.035em;
      }

      .subtitle {
        margin: 7px 0 0;
        color: #64748b;
        font-size: 13px;
        line-height: 1.55;
        max-width: 780px;
      }

      .top-actions, .row-actions, .table-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }

      .summary-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(92px, auto));
        gap: 8px;
      }

      .summary-chip {
        min-width: 104px;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #f8fafc;
        padding: 10px 12px;
      }

      .summary-chip strong {
        display: block;
        color: #0f172a;
        font-size: 20px;
        line-height: 1;
        letter-spacing: -0.03em;
      }

      .summary-chip span {
        display: block;
        margin-top: 5px;
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .filters-card { padding: 14px; }
      .filters {
        min-width: 0;
        display: grid;
        grid-template-columns: minmax(220px, 1.4fr) minmax(150px, 0.7fr) minmax(180px, 0.9fr) minmax(150px, 0.7fr) auto;
        gap: 10px;
        align-items: end;
      }

      .field { min-width: 0; display: grid; gap: 6px; }
      .label {
        color: #64748b;
        font-size: 10px;
        font-weight: 850;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .input, .select {
        width: 100%;
        min-height: 40px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        background: #ffffff;
        color: #0f172a;
        padding: 9px 11px;
        outline: none;
        font-size: 13px;
      }
      .input:focus, .select:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }

      .btn {
        white-space: nowrap;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        min-height: 38px;
        padding: 9px 11px;
        background: #ffffff;
        color: #0f172a;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        text-decoration: none;
      }
      .btn:hover:not(:disabled) { transform: translateY(-1px); border-color: #94a3b8; box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08); }
      .btn.dark { background: #0f172a; border-color: #0f172a; color: #ffffff; }
      .btn.success { background: #16a34a; border-color: #16a34a; color: #ffffff; }
      .btn.link { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
      .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }

      .feedback { border-radius: 16px; padding: 12px 14px; font-size: 13px; font-weight: 800; }
      .feedback.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      .feedback.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }

      .timesheet-section { padding: 16px; }
      .section-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .section-title { margin: 0; color: #0f172a; font-size: 20px; line-height: 1.1; letter-spacing: -0.03em; }
      .section-subtitle { margin: 5px 0 0; color: #64748b; font-size: 12px; }

      .desktop-table-wrap { display: block; width: 100%; overflow: visible; }
      .mobile-cards { display: none; }
      .timesheet-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; }
      .timesheet-table th {
        background: #f8fafc;
        color: #475569;
        font-size: 10px;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        padding: 9px 6px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
      }
      .timesheet-table td {
        background: #ffffff;
        border-bottom: 1px solid #eef2f7;
        padding: 10px 6px;
        vertical-align: middle;
      }
      .timesheet-table tbody tr { transition: background 0.16s ease, box-shadow 0.16s ease; }
      .timesheet-table tbody tr:hover td { background: #f8fafc; }
      .col-worker { width: 18%; }
      .col-project { width: 16%; }
      .col-day { width: 5.5%; text-align: center; }
      .col-total { width: 7%; text-align: right; }
      .col-status { width: 9%; }
      .col-actions { width: 19.5%; }

      .worker-name { font-weight: 850; color: #0f172a; font-size: 13px; line-height: 1.25; overflow-wrap: anywhere; }
      .worker-meta { margin-top: 4px; color: #64748b; font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
      .project { font-weight: 850; color: #0f172a; font-size: 12px; line-height: 1.25; overflow-wrap: anywhere; }
      .project-meta { margin-top: 4px; color: #64748b; font-size: 11px; line-height: 1.3; }
      .day-head-date { margin-top: 3px; color: #94a3b8; font-size: 10px; font-weight: 700; letter-spacing: 0; text-transform: none; }
      .hours-input {
        width: 42px;
        min-height: 34px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 6px 4px;
        text-align: center;
        font-size: 12px;
        font-weight: 750;
        color: #0f172a;
        background: #ffffff;
        outline: none;
      }
      .hours-input::placeholder { color: #cbd5e1; }
      .hours-input.missing { border-color: #fecaca; background: #fff7f7; }
      .hours-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
      .worker-hint { margin-top: 4px; color: #2563eb; font-size: 10px; font-weight: 800; white-space: nowrap; }
      .total-cell { text-align: right; font-weight: 850; color: #0f172a; font-size: 13px; }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 999px;
        padding: 6px 9px;
        font-size: 11px;
        font-weight: 850;
        white-space: nowrap;
      }
      .status-pill.missing { background: #fef2f2; color: #b91c1c; }
      .status-pill.pending { background: #fef9c3; color: #a16207; }
      .status-pill.reviewed { background: #eff6ff; color: #1d4ed8; }
      .status-pill.approved { background: #ecfdf5; color: #047857; }

      .empty { border: 1px dashed #cbd5e1; background: #f8fafc; color: #475569; border-radius: 18px; padding: 28px; text-align: center; font-weight: 800; }

      .worker-card {
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #ffffff;
        padding: 14px;
        display: grid;
        gap: 13px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        transition: transform 0.16s ease, box-shadow 0.16s ease;
      }
      .worker-card:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(15, 23, 42, 0.07); }
      .worker-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .card-project-grid { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
      .mobile-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 7px; }
      .mobile-day { min-width: 0; display: grid; gap: 5px; justify-items: center; }
      .mobile-day-label { color: #64748b; font-size: 10px; font-weight: 850; text-transform: uppercase; }
      .mobile-card-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 12px; }

      @media (max-width: 1180px) {
        .desktop-table-wrap { display: none; }
        .mobile-cards { display: grid; gap: 12px; }
        .top-summary { grid-template-columns: 1fr; }
        .summary-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .filters { grid-template-columns: 1fr 1fr; }
        .filters .top-actions { justify-content: flex-start; }
      }

      @media (max-width: 680px) {
        .hours-shell { width: min(100% - 20px, 1380px); padding-top: 14px; }
        .top-summary, .timesheet-section { padding: 14px; border-radius: 18px; }
        .filters { grid-template-columns: 1fr; }
        .summary-strip { grid-template-columns: 1fr; }
        .mobile-days { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .top-actions, .table-actions, .mobile-card-actions { justify-content: stretch; }
        .btn { flex: 1 1 auto; }
      }

      @media print {
        .uts-topbar, .top-actions, .filters-card, .row-actions, .mobile-card-actions, .btn, .go-to-top-button { display: none !important; }
        body { background: #ffffff; }
        .hours-shell { width: 100%; padding: 0; }
        .card { box-shadow: none; border-color: #e2e8f0; }
        .desktop-table-wrap { display: block; }
        .mobile-cards { display: none; }
      }
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

  const raw = String(value).replace(",", ".").trim();
  if (!raw || raw.startsWith("-")) return "";

  let normalized = "";
  let hasDecimal = false;
  for (const char of raw) {
    if (/\d/.test(char)) {
      normalized += char;
    } else if (char === "." && !hasDecimal) {
      normalized += char;
      hasDecimal = true;
    }
  }

  if (!normalized) return "";
  if (normalized === ".") return "0.";

  const [wholePart, decimalPart = ""] = normalized.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "") || "0";
  const nextValue = hasDecimal ? `${whole}.${decimalPart.slice(0, 2)}` : whole;
  const parsed = Number(nextValue);

  if (!Number.isFinite(parsed) || parsed < 0) return "";
  if (parsed > 24) return "24";
  return nextValue;
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
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
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
  const [linkSavingKey, setLinkSavingKey] = useState("");
  const [exportingLinks, setExportingLinks] = useState(false);
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


  const getOrCreateWorkerHoursLink = async (assignment) => {
    const nowIso = new Date().toISOString();
    const { data: existingLink, error: existingError } = await supabase
      .from("worker_hours_links")
      .select("token")
      .eq("cts_job_candidate_id", assignment.id)
      .is("revoked_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    let token = existingLink?.token;
    if (!token) {
      const { data: createdLink, error: createError } = await supabase
        .from("worker_hours_links")
        .insert({
          cts_job_candidate_id: assignment.id,
          cts_job_id: assignment.cts_job_id,
          worker_id: assignment.worker_id,
          week_start_date: toDateInputValue(startOfWeek(new Date())),
        })
        .select("token")
        .single();

      if (createError) throw createError;
      token = createdLink?.token;
    }

    if (!token) throw new Error("Could not generate worker hours link.");
    return `${WORKER_HOURS_BASE_URL}/worker/hours/${token}`;
  };

  const generateWorkerLink = async (assignment) => {
    setLinkSavingKey(assignment.id);
    setFeedback({ error: "", success: "" });

    try {
      const url = await getOrCreateWorkerHoursLink(assignment);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback({ error: "", success: `Worker hours link copied for ${assignment.name}.` });
      } else {
        window.prompt("Copy worker hours link", url);
        setFeedback({ error: "", success: `Worker hours link ready for ${assignment.name}.` });
      }
    } catch (error) {
      setFeedback({ error: error.message || "Could not generate worker hours link.", success: "" });
    } finally {
      setLinkSavingKey("");
    }
  };

  const saveVisible = async () => {
    for (const row of filteredRows) {
      await saveRow(row.assignment);
    }
  };

  const exportCsv = async () => {
    if (!filteredRows.length) return;
    setExportingLinks(true);
    setFeedback({ error: "", success: "" });

    try {
      const rowsForExport = [];
      for (const { assignment } of filteredRows) {
        const hoursLink = await getOrCreateWorkerHoursLink(assignment);
        rowsForExport.push([
          assignment.name || "",
          assignment.phone || "",
          hoursLink,
          `Buenos dias, ${assignment.name || ""} !, Por favor carga tus horas en este enlace para evitar inconvenientes con las horas reportadas y el pago: ${hoursLink} , .`,
        ]);
      }

      downloadCsv(
        `worker-hours-links-${weekStart}.csv`,
        ["nombre", "telefono", "link para registrar las horas", "Mensaje"],
        rowsForExport
      );
      setFeedback({ error: "", success: `Hours link CSV generated for ${rowsForExport.length} worker${rowsForExport.length === 1 ? "" : "s"}.` });
    } catch (error) {
      setFeedback({ error: error.message || "Could not generate worker hours link CSV.", success: "" });
    } finally {
      setExportingLinks(false);
    }
  };

  return (
    <>
      <PageStyles />
      <UtsTopNavBar />
      <main className="hours-shell">
        <section className="card top-summary">
          <div>
            <div className="kicker"><CalendarDays size={15} /> Admin Hours Control</div>
            <h1 className="title">Weekly Timesheets</h1>
            <p className="subtitle">
              Enter employee hours, review weekly totals, approve completed timesheets, and generate optional worker links without making worker submissions the billing source of truth.
            </p>
          </div>
          <div className="top-actions">
            <div className="summary-strip" aria-label="Weekly timesheet summary">
              <div className="summary-chip"><strong>{formatHours(summary.totalHours)}</strong><span>Total hours</span></div>
              <div className="summary-chip"><strong>{summary.pending + summary.missing}</strong><span>Pending</span></div>
              <div className="summary-chip"><strong>{summary.approved}</strong><span>Approved</span></div>
            </div>
            <button className="btn" type="button" onClick={() => navigate("/admin")}><ArrowLeft size={15} /> Admin</button>
          </div>
        </section>

        {feedback.error ? <div className="feedback error">{feedback.error}</div> : null}
        {feedback.success ? <div className="feedback success">{feedback.success}</div> : null}

        <section className="card filters-card">
          <div className="filters">
            <div className="field">
              <label className="label">Search</label>
              <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Worker, phone, email, or project" />
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
            <div className="top-actions">
              <button className="btn" type="button" onClick={() => load()} disabled={loading}>{loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} Refresh</button>
              <button className="btn" type="button" onClick={exportCsv} disabled={!filteredRows.length || exportingLinks}>{exportingLinks ? <Loader2 className="spin" size={15} /> : <Download size={15} />} CSV</button>
            </div>
          </div>
        </section>

        <section className="card timesheet-section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Week of {formatWeekRange(weekStart)}</h2>
              <p className="section-subtitle">{filteredRows.length} workers shown · {summary.missing} missing hours · {summary.reviewed} reviewed</p>
            </div>
            <div className="table-actions">
              <button className="btn dark" type="button" onClick={saveVisible} disabled={loading || !filteredRows.length || !!savingKey}>
                {savingKey ? <Loader2 className="spin" size={15} /> : <Save size={15} />} Save Visible
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty"><Loader2 className="spin" size={18} /> Loading hours...</div>
          ) : filteredRows.length ? (
            <>
              <div className="desktop-table-wrap">
                <table className="timesheet-table">
                  <thead>
                    <tr>
                      <th className="col-worker">Worker</th>
                      <th className="col-project">Project</th>
                      {days.map((day, index) => <th className="col-day" key={day}>{DAY_LABELS[index]}<div className="day-head-date">{formatDate(day)}</div></th>)}
                      <th className="col-total">Total</th>
                      <th className="col-status">Status</th>
                      <th className="col-actions">Actions</th>
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
                          <td className="col-day" key={day}>
                            <input
                              className={`hours-input ${status === "missing" ? "missing" : ""}`}
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]{0,2}"
                              placeholder="—"
                              value={values[day] ?? ""}
                              onChange={(event) => updateHours(assignment.id, day, event.target.value)}
                              aria-label={`${assignment.name} ${day} hours`}
                            />
                            {Number(workerValues[day] || 0) > 0 ? <div className="worker-hint">W {formatHours(workerValues[day])}</div> : null}
                          </td>
                        ))}
                        <td className="total-cell">{formatHours(total)}{workerTotal > 0 ? <div className="worker-hint">Worker {formatHours(workerTotal)}</div> : null}</td>
                        <td><span className={`status-pill ${status}`}>{status === "approved" ? <CheckCircle2 size={13} /> : null}{getStatusLabel(status)}</span></td>
                        <td>
                          <div className="row-actions">
                            <button className="btn" type="button" onClick={() => saveRow(assignment)} disabled={!!savingKey}>
                              {savingKey === `save-${assignment.id}` ? <Loader2 className="spin" size={14} /> : <Save size={14} />} Save
                            </button>
                            <button className="btn" type="button" onClick={() => updateStatus(assignment, "reviewed")} disabled={!!savingKey || total <= 0}>Reviewed</button>
                            <button className="btn success" type="button" onClick={() => updateStatus(assignment, "approved")} disabled={!!savingKey || total <= 0}>Approve</button>
                            <button className="btn link" type="button" onClick={() => generateWorkerLink(assignment)} disabled={!!linkSavingKey} title="Generate and copy worker hours link">
                              {linkSavingKey === assignment.id ? <Loader2 className="spin" size={14} /> : <Link2 size={14} />} Link
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {filteredRows.map(({ assignment, values, total, workerValues, workerTotal, status }) => (
                  <article className="worker-card" key={assignment.id}>
                    <div className="worker-card-head">
                      <div>
                        <div className="worker-name">{assignment.name}</div>
                        <div className="worker-meta">{assignment.phone || "No phone"}{assignment.email ? <><br />{assignment.email}</> : null}</div>
                      </div>
                      <span className={`status-pill ${status}`}>{status === "approved" ? <CheckCircle2 size={13} /> : null}{getStatusLabel(status)}</span>
                    </div>
                    <div className="card-project-grid">
                      <div>
                        <div className="project">{assignment.project}</div>
                        <div className="project-meta">{assignment.projectLocation || "No location"}</div>
                      </div>
                      <div className="total-cell">{formatHours(total)} hrs{workerTotal > 0 ? <div className="worker-hint">Worker {formatHours(workerTotal)}</div> : null}</div>
                    </div>
                    <div className="mobile-days">
                      {days.map((day, index) => (
                        <label className="mobile-day" key={day}>
                          <span className="mobile-day-label">{DAY_LABELS[index]}</span>
                          <input
                            className={`hours-input ${status === "missing" ? "missing" : ""}`}
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]{0,2}"
                            placeholder="—"
                            value={values[day] ?? ""}
                            onChange={(event) => updateHours(assignment.id, day, event.target.value)}
                            aria-label={`${assignment.name} ${day} hours`}
                          />
                          {Number(workerValues[day] || 0) > 0 ? <span className="worker-hint">W {formatHours(workerValues[day])}</span> : null}
                        </label>
                      ))}
                    </div>
                    <div className="mobile-card-actions">
                      <button className="btn" type="button" onClick={() => saveRow(assignment)} disabled={!!savingKey}>
                        {savingKey === `save-${assignment.id}` ? <Loader2 className="spin" size={14} /> : <Save size={14} />} Save
                      </button>
                      <button className="btn" type="button" onClick={() => updateStatus(assignment, "reviewed")} disabled={!!savingKey || total <= 0}>Reviewed</button>
                      <button className="btn success" type="button" onClick={() => updateStatus(assignment, "approved")} disabled={!!savingKey || total <= 0}>Approve</button>
                      <button className="btn link" type="button" onClick={() => generateWorkerLink(assignment)} disabled={!!linkSavingKey}>
                        {linkSavingKey === assignment.id ? <Loader2 className="spin" size={14} /> : <Link2 size={14} />} Link
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">No placed workers match the current filters.</div>
          )}
        </section>
      </main>
      <GoToTopButton />
    </>
  );
}

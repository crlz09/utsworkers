import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Printer, RefreshCw, Search } from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import { supabase } from "../lib/supabase";

function InvoiceStyles() {
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

      #root { width: 100%; overflow-x: hidden; }
      input, select, textarea, button { font: inherit; }

      .spin { animation: spin 1s linear infinite; }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .invoice-shell {
        width: min(1480px, calc(100% - 48px));
        max-width: 1480px;
        margin: 0 auto;
        padding: 24px 0 40px;
        display: grid;
        gap: 20px;
      }

      .invoice-card {
        min-width: 0;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(10px);
        border: 1px solid #dbeafe;
        border-radius: 28px;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
        padding: 24px;
      }

      .invoice-hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
      }

      .invoice-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #1e40af;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 10px;
      }

      .invoice-title {
        margin: 0;
        font-size: clamp(30px, 4vw, 46px);
        line-height: 1.06;
        font-weight: 750;
        letter-spacing: -0.035em;
      }

      .invoice-subtitle {
        margin: 12px 0 0;
        color: #64748b;
        font-size: 15px;
        line-height: 1.65;
        max-width: 760px;
      }

      .invoice-actions {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .invoice-btn {
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: #ffffff;
        color: #0f172a;
        padding: 11px 14px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: 0.18s ease;
        text-decoration: none;
      }

      .invoice-btn.dark {
        border-color: #0f172a;
        background: #0f172a;
        color: #ffffff;
      }

      .invoice-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
      }

      .invoice-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .invoice-grid {
        display: grid;
        grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      .invoice-panel-title {
        margin: 0;
        font-size: 18px;
        font-weight: 750;
        letter-spacing: -0.02em;
      }

      .invoice-muted {
        color: #64748b;
        font-size: 13px;
        line-height: 1.55;
      }

      .invoice-form {
        margin-top: 18px;
        display: grid;
        gap: 13px;
      }

      .invoice-field {
        display: grid;
        gap: 7px;
      }

      .invoice-label {
        color: #64748b;
        font-size: 11px;
        font-weight: 750;
        text-transform: uppercase;
        letter-spacing: 0.09em;
      }

      .invoice-input,
      .invoice-select,
      .invoice-textarea {
        width: 100%;
        min-height: 46px;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: #ffffff;
        color: #0f172a;
        padding: 11px 13px;
        outline: none;
        font-size: 14px;
      }

      .invoice-textarea {
        min-height: 104px;
        resize: vertical;
        line-height: 1.55;
      }

      .invoice-input:focus,
      .invoice-select:focus,
      .invoice-textarea:focus {
        border-color: #0f172a;
        box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
      }

      .invoice-date-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .summary-box {
        border: 1px solid #dbeafe;
        background: #f8fbff;
        border-radius: 18px;
        padding: 14px;
      }

      .summary-label {
        color: #64748b;
        font-size: 11px;
        font-weight: 750;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .summary-value {
        margin-top: 6px;
        color: #0f172a;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }

      .invoice-preview {
        display: grid;
        gap: 16px;
      }

      .invoice-document {
        background: #ffffff;
        border: 1px solid #dbeafe;
        border-radius: 24px;
        overflow: hidden;
      }

      .invoice-doc-header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
        padding: 24px;
        border-bottom: 1px solid #eef2f7;
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      }

      .invoice-doc-title {
        margin: 0;
        font-size: 30px;
        font-weight: 850;
        letter-spacing: -0.04em;
      }

      .invoice-doc-meta {
        display: grid;
        gap: 5px;
        text-align: right;
        color: #64748b;
        font-size: 13px;
      }

      .invoice-bill-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
        padding: 22px 24px;
        border-bottom: 1px solid #eef2f7;
      }

      .bill-box {
        display: grid;
        gap: 6px;
      }

      .bill-heading {
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.09em;
      }

      .bill-main {
        color: #0f172a;
        font-size: 17px;
        font-weight: 750;
      }

      .invoice-table-wrap {
        width: 100%;
        overflow-x: auto;
      }

      .invoice-table {
        width: 100%;
        min-width: 860px;
        border-collapse: collapse;
      }

      .invoice-table th,
      .invoice-table td {
        padding: 14px 16px;
        border-bottom: 1px solid #eef2f7;
        text-align: left;
        vertical-align: middle;
      }

      .invoice-table th {
        background: #f8fbff;
        color: #334155;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .line-primary {
        color: #0f172a;
        font-size: 14px;
        font-weight: 750;
      }

      .line-secondary {
        margin-top: 4px;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.45;
      }

      .rate-input {
        width: 104px;
        min-height: 38px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 8px 10px;
        text-align: right;
        outline: none;
      }

      .invoice-total-panel {
        display: grid;
        justify-content: end;
        padding: 20px 24px 24px;
      }

      .total-box {
        min-width: 320px;
        display: grid;
        gap: 10px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        color: #475569;
        font-size: 14px;
      }

      .total-row.grand {
        margin-top: 8px;
        padding-top: 14px;
        border-top: 1px solid #cbd5e1;
        color: #0f172a;
        font-size: 22px;
        font-weight: 850;
        letter-spacing: -0.03em;
      }

      .empty-state {
        border: 1px dashed #bfdbfe;
        border-radius: 18px;
        background: #f8fbff;
        padding: 26px;
        color: #475569;
        text-align: center;
        font-weight: 700;
      }

      .feedback {
        border-radius: 16px;
        padding: 13px 14px;
        font-size: 13px;
        font-weight: 700;
      }

      .feedback.error {
        border: 1px solid #fecaca;
        background: #fef2f2;
        color: #b91c1c;
      }

      @media (max-width: 1024px) {
        .invoice-grid { grid-template-columns: 1fr; }
        .invoice-doc-meta { text-align: left; }
      }

      @media (max-width: 640px) {
        .invoice-shell { width: min(100% - 28px, 1480px); padding: 14px 0 28px; }
        .invoice-card { padding: 18px; border-radius: 22px; }
        .invoice-date-grid, .invoice-bill-grid, .summary-grid { grid-template-columns: 1fr; }
        .total-box { min-width: 0; width: 100%; }
      }

      @media print {
        body { background: #ffffff; }
        .uts-topbar, .invoice-hero, .invoice-controls, .invoice-actions, .rate-input, .go-to-top-button { display: none !important; }
        .invoice-shell { width: 100%; max-width: none; padding: 0; }
        .invoice-grid { display: block; }
        .invoice-preview { display: block; }
        .invoice-card { box-shadow: none; border: none; padding: 0; background: #ffffff; }
        .invoice-document { border: none; border-radius: 0; }
        .invoice-table-wrap { overflow: visible; }
      }
    `}</style>
  );
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatHours(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function parseRate(value) {
  if (value == null) return 0;
  const numeric = Number(String(value).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (![",", "\n", '"'].some((char) => text.includes(char))) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function InvoicePage() {
  const today = new Date();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [hoursEntries, setHoursEntries] = useState([]);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(toDateInputValue(startOfMonth(today)));
  const [dateTo, setDateTo] = useState(toDateInputValue(endOfMonth(today)));
  const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-${toDateInputValue(today).replace(/-/g, "")}`);
  const [dueDate, setDueDate] = useState(toDateInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15)));
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("Thank you for your business.");
  const [lineRates, setLineRates] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });

    const reviewStart = toDateInputValue(startOfWeek(new Date(`${dateFrom}T00:00:00`)));
    const [jobsRes, candidatesRes, workersRes, hoursRes, reviewsRes] = await Promise.all([
      supabase.from("cts_jobs").select("id, level_type, city, state, client_name, job_code").order("created_at", { ascending: false }),
      supabase.from("cts_job_candidates").select("*").order("updated_at", { ascending: false, nullsFirst: false }),
      supabase.from("workers").select("id, name, phone, email"),
      supabase
        .from("hours_entries")
        .select("*")
        .eq("source", "admin")
        .gte("work_date", dateFrom)
        .lte("work_date", dateTo),
      supabase
        .from("weekly_hours_reviews")
        .select("*")
        .eq("status", "approved")
        .gte("week_start_date", reviewStart)
        .lte("week_start_date", dateTo),
    ]);

    if (jobsRes.error || candidatesRes.error || workersRes.error || hoursRes.error || reviewsRes.error) {
      setFeedback({
        error:
          jobsRes.error?.message ||
          candidatesRes.error?.message ||
          workersRes.error?.message ||
          hoursRes.error?.message ||
          reviewsRes.error?.message ||
          "Could not load invoice data.",
        success: "",
      });
      setJobs([]);
      setCandidates([]);
      setWorkers([]);
      setHoursEntries([]);
      setWeeklyReviews([]);
      setLoading(false);
      return;
    }

    setJobs(jobsRes.data || []);
    setCandidates(candidatesRes.data || []);
    setWorkers(workersRes.data || []);
    setHoursEntries(hoursRes.data || []);
    setWeeklyReviews(reviewsRes.data || []);
    setLoading(false);
  }, [dateFrom, dateTo, setCandidates, setFeedback, setHoursEntries, setJobs, setLoading, setWeeklyReviews, setWorkers]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const workersById = useMemo(() => new Map(workers.map((worker) => [worker.id, worker])), [workers]);
  const candidatesById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const approvedReviewKeys = useMemo(() => new Set(weeklyReviews.map((review) => `${review.cts_job_candidate_id}|${review.week_start_date}`)), [weeklyReviews]);

  const clients = useMemo(() => {
    const set = new Set(jobs.map((job) => (job.client_name || "CTS").trim() || "CTS"));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const selectedClient = clientFilter || clients[0] || "";

  const invoiceRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const grouped = new Map();

    hoursEntries.forEach((entry) => {
      if (entry.source !== "admin") return;
      if (!approvedReviewKeys.has(`${entry.cts_job_candidate_id}|${entry.week_start_date}`)) return;
      const hours = Number(entry.regular_hours || 0);
      if (!hours) return;

      const candidate = candidatesById.get(entry.cts_job_candidate_id);
      if (!candidate) return;
      const job = jobsById.get(entry.cts_job_id || candidate.cts_job_id);
      if (!job) return;
      const clientName = (job.client_name || "CTS").trim() || "CTS";
      if (selectedClient && clientName !== selectedClient) return;

      const worker = workersById.get(entry.worker_id || candidate.worker_id) || {};
      const candidateName = candidate.name_snapshot || worker.name || "Unnamed worker";
      const projectName = job.level_type || "Untitled project";
      const projectLocation = [job.city, job.state].filter(Boolean).join(", ");
      const searchable = [candidateName, projectName, projectLocation, worker.email, worker.phone, job.job_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (query && !searchable.includes(query)) return;

      const key = `${candidate.id}|${job.id}`;
      const existing = grouped.get(key) || {
        key,
        candidateId: candidate.id,
        jobId: job.id,
        candidateName,
        workerEmail: worker.email || "",
        workerPhone: candidate.phone_snapshot || worker.phone || "",
        projectName,
        projectLocation,
        jobCode: job.job_code || "",
        clientName,
        hours: 0,
        firstDate: entry.work_date,
        lastDate: entry.work_date,
        defaultRate: parseRate(candidate.bill_rate_snapshot || candidate.rate_snapshot),
      };

      existing.hours += hours;
      if (entry.work_date < existing.firstDate) existing.firstDate = entry.work_date;
      if (entry.work_date > existing.lastDate) existing.lastDate = entry.work_date;
      grouped.set(key, existing);
    });

    return [...grouped.values()].sort((a, b) => {
      const projectCompare = a.projectName.localeCompare(b.projectName);
      if (projectCompare !== 0) return projectCompare;
      return a.candidateName.localeCompare(b.candidateName);
    });
  }, [approvedReviewKeys, candidatesById, hoursEntries, jobsById, search, selectedClient, workersById]);

  const rowsWithTotals = useMemo(
    () => invoiceRows.map((row) => {
      const rate = Number(lineRates[row.key] ?? row.defaultRate ?? 0);
      return {
        ...row,
        rate,
        amount: row.hours * rate,
      };
    }),
    [invoiceRows, lineRates]
  );

  const summary = useMemo(() => {
    const totalHours = rowsWithTotals.reduce((total, row) => total + row.hours, 0);
    const subtotal = rowsWithTotals.reduce((total, row) => total + row.amount, 0);
    return {
      totalHours,
      subtotal,
      total: subtotal,
      lineCount: rowsWithTotals.length,
    };
  }, [rowsWithTotals]);

  const refreshData = async () => {
    await load();
  };

  const exportCsv = () => {
    const headers = ["Invoice", "Client", "Date From", "Date To", "Project", "Candidate", "Hours", "Rate", "Amount"];
    const rows = rowsWithTotals.map((row) => [
      invoiceNumber,
      row.clientName,
      dateFrom,
      dateTo,
      row.projectName,
      row.candidateName,
      formatHours(row.hours),
      row.rate.toFixed(2),
      row.amount.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoiceNumber || "invoice"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <InvoiceStyles />
      <UtsTopNavBar />
      <main className="invoice-shell">
        <section className="invoice-card invoice-hero">
          <div>
            <div className="invoice-kicker"><FileText size={15} /> Billing</div>
            <h1 className="invoice-title">Invoice</h1>
            <p className="invoice-subtitle">
              Generate client invoices from approved admin timesheets. Select a client and date range, then review line items before printing or exporting.
            </p>
          </div>
          <div className="invoice-actions">
            <button className="invoice-btn" type="button" onClick={refreshData} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="invoice-btn" type="button" onClick={exportCsv} disabled={!rowsWithTotals.length}>
              <Download size={15} /> Export CSV
            </button>
            <button className="invoice-btn dark" type="button" onClick={() => window.print()} disabled={!rowsWithTotals.length}>
              <Printer size={15} /> Print Invoice
            </button>
          </div>
        </section>

        {feedback.error ? <div className="feedback error">{feedback.error}</div> : null}

        <section className="invoice-grid">
          <aside className="invoice-card invoice-controls">
            <h2 className="invoice-panel-title">Invoice Builder</h2>
            <p className="invoice-muted">Invoices now use approved admin timesheets only, so draft or pending hours are never billed accidentally.</p>

            <div className="invoice-form">
              <div className="invoice-field">
                <label className="invoice-label">Client</label>
                <select className="invoice-select" value={selectedClient} onChange={(event) => setClientFilter(event.target.value)}>
                  {clients.length ? clients.map((client) => <option key={client} value={client}>{client}</option>) : <option value="">No clients found</option>}
                </select>
              </div>

              <div className="invoice-date-grid">
                <div className="invoice-field">
                  <label className="invoice-label">From</label>
                  <input className="invoice-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                </div>
                <div className="invoice-field">
                  <label className="invoice-label">To</label>
                  <input className="invoice-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                </div>
              </div>

              <button className="invoice-btn dark" type="button" onClick={refreshData} disabled={loading}>
                {loading ? <Loader2 className="spin" size={15} /> : <Search size={15} />}
                Load Invoice Lines
              </button>

              <div className="invoice-date-grid">
                <div className="invoice-field">
                  <label className="invoice-label">Invoice #</label>
                  <input className="invoice-input" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
                </div>
                <div className="invoice-field">
                  <label className="invoice-label">Due Date</label>
                  <input className="invoice-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </div>
              </div>

              <div className="invoice-field">
                <label className="invoice-label">Search Lines</label>
                <input className="invoice-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Candidate, project, phone, email..." />
              </div>

              <div className="invoice-field">
                <label className="invoice-label">Invoice Notes</label>
                <textarea className="invoice-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
            </div>

            <div className="summary-grid">
              <div className="summary-box"><div className="summary-label">Lines</div><div className="summary-value">{summary.lineCount}</div></div>
              <div className="summary-box"><div className="summary-label">Hours</div><div className="summary-value">{formatHours(summary.totalHours)}</div></div>
              <div className="summary-box"><div className="summary-label">Total</div><div className="summary-value">{formatCurrency(summary.total)}</div></div>
            </div>
          </aside>

          <section className="invoice-card invoice-preview">
            {loading ? (
              <div className="empty-state"><Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />Loading invoice data...</div>
            ) : (
              <div className="invoice-document">
                <div className="invoice-doc-header">
                  <div>
                    <h2 className="invoice-doc-title">Invoice</h2>
                    <div className="invoice-muted" style={{ marginTop: 8 }}>Universal Talent Source</div>
                  </div>
                  <div className="invoice-doc-meta">
                    <div><strong>Invoice #:</strong> {invoiceNumber || "—"}</div>
                    <div><strong>Invoice Date:</strong> {formatDate(toDateInputValue(today))}</div>
                    <div><strong>Due Date:</strong> {formatDate(dueDate)}</div>
                  </div>
                </div>

                <div className="invoice-bill-grid">
                  <div className="bill-box">
                    <div className="bill-heading">Bill To</div>
                    <div className="bill-main">{selectedClient || "Select a client"}</div>
                    <div className="invoice-muted">Client billing contact</div>
                  </div>
                  <div className="bill-box">
                    <div className="bill-heading">Service Period</div>
                    <div className="bill-main">{formatDate(dateFrom)} – {formatDate(dateTo)}</div>
                    <div className="invoice-muted">Approved admin timesheets only</div>
                  </div>
                </div>

                {rowsWithTotals.length ? (
                  <>
                    <div className="invoice-table-wrap">
                      <table className="invoice-table">
                        <thead>
                          <tr>
                            <th>Project</th>
                            <th>Candidate</th>
                            <th>Dates</th>
                            <th style={{ textAlign: "right" }}>Hours</th>
                            <th style={{ textAlign: "right" }}>Rate</th>
                            <th style={{ textAlign: "right" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rowsWithTotals.map((row) => (
                            <tr key={row.key}>
                              <td>
                                <div className="line-primary">{row.projectName}</div>
                                <div className="line-secondary">{[row.projectLocation, row.jobCode ? `Code: ${row.jobCode}` : ""].filter(Boolean).join(" · ") || "No location"}</div>
                              </td>
                              <td>
                                <div className="line-primary">{row.candidateName}</div>
                                <div className="line-secondary">{[row.workerPhone, row.workerEmail].filter(Boolean).join(" · ") || "No contact"}</div>
                              </td>
                              <td className="invoice-muted">{formatDate(row.firstDate)} – {formatDate(row.lastDate)}</td>
                              <td style={{ textAlign: "right" }}>{formatHours(row.hours)}</td>
                              <td style={{ textAlign: "right" }}>
                                <input
                                  className="rate-input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={lineRates[row.key] ?? row.defaultRate ?? 0}
                                  onChange={(event) => setLineRates((prev) => ({ ...prev, [row.key]: event.target.value }))}
                                  aria-label={`Rate for ${row.candidateName}`}
                                />
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 750 }}>{formatCurrency(row.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="invoice-total-panel">
                      <div className="total-box">
                        <div className="total-row"><span>Total Hours</span><strong>{formatHours(summary.totalHours)}</strong></div>
                        <div className="total-row"><span>Subtotal</span><strong>{formatCurrency(summary.subtotal)}</strong></div>
                        <div className="total-row grand"><span>Total Due</span><span>{formatCurrency(summary.total)}</span></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 24 }}>
                    <div className="empty-state">No approved invoice lines found for the selected client and date range.</div>
                  </div>
                )}

                {notes ? (
                  <div style={{ padding: "0 24px 24px" }}>
                    <div className="bill-heading">Notes</div>
                    <div className="invoice-muted" style={{ marginTop: 6 }}>{notes}</div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </main>
      <GoToTopButton />
    </>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Printer, RefreshCw, Search } from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import { supabase } from "../lib/supabase";

const SOURCE_OPTIONS = [
  { value: "client", label: "Client submitted hours" },
  { value: "admin", label: "Admin hours" },
];

const UTS_CONTACT = {
  company: "UNIVERSAL TALENT SOURCE LLC",
  emailPrimary: "cmolina@universaltalentsource.com",
  phonePrimary: "(863) 254-1402",
  emailSecondary: "ealana@universaltalentsource.com",
  phoneSecondary: "(317) 516-8043",
};

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

      .invoice-check {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #334155;
        font-size: 13px;
        font-weight: 750;
        user-select: none;
      }

      .invoice-check input {
        width: 18px;
        height: 18px;
        accent-color: #0f172a;
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
        border: 1px solid #d7dde5;
        border-radius: 6px;
        overflow: hidden;
        padding: 52px 34px 34px;
        color: #050505;
      }

      .invoice-doc-header {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) minmax(220px, 370px);
        gap: 36px;
        align-items: start;
        padding: 0 54px 12px;
      }

      .invoice-doc-title {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0;
      }

      .invoice-doc-meta {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 7px 18px;
        color: #050505;
        font-size: 15px;
        line-height: 1.15;
      }

      .invoice-bill-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
        margin: 0 0 40px;
        padding: 28px 54px;
        background: #eaf2fb;
        border: none;
      }

      .bill-box {
        display: grid;
        gap: 8px;
      }

      .bill-heading {
        color: #050505;
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0;
      }

      .bill-main {
        color: #050505;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.45;
      }

      .bill-main strong {
        font-weight: 800;
      }

      .uts-logo {
        display: block;
        width: min(100%, 310px);
        margin-left: auto;
      }

      .uts-contact {
        text-align: right;
        font-size: 15px;
        line-height: 1.45;
      }

      .invoice-table-wrap {
        width: 100%;
        overflow-x: auto;
      }

      .invoice-table {
        width: 100%;
        min-width: 920px;
        border-collapse: collapse;
        table-layout: fixed;
        border: 2px solid #111111;
      }

      .invoice-table th,
      .invoice-table td {
        padding: 4px 4px;
        border: 2px solid #111111;
        text-align: left;
        vertical-align: middle;
        color: #050505;
        font-size: 14px;
        line-height: 1.15;
      }

      .invoice-table th {
        background: #d9d9d9;
        color: #050505;
        font-size: 14px;
        font-weight: 800;
        text-transform: none;
        letter-spacing: 0;
      }

      .invoice-table tbody tr:nth-child(odd) td {
        background: #f3f3f3;
      }

      .line-primary {
        color: #050505;
        font-size: 14px;
        font-weight: 400;
      }

      .line-secondary {
        margin-top: 3px;
        color: #050505;
        font-size: 14px;
        line-height: 1.15;
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
        padding: 26px 0 0;
      }

      .total-box {
        min-width: 420px;
        display: grid;
        gap: 0;
      }

      .total-row {
        display: grid;
        grid-template-columns: 1fr 100px 140px;
        gap: 12px;
        color: #050505;
        font-size: 15px;
        align-items: center;
      }

      .total-row.grand {
        margin-top: 2px;
        padding-top: 0;
        border-top: none;
        color: #050505;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0;
      }

      .total-label {
        text-align: right;
        font-weight: 800;
      }

      .total-qty {
        text-align: right;
      }

      .total-amount {
        text-align: right;
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

function formatQty(item) {
  if (item.kind === "placement") {
    return Number(item.qty || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return formatHours(item.qty);
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatInvoiceDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

function getDatePart(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function isDateInRange(value, from, to) {
  const date = getDatePart(value);
  if (!date) return false;
  return (!from || date >= from) && (!to || date <= to);
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
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [clientFilter, setClientFilter] = useState("");
  const [source, setSource] = useState("client");
  const [dateFrom, setDateFrom] = useState(toDateInputValue(startOfMonth(today)));
  const [dateTo, setDateTo] = useState(toDateInputValue(endOfMonth(today)));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(toDateInputValue(today));
  const [terms, setTerms] = useState("Due on receipt");
  const [billToName, setBillToName] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [billToCityStateZip, setBillToCityStateZip] = useState("");
  const [placementRate, setPlacementRate] = useState("50.00");
  const [hourlyRate, setHourlyRate] = useState("1.00");
  const [includePlacementFees, setIncludePlacementFees] = useState(true);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("Thank you for your business.");

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });

    const [jobsRes, candidatesRes, workersRes, hoursRes] = await Promise.all([
      supabase.from("cts_jobs").select("id, level_type, city, state, client_name, job_code").order("created_at", { ascending: false }),
      supabase.from("cts_job_candidates").select("*").order("updated_at", { ascending: false, nullsFirst: false }),
      supabase.from("workers").select("id, name, phone, email"),
      supabase
        .from("hours_entries")
        .select("*")
        .gte("work_date", dateFrom)
        .lte("work_date", dateTo),
    ]);

    if (jobsRes.error || candidatesRes.error || workersRes.error || hoursRes.error) {
      setFeedback({
        error:
          jobsRes.error?.message ||
          candidatesRes.error?.message ||
          workersRes.error?.message ||
          hoursRes.error?.message ||
          "Could not load invoice data.",
        success: "",
      });
      setJobs([]);
      setCandidates([]);
      setWorkers([]);
      setHoursEntries([]);
      setLoading(false);
      return;
    }

    setJobs(jobsRes.data || []);
    setCandidates(candidatesRes.data || []);
    setWorkers(workersRes.data || []);
    setHoursEntries(hoursRes.data || []);
    setLoading(false);
  }, [dateFrom, dateTo, setCandidates, setFeedback, setHoursEntries, setJobs, setLoading, setWorkers]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const workersById = useMemo(() => new Map(workers.map((worker) => [worker.id, worker])), [workers]);
  const candidatesById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);

  const clients = useMemo(() => {
    const set = new Set(jobs.map((job) => (job.client_name || "CTS").trim() || "CTS"));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const selectedClient = clientFilter || clients[0] || "";
  const billToCompany = billToName || selectedClient;

  const handleClientChange = (value) => {
    setClientFilter(value);
    setBillToName(value);
  };

  const invoiceRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const grouped = new Map();

    hoursEntries.forEach((entry) => {
      if (entry.source !== source) return;
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
        candidateStatus: candidate.candidate_status || "",
        placedAt: candidate.placed_at || "",
        hours: 0,
        firstDate: entry.work_date,
        lastDate: entry.work_date,
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
  }, [candidatesById, hoursEntries, jobsById, search, selectedClient, source, workersById]);

  const invoiceItems = useMemo(() => {
    const items = [];
    const placementRateValue = parseRate(placementRate);
    const hourlyRateValue = parseRate(hourlyRate);

    invoiceRows.forEach((row) => {
      const details = [row.projectName, row.projectLocation].filter(Boolean).join("\n");
      const isPlaced = row.candidateStatus === "placed";
      const placedInPeriod = isDateInRange(row.placedAt, dateFrom, dateTo);

      if (includePlacementFees && isPlaced && (!row.placedAt || placedInPeriod)) {
        items.push({
          key: `${row.key}|placement`,
          product: "Job Placement",
          name: row.candidateName,
          details,
          qty: 1,
          rate: placementRateValue,
          amount: placementRateValue,
          kind: "placement",
        });
      }

      items.push({
        key: `${row.key}|hourly`,
        product: "Hourly Fee",
        name: row.candidateName,
        details,
        qty: row.hours,
        rate: hourlyRateValue,
        amount: row.hours * hourlyRateValue,
        kind: "hourly",
      });
    });

    return items.map((item, index) => ({ ...item, itemNumber: index + 1 }));
  }, [dateFrom, dateTo, hourlyRate, includePlacementFees, invoiceRows, placementRate]);

  const summary = useMemo(() => {
    const totalHours = invoiceItems
      .filter((item) => item.kind === "hourly")
      .reduce((total, item) => total + item.qty, 0);
    const totalPlacements = invoiceItems
      .filter((item) => item.kind === "placement")
      .reduce((total, item) => total + item.qty, 0);
    const hourlyTotal = invoiceItems
      .filter((item) => item.kind === "hourly")
      .reduce((total, item) => total + item.amount, 0);
    const placementTotal = invoiceItems
      .filter((item) => item.kind === "placement")
      .reduce((total, item) => total + item.amount, 0);
    const subtotal = hourlyTotal + placementTotal;
    return {
      totalHours,
      totalPlacements,
      hourlyTotal,
      placementTotal,
      subtotal,
      total: subtotal,
      lineCount: invoiceItems.length,
    };
  }, [invoiceItems]);

  const refreshData = async () => {
    await load();
  };

  const exportCsv = () => {
    const headers = ["Item#", "Invoice no.", "Terms", "Invoice date", "Client", "Product or service", "Name", "Details", "Qty", "Rate", "Amount"];
    const rows = invoiceItems.map((row) => [
      row.itemNumber,
      invoiceNumber,
      terms,
      invoiceDate,
      billToCompany,
      row.product,
      row.name,
      row.details,
      formatQty(row),
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
              Generate client invoices from tracked CTS job hours. Select a client, date range, and source, then review line items before printing or exporting.
            </p>
          </div>
          <div className="invoice-actions">
            <button className="invoice-btn" type="button" onClick={refreshData} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="invoice-btn" type="button" onClick={exportCsv} disabled={!invoiceItems.length}>
              <Download size={15} /> Export CSV
            </button>
            <button className="invoice-btn dark" type="button" onClick={() => window.print()} disabled={!invoiceItems.length}>
              <Printer size={15} /> Print Invoice
            </button>
          </div>
        </section>

        {feedback.error ? <div className="feedback error">{feedback.error}</div> : null}

        <section className="invoice-grid">
          <aside className="invoice-card invoice-controls">
            <h2 className="invoice-panel-title">Invoice Builder</h2>
            <p className="invoice-muted">Use client submitted hours for customer-facing invoices, or admin hours when you need an internal correction.</p>

            <div className="invoice-form">
              <div className="invoice-field">
                <label className="invoice-label">Client</label>
                <select className="invoice-select" value={selectedClient} onChange={(event) => handleClientChange(event.target.value)}>
                  {clients.length ? clients.map((client) => <option key={client} value={client}>{client}</option>) : <option value="">No clients found</option>}
                </select>
              </div>

              <div className="invoice-field">
                <label className="invoice-label">Hours Source</label>
                <select className="invoice-select" value={source} onChange={(event) => setSource(event.target.value)}>
                  {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
                  <input className="invoice-input" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="102" />
                </div>
                <div className="invoice-field">
                  <label className="invoice-label">Invoice Date</label>
                  <input className="invoice-input" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
                </div>
              </div>

              <div className="invoice-field">
                <label className="invoice-label">Terms</label>
                <input className="invoice-input" value={terms} onChange={(event) => setTerms(event.target.value)} />
              </div>

              <div className="invoice-field">
                <label className="invoice-label">Company Name</label>
                <input className="invoice-input" value={billToName} onChange={(event) => setBillToName(event.target.value)} />
              </div>

              <div className="invoice-field">
                <label className="invoice-label">Address</label>
                <input className="invoice-input" value={billToAddress} onChange={(event) => setBillToAddress(event.target.value)} placeholder="3924 Pendleton Way" />
              </div>

              <div className="invoice-field">
                <label className="invoice-label">City, State ZIP</label>
                <input className="invoice-input" value={billToCityStateZip} onChange={(event) => setBillToCityStateZip(event.target.value)} placeholder="Indianapolis, Indiana, 46226" />
              </div>

              <div className="invoice-date-grid">
                <div className="invoice-field">
                  <label className="invoice-label">Placement Rate</label>
                  <input className="invoice-input" type="number" min="0" step="0.01" value={placementRate} onChange={(event) => setPlacementRate(event.target.value)} />
                </div>
                <div className="invoice-field">
                  <label className="invoice-label">Hourly Fee Rate</label>
                  <input className="invoice-input" type="number" min="0" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
                </div>
              </div>

              <label className="invoice-check">
                <input type="checkbox" checked={includePlacementFees} onChange={(event) => setIncludePlacementFees(event.target.checked)} />
                Include job placement lines
              </label>

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
                    <h2 className="invoice-doc-title">Invoice details</h2>
                    <div className="invoice-doc-meta" style={{ marginTop: 10 }}>
                      <span>Invoice no.</span><span>{invoiceNumber || "—"}</span>
                      <span>Terms</span><span>{terms || "—"}</span>
                      <span>Invoice date</span><span>{formatInvoiceDate(invoiceDate)}</span>
                    </div>
                  </div>
                  <div>
                    <img className="uts-logo" src="/logo.png" alt="UTS" />
                  </div>
                </div>

                <div className="invoice-bill-grid">
                  <div className="bill-box">
                    <div className="bill-heading">Bill To</div>
                    <div className="bill-main">
                      <div><strong>Company Name:</strong> {billToCompany || "Select a client"}</div>
                      <div><strong>Address:</strong> {billToAddress || "—"}</div>
                      <div><strong>City, State ZIP:</strong> {billToCityStateZip || "—"}</div>
                    </div>
                  </div>
                  <div className="bill-box">
                    <div className="uts-contact">
                      <div><strong>{UTS_CONTACT.company}</strong></div>
                      <div>{UTS_CONTACT.emailPrimary}</div>
                      <div>{UTS_CONTACT.phonePrimary}</div>
                      <div>{UTS_CONTACT.emailSecondary}</div>
                      <div>{UTS_CONTACT.phoneSecondary}</div>
                    </div>
                  </div>
                </div>

                {invoiceItems.length ? (
                  <>
                    <div className="invoice-table-wrap">
                      <table className="invoice-table">
                        <colgroup>
                          <col style={{ width: "56px" }} />
                          <col style={{ width: "150px" }} />
                          <col style={{ width: "205px" }} />
                          <col style={{ width: "250px" }} />
                          <col style={{ width: "92px" }} />
                          <col style={{ width: "120px" }} />
                          <col style={{ width: "135px" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Item#</th>
                            <th>Product or service</th>
                            <th>Name</th>
                            <th>Details</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th style={{ textAlign: "right" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceItems.map((row) => (
                            <tr key={row.key}>
                              <td style={{ textAlign: "right" }}>{row.itemNumber}</td>
                              <td>
                                <div className="line-primary">{row.product}</div>
                              </td>
                              <td>
                                <div className="line-primary">{row.name}</div>
                              </td>
                              <td>
                                {row.details.split("\n").map((line) => <div className="line-secondary" key={`${row.key}-${line}`}>{line}</div>)}
                              </td>
                              <td style={{ textAlign: "right" }}>{formatQty(row)}</td>
                              <td style={{ textAlign: "right" }}>
                                {formatCurrency(row.rate)}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 750 }}>{formatCurrency(row.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="invoice-total-panel">
                      <div className="total-box">
                        <div className="total-row">
                          <span className="total-label">Total Hours</span>
                          <span className="total-qty">{formatHours(summary.totalHours)}</span>
                          <span className="total-amount">{formatCurrency(summary.hourlyTotal)}</span>
                        </div>
                        <div className="total-row">
                          <span className="total-label">Total Placements</span>
                          <span className="total-qty">{formatCount(summary.totalPlacements)}</span>
                          <span className="total-amount">{formatCurrency(summary.placementTotal)}</span>
                        </div>
                        <div className="total-row grand">
                          <span className="total-label">Amount Due</span>
                          <span />
                          <span className="total-amount">{formatCurrency(summary.total)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 24 }}>
                    <div className="empty-state">No invoice lines found for the selected client, date range, and source.</div>
                  </div>
                )}

                {notes ? (
                  <div style={{ padding: "24px 0 0" }}>
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

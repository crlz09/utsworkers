import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
  MoreVertical,
  X,
  Upload,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";

const LAST_IMPORT_BATCH_STORAGE_KEY = "uts_last_cts_jobs_import_batch_id";

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

      .jobs-shell {
        width: min(1440px, calc(100% - 48px));
        max-width: 1440px;
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
      .toolbar-card,
      .table-card {
        padding: 24px;
      }

      .hero-top,
      .toolbar-top,
      .table-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
      }

      .hero-title {
        margin: 0;
        font-size: 40px;
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
        gap: 8px;
        transition: 0.18s ease;
      }

      .btn.dark {
        background: #0f172a;
        color: #ffffff;
      }

      .btn.white {
        background: #ffffff;
        color: #0f172a;
        border: 1px solid #cbd5e1;
      }

      .btn.danger {
        background: #991b1b;
        color: #ffffff;
      }

      .btn.warning {
        background: #f97316;
        color: #ffffff;
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }

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

      .toolbar-grid {
        display: grid;
        grid-template-columns: 1.3fr repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .field {
        display: grid;
        gap: 8px;
      }

      .field-label {
        font-size: 12px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .input,
      .select,
      .textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 14px;
        padding: 12px 14px;
        outline: none;
      }

      .textarea {
        min-height: 120px;
        resize: vertical;
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
        min-width: 1500px;
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

      .job-row-openable {
        cursor: pointer;
      }

      .status-pill,
      .priority-pill,
      .flag-pill {
        display: inline-flex;
        align-items: center;
        padding: 7px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
        white-space: nowrap;
      }

      .flag-pill.now {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }

      .flag-pill.wait {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fcd34d;
      }

      .icon-btn {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 12px;
        padding: 10px 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 800;
      }

      .icon-btn:hover {
        background: #f8fafc;
      }

      .select-cell-btn {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #0f172a;
      }

      .select-cell-btn.active {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
      }

      .actions-menu-wrap {
        position: relative;
        display: inline-flex;
        justify-content: flex-end;
        width: 100%;
      }

      .actions-trigger {
        width: 40px;
        height: 40px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: 0.18s ease;
      }

      .actions-trigger:hover {
        background: #f8fafc;
      }

      .actions-trigger.active {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
      }

      .actions-menu-overlay {
        position: fixed;
        inset: 0;
        background: transparent;
        z-index: 80;
      }

      .actions-dropdown {
        position: fixed;
        width: 190px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        box-shadow: 0 22px 60px rgba(15, 23, 42, 0.22);
        padding: 8px;
        z-index: 90;
        display: grid;
        gap: 4px;
      }

      .actions-menu-item {
        width: 100%;
        border: none;
        background: transparent;
        color: #0f172a;
        border-radius: 12px;
        padding: 10px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 800;
        text-align: left;
      }

      .actions-menu-item:hover {
        background: #f8fafc;
      }

      .actions-menu-item.danger {
        color: #991b1b;
      }

      .actions-menu-item.danger:hover {
        background: #fef2f2;
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

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        display: grid;
        place-items: center;
        padding: 20px;
        z-index: 50;
      }

      .modal-card {
        width: min(980px, 100%);
        max-height: 90vh;
        overflow: auto;
        background: #ffffff;
        border-radius: 24px;
        border: 1px solid #dbeafe;
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.18);
        padding: 24px;
      }

      .modal-card.wide {
        width: min(1240px, 100%);
      }

      .modal-grid {
        display: grid;
        grid-template-columns: 120px 1.3fr 0.8fr 0.8fr;
        gap: 14px;
        margin-top: 18px;
      }

      .span-4 {
        grid-column: span 4;
      }

      .helper-text {
        color: #64748b;
        font-size: 13px;
        line-height: 1.5;
      }

      .preview-table {
        min-width: 1680px;
      }

      .preview-error {
        background: #fef2f2 !important;
      }

      .preview-skipped td {
        background: #f8fafc;
        color: #94a3b8;
      }

      .preview-input,
      .preview-select {
        width: 100%;
        min-width: 90px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 10px;
        padding: 9px 10px;
        outline: none;
      }

      .preview-input.compact,
      .preview-select.compact {
        min-width: 76px;
      }

      .preview-input.wide {
        min-width: 220px;
      }

      .error-list {
        display: grid;
        gap: 8px;
        padding: 14px;
        border-radius: 16px;
        background: #fef2f2;
        border: 1px solid #fca5a5;
        color: #991b1b;
        margin-top: 16px;
        font-weight: 700;
      }

      .drop-zone {
        border: 2px dashed #cbd5e1;
        border-radius: 20px;
        background: #f8fafc;
        padding: 22px;
        display: grid;
        gap: 10px;
        text-align: center;
        color: #475569;
      }

      @media (max-width: 1100px) {
        .summary-grid {
          grid-template-columns: 1fr 1fr;
        }

        .toolbar-grid,
        .modal-grid {
          grid-template-columns: 1fr 1fr;
        }

        .span-4 {
          grid-column: span 2;
        }
      }

      @media (max-width: 760px) {
        .jobs-shell {
          width: min(100%, calc(100% - 28px));
          padding: 14px 0;
        }

        .hero-title {
          font-size: 32px;
        }

        .summary-grid,
        .toolbar-grid,
        .modal-grid {
          grid-template-columns: 1fr;
        }

        .span-4 {
          grid-column: span 1;
        }
      }
    `}</style>
  );
}

const EMPTY_FORM = {
  qty: 1,
  is_now: false,
  is_wait: false,
  level_type: "",
  city: "",
  state: "",
  start_text: "",
  details: "",
  language_requirement: "",
  bd_rep: "",
  order_date: null,
  client_name: "CTS",
  job_code: "",
  status: "open",
  priority: "normal",
  internal_notes: "",
};

const REQUIRED_CSV_HEADERS = [
  "Now",
  "Wait",
  "QTY",
  "Level/Type",
  "City",
  "State",
  "Start",
  "Details",
  "Language",
  "BD Rep",
  "Order Date",
];

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_/-]/g, "");
}

const HEADER_MAP = {
  now: "Now",
  wait: "Wait",
  qty: "QTY",
  quantity: "QTY",
  leveltype: "Level/Type",
  level: "Level/Type",
  type: "Level/Type",
  city: "City",
  state: "State",
  start: "Start",
  details: "Details",
  detail: "Details",
  language: "Language",
  bdrep: "BD Rep",
  rep: "BD Rep",
  orderdate: "Order Date",
  date: "Order Date",
};

function getStatusStyle(status) {
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

const PRIORITY_SORT_ORDER = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function toLocalDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    return dateInput;
  }

  const text = String(dateInput);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toSqlDate(dateInput) {
  const date = toLocalDate(dateInput);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseCsvDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);

    if (year < 100) year += 2000;

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return toSqlDate(date);
    }

    return null;
  }

  const excelSerial = Number(raw);
  if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const utcDays = Math.floor(excelSerial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return toSqlDate(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return toSqlDate(parsed);
  }

  return null;
}

function formatDateOnly(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

function parseBoolean(value) {
  const raw = String(value || "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "x", "✓", "checked", "now", "wait"].includes(raw);
}

function parseQty(value) {
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function validateImportPayload(payload) {
  const errors = [];
  const levelType = String(payload.level_type || "").trim();

  if (!levelType) errors.push("Missing Level/Type.");
  if (payload.order_date && !parseCsvDate(payload.order_date)) {
    errors.push(`Invalid Order Date: "${payload.order_date}". Use MM/DD/YYYY.`);
  }

  return errors;
}

function normalizeCsvRow(row, batchId, rowNumber) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    const canonical = HEADER_MAP[normalizeHeader(key)];
    if (canonical) normalized[canonical] = value;
  });

  const qty = parseQty(normalized["QTY"]);
  const levelType = String(normalized["Level/Type"] || "").trim();
  const orderDateRaw = String(normalized["Order Date"] || "").trim();
  const orderDate = parseCsvDate(orderDateRaw);

  const payload = {
    is_now: parseBoolean(normalized["Now"]),
    is_wait: parseBoolean(normalized["Wait"]),
    qty,
    level_type: levelType,
    city: String(normalized["City"] || "").trim() || null,
    state: String(normalized["State"] || "").trim() || null,
    start_text: String(normalized["Start"] || "").trim() || null,
    details: String(normalized["Details"] || "").trim() || null,
    language_requirement: String(normalized["Language"] || "").trim() || null,
    bd_rep: String(normalized["BD Rep"] || "").trim() || null,
    order_date: orderDateRaw && !orderDate ? orderDateRaw : orderDate,
    client_name: "CTS",
    status: "open",
    priority: parseBoolean(normalized["Now"]) ? "urgent" : "normal",
    internal_notes: null,
    last_import_batch_id: batchId,
  };

  const errors = validateImportPayload(payload);

  return {
    rowNumber,
    raw: normalized,
    payload,
    selected: true,
    errors,
  };
}

function findMissingHeaders(fields) {
  const normalizedFields = new Set((fields || []).map(normalizeHeader));
  return REQUIRED_CSV_HEADERS.filter((header) => {
    const normalized = normalizeHeader(header);
    return !normalizedFields.has(normalized);
  });
}

function buildImportErrors(globalErrors, rows) {
  const rowErrors = rows.filter((row) => row.selected).flatMap((row) =>
    row.errors.map((error) => `Row ${row.rowNumber}: ${error}`)
  );

  return [...globalErrors, ...rowErrors];
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
            <X size={16} />
            Close
          </button>
        </div>

        <div className="modal-grid">
          <div className="field">
            <label className="field-label">Now</label>
            <select
              className="select"
              value={form.is_now ? "yes" : "no"}
              onChange={(e) => update("is_now", e.target.value === "yes")}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Wait</label>
            <select
              className="select"
              value={form.is_wait ? "yes" : "no"}
              onChange={(e) => update("is_wait", e.target.value === "yes")}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Qty</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.qty}
              onChange={(e) => update("qty", Number(e.target.value || 0))}
            />
          </div>

          <div className="field">
            <label className="field-label">Level / Type</label>
            <input
              className="input"
              value={form.level_type}
              onChange={(e) => update("level_type", e.target.value)}
              placeholder="7 High JM Electricians"
            />
          </div>

          <div className="field">
            <label className="field-label">City</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Indianapolis"
            />
          </div>

          <div className="field">
            <label className="field-label">State</label>
            <input
              className="input"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              placeholder="IN"
            />
          </div>

          <div className="field">
            <label className="field-label">Start</label>
            <input
              className="input"
              value={form.start_text}
              onChange={(e) => update("start_text", e.target.value)}
              placeholder="ASAP / Pending / Early May"
            />
          </div>

          <div className="field">
            <label className="field-label">Language</label>
            <input
              className="input"
              value={form.language_requirement}
              onChange={(e) => update("language_requirement", e.target.value)}
              placeholder="English Only / Spanish OK / Ratio"
            />
          </div>

          <div className="field">
            <label className="field-label">BD Rep</label>
            <input
              className="input"
              value={form.bd_rep}
              onChange={(e) => update("bd_rep", e.target.value)}
              placeholder="Chelsea / Connie / Michelle"
            />
          </div>

          <div className="field">
            <label className="field-label">Order Date</label>
            <DatePicker
              selected={toLocalDate(form.order_date)}
              onChange={(date) => update("order_date", date)}
              dateFormat="MM/dd/yyyy"
              placeholderText="MM/DD/YYYY"
              className="input"
              isClearable
            />
          </div>

          <div className="field">
            <label className="field-label">Client Name</label>
            <input
              className="input"
              value={form.client_name}
              onChange={(e) => update("client_name", e.target.value)}
              placeholder="CTS"
            />
          </div>

          <div className="field">
            <label className="field-label">Job Code</label>
            <input
              className="input"
              value={form.job_code}
              onChange={(e) => update("job_code", e.target.value)}
              placeholder="Optional internal ref"
            />
          </div>

          <div className="field">
            <label className="field-label">Status</label>
            <select
              className="select"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="open">Open</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="filled">Filled</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Priority</label>
            <select
              className="select"
              value={form.priority}
              onChange={(e) => update("priority", e.target.value)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="field span-4">
            <label className="field-label">Details</label>
            <textarea
              className="textarea"
              value={form.details}
              onChange={(e) => update("details", e.target.value)}
              placeholder="Rigid / lifts / Walmart nights / bilingual / rough-in ..."
            />
          </div>

          <div className="field span-4">
            <label className="field-label">Internal Notes</label>
            <textarea
              className="textarea"
              value={form.internal_notes}
              onChange={(e) => update("internal_notes", e.target.value)}
              placeholder="Notes only visible to your internal team."
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <div className="helper-text">
            Tip: keep Level / Type and Details as close as possible to the client source sheet.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn white" onClick={onClose} type="button">
              Cancel
            </button>
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

function ActionsMenu({ openMenu, setOpenMenu, onOpen, onEdit, onDuplicate, onDelete }) {
  if (!openMenu) return null;

  const top = openMenu.openUp
    ? openMenu.rect.top - 190
    : openMenu.rect.bottom + 8;

  const left = Math.min(
    Math.max(12, openMenu.rect.right - 190),
    window.innerWidth - 202
  );

  return createPortal(
    <>
      <div className="actions-menu-overlay" onClick={() => setOpenMenu(null)} />
      <div
        className="actions-dropdown"
        style={{
          top,
          left,
        }}
      >
        <button className="actions-menu-item" type="button" onClick={onOpen}>
          <ExternalLink size={15} />
          Open
        </button>
        <button className="actions-menu-item" type="button" onClick={onEdit}>
          <Pencil size={15} />
          Edit
        </button>
        <button className="actions-menu-item" type="button" onClick={onDuplicate}>
          <Copy size={15} />
          Duplicate
        </button>
        <button className="actions-menu-item danger" type="button" onClick={onDelete}>
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </>,
    document.body
  );
}

function ImportCsvModal({
  open,
  onClose,
  importRows,
  importErrors,
  importFileName,
  onFileSelected,
  onConfirmImport,
  onToggleImportRow,
  onToggleAllImportRows,
  onUpdateImportRow,
  importing,
  clearImport,
}) {
  const inputRef = useRef(null);

  if (!open) return null;

  const validRows = importRows.filter((row) => row.errors.length === 0);
  const invalidRows = importRows.filter((row) => row.errors.length > 0);
  const selectedRows = importRows.filter((row) => row.selected);
  const selectedValidRows = selectedRows.filter((row) => row.errors.length === 0);
  const selectedInvalidRows = selectedRows.filter((row) => row.errors.length > 0);
  const allRowsSelected = importRows.length > 0 && importRows.every((row) => row.selected);

  return (
    <div className="modal-backdrop">
      <div className="modal-card wide">
        <div className="toolbar-top">
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
              Import CTS Jobs CSV
            </h2>
            <p className="hero-subtitle" style={{ marginTop: 8 }}>
              Upload a CSV exported from the CTS job order spreadsheet.
            </p>
          </div>

          <button className="icon-btn" onClick={onClose} type="button">
            <X size={16} />
            Close
          </button>
        </div>

        <div className="drop-zone" style={{ marginTop: 18 }}>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelected(file);
              e.target.value = "";
            }}
          />

          <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <Upload size={28} />
            <div style={{ fontWeight: 900, color: "#0f172a" }}>
              {importFileName || "Choose a CTS CSV file"}
            </div>
            <div>
              Expected columns: Now, Wait, QTY, Level/Type, City, State, Start,
              Details, Language, BD Rep, Order Date.
            </div>
            <button
              className="btn dark"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={16} />
              Select CSV
            </button>
          </div>
        </div>

        {importErrors.length > 0 && (
          <div className="error-list">
            {importErrors.slice(0, 8).map((error, index) => (
              <div key={`${error}-${index}`}>
                <AlertTriangle size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
                {error}
              </div>
            ))}
            {importErrors.length > 8 && (
              <div>...and {importErrors.length - 8} more errors.</div>
            )}
          </div>
        )}

        {importRows.length > 0 && (
          <>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                Preview: {selectedValidRows.length} selected / {validRows.length} valid / {invalidRows.length} invalid
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn white"
                  type="button"
                  onClick={onToggleAllImportRows}
                >
                  {allRowsSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  {allRowsSelected ? "Unselect All" : "Select All"}
                </button>
                <button className="btn white" type="button" onClick={clearImport}>
                  Clear Preview
                </button>
                <button
                  className="btn dark"
                  type="button"
                  disabled={importing || selectedValidRows.length === 0 || selectedInvalidRows.length > 0}
                  onClick={onConfirmImport}
                >
                  {importing ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
                  Import {selectedValidRows.length} Jobs
                </button>
              </div>
            </div>

            <div className="table-scroll">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Include</th>
                    <th>Row</th>
                    <th>Now</th>
                    <th>Wait</th>
                    <th>QTY</th>
                    <th>Level / Type</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Start</th>
                    <th>Details</th>
                    <th>Language</th>
                    <th>BD Rep</th>
                    <th>Order Date</th>
                    <th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 100).map((row) => (
                    <tr key={row.rowNumber} className={row.selected ? "" : "preview-skipped"}>
                      <td className={row.errors.length && row.selected ? "preview-error" : ""}>
                        <button
                          className={`select-cell-btn ${row.selected ? "active" : ""}`}
                          type="button"
                          onClick={() => onToggleImportRow(row.rowNumber)}
                          title={row.selected ? "Exclude this job from import" : "Include this job in import"}
                        >
                          {row.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>{row.rowNumber}</td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <select
                          className="preview-select compact"
                          value={row.payload.is_now ? "yes" : "no"}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "is_now", e.target.value === "yes")}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <select
                          className="preview-select compact"
                          value={row.payload.is_wait ? "yes" : "no"}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "is_wait", e.target.value === "yes")}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input compact"
                          type="number"
                          min="0"
                          value={row.payload.qty}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "qty", Number(e.target.value || 0))}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input wide"
                          value={row.payload.level_type}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "level_type", e.target.value)}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input"
                          value={row.payload.city || ""}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "city", e.target.value)}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input compact"
                          value={row.payload.state || ""}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "state", e.target.value)}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input"
                          value={row.payload.start_text || ""}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "start_text", e.target.value)}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input wide"
                          value={row.payload.details || ""}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "details", e.target.value)}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input"
                          value={row.payload.language_requirement || ""}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "language_requirement", e.target.value)}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input"
                          value={row.payload.bd_rep || ""}
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "bd_rep", e.target.value)}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        <input
                          className="preview-input"
                          value={row.payload.order_date || ""}
                          placeholder="MM/DD/YYYY"
                          onChange={(e) => onUpdateImportRow(row.rowNumber, "order_date", e.target.value)}
                        />
                      </td>
                      <td className={row.errors.length ? "preview-error" : ""}>
                        {row.errors.length ? row.errors.join(" ") : "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importRows.length > 100 && (
              <div className="helper-text" style={{ marginTop: 10 }}>
                Showing first 100 rows only. All valid rows will still be imported.
              </div>
            )}
          </>
        )}
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

  const [openMenu, setOpenMenu] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importGlobalErrors, setImportGlobalErrors] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [lastImportBatchId, setLastImportBatchId] = useState(() =>
    localStorage.getItem(LAST_IMPORT_BATCH_STORAGE_KEY) || ""
  );

  const [feedback, setFeedback] = useState({ error: "", success: "" });

  const load = async ({ preserveFeedback = false } = {}) => {
    setLoading(true);
    if (!preserveFeedback) {
      setFeedback({ error: "", success: "" });
    }
    setOpenMenu(null);

    const [jobsRes, candidatesRes] = await Promise.all([
      supabase.from("cts_jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("cts_job_candidates").select("id, cts_job_id"),
    ]);

    if (jobsRes.error) {
      setFeedback({ error: jobsRes.error.message || "Could not load CTS jobs.", success: "" });
      setJobs([]);
      setJobCounts({});
      setLoading(false);
      return;
    }

    const counts = {};
    (candidatesRes.data || []).forEach((row) => {
      counts[row.cts_job_id] = (counts[row.cts_job_id] || 0) + 1;
    });

    setJobs(jobsRes.data || []);
    setJobCounts(counts);
    setSelectedIds(new Set());
    setLoading(false);
  };

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, []);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (job) => {
    setModalMode("edit");
    setEditingId(job.id);
    setForm({
      qty: job.qty ?? 1,
      is_now: !!job.is_now,
      is_wait: !!job.is_wait,
      level_type: job.level_type || "",
      city: job.city || "",
      state: job.state || "",
      start_text: job.start_text || "",
      details: job.details || "",
      language_requirement: job.language_requirement || "",
      bd_rep: job.bd_rep || "",
      order_date: job.order_date ? toLocalDate(job.order_date) : null,
      client_name: job.client_name || "CTS",
      job_code: job.job_code || "",
      status: job.status || "open",
      priority: job.priority || "normal",
      internal_notes: job.internal_notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.level_type.trim()) {
      setFeedback({ error: "Level / Type is required.", success: "" });
      return;
    }

    setSaving(true);
    setFeedback({ error: "", success: "" });

    const payload = {
      qty: Number(form.qty || 0),
      is_now: !!form.is_now,
      is_wait: !!form.is_wait,
      level_type: form.level_type.trim(),
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      start_text: form.start_text.trim() || null,
      details: form.details.trim() || null,
      language_requirement: form.language_requirement.trim() || null,
      bd_rep: form.bd_rep.trim() || null,
      order_date: toSqlDate(form.order_date),
      client_name: form.client_name.trim() || "CTS",
      job_code: form.job_code.trim() || null,
      status: form.status,
      priority: form.priority,
      internal_notes: form.internal_notes.trim() || null,
    };

    let res;
    if (modalMode === "edit" && editingId) {
      res = await supabase.from("cts_jobs").update(payload).eq("id", editingId);
    } else {
      res = await supabase.from("cts_jobs").insert(payload);
    }

    setSaving(false);

    if (res.error) {
      setFeedback({ error: res.error.message || "Could not save CTS job.", success: "" });
      return;
    }

    setModalOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFeedback({
      error: "",
      success: modalMode === "edit" ? "CTS job updated." : "CTS job created.",
    });
    await load({ preserveFeedback: true });
  };

  const handleDelete = async (job) => {
    const confirmed = window.confirm(`Delete "${job.level_type}"? This will also remove its assigned candidates.`);
    if (!confirmed) return;

    setFeedback({ error: "", success: "" });

    const { error } = await supabase.from("cts_jobs").delete().eq("id", job.id);
    if (error) {
      setFeedback({ error: error.message || "Could not delete CTS job.", success: "" });
      return;
    }

    setFeedback({ error: "", success: "CTS job deleted." });
    await load({ preserveFeedback: true });
  };

  const handleDuplicate = async (job) => {
    const payload = {
      qty: job.qty ?? 1,
      is_now: !!job.is_now,
      is_wait: !!job.is_wait,
      level_type: job.level_type,
      city: job.city,
      state: job.state,
      start_text: job.start_text,
      details: job.details,
      language_requirement: job.language_requirement,
      bd_rep: job.bd_rep,
      order_date: job.order_date,
      client_name: job.client_name || "CTS",
      job_code: null,
      status: "open",
      priority: job.priority || "normal",
      internal_notes: job.internal_notes,
    };

    const { error } = await supabase.from("cts_jobs").insert(payload);

    if (error) {
      setFeedback({ error: error.message || "Could not duplicate CTS job.", success: "" });
      return;
    }

    setFeedback({ error: "", success: "CTS job duplicated." });
    await load({ preserveFeedback: true });
  };

  const clearImport = () => {
    setImportRows([]);
    setImportGlobalErrors([]);
    setImportErrors([]);
    setImportFileName("");
  };

  const setImportRowsAndErrors = (rows, globalErrors = importGlobalErrors) => {
    setImportRows(rows);
    setImportErrors(buildImportErrors(globalErrors, rows));
  };

  const parseCsvFile = (file) => {
    clearImport();
    setImportFileName(file.name);
    const batchId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => String(header || "").trim(),
      complete: (results) => {
        const fields = results.meta?.fields || [];
        const missingHeaders = findMissingHeaders(fields);

        const globalErrors = [];
        if (missingHeaders.length > 0) {
          globalErrors.push(
            `Missing required columns: ${missingHeaders.join(", ")}.`
          );
        }

        if (results.errors?.length) {
          results.errors.slice(0, 5).forEach((error) => {
            globalErrors.push(`CSV parse error near row ${error.row}: ${error.message}`);
          });
        }

        const parsedRows = (results.data || [])
          .map((row, index) => normalizeCsvRow(row, batchId, index + 2))
          .filter((row) => {
            const values = Object.values(row.raw || {}).map((value) =>
              String(value || "").trim()
            );
            return values.some(Boolean);
          });

        setImportGlobalErrors(globalErrors);
        setImportRowsAndErrors(parsedRows, globalErrors);
      },
      error: (error) => {
        setImportGlobalErrors([error.message || "Could not parse CSV file."]);
        setImportErrors([error.message || "Could not parse CSV file."]);
      },
    });
  };

  const toggleImportRow = (rowNumber) => {
    setImportRows((prev) => {
      const next = prev.map((row) =>
        row.rowNumber === rowNumber ? { ...row, selected: !row.selected } : row
      );
      setImportErrors(buildImportErrors(importGlobalErrors, next));
      return next;
    });
  };

  const toggleAllImportRows = () => {
    setImportRows((prev) => {
      const shouldSelect = !prev.every((row) => row.selected);
      const next = prev.map((row) => ({ ...row, selected: shouldSelect }));
      setImportErrors(buildImportErrors(importGlobalErrors, next));
      return next;
    });
  };

  const updateImportRow = (rowNumber, field, value) => {
    setImportRows((prev) => {
      const next = prev.map((row) => {
        if (row.rowNumber !== rowNumber) return row;

        const payload = {
          ...row.payload,
          [field]: value,
        };

        if (field === "level_type") {
          payload.level_type = String(value || "");
        }

        if (field === "qty") {
          payload.qty = parseQty(value);
        }

        if (field === "is_now") {
          payload.priority = value ? "urgent" : row.payload.priority;
        }

        const stringFields = [
          "city",
          "state",
          "start_text",
          "details",
          "language_requirement",
          "bd_rep",
        ];
        if (stringFields.includes(field)) {
          payload[field] = String(value || "").trim() || null;
        }

        if (field === "order_date") {
          const rawDate = String(value || "").trim();
          payload.order_date = rawDate ? parseCsvDate(rawDate) || rawDate : null;
        }

        return {
          ...row,
          payload,
          errors: validateImportPayload(payload),
        };
      });

      setImportErrors(buildImportErrors(importGlobalErrors, next));
      return next;
    });
  };

  const confirmImport = async () => {
    const selectedRows = importRows.filter((row) => row.selected);
    const invalidRows = selectedRows.filter((row) => row.errors.length > 0);
    const validRows = selectedRows.filter((row) => row.errors.length === 0);

    if (invalidRows.length > 0) {
      setImportErrors([
        "Please fix or unselect invalid rows before importing.",
        ...invalidRows.flatMap((row) => row.errors.map((error) => `Row ${row.rowNumber}: ${error}`)),
      ]);
      return;
    }

    if (validRows.length === 0) {
      setImportErrors(["Select at least one valid row to import."]);
      return;
    }

    setImporting(true);
    setFeedback({ error: "", success: "" });

    const payload = validRows.map((row) => ({
      ...row.payload,
      level_type: String(row.payload.level_type || "").trim(),
      qty: parseQty(row.payload.qty),
      order_date: row.payload.order_date ? parseCsvDate(row.payload.order_date) : null,
    }));
    const batchId = payload[0]?.last_import_batch_id || "";

    const { error } = await supabase.from("cts_jobs").insert(payload);

    setImporting(false);

    if (error) {
      setFeedback({ error: error.message || "Could not import CTS jobs.", success: "" });
      return;
    }

    if (batchId) {
      localStorage.setItem(LAST_IMPORT_BATCH_STORAGE_KEY, batchId);
      setLastImportBatchId(batchId);
    }

    setImportModalOpen(false);
    clearImport();
    setFeedback({
      error: "",
      success: `Imported ${payload.length} CTS jobs successfully.`,
    });
    await load({ preserveFeedback: true });
  };

  const undoLastImport = async () => {
    if (!lastImportBatchId) {
      setFeedback({ error: "No import batch found to undo.", success: "" });
      return;
    }

    const confirmed = window.confirm(
      "Undo the last CSV import? This deletes all jobs created in that import batch. Assigned candidates for those jobs will also be deleted."
    );

    if (!confirmed) return;

    setFeedback({ error: "", success: "" });

    const { data: batchRows, error: readError } = await supabase
      .from("cts_jobs")
      .select("id, level_type")
      .eq("last_import_batch_id", lastImportBatchId);

    if (readError) {
      setFeedback({ error: readError.message || "Could not find last import batch.", success: "" });
      return;
    }

    if (!batchRows?.length) {
      localStorage.removeItem(LAST_IMPORT_BATCH_STORAGE_KEY);
      setLastImportBatchId("");
      setFeedback({ error: "The last import batch no longer exists.", success: "" });
      return;
    }

    const { error } = await supabase
      .from("cts_jobs")
      .delete()
      .eq("last_import_batch_id", lastImportBatchId);

    if (error) {
      setFeedback({ error: error.message || "Could not undo last import.", success: "" });
      return;
    }

    localStorage.removeItem(LAST_IMPORT_BATCH_STORAGE_KEY);
    setLastImportBatchId("");
    setFeedback({
      error: "",
      success: `Last import undone. Deleted ${batchRows.length} jobs.`,
    });
    await load({ preserveFeedback: true });
  };

  const deleteSelectedJobs = async () => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${ids.length} selected jobs? Assigned candidates for those jobs will also be deleted.`
    );

    if (!confirmed) return;

    setFeedback({ error: "", success: "" });

    const { error } = await supabase.from("cts_jobs").delete().in("id", ids);

    if (error) {
      setFeedback({ error: error.message || "Could not delete selected jobs.", success: "" });
      return;
    }

    setSelectedIds(new Set());
    setFeedback({ error: "", success: `Deleted ${ids.length} selected jobs.` });
    await load({ preserveFeedback: true });
  };

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();

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
            job.client_name,
            job.job_code,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q));

        const matchesStatus = !statusFilter || job.status === statusFilter;
        const matchesState = !stateFilter || String(job.state || "").toLowerCase() === stateFilter.toLowerCase();
        const matchesBdRep = !bdRepFilter || String(job.bd_rep || "").toLowerCase() === bdRepFilter.toLowerCase();
        const matchesLanguage =
          !languageFilter ||
          String(job.language_requirement || "").toLowerCase().includes(languageFilter.toLowerCase());

        return matchesSearch && matchesStatus && matchesState && matchesBdRep && matchesLanguage;
      })
      .sort((a, b) => {
        const priorityA = PRIORITY_SORT_ORDER[a.priority] ?? PRIORITY_SORT_ORDER.normal;
        const priorityB = PRIORITY_SORT_ORDER[b.priority] ?? PRIORITY_SORT_ORDER.normal;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        const updatedAtA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const updatedAtB = b.updated_at ? new Date(b.updated_at).getTime() : 0;

        if (updatedAtA !== updatedAtB) {
          return updatedAtB - updatedAtA;
        }

        const createdAtA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const createdAtB = b.created_at ? new Date(b.created_at).getTime() : 0;

        return createdAtB - createdAtA;
      });
  }, [jobs, search, statusFilter, stateFilter, bdRepFilter, languageFilter]);

  const summary = useMemo(() => {
    const total = jobs.length;
    const open = jobs.filter((job) => job.status === "open" || job.status === "active").length;
    const filled = jobs.filter((job) => job.status === "filled").length;
    const totalQty = jobs.reduce((sum, job) => sum + Number(job.qty || 0), 0);

    return { total, open, filled, totalQty };
  }, [jobs]);

  const distinctStates = useMemo(
    () => [...new Set(jobs.map((job) => job.state).filter(Boolean))].sort(),
    [jobs]
  );

  const distinctBdReps = useMemo(
    () => [...new Set(jobs.map((job) => job.bd_rep).filter(Boolean))].sort(),
    [jobs]
  );

  const selectedCount = selectedIds.size;
  const allFilteredSelected =
    filteredJobs.length > 0 && filteredJobs.every((job) => selectedIds.has(job.id));

  const toggleSelected = (jobId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredJobs.forEach((job) => next.delete(job.id));
      } else {
        filteredJobs.forEach((job) => next.add(job.id));
      }
      return next;
    });
  };

  const shouldUseSingleTapOpen = () =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const shouldIgnoreRowOpen = (event) =>
    event.target instanceof Element &&
    !!event.target.closest("button, a, input, select, textarea, label");

  const openJobFromRow = (event, jobId, mode = "click") => {
    if (shouldIgnoreRowOpen(event)) return;
    if (mode === "click" && !shouldUseSingleTapOpen()) return;
    navigate(`/cts-jobs/${jobId}`);
  };

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
                <p className="hero-subtitle">
                  Read, add, edit, import and organize all active CTS orders in one clean operating system.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn white" type="button" onClick={load}>
                  <Filter size={16} />
                  Refresh
                </button>
                <button className="btn white" type="button" onClick={() => setImportModalOpen(true)}>
                  <Upload size={16} />
                  Import CSV
                </button>
                <button
                  className="btn white"
                  type="button"
                  onClick={undoLastImport}
                  disabled={!lastImportBatchId}
                  title={!lastImportBatchId ? "No import batch available to undo" : "Undo last CSV import"}
                >
                  <RotateCcw size={16} />
                  Undo Last Import
                </button>
                <button className="btn dark" type="button" onClick={openCreate}>
                  <Plus size={16} />
                  New CTS Job
                </button>
              </div>
            </div>

            <div className="summary-grid">
              <div className="metric-card">
                <div className="metric-label">Total Jobs</div>
                <div className="metric-value">{summary.total}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Open / Active</div>
                <div className="metric-value">{summary.open}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Filled</div>
                <div className="metric-value">{summary.filled}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Total Requested Qty</div>
                <div className="metric-value">{summary.totalQty}</div>
              </div>
            </div>
          </div>

          <div className="glass-card toolbar-card">
            <div className="toolbar-top">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Search size={18} />
                <div style={{ fontWeight: 900, fontSize: 20 }}>Search & Filters</div>
              </div>

              <button
                className="btn white"
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setStateFilter("");
                  setBdRepFilter("");
                  setLanguageFilter("");
                }}
              >
                <X size={16} />
                Clear Filters
              </button>
            </div>

            <div className="toolbar-grid">
              <div className="field">
                <label className="field-label">Search</label>
                <input
                  className="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Level / Type, city, details, BD rep..."
                />
              </div>

              <div className="field">
                <label className="field-label">Status</label>
                <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="filled">Filled</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="field">
                <label className="field-label">State</label>
                <select className="select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="">All</option>
                  {distinctStates.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">BD Rep</label>
                <select className="select" value={bdRepFilter} onChange={(e) => setBdRepFilter(e.target.value)}>
                  <option value="">All</option>
                  {distinctBdReps.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">Language</label>
                <input
                  className="input"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  placeholder="English / Spanish / Ratio..."
                />
              </div>
            </div>

            {feedback.error ? (
              <div style={{ marginTop: 16, color: "#991b1b", fontWeight: 800 }}>{feedback.error}</div>
            ) : null}

            {feedback.success ? (
              <div style={{ marginTop: 16, color: "#166534", fontWeight: 800 }}>{feedback.success}</div>
            ) : null}
          </div>

          <div className="glass-card table-card">
            <div className="table-top">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Briefcase size={20} />
                <div style={{ fontWeight: 900, fontSize: 22 }}>
                  CTS Job List ({filteredJobs.length})
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selectedCount > 0 && (
                  <button className="btn danger" type="button" onClick={deleteSelectedJobs}>
                    <Trash2 size={16} />
                    Delete Selected ({selectedCount})
                  </button>
                )}
              </div>
            </div>

            {loading ? (
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
                <table>
                  <thead>
                    <tr>
                      <th>
                        <button
                          className={`select-cell-btn ${allFilteredSelected ? "active" : ""}`}
                          type="button"
                          onClick={toggleSelectAllFiltered}
                          title={allFilteredSelected ? "Unselect all filtered jobs" : "Select all filtered jobs"}
                        >
                          {allFilteredSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </th>
                      <th>Qty</th>
                      <th>Level / Type</th>
                      <th>City</th>
                      <th>State</th>
                      <th>Start</th>
                      <th>Details</th>
                      <th>Language</th>
                      <th>BD Rep</th>
                      <th>Modification Date</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Candidates</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => {
                      const isSelected = selectedIds.has(job.id);

                      return (
                        <tr
                          key={job.id}
                          className="job-row-openable"
                          onDoubleClick={(event) => openJobFromRow(event, job.id, "double")}
                          onClick={(event) => openJobFromRow(event, job.id, "click")}
                        >
                          <td>
                            <button
                              className={`select-cell-btn ${isSelected ? "active" : ""}`}
                              type="button"
                              onClick={() => toggleSelected(job.id)}
                              title={isSelected ? "Unselect job" : "Select job"}
                            >
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                          </td>
                          <td style={{ fontWeight: 900 }}>{job.qty ?? 0}</td>
                          <td>
                            <div style={{ fontWeight: 900, color: "#0f172a" }}>{job.level_type || "—"}</div>
                            {job.job_code ? (
                              <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
                                Ref: {job.job_code}
                              </div>
                            ) : null}
                          </td>
                          <td>{job.city || "—"}</td>
                          <td>{job.state || "—"}</td>
                          <td>{job.start_text || "—"}</td>
                          <td style={{ minWidth: 240 }}>{job.details || "—"}</td>
                          <td>{job.language_requirement || "—"}</td>
                          <td>{job.bd_rep || "—"}</td>
                          <td>{formatDateOnly(job.updated_at)}</td>
                          <td>
                            <span className="status-pill" style={getStatusStyle(job.status)}>
                              {job.status}
                            </span>
                          </td>
                          <td>
                            <span className="priority-pill" style={getPriorityStyle(job.priority)}>
                              {job.priority}
                            </span>
                          </td>
                          <td style={{ fontWeight: 900 }}>{jobCounts[job.id] || 0}</td>
                          <td>
                            <div className="actions-menu-wrap">
                              <button
                                className={`actions-trigger ${openMenu?.jobId === job.id ? "active" : ""}`}
                                type="button"
                                onClick={(event) => {
                                  const rect = event.currentTarget.getBoundingClientRect();
                                  const openUp = window.innerHeight - rect.bottom < 230;
                                  setOpenMenu((prev) =>
                                    prev?.jobId === job.id
                                      ? null
                                      : { jobId: job.id, rect, openUp }
                                  );
                                }}
                                title="Actions"
                              >
                                <MoreVertical size={18} />
                              </button>

                              <ActionsMenu
                                openMenu={openMenu?.jobId === job.id ? openMenu : null}
                                setOpenMenu={setOpenMenu}
                                onOpen={() => {
                                  setOpenMenu(null);
                                  navigate(`/cts-jobs/${job.id}`);
                                }}
                                onEdit={() => {
                                  setOpenMenu(null);
                                  openEdit(job);
                                }}
                                onDuplicate={() => {
                                  setOpenMenu(null);
                                  handleDuplicate(job);
                                }}
                                onDelete={() => {
                                  setOpenMenu(null);
                                  handleDelete(job);
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <JobModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
      />

      <ImportCsvModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importRows={importRows}
        importErrors={importErrors}
        importFileName={importFileName}
        onFileSelected={parseCsvFile}
        onConfirmImport={confirmImport}
        onToggleImportRow={toggleImportRow}
        onToggleAllImportRows={toggleAllImportRows}
        onUpdateImportRow={updateImportRow}
        importing={importing}
        clearImport={clearImport}
      />

      <GoToTopButton />
    </>
  );
}

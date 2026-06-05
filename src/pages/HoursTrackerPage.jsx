import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Loader2,
  Printer,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import UtsClientTopBar from "../components/UtsClientTopBar";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FIRST_ASSIGNMENT_WEEK = "2026-04-06";
const LOCKED_WEEKS_STORAGE_KEY = "uts_hours_locked_weeks_v1";
const SOURCE_LABEL = {
  admin: "Admin",
  client: "Client",
};

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

      .hours-shell {
        width: min(1440px, calc(100% - 48px));
        margin: 0 auto;
        padding: 24px 0 48px;
        display: grid;
        gap: 20px;
      }

      .glass-card {
        min-width: 0;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(10px);
        border: 1px solid #dbeafe;
        border-radius: 28px;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
      }

      .hero-card,
      .week-card {
        padding: 24px;
      }

      .hero-top,
      .week-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
      }

      .hero-title {
        margin: 0;
        font-size: clamp(34px, 5vw, 44px);
        line-height: 1.02;
        font-weight: 900;
        letter-spacing: 0;
      }

      .hero-subtitle {
        margin: 10px 0 0 0;
        color: #475569;
        font-size: 16px;
        line-height: 1.5;
      }

      .btn,
      .icon-btn {
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        min-height: 46px;
        padding: 12px 16px;
        background: #ffffff;
        color: #0f172a;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: 0.18s ease;
      }

      .btn.dark {
        background: #0f172a;
        color: #ffffff;
        border-color: #0f172a;
      }

      .btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .icon-btn {
        width: 48px;
        padding: 0;
      }

      .filters-row {
        display: grid;
        grid-template-columns: minmax(240px, 1fr) minmax(170px, 0.45fr);
        gap: 10px;
        align-items: center;
        width: min(100%, 860px);
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

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .metric-card {
        border: 1px solid #dbeafe;
        border-radius: 18px;
        padding: 16px;
        background: rgba(248, 251, 255, 0.92);
      }

      .metric-label {
        color: #64748b;
        font-weight: 900;
        font-size: 13px;
      }

      .metric-value {
        margin-top: 5px;
        color: #0f172a;
        font-weight: 950;
        font-size: 28px;
      }

      .table-scroll {
        width: 100%;
        max-width: 100%;
        overflow-x: auto;
        margin-top: 18px;
      }

      .hours-table {
        width: 100%;
        min-width: 1120px;
        border-collapse: separate;
        border-spacing: 0;
      }

      .hours-table th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #eff6ff;
        color: #1e3a8a;
        text-align: left;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 14px;
        border-bottom: 1px solid #bfdbfe;
      }

      .hours-table td {
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        padding: 14px;
        vertical-align: middle;
      }

      .hours-table tbody tr:hover td {
        background: #f8fbff;
      }

      .sticky-worker {
        position: sticky;
        left: 0;
        z-index: 2;
        min-width: 260px;
        max-width: 260px;
        box-shadow: 10px 0 20px rgba(15, 23, 42, 0.05);
      }

      thead .sticky-worker {
        z-index: 4;
        background: #eff6ff;
      }

      .hours-input {
        width: 78px;
        min-height: 42px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 10px;
        text-align: center;
        font-weight: 900;
        color: #0f172a;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 11px;
        border-radius: 999px;
        background: #e0f2fe;
        color: #075985;
        font-weight: 900;
        font-size: 12px;
      }

      .match-cell {
        border-radius: 14px;
        padding: 10px 12px;
        font-weight: 900;
        min-width: 120px;
        text-align: center;
      }

      .match-ok {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }

      .match-warn {
        background: #ffedd5;
        color: #9a3412;
        border: 1px solid #fdba74;
      }

      .match-empty {
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #cbd5e1;
      }

      .section-toggle {
        width: 100%;
        margin-top: 18px;
        border: 1px solid #dbeafe;
        border-radius: 18px;
        background: rgba(248, 251, 255, 0.92);
        color: #0f172a;
        padding: 14px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        text-align: left;
      }

      .section-toggle-title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 950;
        font-size: 18px;
      }

      .table-total-line {
        margin-top: 12px;
        border: 1px solid #dbeafe;
        border-radius: 16px;
        background: #f8fbff;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 14px;
        color: #0f172a;
        font-weight: 950;
      }

      .report-card {
        padding: 24px;
      }

      .report-toolbar {
        margin-top: 18px;
        display: grid;
        grid-template-columns: minmax(180px, 0.8fr) minmax(200px, 1fr) minmax(160px, 0.7fr) minmax(160px, 0.7fr);
        gap: 10px;
        align-items: center;
      }

      .report-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 900;
        white-space: nowrap;
      }

      .status-chip.confirmed { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
      .status-chip.pending { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
      .status-chip.missing { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
      .status-chip.neutral { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

      .report-table {
        width: 100%;
        min-width: 980px;
        border-collapse: separate;
        border-spacing: 0;
      }

      .report-table th,
      .report-table td {
        padding: 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #ffffff;
        text-align: left;
        vertical-align: middle;
      }

      .report-table th {
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .report-table tbody tr:hover td { background: #f8fbff; }

      .report-worker {
        font-weight: 950;
        color: #0f172a;
      }

      .report-meta {
        margin-top: 4px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.45;
      }

      .empty-state {
        border: 1px dashed #cbd5e1;
        background: rgba(248, 250, 252, 0.9);
        border-radius: 18px;
        padding: 18px;
        color: #475569;
        font-weight: 800;
        text-align: center;
      }

      .feedback-error,
      .feedback-success {
        border-radius: 16px;
        padding: 14px 16px;
        font-weight: 900;
      }

      .feedback-error {
        color: #991b1b;
        background: #fef2f2;
        border: 1px solid #fecaca;
      }

      .feedback-success {
        color: #166534;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
      }

      @media (max-width: 900px) {
        .hours-shell {
          width: min(100% - 24px, 1440px);
        }

        .hero-card,
        .week-card {
          padding: 18px;
          border-radius: 22px;
        }

        .filters-row,
        .report-toolbar,
        .summary-grid {
          grid-template-columns: 1fr;
        }

      }
    `}</style>
  );
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function formatWeekRange(weekStart) {
  const start = parseDate(weekStart);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function getTrackedWeekStarts(today = new Date()) {
  const firstWeek = parseDate(FIRST_ASSIGNMENT_WEEK);
  const currentWeek = startOfWeek(today);
  const weeks = [];

  for (let cursor = currentWeek; cursor >= firstWeek; cursor = addDays(cursor, -7)) {
    weeks.push(toDateInputValue(cursor));
  }

  return weeks;
}

function formatDateLabel(dateValue) {
  return parseDate(dateValue).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatHours(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function entryKey(candidateId, date, source) {
  return `${candidateId}|${date}|${source}`;
}

function normalizeHours(value) {
  if (value === "" || value == null) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return Math.min(parsed, 24).toString();
}

function normalizePhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, index) => toDateInputValue(addDays(parseDate(weekStart), index)));
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

function getReportStatus({ adminTotal, clientTotal, hasUnreviewedClientHours }) {
  if (clientTotal > 0 && adminTotal === 0) return "missing_admin";
  if (adminTotal > 0 && clientTotal === 0) return "missing_client";
  if (adminTotal !== clientTotal) return "difference";
  if (clientTotal > 0 && hasUnreviewedClientHours) return "pending";
  if (adminTotal > 0 || clientTotal > 0) return "confirmed";
  return "empty";
}

function getReportStatusLabel(status) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending review";
    case "missing_admin":
      return "Missing admin";
    case "missing_client":
      return "Missing worker";
    case "difference":
      return "Difference";
    default:
      return "No hours";
  }
}

function getReportStatusClass(status) {
  if (status === "confirmed") return "confirmed";
  if (status === "pending" || status === "difference") return "pending";
  if (status === "missing_admin" || status === "missing_client") return "missing";
  return "neutral";
}

function compareClass(adminValue, clientValue) {
  const hasAdmin = adminValue !== "" && adminValue != null;
  const hasClient = clientValue !== "" && clientValue != null;
  if (!hasAdmin && !hasClient) return "match-empty";
  if (Number(adminValue || 0) === Number(clientValue || 0) && hasAdmin && hasClient) return "match-ok";
  return "match-warn";
}

function HoursTable({
  assignments,
  days,
  entriesByKey,
  source,
  onChange,
  readOnly = false,
}) {
  const tableTotal = assignments.reduce(
    (sum, assignment) =>
      sum +
      days.reduce((daySum, day) => {
        const value = entriesByKey.get(entryKey(assignment.id, day, source))?.regular_hours ?? "";
        return daySum + Number(value || 0);
      }, 0),
    0
  );

  return (
    <>
      <div className="table-scroll">
        <table className="hours-table">
          <thead>
            <tr>
              <th className="sticky-worker">Worker / Project</th>
              {days.map((day, index) => (
                <th key={day}>
                  {DAY_LABELS[index]}
                  <div style={{ marginTop: 4, color: "#64748b", letterSpacing: 0, textTransform: "none" }}>
                    {formatDateLabel(day)}
                  </div>
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => {
              const total = days.reduce((sum, day) => {
                const value = entriesByKey.get(entryKey(assignment.id, day, source))?.regular_hours ?? "";
                return sum + Number(value || 0);
              }, 0);

              return (
                <tr key={assignment.id}>
                  <td className="sticky-worker">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 950, color: "#0f172a" }}>{assignment.name}</div>
                        <div style={{ marginTop: 5, color: "#64748b", fontSize: 13 }}>
                          {assignment.project || "Unlinked project"}
                        </div>
                      </div>
                      {assignment.public_profile_slug ? (
                        <button
                          className="icon-btn"
                          type="button"
                          style={{ width: 38, minHeight: 38, borderRadius: 12 }}
                          onClick={() => window.open(`/profile/${assignment.public_profile_slug}`, "_blank")}
                          title="Open worker profile"
                        >
                          <ExternalLink size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                  {days.map((day) => {
                    const key = entryKey(assignment.id, day, source);
                    const current = entriesByKey.get(key)?.regular_hours ?? "";

                    return (
                      <td key={day}>
                        <input
                          className="hours-input"
                          type="number"
                          min="0"
                          max="24"
                          step="0.25"
                          value={current}
                          disabled={readOnly}
                          onChange={(event) => onChange(assignment, day, normalizeHours(event.target.value))}
                          aria-label={`${assignment.name} ${DAY_LABELS[days.indexOf(day)]} hours`}
                        />
                      </td>
                    );
                  })}
                  <td style={{ fontWeight: 950 }}>{formatHours(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-total-line">
        <span>Total Hours</span>
        <span style={{ fontSize: 24 }}>{formatHours(tableTotal)}</span>
      </div>
    </>
  );
}

function ReconciliationTable({ assignments, days, entriesByKey }) {
  return (
    <div className="table-scroll">
      <table className="hours-table">
        <thead>
          <tr>
            <th className="sticky-worker">Worker / Project</th>
            {days.map((day, index) => (
              <th key={day}>
                {DAY_LABELS[index]}
                <div style={{ marginTop: 4, color: "#64748b", letterSpacing: 0, textTransform: "none" }}>
                  {formatDateLabel(day)}
                </div>
              </th>
            ))}
            <th>Week</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => {
            let adminTotal = 0;
            let clientTotal = 0;

            return (
              <tr key={assignment.id}>
                <td className="sticky-worker">
                  <div style={{ fontWeight: 950, color: "#0f172a" }}>{assignment.name}</div>
                  <div style={{ marginTop: 5, color: "#64748b", fontSize: 13 }}>{assignment.project || "Unlinked project"}</div>
                </td>
                {days.map((day) => {
                  const adminValue = entriesByKey.get(entryKey(assignment.id, day, "admin"))?.regular_hours ?? "";
                  const clientValue = entriesByKey.get(entryKey(assignment.id, day, "client"))?.regular_hours ?? "";
                  adminTotal += Number(adminValue || 0);
                  clientTotal += Number(clientValue || 0);

                  return (
                    <td key={day}>
                      <div className={`match-cell ${compareClass(adminValue, clientValue)}`}>
                        A {adminValue === "" ? "—" : formatHours(adminValue)}
                        <br />
                        C {clientValue === "" ? "—" : formatHours(clientValue)}
                      </div>
                    </td>
                  );
                })}
                <td>
                  <div className={`match-cell ${compareClass(adminTotal, clientTotal)}`}>
                    A {formatHours(adminTotal)}
                    <br />
                    C {formatHours(clientTotal)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HoursReport({
  weeks,
  selectedWeek,
  setSelectedWeek,
  rows,
  summary,
  statusFilter,
  setStatusFilter,
  onConfirmRow,
  onConfirmVisible,
  confirmingKey,
}) {
  const exportReport = () => {
    downloadCsv(
      `hours-report-${selectedWeek}.csv`,
      ["Week", "Worker", "Phone", "Email", "Project", "Admin Hours", "Client Hours", "Difference", "Status"],
      rows.map((row) => [
        formatWeekRange(selectedWeek),
        row.name,
        row.phone,
        row.email,
        row.project,
        formatHours(row.adminTotal),
        formatHours(row.clientTotal),
        formatHours(row.difference),
        getReportStatusLabel(row.status),
      ])
    );
  };

  return (
    <div className="glass-card report-card">
      <div className="hero-top">
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 950, letterSpacing: "-0.03em" }}>Weekly Hours Report</h2>
          <p className="hero-subtitle" style={{ marginTop: 8 }}>
            Review worker-submitted hours, compare them against admin hours, and confirm rows that are ready for billing.
          </p>
        </div>
        <div className="report-actions">
          <button className="btn" type="button" onClick={exportReport} disabled={!rows.length}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn" type="button" onClick={() => window.print()} disabled={!rows.length}>
            <Printer size={16} /> Print
          </button>
          <button className="btn dark" type="button" onClick={() => onConfirmVisible(rows)} disabled={!rows.some((row) => row.canConfirm) || !!confirmingKey}>
            <CheckCircle2 size={16} /> Confirm Visible
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <div className="metric-card"><div className="metric-label">Pending Review</div><div className="metric-value">{summary.pending}</div></div>
        <div className="metric-card"><div className="metric-label">Admin Hours</div><div className="metric-value">{formatHours(summary.adminHours)}</div></div>
        <div className="metric-card"><div className="metric-label">Worker Hours</div><div className="metric-value">{formatHours(summary.clientHours)}</div></div>
        <div className="metric-card"><div className="metric-label">Differences</div><div className="metric-value">{summary.differences}</div></div>
      </div>

      <div className="report-toolbar">
        <select className="select" value={selectedWeek} onChange={(event) => setSelectedWeek(event.target.value)}>
          {weeks.map((week) => <option key={week} value={week}>{formatWeekRange(week)}</option>)}
        </select>
        <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending review</option>
          <option value="difference">Differences</option>
          <option value="missing_admin">Missing admin</option>
          <option value="missing_client">Missing worker</option>
          <option value="confirmed">Confirmed</option>
        </select>
        <div className="status-chip pending"><AlertTriangle size={14} /> {summary.needsAttention} need attention</div>
        <div className="status-chip confirmed"><CheckCircle2 size={14} /> {summary.confirmed} confirmed</div>
      </div>

      {rows.length ? (
        <div className="table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Worker / Project</th>
                <th style={{ textAlign: "right" }}>Admin</th>
                <th style={{ textAlign: "right" }}>Worker</th>
                <th style={{ textAlign: "right" }}>Difference</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <div className="report-worker">{row.name}</div>
                    <div className="report-meta">{row.project || "Unlinked project"}{row.projectLocation ? ` · ${row.projectLocation}` : ""}</div>
                    <div className="report-meta">{[row.phone, row.email].filter(Boolean).join(" · ") || "No contact"}</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 950 }}>{formatHours(row.adminTotal)}</td>
                  <td style={{ textAlign: "right", fontWeight: 950 }}>{formatHours(row.clientTotal)}</td>
                  <td style={{ textAlign: "right", fontWeight: 950 }}>{formatHours(row.difference)}</td>
                  <td>
                    <span className={`status-chip ${getReportStatusClass(row.status)}`}>
                      {row.status === "confirmed" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {getReportStatusLabel(row.status)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn" type="button" onClick={() => onConfirmRow(row)} disabled={!row.canConfirm || confirmingKey === row.key}>
                      {confirmingKey === row.key ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                      Confirm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: 18 }}>No hours report rows match the selected filters.</div>
      )}
    </div>
  );
}

export default function HoursTrackerPage({ mode = "admin" }) {
  const navigate = useNavigate();
  const source = mode === "client" ? "client" : "admin";
  const isAdmin = mode === "admin";
  const [assignments, setAssignments] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [savingWeek, setSavingWeek] = useState("");
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [reportWeek, setReportWeek] = useState(() => toDateInputValue(startOfWeek(new Date())));
  const [reportStatusFilter, setReportStatusFilter] = useState("pending");
  const [confirmingReportKey, setConfirmingReportKey] = useState("");
  const [openWeeks, setOpenWeeks] = useState(() => new Set([toDateInputValue(startOfWeek(new Date()))]));
  const [closedEntryWeeks, setClosedEntryWeeks] = useState(() => new Set());
  const [openReconciliationWeeks, setOpenReconciliationWeeks] = useState(() => new Set());
  const [lockedWeeks, setLockedWeeks] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`${LOCKED_WEEKS_STORAGE_KEY}_${source}`) || "[]"));
    } catch {
      return new Set();
    }
  });

  const weeks = useMemo(() => getTrackedWeekStarts(), []);

  const dateRange = useMemo(() => {
    const starts = weeks.map(parseDate);
    const min = new Date(Math.min(...starts.map((item) => item.getTime())));
    const max = addDays(parseDate(weeks[0]), 6);
    return { start: toDateInputValue(min), end: toDateInputValue(max) };
  }, [weeks]);

  const load = useCallback(async ({ preserveFeedback = false } = {}) => {
    setLoading(true);
    if (!preserveFeedback) {
      setFeedback({ error: "", success: "" });
    }

    const [candidateRes, jobsRes, workersRes, hoursRes] = await Promise.all([
      supabase.from("cts_job_candidates").select("*").order("updated_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("cts_jobs").select("id, level_type, city, state, status").order("created_at", { ascending: false }),
      supabase.from("workers").select("id, name, phone, email, public_profile_slug"),
      supabase
        .from("hours_entries")
        .select("*")
        .gte("work_date", dateRange.start)
        .lte("work_date", dateRange.end),
    ]);

    if (candidateRes.error || jobsRes.error || workersRes.error || hoursRes.error) {
      setFeedback({
        error:
          candidateRes.error?.message ||
          jobsRes.error?.message ||
          workersRes.error?.message ||
          hoursRes.error?.message ||
          "Could not load hours tracker.",
        success: "",
      });
      setAssignments([]);
      setEntriesByKey(new Map());
      setLoading(false);
      return;
    }

    const jobsById = new Map((jobsRes.data || []).map((job) => [job.id, job]));
    const workersById = new Map((workersRes.data || []).map((worker) => [worker.id, worker]));

    setAssignments(
      (candidateRes.data || [])
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
            project: job.level_type || "",
            project_location: [job.city, job.state].filter(Boolean).join(", "),
            job_status: job.status || "",
            phone_digits: normalizePhoneDigits(candidate.phone_snapshot || worker.phone || ""),
          };
        })
    );

    const nextEntries = new Map();
    (hoursRes.data || []).forEach((entry) => {
      nextEntries.set(entryKey(entry.cts_job_candidate_id, entry.work_date, entry.source), entry);
    });
    setEntriesByKey(nextEntries);
    setLoading(false);
  }, [dateRange.end, dateRange.start]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const filteredAssignments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const phoneNeedle = normalizePhoneDigits(search);
    return assignments
      .filter((assignment) => {
        const haystack = [
          assignment.name,
          assignment.phone,
          assignment.email,
          assignment.project,
          assignment.project_location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = !needle || haystack.includes(needle) || (phoneNeedle && assignment.phone_digits?.includes(phoneNeedle));
        const matchesJob = !jobFilter || assignment.cts_job_id === jobFilter;
        return matchesSearch && matchesJob;
      })
      .sort((a, b) => {
        const projectCompare = (a.project || "Unlinked project").localeCompare(b.project || "Unlinked project");
        if (projectCompare !== 0) return projectCompare;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [assignments, jobFilter, search]);

  const distinctJobs = useMemo(() => {
    const map = new Map();
    assignments.forEach((assignment) => {
      if (assignment.cts_job_id) {
        map.set(assignment.cts_job_id, assignment.project || "Unlinked project");
      }
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [assignments]);

  const summary = useMemo(() => {
    let totalHours = 0;

    entriesByKey.forEach((entry) => {
      if (entry.source === source) {
        totalHours += Number(entry.regular_hours || 0);
      }
    });

    return { totalHours };
  }, [entriesByKey, source]);

  const weeklyReportRows = useMemo(() => {
    const days = getWeekDays(reportWeek);

    return filteredAssignments
      .map((assignment) => {
        let adminTotal = 0;
        let clientTotal = 0;
        const clientEntryIds = [];
        let hasUnreviewedClientHours = false;

        days.forEach((day) => {
          const adminEntry = entriesByKey.get(entryKey(assignment.id, day, "admin"));
          const clientEntry = entriesByKey.get(entryKey(assignment.id, day, "client"));
          adminTotal += Number(adminEntry?.regular_hours || 0);
          clientTotal += Number(clientEntry?.regular_hours || 0);

          if (clientEntry?.id && Number(clientEntry.regular_hours || 0) > 0) {
            clientEntryIds.push(clientEntry.id);
            if (!clientEntry.admin_reviewed_at) hasUnreviewedClientHours = true;
          }
        });

        const status = getReportStatus({ adminTotal, clientTotal, hasUnreviewedClientHours });
        const difference = adminTotal - clientTotal;

        return {
          key: `${assignment.id}|${reportWeek}`,
          assignmentId: assignment.id,
          name: assignment.name,
          phone: assignment.phone,
          email: assignment.email,
          project: assignment.project,
          projectLocation: assignment.project_location,
          ctsJobId: assignment.cts_job_id,
          adminTotal,
          clientTotal,
          difference,
          status,
          clientEntryIds,
          canConfirm: clientEntryIds.length > 0 && status !== "confirmed" && status !== "missing_admin" && status !== "missing_client" && Math.abs(difference) < 0.0001,
        };
      })
      .filter((row) => {
        if (reportStatusFilter === "all") return row.adminTotal > 0 || row.clientTotal > 0;
        if (reportStatusFilter === "pending") return row.status === "pending" || row.status === "difference" || row.status === "missing_admin" || row.status === "missing_client";
        return row.status === reportStatusFilter;
      })
      .sort((a, b) => {
        const projectCompare = (a.project || "Unlinked project").localeCompare(b.project || "Unlinked project");
        if (projectCompare !== 0) return projectCompare;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [entriesByKey, filteredAssignments, reportStatusFilter, reportWeek]);

  const weeklyReportSummary = useMemo(() => {
    const allRows = weeklyReportRows;
    return {
      adminHours: allRows.reduce((sum, row) => sum + row.adminTotal, 0),
      clientHours: allRows.reduce((sum, row) => sum + row.clientTotal, 0),
      pending: allRows.filter((row) => row.status === "pending").length,
      differences: allRows.filter((row) => row.status === "difference").length,
      confirmed: allRows.filter((row) => row.status === "confirmed").length,
      needsAttention: allRows.filter((row) => ["pending", "difference", "missing_admin", "missing_client"].includes(row.status)).length,
    };
  }, [weeklyReportRows]);

  const confirmReportRows = async (rows) => {
    if (!isAdmin) return;
    const ids = [...new Set(rows.filter((row) => row.canConfirm).flatMap((row) => row.clientEntryIds))];
    if (!ids.length) return;

    setConfirmingReportKey(rows.length === 1 ? rows[0].key : "visible");
    setFeedback({ error: "", success: "" });
    const reviewedAt = new Date().toISOString();
    const { error } = await supabase
      .from("hours_entries")
      .update({ admin_reviewed_at: reviewedAt })
      .in("id", ids);

    setConfirmingReportKey("");
    if (error) {
      setFeedback({ error: error.message || "Could not confirm hours.", success: "" });
      return;
    }

    setEntriesByKey((prev) => {
      const next = new Map(prev);
      next.forEach((entry, key) => {
        if (ids.includes(entry.id)) next.set(key, { ...entry, admin_reviewed_at: reviewedAt });
      });
      return next;
    });
    setFeedback({ error: "", success: `${ids.length} worker hour entries confirmed for ${formatWeekRange(reportWeek)}.` });
  };

  const updateLocalEntry = (assignment, workDate, value) => {
    setEntriesByKey((prev) => {
      const next = new Map(prev);
      const key = entryKey(assignment.id, workDate, source);
      const existing = next.get(key);

      if (value === "") {
        if (existing) next.set(key, { ...existing, regular_hours: "" });
        return next;
      }

      next.set(key, {
        ...(existing || {}),
        cts_job_candidate_id: assignment.id,
        cts_job_id: assignment.cts_job_id,
        worker_id: assignment.worker_id,
        work_date: workDate,
        week_start_date: toDateInputValue(startOfWeek(parseDate(workDate))),
        source,
        regular_hours: value,
      });
      return next;
    });
  };

  const saveWeek = async (weekStart) => {
    if (lockedWeeks.has(weekStart)) {
      setFeedback({ error: `Unlock ${formatWeekRange(weekStart)} before saving changes.`, success: "" });
      return;
    }

    setSavingWeek(weekStart);
    setFeedback({ error: "", success: "" });

    const days = Array.from({ length: 7 }, (_, index) => toDateInputValue(addDays(parseDate(weekStart), index)));
    const upsertRows = [];
    const deleteIds = [];

    filteredAssignments.forEach((assignment) => {
      days.forEach((day) => {
        const entry = entriesByKey.get(entryKey(assignment.id, day, source));
        if (!entry) return;
        if (entry.regular_hours === "" || entry.regular_hours == null) {
          if (entry.id) deleteIds.push(entry.id);
          return;
        }

        upsertRows.push({
          cts_job_candidate_id: assignment.id,
          cts_job_id: assignment.cts_job_id,
          worker_id: assignment.worker_id,
          work_date: day,
          week_start_date: weekStart,
          source,
          regular_hours: Number(entry.regular_hours || 0),
          ...(source === "client" ? { admin_reviewed_at: null } : {}),
        });
      });
    });

    if (deleteIds.length > 0) {
      const { error } = await supabase.from("hours_entries").delete().eq("source", source).in("id", deleteIds);
      if (error) {
        setFeedback({ error: error.message || "Could not delete cleared hours.", success: "" });
        setSavingWeek("");
        return;
      }
    }

    if (upsertRows.length > 0) {
      const { error } = await supabase
        .from("hours_entries")
        .upsert(upsertRows, { onConflict: "cts_job_candidate_id,work_date,source" });
      if (error) {
        setFeedback({ error: error.message || "Could not save hours.", success: "" });
        setSavingWeek("");
        return;
      }
    }

    setSavingWeek("");
    await load({ preserveFeedback: true });
    setFeedback({ error: "", success: `${SOURCE_LABEL[source]} hours saved for ${formatWeekRange(weekStart)}.` });
  };

  const toggleWeek = (week) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const toggleEntryWeek = (week) => {
    setClosedEntryWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const toggleReconciliationWeek = (week) => {
    setOpenReconciliationWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const toggleLockedWeek = (week) => {
    setLockedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      localStorage.setItem(`${LOCKED_WEEKS_STORAGE_KEY}_${source}`, JSON.stringify([...next]));
      return next;
    });
  };

  const renderTopBar = () => (isAdmin ? <UtsTopNavBar /> : <UtsClientTopBar />);

  return (
    <>
      <PageStyles />
      {renderTopBar()}
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)" }}>
        <div className="hours-shell">
          <div className="glass-card hero-card">
            <div className="hero-top">
              <div>
                <h1 className="hero-title">{isAdmin ? "Hours Tracker" : "CTS Hours Entry"}</h1>
                <p className="hero-subtitle">
                  {isAdmin
                    ? "Load worker-reported hours and compare them against the client weekly submission."
                    : "Submit weekly hours for sourced candidates assigned to CTS jobs."}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {!isAdmin ? (
                  <button className="btn" type="button" onClick={() => navigate("/client/cts-jobs")}>
                    <ArrowLeft size={16} />
                    Back to Jobs
                  </button>
                ) : null}
                <button className="btn" type="button" onClick={load}>
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ marginTop: 18 }} className="filters-row">
              <input
                className="input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search worker, phone digits, email or project..."
              />
              <select className="select" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                <option value="">All Projects</option>
                {distinctJobs.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>

            {isAdmin ? (
              <div className="summary-grid">
                <div className="metric-card">
                  <div className="metric-label">Total Hours</div>
                  <div className="metric-value">{formatHours(summary.totalHours)}</div>
                </div>
              </div>
            ) : null}
          </div>

          {feedback.error ? <div className="feedback-error">{feedback.error}</div> : null}
          {feedback.success ? <div className="feedback-success">{feedback.success}</div> : null}

          {isAdmin && !loading ? (
            <HoursReport
              weeks={weeks}
              selectedWeek={reportWeek}
              setSelectedWeek={setReportWeek}
              rows={weeklyReportRows}
              summary={weeklyReportSummary}
              statusFilter={reportStatusFilter}
              setStatusFilter={setReportStatusFilter}
              onConfirmRow={(row) => confirmReportRows([row])}
              onConfirmVisible={confirmReportRows}
              confirmingKey={confirmingReportKey}
            />
          ) : null}

          {loading ? (
            <div className="glass-card week-card empty-state">
              <Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
              Loading hours tracker...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="glass-card week-card empty-state">No assigned candidates found with the current filters.</div>
          ) : (
            weeks.map((week) => {
              const isOpen = openWeeks.has(week);
              const isEntryOpen = !closedEntryWeeks.has(week);
              const isReconciliationOpen = openReconciliationWeeks.has(week);
              const isLocked = lockedWeeks.has(week);
              const days = Array.from({ length: 7 }, (_, index) => toDateInputValue(addDays(parseDate(week), index)));
              const weekTotal = filteredAssignments.reduce(
                (sum, assignment) =>
                  sum +
                  days.reduce((daySum, day) => {
                    const value = entriesByKey.get(entryKey(assignment.id, day, source))?.regular_hours ?? "";
                    return daySum + Number(value || 0);
                  }, 0),
                0
              );

              return (
                <div className="glass-card week-card" key={week}>
                  <div className="week-top">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <button
                        className="icon-btn"
                        type="button"
                        onClick={() => toggleWeek(week)}
                        title={isOpen ? "Collapse week" : "Expand week"}
                        aria-label={isOpen ? "Collapse week" : "Expand week"}
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <CalendarDays size={20} />
                      <div>
                        <div style={{ fontWeight: 950, fontSize: 22 }}>Week of {formatWeekRange(week)}</div>
                        <div style={{ marginTop: 4, color: "#64748b", fontWeight: 800 }}>
                          {filteredAssignments.length} candidates · {formatHours(weekTotal)} {SOURCE_LABEL[source].toLowerCase()} hours
                        </div>
                      </div>
                    </div>

                    {isOpen ? (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn" type="button" onClick={() => toggleLockedWeek(week)}>
                          {isLocked ? <Clock3 size={16} /> : <Save size={16} />}
                          {isLocked ? "Unlock Week" : "Lock Week"}
                        </button>
                        <button className="btn dark" type="button" onClick={() => saveWeek(week)} disabled={savingWeek === week || isLocked}>
                          {savingWeek === week ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                          {isLocked ? "Locked" : "Save Week"}
                        </button>
                      </div>
                    ) : (
                      <span className="pill">
                        <Clock3 size={14} />
                        Collapsed
                      </span>
                    )}
                  </div>

                  {isOpen ? (
                    <>
                      <button
                        className="section-toggle"
                        type="button"
                        onClick={() => toggleEntryWeek(week)}
                        aria-expanded={isEntryOpen}
                      >
                        <span className="section-toggle-title">
                          <Briefcase size={18} />
                          {SOURCE_LABEL[source]} Hours Entry
                        </span>
                        {isEntryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {isEntryOpen ? (
                        <HoursTable
                          assignments={filteredAssignments}
                          days={days}
                          entriesByKey={entriesByKey}
                          source={source}
                          onChange={updateLocalEntry}
                          readOnly={isLocked}
                        />
                      ) : null}

                      {isAdmin ? (
                        <>
                          <button
                            className="section-toggle"
                            type="button"
                            onClick={() => toggleReconciliationWeek(week)}
                            aria-expanded={isReconciliationOpen}
                          >
                            <span className="section-toggle-title">
                              <Users size={18} />
                              Reconciliation
                            </span>
                            {isReconciliationOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {isReconciliationOpen ? (
                            <>
                              <p style={{ margin: "8px 0 0", color: "#64748b", fontWeight: 750 }}>
                                Green means admin and client match. Orange means missing or different hours.
                              </p>
                              <ReconciliationTable assignments={filteredAssignments} days={days} entriesByKey={entriesByKey} />
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
      <GoToTopButton />
    </>
  );
}

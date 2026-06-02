import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import UtsClientTopBar from "../components/UtsClientTopBar";
import GoToTopButton from "../components/GoToTopButton";
import { supabase } from "../lib/supabase";

const EMPTY_JOB_FORM = {
  qty: 1,
  level_type: "",
  city: "",
  state: "",
  start_text: "",
  details: "",
  language_requirement: "",
  bd_rep: "",
  client_name: "CTS",
  status: "open",
  priority: "normal",
};

const CANDIDATE_STATUS_OPTIONS = [
  "sourced",
  "contacted",
  "interested",
  "interviewed",
  "submitted",
  "placed",
  "rejected",
  "on_hold",
];

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

      .uts-topbar {
        position: sticky !important;
        top: 0 !important;
        z-index: 60 !important;
      }

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
        padding: 22px 24px;
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
        font-size: clamp(28px, 3.4vw, 40px);
        line-height: 1.08;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      .btn {
        border: none;
        border-radius: 14px;
        padding: 12px 16px;
        font-weight: 700;
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

      .dashboard-layout {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      .side-nav {
        display: grid;
        gap: 18px;
        padding: 20px;
        align-self: start;
        overflow: visible;
      }

      .side-section {
        display: grid;
        gap: 10px;
      }

      .side-section-title {
        font-size: 11px;
        color: #64748b;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .side-nav-btn {
        width: 100%;
        min-width: 0;
        border: 1px solid #dbeafe;
        border-radius: 14px;
        background: #ffffff;
        color: #0f172a;
        padding: 10px 12px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
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
        display: block;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 500;
      }

      .job-nav-btn .side-nav-label {
        font-size: 13px;
        line-height: 1.25;
        letter-spacing: -0.01em;
        font-weight: 700;
      }

      .side-nav-meta {
        display: block;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-top: 4px;
        color: #64748b;
        font-size: 11px;
        font-weight: 400;
      }

      .side-nav-btn.active .side-nav-meta { color: rgba(255,255,255,0.72); }

      .count-badge {
        min-width: 34px;
        justify-content: center;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 5px 10px;
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 11px;
        font-weight: 500;
        line-height: 1;
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
        font-size: clamp(22px, 2.4vw, 30px);
        font-weight: 700;
        letter-spacing: -0.025em;
      }

      .view-subtitle {
        margin: 8px 0 0 0;
        color: #64748b;
        font-size: 14px;
        line-height: 1.6;
      }

      .toolbar-row {
        margin-top: 18px;
        display: grid;
        grid-template-columns: minmax(220px, 1fr) minmax(180px, auto);
        gap: 12px;
        align-items: center;
      }

      .toolbar-row.with-filter {
        grid-template-columns: minmax(220px, 1fr) minmax(150px, 220px) minmax(140px, auto);
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

      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(15, 23, 42, 0.42);
        display: grid;
        place-items: center;
        padding: 20px;
      }

      .modal-card {
        width: min(760px, 100%);
        max-height: min(760px, calc(100vh - 40px));
        overflow: auto;
        background: #ffffff;
        border: 1px solid #dbeafe;
        border-radius: 24px;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
        padding: 22px;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .form-field {
        display: grid;
        gap: 6px;
      }

      .form-label {
        color: #64748b;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .candidate-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .add-candidate-modal {
        width: min(760px, 100%);
        height: min(720px, calc(100vh - 40px));
        max-height: min(720px, calc(100vh - 40px));
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .add-candidate-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 0 4px 4px 0;
      }

      .add-candidate-search {
        position: sticky;
        top: 0;
        z-index: 2;
        background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.98) 78%, rgba(255, 255, 255, 0) 100%);
        padding: 18px 0 14px;
      }

      .search-box {
        width: 100%;
        min-height: 56px;
        border: 1px solid #cbd5e1;
        border-radius: 18px;
        background: #ffffff;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 16px;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
      }

      .search-box svg {
        color: #64748b;
        flex: 0 0 auto;
      }

      .search-box input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: #0f172a;
        font-size: 15px;
      }

      .search-box input::placeholder {
        color: #94a3b8;
      }

      .worker-results {
        display: grid;
        gap: 10px;
      }

      .worker-result-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border: 1px solid #dbeafe;
        border-radius: 16px;
        background: #ffffff;
        padding: 12px 14px;
      }

      .worker-result-info {
        min-width: 0;
      }

      .worker-result-name {
        color: #0f172a;
        font-size: 14px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .worker-result-meta {
        color: #64748b;
        font-size: 12px;
        line-height: 1.45;
        margin-top: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mini-action-btn {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 12px;
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .mini-action-btn.danger {
        border-color: #fecaca;
        color: #b91c1c;
      }

      .table-scroll {
        width: 100%;
        overflow-x: auto;
        overflow-y: visible;
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
        padding: 15px 16px;
        text-align: left;
        border-bottom: 1px solid #eef2f7;
        vertical-align: middle;
      }

      th {
        background: #f8fbff;
        color: #334155;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }

      tbody tr {
        transition: background-color 0.16s ease;
      }

      tbody tr:nth-child(even) {
        background: #fbfdff;
      }

      tbody tr:hover {
        background: #f8fbff;
      }

      tr:last-child td { border-bottom: none; }

      .candidate-name {
        font-weight: 500;
        color: #0f172a;
        letter-spacing: -0.01em;
      }

      .candidate-contact {
        margin-top: 6px;
        display: grid;
        gap: 2px;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.35;
        font-weight: 400;
      }

      .profile-action-cell {
        text-align: center;
        vertical-align: middle;
      }

      .profile-action-btn {
        width: 38px;
        height: 38px;
        padding: 0;
        border-radius: 12px;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 500;
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1e3a8a;
        white-space: nowrap;
      }

      .status-pill.placed { border-color: #bbf7d0; background: #ecfdf3; color: #15803d; }
      .status-pill.sourced { border-color: #bfdbfe; background: #dbeafe; color: #1e40af; }
      .status-pill.other { border-color: #e2e8f0; background: #f8fafc; color: #475569; }

      .table-project-name {
        border: none;
        background: transparent;
        color: #1d4ed8;
        font-size: 13px;
        font-weight: 700;
        padding: 0;
        cursor: pointer;
        text-align: left;
      }

      .table-muted {
        color: #64748b;
        font-size: 13px;
        font-weight: 400;
      }

      .table-muted-xs {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 400;
      }

      .jobs-submenu {
        display: grid;
        gap: 8px;
        padding-left: 16px;
        border-left: 1px solid #dbeafe;
      }

      .accordion-symbol {
        display: inline-flex;
        width: 16px;
        justify-content: center;
        color: #64748b;
        font-weight: 500;
      }

      .side-nav-btn.active .accordion-symbol {
        color: rgba(255,255,255,0.78);
      }

      .job-detail-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .job-detail-toggle {
        border: 1px solid #dbeafe;
        border-radius: 14px;
        background: #ffffff;
        color: #0f172a;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .job-detail-grid {
        margin-top: 12px;
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
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .detail-value {
        margin-top: 6px;
        color: #475569;
        font-size: 13px;
        font-weight: 400;
      }

      .job-title-wrap {
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .job-title-wrap .view-title {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .job-detail-actions {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .icon-danger-btn {
        width: 38px;
        height: 38px;
        padding: 0;
        border: 1px solid #fecaca;
        border-radius: 12px;
        background: #fff5f5;
        color: #b91c1c;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: 0.18s ease;
      }

      .icon-danger-btn:hover:not(:disabled) {
        background: #fee2e2;
        transform: translateY(-1px);
      }

      .icon-danger-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .detail-box-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .detail-edit-btn {
        border: none;
        border-radius: 999px;
        background: #eff6ff;
        color: #1e3a8a;
        padding: 5px 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .detail-edit-btn:hover:not(:disabled) {
        background: #dbeafe;
      }

      .detail-edit-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 10px;
      }

      .detail-edit-control {
        margin-top: 8px;
        min-height: 38px;
        padding: 8px 10px;
        font-size: 13px;
        border-radius: 12px;
      }

      .detail-textarea {
        min-height: 92px;
        resize: vertical;
        line-height: 1.5;
      }

      .empty-state {
        margin-top: 18px;
        border: 1px dashed #bfdbfe;
        border-radius: 18px;
        background: #f8fbff;
        padding: 26px;
        color: #475569;
        text-align: center;
        font-weight: 700;
      }

      @media (max-width: 1024px) {
        .dashboard-layout { grid-template-columns: 1fr; }
        .side-nav { overflow: visible; }
        .job-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }

      @media (max-width: 640px) {
        .jobs-test-shell { width: min(100% - 28px, 1480px); padding: 14px 0; }
        .hero-card, .dashboard-card, .view-panel { padding: 18px; border-radius: 20px; }
        .toolbar-row, .toolbar-row.with-filter, .job-detail-grid, .form-grid { grid-template-columns: 1fr; }
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

function SearchToolbar({
  search,
  setSearch,
  resultCount,
  resultType = "candidates",
  showStatusFilter = false,
  statusFilter = "",
  setStatusFilter = () => {},
  statuses = [],
}) {
  return (
    <div className={`toolbar-row ${showStatusFilter ? "with-filter" : ""}`}>
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

      {showStatusFilter ? (
        <select
          className="select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter candidates by status"
        >
          <option value="">All Statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>
      ) : null}

      <div className="status-pill other">
        {resultCount} {resultType}
      </div>
    </div>
  );
}

function CandidateTable({ candidates, onOpenJob, mode = "admin", onCandidateChange, onCandidateSave, onCandidateDelete, savingIds = {}, deletingIds = {} }) {
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
            const canAdminEdit = mode === "admin";
            const canEditStatus = canAdminEdit || mode === "client";

            return (
              <tr key={candidate.id}>
                <td>
                  {canAdminEdit ? (
                    <input
                      className="input"
                      value={candidate.name_snapshot || ""}
                      onChange={(event) => onCandidateChange(candidate.id, "name_snapshot", event.target.value)}
                      onBlur={() => onCandidateSave(candidate, "name_snapshot")}
                      style={{ minHeight: 38, padding: "8px 10px" }}
                    />
                  ) : (
                    <div className="candidate-name">{candidateName}</div>
                  )}
                  <div className="candidate-contact">
                    {canAdminEdit ? (
                      <input
                        className="input"
                        value={candidate.phone_snapshot || ""}
                        onChange={(event) => onCandidateChange(candidate.id, "phone_snapshot", event.target.value)}
                        onBlur={() => onCandidateSave(candidate, "phone_snapshot")}
                        placeholder="No phone"
                        style={{ minHeight: 34, padding: "7px 9px", fontSize: 12 }}
                      />
                    ) : (
                      <span>{candidate.phone_snapshot || worker.phone || "No phone"}</span>
                    )}
                    {worker.email ? <span>{worker.email}</span> : null}
                  </div>
                </td>
                <td className="profile-action-cell">
                  {profileSlug ? (
                    <button
                      className="btn white profile-action-btn"
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
                    className="table-project-name"
                    type="button"
                    onClick={() => job.id && onOpenJob(job.id)}
                    disabled={!job.id}
                  >
                    {projectName}
                  </button>
                  {projectLocation ? (
                    <div className="table-muted-xs" style={{ marginTop: 5 }}>{projectLocation}</div>
                  ) : null}
                </td>
                <td>
                  {canEditStatus ? (
                    <select
                      className="select"
                      value={candidate.candidate_status || "sourced"}
                      onChange={(event) => {
                        onCandidateChange(candidate.id, "candidate_status", event.target.value);
                        onCandidateSave({ ...candidate, candidate_status: event.target.value }, "candidate_status");
                      }}
                      disabled={!!savingIds[`${candidate.id}:candidate_status`]}
                      style={{ minHeight: 38, padding: "8px 10px", fontSize: 12 }}
                    >
                      {CANDIDATE_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{formatStatus(status)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`status-pill ${getCandidateStatusClass(candidate.candidate_status)}`}>
                      {formatStatus(candidate.candidate_status)}
                    </span>
                  )}
                </td>
                <td className="table-muted-xs">
                  <div>{formatDateTime(candidate.updated_at || candidate.created_at)}</div>
                  {canAdminEdit ? (
                    <button
                      className="mini-action-btn danger"
                      type="button"
                      onClick={() => onCandidateDelete(candidate)}
                      disabled={!!deletingIds[candidate.id]}
                      style={{ marginTop: 8 }}
                    >
                      <Trash2 size={13} />
                      {deletingIds[candidate.id] ? "Deleting..." : "Delete"}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JobsTable({ jobs, candidateCounts, onOpenJob }) {
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
              <td className="table-muted">{job.qty ?? "—"}</td>
              <td>
                <button
                  className="table-project-name"
                  type="button"
                  onClick={() => onOpenJob(job.id)}
                >
                  {job.level_type || "Untitled job"}
                </button>
                {job.job_code ? (
                  <div className="table-muted-xs" style={{ marginTop: 5 }}>Code: {job.job_code}</div>
                ) : null}
              </td>
              <td className="table-muted-xs">{job.city || "—"}</td>
              <td className="table-muted-xs">{job.state || "—"}</td>
              <td className="table-muted">{job.start_text || formatDateOnly(job.order_date)}</td>
              <td className="table-muted">{job.bd_rep || "—"}</td>
              <td><span className="status-pill other">{formatStatus(job.status || "open")}</span></td>
              <td className="table-muted">{candidateCounts[job.id] || 0}</td>
              <td className="table-muted">{formatDateTime(job.updated_at || job.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function AddCandidateModal({ open, workers, onAddCandidate, onClose, adding }) {
  const [workerSearch, setWorkerSearch] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const filteredWorkers = useMemo(() => {
    const query = normalizeText(workerSearch);
    if (!query) return workers.slice(0, 40);

    return workers
      .filter((worker) => normalizeText([worker.name, worker.phone, worker.email].filter(Boolean).join(" ")).includes(query))
      .slice(0, 40);
  }, [workerSearch, workers]);

  const submit = async (workerId) => {
    if (!workerId || adding) return;
    const added = await onAddCandidate(workerId);
    if (!added) return;
    setWorkerSearch("");
    onClose();
  };

  const handleEscape = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (workerSearch) {
      setWorkerSearch("");
      return;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-candidate-title"
      onMouseDown={onClose}
      onKeyDown={handleEscape}
      tabIndex={-1}
    >
      <div className="modal-card add-candidate-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="view-header">
          <div>
            <h2 className="view-title" id="add-candidate-title">Add Candidate</h2>
            <p className="view-subtitle">Search registered workers by name or phone.</p>
          </div>
          <button className="mini-action-btn" type="button" onClick={onClose} disabled={adding}><X size={14} />Close</button>
        </div>

        <div className="add-candidate-scroll">
          <div className="add-candidate-search">
            <div className="search-box">
              <Search size={16} />
              <input
                value={workerSearch}
                onChange={(event) => setWorkerSearch(event.target.value)}
                placeholder="Search worker by name or phone..."
                autoFocus
              />
            </div>
          </div>

          <div className="worker-results" aria-live="polite">
            {filteredWorkers.length ? filteredWorkers.map((worker) => (
              <div className="worker-result-row" key={worker.id}>
                <div className="worker-result-info">
                  <div className="worker-result-name">{worker.name || worker.email || worker.phone || "Unnamed worker"}</div>
                  <div className="worker-result-meta">
                    {worker.phone || "No phone"}{worker.email ? ` · ${worker.email}` : ""}
                  </div>
                </div>
                <button className="mini-action-btn" type="button" onClick={() => submit(worker.id)} disabled={adding}>
                  <Plus size={13} />
                  {adding ? "Adding..." : "Add"}
                </button>
              </div>
            )) : (
              <div className="empty-state" style={{ marginTop: 14 }}>
                No available workers match your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobFormModal({ open, form, setForm, onClose, onSave, saving }) {
  if (!open) return null;
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="view-header">
          <div>
            <h2 className="view-title">New CTS Job</h2>
            <p className="view-subtitle">Create a new CTS project/order.</p>
          </div>
          <button className="mini-action-btn" type="button" onClick={onClose}><X size={14} />Close</button>
        </div>
        <div className="form-grid" style={{ marginTop: 18 }}>
          <div className="form-field"><label className="form-label">Level / Type</label><input className="input" value={form.level_type} onChange={(e) => update("level_type", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">Qty</label><input className="input" type="number" min="0" value={form.qty} onChange={(e) => update("qty", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">City</label><input className="input" value={form.city} onChange={(e) => update("city", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">State</label><input className="input" value={form.state} onChange={(e) => update("state", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">Start</label><input className="input" value={form.start_text} onChange={(e) => update("start_text", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">BD Rep</label><input className="input" value={form.bd_rep} onChange={(e) => update("bd_rep", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">Language</label><input className="input" value={form.language_requirement} onChange={(e) => update("language_requirement", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">Priority</label><select className="select" value={form.priority} onChange={(e) => update("priority", e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}><label className="form-label">Details</label><textarea className="input" value={form.details} onChange={(e) => update("details", e.target.value)} style={{ minHeight: 90, resize: "vertical" }} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button className="mini-action-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="btn dark" type="button" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Create Job"}</button>
        </div>
      </div>
    </div>
  );
}

function EditableJobDetailField({
  label,
  field,
  value,
  displayValue,
  editable = true,
  type = "text",
  options = [],
  editingField,
  setEditingField,
  onSave,
  saving = false,
}) {
  const isEditing = editingField === field;
  const [draftValue, setDraftValue] = useState(value ?? "");

  const openEditor = () => {
    if (isEditing) {
      setEditingField("");
      return;
    }
    setDraftValue(value ?? "");
    setEditingField(field);
  };

  const save = () => {
    void onSave(field, draftValue);
  };

  return (
    <div className="detail-box">
      <div className="detail-box-header">
        <div className="detail-label">{label}</div>
        {editable ? (
          <button
            className="detail-edit-btn"
            type="button"
            onClick={openEditor}
            disabled={saving}
          >
            <Pencil size={11} />
            {isEditing ? "Editing" : "Edit"}
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <>
          {type === "select" ? (
            <select
              className="select detail-edit-control"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              disabled={saving}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea
              className="input detail-edit-control detail-textarea"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              disabled={saving}
            />
          ) : (
            <input
              className="input detail-edit-control"
              type={type}
              min={type === "number" ? "0" : undefined}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              disabled={saving}
            />
          )}
          <div className="detail-edit-actions">
            <button className="mini-action-btn" type="button" onClick={() => setEditingField("")} disabled={saving}>Cancel</button>
            <button className="mini-action-btn" type="button" onClick={save} disabled={saving}>
              <Check size={13} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      ) : (
        <div className="detail-value">{displayValue ?? value ?? "—"}</div>
      )}
    </div>
  );
}

function JobDetailView({
  job,
  candidates,
  onOpenJob,
  searchToolbar,
  mode = "admin",
  onAddCandidateClick,
  addingCandidate,
  onCandidateChange,
  onCandidateSave,
  onCandidateDelete,
  savingIds,
  deletingIds,
  onJobSaveField,
  savingJobFields = {},
  onJobDelete,
  deletingJob = false,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingJobField, setEditingJobField] = useState("");
  const isAdmin = mode === "admin";

  if (!job) {
    return <div className="empty-state">Select a CTS job from the left navigation.</div>;
  }

  const saveJobField = async (field, value) => {
    const saved = await onJobSaveField(job, field, value);
    if (saved) setEditingJobField("");
  };

  const commonFieldProps = {
    editable: isAdmin,
    editingField: editingJobField,
    setEditingField: setEditingJobField,
    onSave: saveJobField,
  };

  return (
    <>
      <div className="job-detail-header">
        <div className="job-title-wrap">
          <h2 className="view-title">{job.level_type || "Untitled job"}</h2>
          {isAdmin ? (
            <button
              className="icon-danger-btn"
              type="button"
              onClick={() => onJobDelete(job)}
              disabled={deletingJob}
              title="Delete CTS job"
              aria-label="Delete CTS job"
            >
              <Trash2 size={17} />
            </button>
          ) : null}
        </div>
        <div className="job-detail-actions">
          <button
            className="job-detail-toggle"
            type="button"
            onClick={() => setDetailsOpen((prev) => !prev)}
            aria-expanded={detailsOpen}
          >
            <span className="accordion-symbol">{detailsOpen ? "−" : "+"}</span>
            Job Details
          </button>
        </div>
      </div>

      {detailsOpen ? (
        <>
          <div className="job-detail-grid">
            <EditableJobDetailField
              label="Level / Type"
              field="level_type"
              value={job.level_type || ""}
              displayValue={job.level_type || "Untitled job"}
              saving={!!savingJobFields.level_type}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="Qty"
              field="qty"
              value={job.qty ?? 0}
              displayValue={job.qty ?? "—"}
              type="number"
              saving={!!savingJobFields.qty}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="Status"
              field="status"
              value={job.status || "open"}
              displayValue={formatStatus(job.status || "open")}
              type="select"
              options={["open", "filled", "closed", "on_hold", "cancelled"].map((status) => ({ value: status, label: formatStatus(status) }))}
              saving={!!savingJobFields.status}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="Priority"
              field="priority"
              value={job.priority || "normal"}
              displayValue={formatStatus(job.priority || "normal")}
              type="select"
              options={["low", "normal", "high", "urgent"].map((priority) => ({ value: priority, label: formatStatus(priority) }))}
              saving={!!savingJobFields.priority}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="City"
              field="city"
              value={job.city || ""}
              displayValue={job.city || "—"}
              saving={!!savingJobFields.city}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="State"
              field="state"
              value={job.state || ""}
              displayValue={job.state || "—"}
              saving={!!savingJobFields.state}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="Start"
              field="start_text"
              value={job.start_text || ""}
              displayValue={job.start_text || formatDateOnly(job.order_date)}
              saving={!!savingJobFields.start_text}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="BD Rep"
              field="bd_rep"
              value={job.bd_rep || ""}
              displayValue={job.bd_rep || "—"}
              saving={!!savingJobFields.bd_rep}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="Language"
              field="language_requirement"
              value={job.language_requirement || ""}
              displayValue={job.language_requirement || "—"}
              saving={!!savingJobFields.language_requirement}
              {...commonFieldProps}
            />
            <EditableJobDetailField
              label="Last Modified"
              field="updated_at"
              value={formatDateTime(job.updated_at || job.created_at)}
              displayValue={formatDateTime(job.updated_at || job.created_at)}
              editable={false}
              editingField={editingJobField}
              setEditingField={setEditingJobField}
              onSave={saveJobField}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <EditableJobDetailField
              label="Details"
              field="details"
              value={job.details || ""}
              displayValue={job.details || "—"}
              type="textarea"
              saving={!!savingJobFields.details}
              {...commonFieldProps}
            />
          </div>
        </>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Candidates for this job ({candidates.length})</h3>
          {mode === "admin" ? (
            <button className="mini-action-btn" type="button" onClick={onAddCandidateClick} disabled={addingCandidate}>
              <Plus size={13} />
              Add Candidate
            </button>
          ) : null}
        </div>
        {searchToolbar}
        <CandidateTable
          candidates={candidates}
          onOpenJob={onOpenJob}
          mode={mode}
          onCandidateChange={onCandidateChange}
          onCandidateSave={onCandidateSave}
          onCandidateDelete={onCandidateDelete}
          savingIds={savingIds}
          deletingIds={deletingIds}
        />
      </div>

    </>
  );
}

export default function JobsPageTest({ mode = "admin" }) {
  const [jobs, setJobs] = useState([]);
  const [jobCandidates, setJobCandidates] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [search, setSearch] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("");
  const [activeView, setActiveView] = useState({ type: "candidate", status: "placed" });
  const [jobsListOpen, setJobsListOpen] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobForm, setJobForm] = useState(EMPTY_JOB_FORM);
  const [savingJob, setSavingJob] = useState(false);
  const [savingJobFields, setSavingJobFields] = useState({});
  const [deletingJobIds, setDeletingJobIds] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [deletingIds, setDeletingIds] = useState({});
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });

    const [jobsRes, candidatesRes, workersRes] = await Promise.all([
      supabase.from("cts_jobs").select("*").order("updated_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("cts_job_candidates").select("*").order("updated_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("workers").select("id, name, phone, email, public_profile_slug").order("name", { ascending: true }),
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
    setWorkers(workersRes.data || []);
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

  const touchJobModifiedAt = async (jobId) => {
    if (!jobId) return null;
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from("cts_jobs").update({ updated_at: nowIso }).eq("id", jobId);
    return error || null;
  };

  const syncWorkerStatusFromPlacement = async (workerId) => {
    if (!workerId) return null;

    const { data: placedRows, error: placedError } = await supabase
      .from("cts_job_candidates")
      .select("id")
      .eq("worker_id", workerId)
      .eq("candidate_status", "placed")
      .limit(1);

    if (placedError) return placedError;

    const desiredStatus = placedRows?.length ? "working" : "completed";
    const { error } = await supabase
      .from("workers")
      .update({ status: desiredStatus, status_updated_at: new Date().toISOString() })
      .eq("id", workerId);

    return error || null;
  };

  const saveNewJob = async () => {
    if (mode !== "admin") return;
    if (!jobForm.level_type.trim()) {
      setFeedback({ error: "Level / Type is required.", success: "" });
      return;
    }

    setSavingJob(true);
    setFeedback({ error: "", success: "" });
    const payload = {
      qty: Number(jobForm.qty || 0),
      level_type: jobForm.level_type.trim(),
      city: jobForm.city.trim() || null,
      state: jobForm.state.trim() || null,
      start_text: jobForm.start_text.trim() || null,
      details: jobForm.details.trim() || null,
      language_requirement: jobForm.language_requirement.trim() || null,
      bd_rep: jobForm.bd_rep.trim() || null,
      client_name: jobForm.client_name.trim() || "CTS",
      status: jobForm.status || "open",
      priority: jobForm.priority || "normal",
    };

    const { error } = await supabase.from("cts_jobs").insert(payload);
    setSavingJob(false);
    if (error) {
      setFeedback({ error: error.message || "Could not create CTS job.", success: "" });
      return;
    }

    setJobForm(EMPTY_JOB_FORM);
    setJobModalOpen(false);
    setFeedback({ error: "", success: "CTS job created." });
    await load({ preserveFeedback: true });
  };

  const saveJobField = async (job, field, rawValue) => {
    if (mode !== "admin" || !job?.id) return false;

    const editableFields = new Set([
      "qty",
      "level_type",
      "city",
      "state",
      "start_text",
      "details",
      "language_requirement",
      "bd_rep",
      "status",
      "priority",
    ]);
    if (!editableFields.has(field)) return false;

    let value = rawValue;
    if (typeof value === "string") value = value.trim();

    if (field === "level_type" && !value) {
      setFeedback({ error: "Level / Type is required.", success: "" });
      return false;
    }

    if (field === "qty") {
      value = Number(value || 0);
      if (Number.isNaN(value) || value < 0) {
        setFeedback({ error: "Qty must be a valid number.", success: "" });
        return false;
      }
    }

    const savingKey = `${job.id}:${field}`;
    setSavingJobFields((prev) => ({ ...prev, [savingKey]: true, [field]: true }));
    setFeedback({ error: "", success: "" });

    const updatedAt = new Date().toISOString();
    const payload = {
      [field]: value === "" ? null : value,
      updated_at: updatedAt,
    };

    const { error } = await supabase.from("cts_jobs").update(payload).eq("id", job.id);
    setSavingJobFields((prev) => ({ ...prev, [savingKey]: false, [field]: false }));
    if (error) {
      setFeedback({ error: error.message || "Could not update CTS job.", success: "" });
      return false;
    }

    setJobs((prev) => prev.map((item) => (
      item.id === job.id ? { ...item, ...payload } : item
    )));
    setJobCandidates((prev) => prev.map((candidate) => (
      candidate.cts_job_id === job.id && candidate.job
        ? { ...candidate, job: { ...candidate.job, ...payload } }
        : candidate
    )));
    setFeedback({ error: "", success: "CTS job updated." });
    return true;
  };

  const deleteJob = async (job) => {
    if (mode !== "admin" || !job?.id) return;
    const confirmed = window.confirm(
      `Delete "${job.level_type || "Untitled job"}"? This will remove the project and any assigned candidates. This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingJobIds((prev) => ({ ...prev, [job.id]: true }));
    setFeedback({ error: "", success: "" });
    const { error } = await supabase.from("cts_jobs").delete().eq("id", job.id);
    setDeletingJobIds((prev) => ({ ...prev, [job.id]: false }));
    if (error) {
      setFeedback({ error: error.message || "Could not delete CTS job.", success: "" });
      return;
    }

    setActiveView({ type: "jobs" });
    setFeedback({ error: "", success: "CTS job deleted." });
    await load({ preserveFeedback: true });
  };

  const updateCandidateField = (candidateId, field, value) => {
    setJobCandidates((prev) => prev.map((candidate) => (
      candidate.id === candidateId ? { ...candidate, [field]: value } : candidate
    )));
  };

  const saveCandidateField = async (row, field) => {
    if (!row?.id) return;
    if (mode === "client" && field !== "candidate_status") return;
    const savingKey = `${row.id}:${field}`;
    setSavingIds((prev) => ({ ...prev, [savingKey]: true }));
    setFeedback({ error: "", success: "" });

    let value = row[field];
    if (typeof value === "string") value = value.trim();
    const payload = { [field]: value === "" ? null : value };

    if (field === "candidate_status") {
      payload.submitted_at = value === "submitted" && !row.submitted_at ? new Date().toISOString() : row.submitted_at || null;
      payload.placed_at = value === "placed" && !row.placed_at ? new Date().toISOString() : row.placed_at || null;
    }

    if (field === "name_snapshot" && !payload[field]) {
      setSavingIds((prev) => ({ ...prev, [savingKey]: false }));
      setFeedback({ error: "Candidate name cannot be empty.", success: "" });
      return;
    }

    const { error } = await supabase.from("cts_job_candidates").update(payload).eq("id", row.id);
    setSavingIds((prev) => ({ ...prev, [savingKey]: false }));
    if (error) {
      setFeedback({ error: error.message || "Could not save candidate.", success: "" });
      return;
    }

    if (field === "candidate_status") {
      const syncError = await syncWorkerStatusFromPlacement(row.worker_id);
      if (syncError) {
        setFeedback({ error: syncError.message || "Status saved, but worker status could not be synced.", success: "" });
        await load({ preserveFeedback: true });
        return;
      }
    }

    const touchError = await touchJobModifiedAt(row.cts_job_id);
    if (touchError) {
      setFeedback({ error: touchError.message || "Candidate saved, but job modified date could not update.", success: "" });
      await load({ preserveFeedback: true });
      return;
    }

    setFeedback({ error: "", success: "Candidate updated." });
    await load({ preserveFeedback: true });
  };

  const addCandidateToJob = async (workerId, candidateStatus = "sourced") => {
    if (mode !== "admin" || activeView.type !== "job" || !activeView.jobId) return false;
    const worker = workers.find((item) => item.id === workerId);
    if (!worker) return false;

    setAddingCandidate(true);
    setFeedback({ error: "", success: "" });
    const payload = {
      cts_job_id: activeView.jobId,
      worker_id: worker.id,
      name_snapshot: worker.name || worker.email || worker.phone || "Unnamed worker",
      phone_snapshot: worker.phone || null,
      candidate_status: candidateStatus || "sourced",
      sort_order: jobCandidates.filter((candidate) => candidate.cts_job_id === activeView.jobId).length + 1,
      submitted_at: candidateStatus === "submitted" ? new Date().toISOString() : null,
      placed_at: candidateStatus === "placed" ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("cts_job_candidates").insert(payload);
    setAddingCandidate(false);
    if (error) {
      setFeedback({ error: error.message || "Could not add candidate.", success: "" });
      return false;
    }

    if (candidateStatus === "placed") {
      const syncError = await syncWorkerStatusFromPlacement(worker.id);
      if (syncError) {
        setFeedback({ error: syncError.message || "Candidate added, but worker status could not be synced.", success: "" });
        await load({ preserveFeedback: true });
        return false;
      }
    }

    await touchJobModifiedAt(activeView.jobId);
    setFeedback({ error: "", success: "Candidate added." });
    await load({ preserveFeedback: true });
    return true;
  };

  const deleteCandidate = async (candidate) => {
    if (mode !== "admin") return;
    const confirmed = window.confirm(`Remove "${candidate.name_snapshot || "candidate"}" from this CTS job?`);
    if (!confirmed) return;

    setDeletingIds((prev) => ({ ...prev, [candidate.id]: true }));
    setFeedback({ error: "", success: "" });
    const { error } = await supabase.from("cts_job_candidates").delete().eq("id", candidate.id);
    setDeletingIds((prev) => ({ ...prev, [candidate.id]: false }));
    if (error) {
      setFeedback({ error: error.message || "Could not delete candidate.", success: "" });
      return;
    }

    await syncWorkerStatusFromPlacement(candidate.worker_id);
    await touchJobModifiedAt(candidate.cts_job_id);
    setFeedback({ error: "", success: "Candidate removed." });
    await load({ preserveFeedback: true });
  };

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
      if (activeView.type === "candidate" && activeView.status === "all" && candidateStatusFilter) {
        const status = String(candidate.candidate_status || "sourced").toLowerCase();
        if (status !== candidateStatusFilter) return false;
      }

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
  }, [activeView, candidateStatusFilter, search, sortedCandidates]);

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

  const availableWorkersForJob = useMemo(() => {
    if (activeView.type !== "job") return workers;
    const assignedIds = new Set(jobCandidates.filter((candidate) => candidate.cts_job_id === activeView.jobId).map((candidate) => candidate.worker_id));
    return workers.filter((worker) => !assignedIds.has(worker.id));
  }, [activeView, jobCandidates, workers]);

  const summary = useMemo(() => {
    const placed = jobCandidates.filter((candidate) => String(candidate.candidate_status || "sourced").toLowerCase() === "placed").length;
    return { totalJobs: jobs.length, totalCandidates: jobCandidates.length, placed };
  }, [jobCandidates, jobs.length]);

  const distinctCandidateStatuses = useMemo(
    () => [...new Set(jobCandidates.map((candidate) => String(candidate.candidate_status || "sourced").toLowerCase()))].sort(),
    [jobCandidates]
  );

  const activeTitle = useMemo(() => {
    if (activeView.type === "candidate") {
      if (activeView.status === "placed") return "Placed Candidates";
      return "All Candidates";
    }
    if (activeView.type === "jobs") return "CTS Jobs List";
    return selectedJob?.level_type || "CTS Job Detail";
  }, [activeView, selectedJob]);

  const activeSubtitle = useMemo(() => {
    if (activeView.type === "candidate") return "Candidates are ordered by Status priority, then Last Modified from newest to oldest.";
    if (activeView.type === "jobs") return "Select any project from the left navigation or open its full detail page.";
    return "";
  }, [activeView.type]);

  const openJobView = (jobId) => setActiveView({ type: "job", jobId });
  const isClientMode = mode === "client";

  return (
    <>
      <PageStyles />
      {isClientMode ? <UtsClientTopBar /> : <UtsTopNavBar />}
      <main className="jobs-test-shell">
        <section className="glass-card hero-card">
          <div className="hero-top">
            <h1 className="hero-title">CTS Jobs Dashboard</h1>
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
                { key: "placed", label: "Placed", count: summary.placed },
                { key: "all", label: "All", count: summary.totalCandidates },
              ].map((item) => {
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
                className={`side-nav-btn job-nav-btn ${activeView.type === "jobs" ? "active" : ""}`}
                onClick={() => {
                  setJobsListOpen((prev) => !prev);
                  setActiveView({ type: "jobs" });
                }}
                aria-expanded={jobsListOpen}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }}>
                  <span className="accordion-symbol">{jobsListOpen ? "−" : "+"}</span>
                  <span className="side-nav-label">All ({summary.totalJobs})</span>
                </span>
              </button>

              {jobsListOpen ? (
                <div className="jobs-submenu">
                  {jobs.map((job) => {
                    const active = activeView.type === "job" && activeView.jobId === job.id;
                    return (
                      <button
                        key={job.id}
                        type="button"
                        className={`side-nav-btn job-nav-btn ${active ? "active" : ""}`}
                        onClick={() => openJobView(job.id)}
                        title={job.level_type || "Untitled job"}
                      >
                        <span style={{ minWidth: 0, overflow: "hidden" }}>
                          <span className="side-nav-label">{job.level_type || "Untitled job"}</span>
                          <span className="side-nav-meta">{[job.city, job.state].filter(Boolean).join(", ") || "No location"}</span>
                        </span>
                        <span className="count-badge">{candidateCounts[job.id] || 0}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </aside>

          <section className="glass-card view-panel">
            {activeView.type !== "job" ? (
              <>
                <div className="view-header">
                  <div>
                    <h2 className="view-title">{activeTitle}</h2>
                    {activeSubtitle ? <p className="view-subtitle">{activeSubtitle}</p> : null}
                  </div>
                  {mode === "admin" && activeView.type === "jobs" ? (
                    <button className="btn dark" type="button" onClick={() => setJobModalOpen(true)}>
                      <Plus size={15} />
                      New Project
                    </button>
                  ) : null}
                </div>

                <SearchToolbar
                  search={search}
                  setSearch={setSearch}
                  resultCount={loading ? "Loading..." : activeView.type === "jobs" ? viewJobs.length : viewCandidates.length}
                  resultType={loading ? "" : "results"}
                  showStatusFilter={activeView.type === "candidate" && activeView.status === "all"}
                  statusFilter={candidateStatusFilter}
                  setStatusFilter={setCandidateStatusFilter}
                  statuses={distinctCandidateStatuses}
                />
              </>
            ) : null}

            {loading ? (
              <div className="empty-state">
                <Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
                Loading CTS dashboard...
              </div>
            ) : activeView.type === "jobs" ? (
              <JobsTable jobs={viewJobs} candidateCounts={candidateCounts} onOpenJob={openJobView} />
            ) : activeView.type === "job" ? (
              <JobDetailView
                key={selectedJob?.id || "job-detail"}
                job={selectedJob}
                candidates={viewCandidates}
                onOpenJob={openJobView}
                mode={mode}
                onAddCandidateClick={() => setCandidateModalOpen(true)}
                addingCandidate={addingCandidate}
                onCandidateChange={updateCandidateField}
                onCandidateSave={saveCandidateField}
                onCandidateDelete={deleteCandidate}
                savingIds={savingIds}
                deletingIds={deletingIds}
                onJobSaveField={saveJobField}
                savingJobFields={savingJobFields}
                onJobDelete={deleteJob}
                deletingJob={!!deletingJobIds[selectedJob?.id]}
                searchToolbar={(
                  <SearchToolbar
                    search={search}
                    setSearch={setSearch}
                    resultCount={viewCandidates.length}
                    resultType="results"
                  />
                )}
              />
            ) : (
              <CandidateTable
                candidates={viewCandidates}
                onOpenJob={openJobView}
                mode={mode}
                onCandidateChange={updateCandidateField}
                onCandidateSave={saveCandidateField}
                onCandidateDelete={deleteCandidate}
                savingIds={savingIds}
                deletingIds={deletingIds}
              />
            )}
          </section>
        </section>
      </main>
      <JobFormModal
        open={jobModalOpen && mode === "admin"}
        form={jobForm}
        setForm={setJobForm}
        onClose={() => setJobModalOpen(false)}
        onSave={saveNewJob}
        saving={savingJob}
      />
      <AddCandidateModal
        open={candidateModalOpen && mode === "admin" && activeView.type === "job"}
        workers={availableWorkersForJob}
        onAddCandidate={addCandidateToJob}
        onClose={() => setCandidateModalOpen(false)}
        adding={addingCandidate}
      />
      <GoToTopButton />
    </>
  );
}

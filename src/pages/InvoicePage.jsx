import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Pencil, Printer, RefreshCw, Search, Trash2 } from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

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

      .invoice-builder-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .invoice-collapse-btn {
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        background: #ffffff;
        color: #0f172a;
        padding: 8px 11px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: 0.18s ease;
      }

      .invoice-collapse-btn:hover {
        border-color: #93c5fd;
        background: #eff6ff;
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

      .project-picker {
        display: grid;
        gap: 10px;
      }

      .project-picker-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .project-toggle {
        border: 0;
        background: transparent;
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        padding: 4px 0;
      }

      .project-checklist {
        display: grid;
        gap: 8px;
        max-height: 320px;
        overflow-y: auto;
        padding: 4px 2px 4px 0;
      }

      .project-check-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        border: 1px solid #dbeafe;
        border-radius: 16px;
        background: #ffffff;
        padding: 11px 12px;
        cursor: pointer;
        transition: 0.18s ease;
      }

      .project-check-row:hover {
        border-color: #93c5fd;
        background: #f8fbff;
        transform: translateY(-1px);
      }

      .project-check-row.selected {
        border-color: #2563eb;
        background: #eff6ff;
      }

      .project-checkbox {
        width: 18px;
        height: 18px;
        accent-color: #1d4ed8;
      }

      .project-check-main {
        min-width: 0;
        display: grid;
        gap: 3px;
      }

      .project-check-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #0f172a;
        font-size: 13px;
        font-weight: 800;
      }

      .project-check-meta {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #64748b;
        font-size: 12px;
      }

      .project-check-stats {
        display: grid;
        justify-items: end;
        gap: 3px;
        color: #64748b;
        font-size: 11px;
        white-space: nowrap;
      }

      .project-check-badge {
        border-radius: 999px;
        background: #dbeafe;
        color: #1e40af;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 800;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
      }

      .summary-box.total-summary-box {
        grid-column: 1 / -1;
      }

      .summary-box {
        min-width: 0;
        border: 1px solid #dbeafe;
        background: #f8fbff;
        border-radius: 18px;
        padding: 12px;
        overflow: hidden;
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
        font-size: clamp(17px, 1.8vw, 21px);
        font-weight: 800;
        letter-spacing: -0.03em;
        overflow-wrap: anywhere;
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

      .invoice-title-meta {
        margin-top: 10px;
        display: grid;
        gap: 3px;
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

      .bill-box.align-right {
        justify-items: end;
        text-align: right;
      }

      .from-info {
        display: grid;
        gap: 3px;
      }

      .invoice-info-list {
        margin-top: 8px;
        display: grid;
        gap: 4px;
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
        overflow-x: visible;
      }

      .invoice-table {
        width: 100%;
        min-width: 0;
        table-layout: fixed;
        border-collapse: collapse;
      }

      .invoice-table th,
      .invoice-table td {
        padding: 11px 10px;
        border-bottom: 1px solid #eef2f7;
        text-align: left;
        vertical-align: middle;
        overflow-wrap: anywhere;
      }

      .invoice-table th {
        background: #f8fbff;
        color: #334155;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .invoice-table th:nth-child(1),
      .invoice-table td:nth-child(1) { width: 6%; }
      .invoice-table th:nth-child(2),
      .invoice-table td:nth-child(2) { width: 15%; }
      .invoice-table th:nth-child(3),
      .invoice-table td:nth-child(3) { width: 19%; }
      .invoice-table th:nth-child(4),
      .invoice-table td:nth-child(4) { width: 28%; }
      .invoice-table th:nth-child(5),
      .invoice-table td:nth-child(5) { width: 8%; }
      .invoice-table th:nth-child(6),
      .invoice-table td:nth-child(6) { width: 11%; }
      .invoice-table th:nth-child(7),
      .invoice-table td:nth-child(7) { width: 13%; }

      .line-primary {
        color: #0f172a;
        font-size: 13px;
        font-weight: 750;
      }

      .line-secondary {
        margin-top: 3px;
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.35;
      }

      .print-service-name,
      .print-rate-value {
        display: none;
      }

      .invoice-logo {
        width: 108px;
        height: auto;
        object-fit: contain;
      }

      .rate-input,
      .service-select {
        min-height: 38px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        background: #ffffff;
        color: #0f172a;
        padding: 8px 10px;
        outline: none;
        font-size: 13px;
      }

      .rate-input {
        width: min(82px, 100%);
        text-align: right;
      }

      .service-select {
        width: 100%;
        font-weight: 700;
      }

      .invoice-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: start center;
        padding: 78px 18px 24px;
        background: rgba(15, 23, 42, 0.48);
        backdrop-filter: blur(6px);
      }

      .invoice-modal {
        width: min(420px, 100%);
        border: 1px solid #dbeafe;
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 26px 70px rgba(15, 23, 42, 0.24);
        padding: 22px;
        display: grid;
        gap: 16px;
      }

      .invoice-modal-head {
        display: grid;
        gap: 7px;
      }

      .invoice-modal-title {
        margin: 0;
        color: #0f172a;
        font-size: 20px;
        font-weight: 850;
        letter-spacing: -0.03em;
      }

      .invoice-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
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

      .feedback.success {
        border: 1px solid #bbf7d0;
        background: #f0fdf4;
        color: #15803d;
      }

      .invoice-dashboard {
        display: grid;
        gap: 14px;
      }

      .invoice-dashboard-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
      }

      .invoice-dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
      }

      .invoice-history-card {
        border: 1px solid #dbeafe;
        border-radius: 18px;
        background: #ffffff;
        padding: 14px;
        display: grid;
        gap: 10px;
        cursor: pointer;
        transition: 0.18s ease;
      }

      .invoice-history-card:hover {
        border-color: #93c5fd;
        background: #f8fbff;
        transform: translateY(-1px);
        box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
      }

      .invoice-history-card.selected {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
      }

      .invoice-history-top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .status-badge {
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 11px;
        font-weight: 850;
        text-transform: capitalize;
      }

      .status-badge.finalized { background: #e0f2fe; color: #0369a1; }
      .status-badge.printed { background: #ede9fe; color: #6d28d9; }
      .status-badge.sent { background: #fef3c7; color: #b45309; }
      .status-badge.paid { background: #dcfce7; color: #15803d; }

      .invoice-history-actions {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
      }

      .mini-btn {
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        background: #ffffff;
        color: #0f172a;
        padding: 6px 9px;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }

      .icon-btn {
        width: 34px;
        height: 34px;
        padding: 0;
      }

      .mini-btn:hover {
        border-color: #93c5fd;
        background: #eff6ff;
      }

      .mini-btn.danger {
        border-color: #fecaca;
        color: #b91c1c;
      }

      .mini-btn.danger:hover {
        border-color: #fca5a5;
        background: #fef2f2;
      }

      .mini-btn.paid-action {
        border-color: #0f172a;
        background: #0f172a;
        color: #ffffff;
      }

      .invoice-bottom-actions {
        justify-content: flex-end;
        padding: 16px 24px 24px;
        border-top: 1px solid #eef2f7;
      }

      .row-action-btn {
        margin-top: 6px;
        border: 1px solid #bbf7d0;
        border-radius: 999px;
        background: #f0fdf4;
        color: #15803d;
        padding: 5px 8px;
        font-size: 10px;
        font-weight: 850;
        cursor: pointer;
      }

      @media (max-width: 1024px) {
        .invoice-grid { grid-template-columns: 1fr; }
        .invoice-doc-meta { text-align: left; }
      }

      @media (max-width: 760px) {
        .invoice-shell { width: min(100% - 28px, 1480px); padding: 14px 0 28px; }
        .invoice-card { padding: 18px; border-radius: 22px; }
        .invoice-hero { display: grid; }
        .invoice-actions { width: 100%; display: grid; grid-template-columns: 1fr; }
        .invoice-actions .invoice-btn { width: 100%; }
        .invoice-date-grid, .invoice-bill-grid, .summary-grid { grid-template-columns: 1fr; }
        .invoice-dashboard-head { display: grid; }
        .invoice-dashboard-head .invoice-btn { width: 100%; }
        .invoice-dashboard-grid { grid-template-columns: 1fr; }
        .invoice-history-top { align-items: flex-start; }
        .invoice-history-actions { justify-content: flex-start; }
        .invoice-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .invoice-table { min-width: 720px; }
        .total-box { min-width: 0; width: 100%; }
      }

      @media print {
        @page { size: Letter; margin: 0.35in; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body { background: #ffffff !important; overflow: visible !important; }
        .uts-topbar, .invoice-hero, .invoice-controls, .invoice-actions, .invoice-dashboard, .rate-input, .service-select, .row-action-btn, .invoice-modal-backdrop, .go-to-top-button { display: none !important; }
        .print-service-name, .print-rate-value { display: inline !important; }
        .invoice-shell { width: 100%; max-width: none; padding: 0; gap: 0; }
        .invoice-grid { display: block; }
        .invoice-preview { display: block; }
        .invoice-preview .empty-state { display: none !important; }
        .invoice-card { box-shadow: none; border: none; padding: 0; background: #ffffff; }
        .invoice-document { border: none; border-radius: 0; overflow: visible; }
        .invoice-doc-header { padding: 0 0 12px; }
        .invoice-doc-title { font-size: 25px; }
        .invoice-doc-meta { font-size: 10px; gap: 3px; }
        .invoice-logo { width: 88px; }
        .invoice-bill-grid { padding: 11px 0; gap: 12px; }
        .bill-main { font-size: 13px; }
        .bill-heading { font-size: 9px; }
        .invoice-muted { font-size: 9.5px; line-height: 1.3; }
        .invoice-table-wrap { overflow: visible; }
        .invoice-table { min-width: 0; width: 100%; table-layout: fixed; font-size: 9px; }
        .invoice-table th, .invoice-table td { padding: 5px 4px; overflow-wrap: anywhere; }
        .invoice-table th { font-size: 8px; letter-spacing: 0.035em; }
        .invoice-table tr { break-inside: avoid; page-break-inside: avoid; }
        .line-primary { font-size: 9px; }
        .line-secondary { font-size: 8px; line-height: 1.25; }
        .invoice-total-panel { padding: 10px 0 0; }
        .total-box { min-width: 230px; gap: 5px; }
        .total-row { font-size: 10px; }
        .total-row.grand { font-size: 15px; }
      }
    `}</style>
  );
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function formatInvoiceNumber(date = new Date()) {
  const value = toDateInputValue(date).replace(/-/g, "");
  return `INV-${value.slice(2)}`;
}

function getInvoiceNumberRoot(invoiceNumber) {
  const match = String(invoiceNumber || "").match(/^(INV-\d{6})/i);
  return match ? match[1].toUpperCase() : String(invoiceNumber || "").trim();
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
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

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-US", {
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

const DEFAULT_PRODUCT_SERVICES = [
  { id: "hourly-fee", name: "Hourly Fee", rate: 1 },
  { id: "placement-fee", name: "Placement Fee", rate: 0 },
];


function loadStoredProductServices() {
  if (typeof window === "undefined") return DEFAULT_PRODUCT_SERVICES;
  try {
    const parsed = JSON.parse(window.localStorage.getItem("uts_invoice_product_services") || "[]");
    const customServices = Array.isArray(parsed)
      ? parsed.filter((service) => service?.id && service?.name)
      : [];
    return [...DEFAULT_PRODUCT_SERVICES, ...customServices.filter((service) => !DEFAULT_PRODUCT_SERVICES.some((item) => item.id === service.id))];
  } catch {
    return DEFAULT_PRODUCT_SERVICES;
  }
}

function saveStoredProductServices(services) {
  if (typeof window === "undefined") return;
  const customServices = services.filter((service) => !DEFAULT_PRODUCT_SERVICES.some((item) => item.id === service.id));
  window.localStorage.setItem("uts_invoice_product_services", JSON.stringify(customServices));
}

function slugifyId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "client";
}

function loadStoredInvoiceClients() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem("uts_invoice_clients") || "[]");
    return Array.isArray(parsed) ? parsed.filter((client) => client?.id && client?.name) : [];
  } catch {
    return [];
  }
}

function saveStoredInvoiceClients(clients) {
  if (typeof window === "undefined") return;
  const customClients = clients.filter((client) => String(client.id || "").startsWith("custom-"));
  window.localStorage.setItem("uts_invoice_clients", JSON.stringify(customClients));
}

export default function InvoicePage() {
  const today = new Date();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [hoursEntries, setHoursEntries] = useState([]);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [loadedInvoiceRows, setLoadedInvoiceRows] = useState(null);
  const [invoiceReadOnly, setInvoiceReadOnly] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [selectedProjectIds, setSelectedProjectIds] = useState(null);
  const [dateFrom, setDateFrom] = useState(toDateInputValue(startOfMonth(today)));
  const [dateTo, setDateTo] = useState(toDateInputValue(endOfMonth(today)));
  const [invoiceDate, setInvoiceDate] = useState(toDateInputValue(today));
  const [invoiceNumber, setInvoiceNumber] = useState(() => formatInvoiceNumber(today));
  const [dueDate, setDueDate] = useState(toDateInputValue(addDays(today, 7)));
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("Thank you for your business.");
  const [builderOpen, setBuilderOpen] = useState(true);
  const [productServices, setProductServices] = useState(loadStoredProductServices);
  const [invoiceClients, setInvoiceClients] = useState(loadStoredInvoiceClients);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [lineServiceIds, setLineServiceIds] = useState({});
  const [lineRates, setLineRates] = useState({});
  const [serviceModal, setServiceModal] = useState({ open: false, rowKey: "", name: "", rate: "0" });
  const [clientModal, setClientModal] = useState({ open: false, name: "", address: "", phone: "", email: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });

    const reviewStart = toDateInputValue(startOfWeek(new Date(`${dateFrom}T00:00:00`)));
    const [jobsRes, candidatesRes, workersRes, hoursRes, reviewsRes, invoicesRes] = await Promise.all([
      supabase.from("cts_jobs").select("*").order("created_at", { ascending: false }),
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
      supabase
        .from("invoices")
        .select("*, invoice_line_items(*)")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (jobsRes.error || candidatesRes.error || workersRes.error || hoursRes.error || reviewsRes.error || invoicesRes.error) {
      setFeedback({
        error:
          jobsRes.error?.message ||
          candidatesRes.error?.message ||
          workersRes.error?.message ||
          hoursRes.error?.message ||
          reviewsRes.error?.message ||
          invoicesRes.error?.message ||
          "Could not load invoice data.",
        success: "",
      });
      setJobs([]);
      setCandidates([]);
      setWorkers([]);
      setHoursEntries([]);
      setWeeklyReviews([]);
      setInvoices([]);
      setLoading(false);
      return;
    }

    setJobs(jobsRes.data || []);
    setCandidates(candidatesRes.data || []);
    setWorkers(workersRes.data || []);
    setHoursEntries(hoursRes.data || []);
    setWeeklyReviews(reviewsRes.data || []);
    setInvoices(invoicesRes.data || []);
    setLoading(false);
  }, [dateFrom, dateTo, setCandidates, setFeedback, setHoursEntries, setInvoices, setJobs, setLoading, setWeeklyReviews, setWorkers]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const workersById = useMemo(() => new Map(workers.map((worker) => [worker.id, worker])), [workers]);
  const candidatesById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const approvedReviewKeys = useMemo(() => new Set(weeklyReviews.map((review) => `${review.cts_job_candidate_id}|${review.week_start_date}`)), [weeklyReviews]);

  const projectOptions = useMemo(() => {
    const placedCandidates = candidates.filter((candidate) => String(candidate.candidate_status || "").toLowerCase() === "placed");
    const countsByJobId = new Map();
    placedCandidates.forEach((candidate) => {
      if (!candidate.cts_job_id) return;
      countsByJobId.set(candidate.cts_job_id, (countsByJobId.get(candidate.cts_job_id) || 0) + 1);
    });

    const approvedHoursByJobId = new Map();
    hoursEntries.forEach((entry) => {
      if (entry.source !== "admin") return;
      if (!approvedReviewKeys.has(`${entry.cts_job_candidate_id}|${entry.week_start_date}`)) return;
      const candidate = candidatesById.get(entry.cts_job_candidate_id);
      const jobId = entry.cts_job_id || candidate?.cts_job_id;
      if (!jobId) return;
      approvedHoursByJobId.set(jobId, (approvedHoursByJobId.get(jobId) || 0) + Number(entry.regular_hours || 0));
    });

    return jobs
      .filter((job) => countsByJobId.has(job.id))
      .map((job) => ({
        ...job,
        placedCount: countsByJobId.get(job.id) || 0,
        approvedHours: approvedHoursByJobId.get(job.id) || 0,
        projectName: job.level_type || "Untitled project",
        projectLocation: [job.city, job.state].filter(Boolean).join(", "),
      }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [approvedReviewKeys, candidates, candidatesById, hoursEntries, jobs]);

  const effectiveSelectedProjectIds = selectedProjectIds ?? projectOptions.map((project) => project.id);
  const selectedProjectIdSet = useMemo(() => new Set(effectiveSelectedProjectIds), [effectiveSelectedProjectIds]);
  const selectedProjects = useMemo(
    () => projectOptions.filter((project) => selectedProjectIdSet.has(project.id)),
    [projectOptions, selectedProjectIdSet]
  );
  const projectClientOptions = useMemo(() => {
    const seen = new Set();
    return selectedProjects.reduce((clients, project) => {
      const name = (project.client_name || "CTS").trim() || "CTS";
      const id = `project-${slugifyId(name)}`;
      if (seen.has(id)) return clients;
      seen.add(id);
      clients.push({ id, name, address: "", phone: "", email: "" });
      return clients;
    }, []);
  }, [selectedProjects]);
  const clientOptions = useMemo(() => {
    const customIds = new Set(invoiceClients.map((client) => client.id));
    return [
      ...invoiceClients,
      ...projectClientOptions.filter((client) => !customIds.has(client.id)),
    ];
  }, [invoiceClients, projectClientOptions]);
  const effectiveSelectedClientId = selectedClientId ?? clientOptions[0]?.id ?? "";
  const selectedClient = clientOptions.find((client) => client.id === effectiveSelectedClientId) || null;
  const selectedClientName = selectedClient?.name || "Select or add a client";
  const selectedProjectLabel = !projectOptions.length
    ? "No active projects"
    : selectedProjects.length === projectOptions.length
      ? "All active projects"
      : `${selectedProjects.length} selected project${selectedProjects.length === 1 ? "" : "s"}`;

  const toggleProjectSelection = (projectId) => {
    setSelectedProjectIds((prev) => {
      const current = prev ?? projectOptions.map((project) => project.id);
      return current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId];
    });
  };

  const selectAllProjects = () => {
    setSelectedProjectIds(projectOptions.map((project) => project.id));
  };

  const clearProjectSelection = () => {
    setSelectedProjectIds([]);
  };

  const handleClientChange = (value) => {
    if (value === "__new__") {
      setClientModal({ open: true, name: "", address: "", phone: "", email: "" });
      return;
    }
    setSelectedClientId(value);
  };

  const closeClientModal = () => {
    setClientModal({ open: false, name: "", address: "", phone: "", email: "" });
  };

  const createInvoiceClient = () => {
    const name = clientModal.name.trim();
    if (!name) {
      setFeedback({ error: "Client name is required.", success: "" });
      return;
    }

    const newClient = {
      id: `custom-${Date.now()}`,
      name,
      address: clientModal.address.trim(),
      phone: clientModal.phone.trim(),
      email: clientModal.email.trim(),
    };
    const nextClients = [...invoiceClients, newClient];
    setInvoiceClients(nextClients);
    saveStoredInvoiceClients(nextClients);
    setSelectedClientId(newClient.id);
    setFeedback({ error: "", success: "" });
    closeClientModal();
  };

  const servicesById = useMemo(() => new Map(productServices.map((service) => [service.id, service])), [productServices]);

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
      if (String(candidate.candidate_status || "").toLowerCase() !== "placed") return;
      const job = jobsById.get(entry.cts_job_id || candidate.cts_job_id);
      if (!job) return;
      if (!selectedProjectIdSet.has(job.id)) return;
      const clientName = (job.client_name || "CTS").trim() || "CTS";
      const isCtsClient = clientName.toLowerCase() === "cts";

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
        lineType: "hours",
        workerId: entry.worker_id || candidate.worker_id || null,
        hours: 0,
        qty: 0,
        firstDate: entry.work_date,
        lastDate: entry.work_date,
        serviceName: DEFAULT_PRODUCT_SERVICES[0].name,
        defaultServiceId: DEFAULT_PRODUCT_SERVICES[0].id,
        defaultRate: isCtsClient ? 1 : (parseRate(candidate.bill_rate_snapshot || candidate.rate_snapshot) || DEFAULT_PRODUCT_SERVICES[0].rate),
      };

      existing.hours += hours;
      existing.qty += hours;
      if (entry.work_date < existing.firstDate) existing.firstDate = entry.work_date;
      if (entry.work_date > existing.lastDate) existing.lastDate = entry.work_date;
      grouped.set(key, existing);
    });

    candidates.forEach((candidate) => {
      if (String(candidate.candidate_status || "").toLowerCase() !== "placed") return;
      if (candidate.placement_fee_paid) return;
      const job = jobsById.get(candidate.cts_job_id);
      if (!job || !selectedProjectIdSet.has(job.id)) return;

      const worker = workersById.get(candidate.worker_id) || {};
      const candidateName = candidate.name_snapshot || worker.name || "Unnamed worker";
      const projectName = job.level_type || "Untitled project";
      const projectLocation = [job.city, job.state].filter(Boolean).join(", ");
      const searchable = [candidateName, projectName, projectLocation, worker.email, worker.phone, job.job_code, "Placement Fee"]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (query && !searchable.includes(query)) return;

      const placementClientName = (job.client_name || "CTS").trim() || "CTS";
      const placementRate = placementClientName.toLowerCase() === "cts"
        ? 50
        : (parseRate(candidate.placement_fee_amount) || parseRate(job.placement_fee_amount) || 0);
      grouped.set(`placement-${candidate.id}|${job.id}`, {
        key: `placement-${candidate.id}|${job.id}`,
        lineType: "placement_fee",
        candidateId: candidate.id,
        jobId: job.id,
        workerId: candidate.worker_id || null,
        candidateName,
        workerEmail: worker.email || "",
        workerPhone: candidate.phone_snapshot || worker.phone || "",
        projectName,
        projectLocation,
        jobCode: job.job_code || "",
        clientName: (job.client_name || "CTS").trim() || "CTS",
        hours: 0,
        qty: 1,
        firstDate: dateFrom,
        lastDate: dateTo,
        serviceName: "Placement Fee",
        defaultServiceId: "placement-fee",
        defaultRate: placementRate,
      });
    });

    return [...grouped.values()].sort((a, b) => {
      const lineTypeCompare = (a.lineType === "placement_fee" ? 0 : 1) - (b.lineType === "placement_fee" ? 0 : 1);
      if (lineTypeCompare !== 0) return lineTypeCompare;
      const projectCompare = a.projectName.localeCompare(b.projectName);
      if (projectCompare !== 0) return projectCompare;
      return a.candidateName.localeCompare(b.candidateName);
    });
  }, [approvedReviewKeys, candidates, candidatesById, dateFrom, dateTo, hoursEntries, jobsById, search, selectedProjectIdSet, workersById]);

  const rowsWithTotals = useMemo(
    () => invoiceRows.map((row) => {
      const serviceId = lineServiceIds[row.key] || row.defaultServiceId || DEFAULT_PRODUCT_SERVICES[0].id;
      const service = servicesById.get(serviceId) || servicesById.get(row.defaultServiceId) || DEFAULT_PRODUCT_SERVICES[0];
      const rate = Number(lineRates[row.key] ?? row.defaultRate ?? service.rate ?? 0);
      return {
        ...row,
        serviceId,
        serviceName: service.name,
        rate,
        amount: Number(row.qty ?? row.hours ?? 0) * rate,
      };
    }),
    [invoiceRows, lineRates, lineServiceIds, servicesById]
  );



  const activeRowsWithTotals = useMemo(
    () => (loadedInvoiceRows || rowsWithTotals).map((row) => {
      const serviceId = lineServiceIds[row.key] || row.serviceId || row.defaultServiceId || DEFAULT_PRODUCT_SERVICES[0].id;
      const service = servicesById.get(serviceId) || servicesById.get(row.defaultServiceId) || { id: serviceId, name: row.serviceName, rate: row.rate || 0 };
      const rate = Number(lineRates[row.key] ?? row.rate ?? row.defaultRate ?? service.rate ?? 0);
      const qty = Number(row.qty ?? row.hours ?? 0);
      return {
        ...row,
        serviceId,
        serviceName: service.name,
        rate,
        qty,
        amount: qty * rate,
      };
    }),
    [lineRates, lineServiceIds, loadedInvoiceRows, rowsWithTotals, servicesById]
  );

  const summary = useMemo(() => {
    const totalHours = activeRowsWithTotals.reduce((total, row) => total + (row.lineType === "hours" ? row.hours : 0), 0);
    const totalPlacements = activeRowsWithTotals.reduce((total, row) => total + (row.lineType === "placement_fee" ? Number(row.qty || 0) : 0), 0);
    const subtotal = activeRowsWithTotals.reduce((total, row) => total + row.amount, 0);
    return {
      totalHours,
      totalPlacements,
      subtotal,
      total: subtotal,
      lineCount: activeRowsWithTotals.length,
    };
  }, [activeRowsWithTotals]);

  const refreshData = async () => {
    await load();
  };

  const handleServiceChange = (rowKey, value) => {
    if (value === "__new__") {
      setServiceModal({ open: true, rowKey, name: "", rate: "0" });
      return;
    }

    const selectedService = servicesById.get(value);
    setLineServiceIds((prev) => ({ ...prev, [rowKey]: value }));
    if (selectedService) {
      setLineRates((prev) => ({ ...prev, [rowKey]: selectedService.rate ?? 0 }));
    }
  };

  const closeServiceModal = () => {
    setServiceModal({ open: false, rowKey: "", name: "", rate: "0" });
  };

  const createProductService = () => {
    const name = serviceModal.name.trim();
    if (!name) {
      setFeedback({ error: "Product or service name is required.", success: "" });
      return;
    }

    const rate = parseRate(serviceModal.rate);
    const newService = {
      id: `custom-${Date.now()}`,
      name,
      rate: Number.isFinite(rate) ? rate : 0,
    };
    const nextServices = [...productServices, newService];
    setProductServices(nextServices);
    saveStoredProductServices(nextServices);
    setLineServiceIds((prev) => ({ ...prev, [serviceModal.rowKey]: newService.id }));
    setLineRates((prev) => ({ ...prev, [serviceModal.rowKey]: newService.rate }));
    setFeedback({ error: "", success: "" });
    closeServiceModal();
  };



  const buildInvoicePayload = (status, resolvedInvoiceNumber = invoiceNumber) => ({
    invoice_number: resolvedInvoiceNumber || formatInvoiceNumber(today),
    status,
    client_name: selectedClientName,
    client_address: selectedClient?.address || "",
    client_phone: selectedClient?.phone || "",
    client_email: selectedClient?.email || "",
    date_from: dateFrom,
    date_to: dateTo,
    invoice_date: invoiceDate || toDateInputValue(today),
    due_date: dueDate || null,
    notes,
    subtotal: Number(summary.subtotal.toFixed(2)),
    total: Number(summary.total.toFixed(2)),
  });

  const getUniqueInvoiceNumber = async (preferredInvoiceNumber, excludeInvoiceId = null) => {
    const preferred = String(preferredInvoiceNumber || formatInvoiceNumber(today)).trim() || formatInvoiceNumber(today);
    let query = supabase
      .from("invoices")
      .select("id, invoice_number")
      .ilike("invoice_number", `${getInvoiceNumberRoot(preferred)}%`);

    if (excludeInvoiceId) query = query.neq("id", excludeInvoiceId);

    const { data, error } = await query;
    if (error) throw error;

    const existingNumbers = new Set((data || []).map((invoice) => String(invoice.invoice_number || "").toUpperCase()));
    if (!existingNumbers.has(preferred.toUpperCase())) return preferred;

    const root = getInvoiceNumberRoot(preferred) || preferred;
    for (let index = 1; index <= 99; index += 1) {
      const candidate = `${root}${String(index).padStart(2, "0")}`;
      if (!existingNumbers.has(candidate.toUpperCase())) return candidate;
    }

    return `${root}${Date.now()}`;
  };

  const buildLineItemPayload = (invoiceId) => activeRowsWithTotals.map((row) => ({
    invoice_id: invoiceId,
    line_type: row.lineType || "hours",
    cts_job_candidate_id: row.candidateId || null,
    cts_job_id: row.jobId || null,
    worker_id: row.workerId || null,
    product_service_name: row.serviceName,
    worker_name: row.candidateName,
    project_name: row.projectName,
    details: [row.projectLocation, row.firstDate && row.lastDate ? `${formatDate(row.firstDate)} – ${formatDate(row.lastDate)}` : "", row.jobCode ? `Code: ${row.jobCode}` : ""].filter(Boolean).join(" · "),
    qty: Number((row.qty ?? row.hours ?? 0).toFixed(2)),
    rate: Number(row.rate.toFixed(2)),
    amount: Number(row.amount.toFixed(2)),
  }));

  const saveInvoice = async (status = "finalized", options = {}) => {
    if (!activeRowsWithTotals.length) {
      setFeedback({ error: "No invoice lines to save.", success: "" });
      return null;
    }

    setSavingInvoice(true);
    setFeedback({ error: "", success: "" });

    let invoiceId = currentInvoiceId;
    let resolvedInvoiceNumber = invoiceNumber || formatInvoiceNumber(today);

    if (!invoiceId) {
      try {
        resolvedInvoiceNumber = await getUniqueInvoiceNumber(resolvedInvoiceNumber);
        setInvoiceNumber(resolvedInvoiceNumber);
      } catch (error) {
        setSavingInvoice(false);
        setFeedback({ error: error.message || "Could not validate invoice number.", success: "" });
        return null;
      }
    }

    const payload = buildInvoicePayload(status, resolvedInvoiceNumber);

    if (invoiceId) {
      const { error } = await supabase.from("invoices").update(payload).eq("id", invoiceId);
      if (error) {
        setSavingInvoice(false);
        setFeedback({ error: error.message, success: "" });
        return null;
      }
      await supabase.from("invoice_line_items").delete().eq("invoice_id", invoiceId);
    } else {
      const { data, error } = await supabase.from("invoices").insert(payload).select("id").single();
      if (error) {
        setSavingInvoice(false);
        setFeedback({ error: error.message, success: "" });
        return null;
      }
      invoiceId = data.id;
      setCurrentInvoiceId(invoiceId);
    }

    const lineItems = buildLineItemPayload(invoiceId);
    const { error: lineError } = await supabase.from("invoice_line_items").insert(lineItems);
    if (lineError) {
      setSavingInvoice(false);
      setFeedback({ error: lineError.message, success: "" });
      return null;
    }

    setSavingInvoice(false);
    setFeedback({ error: "", success: `Invoice ${payload.invoice_number} saved as ${status}.` });
    if (!options.skipReload) await load();
    return invoiceId;
  };

  const updateInvoiceStatus = async (invoiceId, status, options = {}) => {
    setSavingInvoice(true);
    setFeedback({ error: "", success: "" });
    const { error } = await supabase.from("invoices").update({ status }).eq("id", invoiceId);
    setSavingInvoice(false);
    if (error) {
      setFeedback({ error: error.message, success: "" });
      return false;
    }
    if (invoiceId === currentInvoiceId && status === "paid") {
      setCurrentInvoiceId(invoiceId);
    }
    setFeedback({ error: "", success: `Invoice marked as ${status}.` });
    if (!options.skipReload) await load();
    return true;
  };



  const mapInvoiceLineToRow = (line) => ({
    key: `saved-${line.id}`,
    lineType: line.line_type || "hours",
    candidateId: line.cts_job_candidate_id || null,
    jobId: line.cts_job_id || null,
    workerId: line.worker_id || null,
    candidateName: line.worker_name || "Unnamed worker",
    workerEmail: "",
    workerPhone: "",
    projectName: line.project_name || "Untitled project",
    projectLocation: "",
    jobCode: "",
    clientName: selectedClientName,
    hours: line.line_type === "hours" ? Number(line.qty || 0) : 0,
    qty: Number(line.qty || 0),
    firstDate: dateFrom,
    lastDate: dateTo,
    serviceName: line.product_service_name || DEFAULT_PRODUCT_SERVICES[0].name,
    serviceId: productServices.find((service) => service.name === line.product_service_name)?.id || DEFAULT_PRODUCT_SERVICES[0].id,
    defaultServiceId: productServices.find((service) => service.name === line.product_service_name)?.id || DEFAULT_PRODUCT_SERVICES[0].id,
    defaultRate: Number(line.rate || 0),
    rate: Number(line.rate || 0),
    amount: Number(line.amount || 0),
    savedLineId: line.id,
  });

  const loadInvoiceIntoView = (invoice, readOnly = true) => {
    setCurrentInvoiceId(invoice.id);
    setInvoiceReadOnly(readOnly);
    setInvoiceNumber(invoice.invoice_number || "");
    setInvoiceDate(invoice.invoice_date || toDateInputValue(today));
    setDateFrom(invoice.date_from || dateFrom);
    setDateTo(invoice.date_to || dateTo);
    setDueDate(invoice.due_date || dueDate);
    setNotes(invoice.notes || "");
    const clientId = `saved-${invoice.id}`;
    const savedClient = {
      id: clientId,
      name: invoice.client_name || "Saved client",
      address: invoice.client_address || "",
      phone: invoice.client_phone || "",
      email: invoice.client_email || "",
    };
    setInvoiceClients((prev) => prev.some((client) => client.id === clientId) ? prev : [savedClient, ...prev]);
    setSelectedClientId(clientId);
    const mappedRows = (invoice.invoice_line_items || []).map(mapInvoiceLineToRow).sort((a, b) => {
      const lineTypeCompare = (a.lineType === "placement_fee" ? 0 : 1) - (b.lineType === "placement_fee" ? 0 : 1);
      if (lineTypeCompare !== 0) return lineTypeCompare;
      const projectCompare = a.projectName.localeCompare(b.projectName);
      if (projectCompare !== 0) return projectCompare;
      return a.candidateName.localeCompare(b.candidateName);
    });
    setLoadedInvoiceRows(mappedRows);
    setLineRates(Object.fromEntries(mappedRows.map((row) => [row.key, row.rate])));
    setLineServiceIds(Object.fromEntries(mappedRows.map((row) => [row.key, row.serviceId])));
    setBuilderOpen(false);
    setFeedback({ error: "", success: readOnly ? `Loaded ${invoice.invoice_number} in read-only view.` : `Loaded ${invoice.invoice_number} for editing.` });
  };

  const reloadInvoiceIntoView = async (invoiceId, readOnly = true) => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, invoice_line_items(*)")
      .eq("id", invoiceId)
      .single();
    if (error) {
      setFeedback({ error: error.message, success: "" });
      return null;
    }
    loadInvoiceIntoView(data, readOnly);
    return data;
  };

  const finalizeInvoice = async () => {
    const invoiceId = await saveInvoice("finalized");
    if (!invoiceId) return;
    await reloadInvoiceIntoView(invoiceId, true);
    setFeedback({ error: "", success: "Invoice finalized and loaded in read-only view." });
  };

  const markInvoicePaid = async (invoiceId = currentInvoiceId) => {
    if (!invoiceId) return;
    const ok = await updateInvoiceStatus(invoiceId, "paid", { skipReload: true });
    if (!ok) return;
    await load();
    await reloadInvoiceIntoView(invoiceId, true);
    setFeedback({ error: "", success: "Invoice marked as paid." });
  };

  const startNewInvoice = async () => {
    const nextInvoiceDate = new Date();
    const nextInvoiceDateInput = toDateInputValue(nextInvoiceDate);
    const nextDueDateInput = toDateInputValue(addDays(nextInvoiceDate, 7));
    const preferredInvoiceNumber = formatInvoiceNumber(nextInvoiceDate);

    setSavingInvoice(true);
    setFeedback({ error: "", success: "" });
    let nextInvoiceNumber = preferredInvoiceNumber;
    try {
      nextInvoiceNumber = await getUniqueInvoiceNumber(preferredInvoiceNumber);
    } catch (error) {
      setSavingInvoice(false);
      setFeedback({ error: error.message || "Could not generate a unique invoice number.", success: "" });
      return;
    }

    setCurrentInvoiceId(null);
    setLoadedInvoiceRows(null);
    setInvoiceReadOnly(false);
    setLineRates({});
    setLineServiceIds({});
    setDateFrom(nextInvoiceDateInput);
    setDateTo(nextInvoiceDateInput);
    setInvoiceDate(nextInvoiceDateInput);
    setInvoiceNumber(nextInvoiceNumber);
    setDueDate(nextDueDateInput);
    setBuilderOpen(true);
    setSavingInvoice(false);
    setFeedback({ error: "", success: `Started a new invoice draft (${nextInvoiceNumber}).` });
  };

  const deleteInvoice = async (invoiceId) => {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    setSavingInvoice(true);
    const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
    setSavingInvoice(false);
    if (error) {
      setFeedback({ error: error.message, success: "" });
      return;
    }
    if (currentInvoiceId === invoiceId) startNewInvoice();
    setFeedback({ error: "", success: "Invoice deleted." });
    await load();
  };

  const markPlacementFeePaid = async (row) => {
    if (!row.candidateId) return;
    const { error } = await supabase
      .from("cts_job_candidates")
      .update({
        placement_fee_paid: true,
        placement_fee_paid_at: new Date().toISOString(),
        placement_fee_billed_at: new Date().toISOString(),
        placement_fee_invoice_number: invoiceNumber || null,
        placement_fee_invoice_id: currentInvoiceId || null,
      })
      .eq("id", row.candidateId);
    if (error) {
      setFeedback({ error: error.message, success: "" });
      return;
    }
    setFeedback({ error: "", success: `Placement Fee marked paid for ${row.candidateName}.` });
    setLoadedInvoiceRows((prev) => prev ? prev.filter((item) => item.key !== row.key) : prev);
    await load();
  };

  const printInvoice = () => {
    setTimeout(() => window.print(), 150);
  };

  const exportCsv = () => {
    const headers = ["Invoice", "Client", "Date From", "Date To", "Item #", "Product or Service", "Name", "Details", "Qty", "Rate", "Amount"];
    const rows = activeRowsWithTotals.map((row, index) => [
      invoiceNumber,
      selectedClientName,
      dateFrom,
      dateTo,
      index + 1,
      row.serviceName,
      row.candidateName,
      [row.projectName, row.projectLocation].filter(Boolean).join(" · "),
      formatHours(row.qty ?? row.hours),
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
              Generate one invoice from confirmed HoursTracker weeks. Select one or more active projects to load every placed worker and their approved hours, ordered by project.
            </p>
          </div>
          <div className="invoice-actions">
            <button className="invoice-btn" type="button" onClick={refreshData} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="invoice-btn" type="button" onClick={startNewInvoice} disabled={savingInvoice}>
              New Invoice
            </button>
            <button className="invoice-btn" type="button" onClick={finalizeInvoice} disabled={!activeRowsWithTotals.length || loading || savingInvoice || invoiceReadOnly}>
              {savingInvoice ? <Loader2 className="spin" size={15} /> : <FileText size={15} />} Finalize
            </button>
            <button className="invoice-btn" type="button" onClick={exportCsv} disabled={!activeRowsWithTotals.length || loading}>
              <Download size={15} /> Export CSV
            </button>
            <button className="invoice-btn" type="button" onClick={printInvoice} disabled={!activeRowsWithTotals.length || loading || savingInvoice}>
              <Printer size={15} /> Print Invoice
            </button>
          </div>
        </section>

        {feedback.error ? <div className="feedback error">{feedback.error}</div> : null}
        {feedback.success ? <div className="feedback success">{feedback.success}</div> : null}

        <section className="invoice-card invoice-dashboard">
          <div className="invoice-dashboard-head">
            <div>
              <h2 className="invoice-panel-title">Invoice Dashboard</h2>
              <p className="invoice-muted">Click any invoice to load it in read-only view. Edit or delete it from the icon actions.</p>
            </div>
            <button className="invoice-btn" type="button" onClick={refreshData} disabled={loading}>Refresh Dashboard</button>
          </div>
          {invoices.length ? (
            <div className="invoice-dashboard-grid">
              {invoices.map((invoice) => {
                const isSelectedInvoice = currentInvoiceId === invoice.id;
                return (
                  <article
                    className={`invoice-history-card${isSelectedInvoice ? " selected" : ""}`}
                    key={invoice.id}
                    onClick={() => loadInvoiceIntoView(invoice, true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        loadInvoiceIntoView(invoice, true);
                      }
                    }}
                  >
                    <div className="invoice-history-top">
                      <div>
                        <div className="line-primary">{invoice.invoice_number}</div>
                        <div className="line-secondary">{invoice.client_name}</div>
                      </div>
                      <span className={`status-badge ${invoice.status}`}>{invoice.status}</span>
                    </div>
                    <div className="invoice-muted">
                      {formatDate(invoice.date_from)} – {formatDate(invoice.date_to)} · {formatCurrency(invoice.total)} · {invoice.invoice_line_items?.length || 0} lines
                    </div>
                    <div className="invoice-history-actions">
                      <button
                        className="mini-btn icon-btn"
                        type="button"
                        title="Edit invoice"
                        aria-label={`Edit ${invoice.invoice_number}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          loadInvoiceIntoView(invoice, false);
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="mini-btn danger icon-btn"
                        type="button"
                        title="Delete invoice"
                        aria-label={`Delete ${invoice.invoice_number}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteInvoice(invoice.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                      {isSelectedInvoice && invoice.status === "finalized" ? (
                        <button
                          className="mini-btn paid-action"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            markInvoicePaid(invoice.id);
                          }}
                          disabled={savingInvoice}
                        >
                          Mark As Paid
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No generated invoices yet.</div>
          )}
        </section>

        <section className="invoice-grid">
          <aside className="invoice-card invoice-controls">
            <div className="invoice-builder-head">
              <div>
                <h2 className="invoice-panel-title">Invoice Builder</h2>
                <p className="invoice-muted">Invoices use only weeks confirmed in HoursTracker. Select every active project you want to include in this invoice.</p>
              </div>
              <button className="invoice-collapse-btn" type="button" onClick={() => setBuilderOpen((open) => !open)}>
                {builderOpen ? "Collapse" : "Expand"}
              </button>
            </div>

            {builderOpen ? (
              <>
                <div className="invoice-form">
                  <div className="invoice-field">
                    <label className="invoice-label">Client</label>
                    <select className="invoice-select" value={effectiveSelectedClientId} onChange={(event) => handleClientChange(event.target.value)}>
                      {!clientOptions.length ? <option value="">Select or add a client</option> : null}
                      {clientOptions.map((client) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                      <option value="__new__">Add new...</option>
                    </select>
                    <div className="invoice-muted">This client information prints in the Bill To section.</div>
                  </div>

                  <div className="invoice-field project-picker">
                    <div className="project-picker-head">
                      <label className="invoice-label">Projects</label>
                      <button
                        className="project-toggle"
                        type="button"
                        onClick={effectiveSelectedProjectIds.length === projectOptions.length ? clearProjectSelection : selectAllProjects}
                        disabled={!projectOptions.length}
                      >
                        {effectiveSelectedProjectIds.length === projectOptions.length ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    {projectOptions.length ? (
                      <div className="project-checklist" role="group" aria-label="Invoice projects">
                        {projectOptions.map((project) => {
                          const checked = selectedProjectIdSet.has(project.id);
                          return (
                            <label className={`project-check-row${checked ? " selected" : ""}`} key={project.id}>
                              <input
                                className="project-checkbox"
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProjectSelection(project.id)}
                              />
                              <span className="project-check-main">
                                <span className="project-check-title">{project.projectName}</span>
                                <span className="project-check-meta">{project.projectLocation || "No location"}</span>
                              </span>
                              <span className="project-check-stats">
                                <span className="project-check-badge">{project.placedCount} placed</span>
                                <span>{formatHours(project.approvedHours)} hrs</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state">No placed-worker projects found.</div>
                    )}
                    <div className="invoice-muted">{selectedProjectLabel} · Bill to: {selectedClientName}</div>
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
                  <div className="summary-box total-summary-box"><div className="summary-label">Total</div><div className="summary-value">{formatCurrency(summary.total)}</div></div>
                </div>
              </>
            ) : null}
          </aside>

          <section className="invoice-card invoice-preview">
            {loading ? (
              <div className="empty-state"><Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />Loading invoice data...</div>
            ) : (
              <div className="invoice-document">
                <div className="invoice-doc-header">
                  <div>
                    <h2 className="invoice-doc-title">Invoice</h2>
                    <div className="invoice-title-meta">
                      <div className="bill-heading">Service Period</div>
                      <div className="bill-main">{formatDate(dateFrom)} – {formatDate(dateTo)}</div>
                      <div className="invoice-muted">All active projects</div>
                    </div>
                  </div>
                  <div className="invoice-doc-meta">
                    <img className="invoice-logo" src={utsLogo} alt="Universal Talent Source" />
                    <div className="invoice-info-list">
                      <div className="invoice-muted"><strong>Invoice #:</strong> {invoiceNumber || "—"}</div>
                      <div className="invoice-muted"><strong>Invoice Date:</strong> {formatDate(invoiceDate)}</div>
                      <div className="invoice-muted"><strong>Due Date:</strong> {formatDate(dueDate)}</div>
                    </div>
                  </div>
                </div>

                <div className="invoice-bill-grid">
                  <div className="bill-box">
                    <div className="bill-heading">Bill To</div>
                    <div className="bill-main">{selectedClientName}</div>
                    {selectedClient?.address ? <div className="invoice-muted">{selectedClient.address}</div> : null}
                    {selectedClient?.phone ? <div className="invoice-muted">{selectedClient.phone}</div> : null}
                    {selectedClient?.email ? <div className="invoice-muted">{selectedClient.email}</div> : null}
                  </div>
                  <div className="bill-box align-right">
                    <div className="bill-heading">From</div>
                    <div className="from-info">
                      <div className="bill-main">Universal Talent Source</div>
                      <div className="invoice-muted">www.universaltalentsource.com</div>
                      <div className="invoice-muted">info@universaltalentsource.com</div>
                      <div className="invoice-muted">(863) 254-1402 / (317) 516-8043</div>
                    </div>
                  </div>
                </div>

                {activeRowsWithTotals.length ? (
                  <>
                    <div className="invoice-table-wrap">
                      <table className="invoice-table">
                        <thead>
                          <tr>
                            <th style={{ width: 70, textAlign: "right" }}>Item #</th>
                            <th>Product or service</th>
                            <th>Name</th>
                            <th>Details</th>
                            <th style={{ textAlign: "right" }}>Qty</th>
                            <th style={{ textAlign: "right" }}>Rate</th>
                            <th style={{ textAlign: "right" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeRowsWithTotals.map((row, index) => (
                            <tr key={row.key}>
                              <td style={{ textAlign: "right" }}>{index + 1}</td>
                              <td>
                                {invoiceReadOnly ? <span>{row.serviceName}</span> : (
                                  <select
                                    className="service-select"
                                    value={row.serviceId}
                                    onChange={(event) => handleServiceChange(row.key, event.target.value)}
                                    aria-label={`Product or service for ${row.candidateName}`}
                                  >
                                    {productServices.map((service) => (
                                      <option key={service.id} value={service.id}>{service.name}</option>
                                    ))}
                                    <option value="__new__">New...</option>
                                  </select>
                                )}
                                <span className="print-service-name">{row.serviceName}</span>
                              </td>
                              <td>
                                <div className="line-primary">{row.candidateName}</div>
                                <div className="line-secondary">{[row.workerPhone, row.workerEmail].filter(Boolean).join(" · ") || "No contact"}</div>
                              </td>
                              <td>
                                <div className="line-primary">{row.projectName}</div>
                                <div className="line-secondary">{[row.projectLocation, `${formatDate(row.firstDate)} – ${formatDate(row.lastDate)}`, row.jobCode ? `Code: ${row.jobCode}` : ""].filter(Boolean).join(" · ") || "No location"}</div>
                                {row.lineType === "placement_fee" && !invoiceReadOnly ? (
                                  <button className="row-action-btn" type="button" onClick={() => markPlacementFeePaid(row)}>Mark Placement Paid</button>
                                ) : null}
                              </td>
                              <td style={{ textAlign: "right" }}>{formatHours(row.qty ?? row.hours)}</td>
                              <td style={{ textAlign: "right" }}>
                                {invoiceReadOnly ? <span>{formatCurrency(row.rate)}</span> : (
                                  <input
                                    className="rate-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={lineRates[row.key] ?? row.rate ?? 0}
                                    onChange={(event) => setLineRates((prev) => ({ ...prev, [row.key]: event.target.value }))}
                                    aria-label={`Rate for ${row.candidateName}`}
                                  />
                                )}
                                <span className="print-rate-value">{formatCurrency(row.rate)}</span>
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
                        <div className="total-row"><span>Total Placements</span><strong>{formatCount(summary.totalPlacements)}</strong></div>
                        <div className="total-row grand"><span>Total Due</span><span>{formatCurrency(summary.total)}</span></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 24 }}>
                    <div className="empty-state">No confirmed HoursTracker hours found for the selected projects and date range.</div>
                  </div>
                )}

                {notes ? (
                  <div style={{ padding: "0 24px 24px" }}>
                    <div className="bill-heading">Notes</div>
                    <div className="invoice-muted" style={{ marginTop: 6 }}>{notes}</div>
                  </div>
                ) : null}

                {activeRowsWithTotals.length ? (
                  <div className="invoice-actions invoice-bottom-actions">
                    <button className="invoice-btn" type="button" onClick={finalizeInvoice} disabled={!activeRowsWithTotals.length || loading || savingInvoice || invoiceReadOnly}>
                      {savingInvoice ? <Loader2 className="spin" size={15} /> : <FileText size={15} />} Finalize
                    </button>
                    <button className="invoice-btn" type="button" onClick={exportCsv} disabled={!activeRowsWithTotals.length || loading}>
                      <Download size={15} /> Export CSV
                    </button>
                    <button className="invoice-btn" type="button" onClick={printInvoice} disabled={!activeRowsWithTotals.length || loading || savingInvoice}>
                      <Printer size={15} /> Print Invoice
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </main>
      {clientModal.open ? (
        <div className="invoice-modal-backdrop" onMouseDown={closeClientModal} role="presentation">
          <div className="invoice-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-client-title">
            <div className="invoice-modal-head">
              <h2 className="invoice-modal-title" id="new-client-title">New Client</h2>
              <div className="invoice-muted">Add client billing details for the Bill To section.</div>
            </div>

            <div className="invoice-field">
              <label className="invoice-label">Name</label>
              <input
                className="invoice-input"
                value={clientModal.name}
                onChange={(event) => setClientModal((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Client name"
                autoFocus
              />
            </div>

            <div className="invoice-field">
              <label className="invoice-label">Address</label>
              <textarea
                className="invoice-textarea"
                value={clientModal.address}
                onChange={(event) => setClientModal((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Billing address"
              />
            </div>

            <div className="invoice-date-grid">
              <div className="invoice-field">
                <label className="invoice-label">Phone</label>
                <input
                  className="invoice-input"
                  value={clientModal.phone}
                  onChange={(event) => setClientModal((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone"
                />
              </div>
              <div className="invoice-field">
                <label className="invoice-label">Email</label>
                <input
                  className="invoice-input"
                  type="email"
                  value={clientModal.email}
                  onChange={(event) => setClientModal((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="billing@example.com"
                />
              </div>
            </div>

            <div className="invoice-modal-actions">
              <button className="invoice-btn" type="button" onClick={closeClientModal}>Cancel</button>
              <button className="invoice-btn dark" type="button" onClick={createInvoiceClient}>Create</button>
            </div>
          </div>
        </div>
      ) : null}
      {serviceModal.open ? (
        <div className="invoice-modal-backdrop" onMouseDown={closeServiceModal} role="presentation">
          <div className="invoice-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-service-title">
            <div className="invoice-modal-head">
              <h2 className="invoice-modal-title" id="new-service-title">New Product / Service</h2>
              <div className="invoice-muted">Create a reusable product or service for invoice lines.</div>
            </div>

            <div className="invoice-field">
              <label className="invoice-label">Product / Service</label>
              <input
                className="invoice-input"
                value={serviceModal.name}
                onChange={(event) => setServiceModal((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Hourly Fee"
                autoFocus
              />
            </div>

            <div className="invoice-field">
              <label className="invoice-label">Rate</label>
              <input
                className="invoice-input"
                type="number"
                min="0"
                step="0.01"
                value={serviceModal.rate}
                onChange={(event) => setServiceModal((prev) => ({ ...prev, rate: event.target.value }))}
                placeholder="0.00"
              />
              <div className="invoice-muted">Leave as 0 if this product/service has no default rate.</div>
            </div>

            <div className="invoice-modal-actions">
              <button className="invoice-btn" type="button" onClick={closeServiceModal}>Cancel</button>
              <button className="invoice-btn dark" type="button" onClick={createProductService}>Create</button>
            </div>
          </div>
        </div>
      ) : null}
      <GoToTopButton />
    </>
  );
}

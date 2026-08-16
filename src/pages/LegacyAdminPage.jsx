import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import UtsLegacyTopNavBar from "../components/UtsLegacyTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import {
  getWorkerDocumentCategoryKey,
  getWorkerDocumentLabel,
  getWorkerDocumentStatus,
  CTS_BIO_DOCUMENT_LABEL,
  REMINDER_WORKER_DOCUMENT_TYPES,
  TWO_SIDED_WORKER_DOCUMENT_TYPES,
  WORKER_DOCUMENT_TYPES,
} from "../lib/workerDocuments";
import { buildCtsBioBlob, createInitialCtsBio, sanitizeBioFileName } from "../lib/ctsBio";
import { buildCtsJotformPrefillUrl } from "../lib/ctsJotform";
import {
  findLocationIdByState,
  lookupUsZipCode,
  normalizeZipCode,
} from "../lib/addressLookup";
import {
  Loader2,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Briefcase,
  MapPin,
  ShieldCheck,
  Wrench,
  Languages,
  X,
  CalendarDays,
  DollarSign,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  Download,
  Pencil,
  ExternalLink,
  Copy,
  Link2,
  MessageCircle,
  AlertTriangle,
  UserRound,
  MoreVertical,
} from "lucide-react";

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #eef4ff;
        color: #0f172a;
      }

      input, select, textarea, button {
        font: inherit;
      }

      input, select, textarea {
        transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
      }

      input:focus, select:focus, textarea:focus {
        border-color: #1f2c40 !important;
        box-shadow: 0 0 0 4px rgba(31, 44, 64, 0.11);
      }

      input::placeholder,
      textarea::placeholder {
        color: #94a3b8;
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      .worker-mobile-action-menu { display: none; }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .uts-topbar {
        position: sticky;
        top: 0;
        z-index: 30;
        background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      }

      .uts-topbar-inner {
        max-width: 1280px;
        margin: 0 auto;
        min-height: 78px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 0 24px;
      }

      .uts-brand {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        flex-shrink: 0;
      }

      .uts-brand img {
        height: 52px;
        width: auto;
        object-fit: contain;
        display: block;
      }

      .uts-nav {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .uts-nav-btn {
        border: none;
        background: transparent;
        color: rgba(255,255,255,0.82);
        padding: 12px 14px;
        border-radius: 12px;
        font-weight: 800;
        font-size: 15px;
        cursor: pointer;
        transition: 0.18s ease;
      }

      .uts-nav-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #ffffff;
      }

      .uts-nav-btn.active {
        background: rgba(255,255,255,0.12);
        color: #ffffff;
      }

      .uts-topbar-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .uts-logout-btn {
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.04);
        color: #ffffff;
        border-radius: 14px;
        padding: 11px 15px;
        font-weight: 800;
        cursor: pointer;
      }

      @media (max-width: 1100px) {
        .uts-topbar-inner {
          align-items: flex-start;
          flex-direction: column;
          padding-top: 14px;
          padding-bottom: 14px;
        }

        .uts-topbar-right {
          width: 100%;
          justify-content: flex-start;
        }
      }

      @media (max-width: 950px) {
        .filters-grid,
        .stats-grid,
        .worker-top,
        .worker-meta,
        .worker-notes,
        .worker-dates,
        .document-upload-grid,
        .worker-actions {
          grid-template-columns: 1fr !important;
        }

        .admin-shell {
          padding: 16px !important;
        }

        .admin-panel {
          padding: 20px !important;
          border-radius: 18px !important;
        }

        .admin-title-search-row {
          grid-template-columns: 1fr !important;
          justify-content: stretch !important;
        }

        .worker-edit-modal {
          width: calc(100vw - 28px) !important;
          max-height: 88dvh !important;
          padding: 16px !important;
          gap: 14px !important;
        }

        .worker-edit-modal textarea {
          min-height: 88px !important;
        }
      }

      @media (max-width: 640px) {
        body {
          background: #eff6ff !important;
        }

        .admin-shell {
          padding: 22px 10px calc(28px + env(safe-area-inset-bottom)) !important;
          scroll-margin-top: 0;
        }

        .admin-panel {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          gap: 14px !important;
        }

        .admin-dashboard {
          gap: 12px !important;
        }

        .admin-kicker {
          font-size: 13px !important;
          padding: 7px 12px !important;
        }

        .admin-heading {
          font-size: 30px !important;
        }

        .admin-subtitle {
          font-size: 15px !important;
          line-height: 1.45 !important;
        }

        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 8px !important;
        }

        .stats-grid > div {
          padding: 12px !important;
        }

        .admin-pill-strip {
          flex-wrap: nowrap !important;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .admin-pill-strip::-webkit-scrollbar {
          display: none;
        }

        .admin-pill-strip > span,
        .admin-pill-strip > button {
          flex: 0 0 auto;
        }

        .filters-card {
          border-radius: 18px !important;
          padding: 14px !important;
        }

        .worker-card {
          border-radius: 14px !important;
          padding: 14px !important;
        }

        .worker-meta {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .worker-contact-panel {
          border-radius: 14px !important;
        }

        .worker-dates {
          display: none !important;
        }

        .worker-card-title-row {
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: start !important;
        }

        .worker-card-actions {
          justify-content: flex-end !important;
          align-self: start !important;
        }

        .worker-desktop-actions { display: none !important; }

        .worker-mobile-action-menu { display: block !important; }
      }

      @media (min-width: 951px) {
        .worker-card {
          padding: 16px !important;
          gap: 12px !important;
        }

        .worker-top {
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr) !important;
          gap: 14px !important;
        }

        .worker-meta {
          gap: 8px !important;
        }

        .worker-dates {
          gap: 8px !important;
        }

        .worker-dates > div {
          padding: 10px 12px !important;
          border-radius: 10px !important;
        }
      }
    `}</style>
  );
}
const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle = {
  width: "100%",
  minHeight: 120,
  padding: "13px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  resize: "vertical",
  lineHeight: 1.6,
  boxSizing: "border-box",
};

function pillStyle(dark = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 999,
    background: dark ? "#0f172a" : "#dbeafe",
    color: dark ? "#ffffff" : "#0f172a",
    fontSize: 13,
    fontWeight: 700,
  };
}

function Card({ children, className = "", compact = false, style = {} }) {
  return (
    <div
      className={className}
      style={{
        background: "#ffffff",
        border: "1px solid #dbeafe",
        borderRadius: 12,
        padding: compact ? 14 : 18,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, dark = false, style = {} }) {
  return <span style={{ ...pillStyle(dark), ...style }}>{children}</span>;
}

function Field({ label, children, style = {} }) {
  return (
    <div style={{ display: "grid", gap: 7, ...style }}>
      <label style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  tone = "neutral",
  icon: Icon,
  iconClassName,
  title,
  ariaLabel,
  style = {},
  ...buttonProps
}) {
  const isDark = tone === "dark";
  const isDanger = tone === "danger";

  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      {...buttonProps}
      style={{
        border: isDark
          ? "none"
          : isDanger
          ? "1px solid #fecaca"
          : "1px solid #cbd5e1",
        background: disabled ? "#f8fafc" : isDark ? "#0f172a" : "#ffffff",
        color: disabled ? "#94a3b8" : isDanger ? "#b91c1c" : isDark ? "#ffffff" : "#0f172a",
        borderRadius: 10,
        padding: children ? "10px 13px" : 0,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...style,
      }}
    >
      {Icon ? <Icon size={16} className={iconClassName} /> : null}
      {children}
    </button>
  );
}

function IconButton({ icon: Icon, tone = "neutral", ...props }) {
  return (
    <Button
      tone={tone}
      icon={Icon}
      style={{
        width: 34,
        height: 34,
        boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
        ...props.style,
      }}
      {...props}
    />
  );
}

function mobileActionMenuItemStyle(disabled = false, danger = false) {
  return {
    width: "100%",
    border: 0,
    borderRadius: 10,
    padding: "11px 12px",
    background: "transparent",
    color: disabled ? "#94a3b8" : danger ? "#b91c1c" : "#0f172a",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    gap: 9,
    textAlign: "left",
  };
}

function fieldGroupTitleStyle() {
  return {
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  };
}

function getStatusStyle(status) {
  switch (status) {
    case "hold":
      return {
        background: "#ffedd5",
        color: "#9a3412",
        border: "1px solid #fdba74",
      };
    case "rejected":
      return {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      };
    case "completed":
      return {
        background: "#ede9fe",
        color: "#5b21b6",
        border: "1px solid #c4b5fd",
      };
    case "working":
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    default:
      return {
        background: "#ede9fe",
        color: "#5b21b6",
        border: "1px solid #c4b5fd",
      };
  }
}

function formatStatus(status) {
  switch (status) {
    case "hold":
      return "Hold";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Available";
    case "working":
      return "Working";
    default:
      return "Available";
  }
}

function statusPriority(status) {
  switch (status) {
    case "working":
      return 1;
    case "hold":
      return 2;
    case "completed":
      return 3;
    case "rejected":
      return 4;
    default:
      return 99;
  }
}

function getSyncedWorkerStatus(worker, placedWorkerIds) {
  if (placedWorkerIds.has(worker.id)) return "working";
  if (["pending", "onboarding", "working"].includes(worker.status)) return "completed";
  return worker.status || "completed";
}

const WORKER_HOURS_BASE_URL = "https://uts.services";

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatPayValue(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "—";
}

function normalizePhoneDigits(value) {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  return digitsOnly.length === 11 && digitsOnly.startsWith("1")
    ? digitsOnly.slice(1)
    : digitsOnly;
}

function formatPhoneInput(value) {
  const digits = normalizePhoneDigits(value).slice(0, 10);

  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isWorkerUnreviewed(worker) {
  return !worker.admin_reviewed_at;
}

function getWorkerQualityIssues(worker) {
  const issues = [];

  if (!String(worker.rate || "").trim()) issues.push("Missing rate");
  if (!String(worker.per_diem || "").trim()) issues.push("Missing per diem");
  if (!String(worker.phone || "").trim()) issues.push("Missing phone");
  if (!String(worker.email || "").trim()) issues.push("Missing email");
  if (!formatWorkerAddress(worker)) issues.push("Missing address");
  if (!String(worker.public_profile_slug || "").trim()) issues.push("No profile link");

  const documentBadgeCutoff = new Date("2026-07-27T00:00:00-04:00").getTime();
  const registeredAt = new Date(worker.created_at || 0).getTime();
  if (registeredAt >= documentBadgeCutoff) {
    const documents = worker.worker_documents || [];
    const hasRequiredId = getWorkerDocumentStatus(documents, "state_id_or_driver_license").complete;
    const hasSocialSecurity = getWorkerDocumentStatus(documents, "social_security_card").complete;
    if (!hasRequiredId || !hasSocialSecurity) issues.push("Missing documents");
  }

  return issues;
}

function MiniMetric({ label, value }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "#0f172a", fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function TagRow({ title, values, icon, emptyLabel }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...fieldGroupTitleStyle() }}>
        {icon}
        <span>{title}</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {values.length === 0 ? (
          <span style={{ color: "#64748b" }}>{emptyLabel}</span>
        ) : (
          values.map((value) => (
            <Pill key={`${title}-${value}`}>
              {value}
            </Pill>
          ))
        )}
      </div>
    </div>
  );
}

function SkillMultiFilter({ skills, selectedSkillIds, setSelectedSkillIds }) {
  const toggleSkill = (id) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedNames = skills
    .filter((skill) => selectedSkillIds.includes(skill.id))
    .map((skill) => skill.name);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, color: "#0f172a" }}>Skills</div>

        {selectedSkillIds.length > 0 ? (
          <Button
            type="button"
            onClick={() => setSelectedSkillIds([])}
            icon={X}
            style={{ padding: "8px 12px", fontWeight: 700 }}
          >
            Clear skills
          </Button>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {skills.map((skill) => {
          const active = selectedSkillIds.includes(skill.id);

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggleSkill(skill.id)}
              style={{
                padding: "9px 13px",
                borderRadius: 999,
                border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
                background: active ? "#0f172a" : "#ffffff",
                color: active ? "#ffffff" : "#0f172a",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {skill.name}
            </button>
          );
        })}
      </div>

      <div style={{ color: "#64748b", fontSize: 14 }}>
        {selectedNames.length === 0
          ? "No skill filters selected."
          : `Selected: ${selectedNames.join(", ")}`}
      </div>
    </div>
  );
}

function formatWorkerAddress(worker) {
  return [
    worker.address,
    worker.city,
    worker.state,
    worker.zip_code,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function WorkerEditModal({ worker, trades, locations, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: worker.name || "",
    phone: worker.phone || "",
    email: worker.email || "",
    rate: worker.rate || "",
    per_diem: worker.per_diem || "",
    address: worker.address || "",
    zip_code: worker.zip_code || "",
    city: worker.city || "",
    state: worker.state || "",
    trade_id: worker.trade_id || "",
    location_id: worker.location_id || "",
    total_experience_years: worker.total_experience_years ?? 0,
    industrial_experience_years: worker.industrial_experience_years ?? 0,
    commercial_experience_years: worker.commercial_experience_years ?? 0,
    residential_experience_years: worker.residential_experience_years ?? 0,
    strengths: worker.strengths || "",
    needs_improvement: worker.needs_improvement || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [zipLookupStatus, setZipLookupStatus] = useState("");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleZipChange = (value) => {
    const zip = normalizeZipCode(value);
    update("zip_code", zip);
    setZipLookupStatus(zip.length === 5 ? "Looking up ZIP..." : "");
  };

  useEffect(() => {
    const zip = normalizeZipCode(form.zip_code);
    if (zip.length !== 5) {
      return;
    }

    let active = true;

    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupUsZipCode(zip);
        if (!active) return;

        if (!result) {
          setZipLookupStatus("ZIP not found.");
          return;
        }

        const locationId = findLocationIdByState(locations, result.state);
        setForm((prev) => ({
          ...prev,
          city: result.city || prev.city,
          state: result.state || prev.state,
          location_id: locationId || prev.location_id,
        }));
        setZipLookupStatus("City and state filled from ZIP.");
      } catch {
        if (active) setZipLookupStatus("Could not look up ZIP.");
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.zip_code, locations]);

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const save = async () => {
    setError("");

    if (!form.name.trim() || !form.trade_id || !form.location_id) {
      setError("Name, trade, and location are required.");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (form.phone && normalizePhoneDigits(form.phone).length !== 10) {
      setError("Please enter a valid 10-digit US phone number.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      rate: form.rate.trim() || null,
      per_diem: form.per_diem.trim() || null,
      address: form.address.trim() || null,
      zip_code: form.zip_code.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      trade_id: form.trade_id,
      location_id: form.location_id,
      total_experience_years: toNumber(form.total_experience_years),
      industrial_experience_years: toNumber(form.industrial_experience_years),
      commercial_experience_years: toNumber(form.commercial_experience_years),
      residential_experience_years: toNumber(form.residential_experience_years),
      strengths: form.strengths.trim() || null,
      needs_improvement: form.needs_improvement.trim() || null,
    };

    const { data, error } = await supabase
      .from("workers")
      .update(payload)
      .eq("id", worker.id)
      .select(`
        *,
        trades(name),
        locations(name),
        worker_languages(language_name, proficiency_percent),
        worker_projects(*),
        worker_skills(skills(id, name)),
        worker_certifications(certifications(name)),
        worker_documents(*)
      `)
      .single();

    if (error) {
      const message = String(error.message || "");
      const isDuplicateEmail = message.includes("workers_email_unique_normalized_idx");
      const isDuplicatePhone = message.includes("workers_phone_unique_normalized_idx");

      setError(
        isDuplicateEmail
          ? "This email address is already registered."
          : isDuplicatePhone
          ? "This phone number is already registered."
          : message || "Could not update worker."
      );
      setSaving(false);
      return;
    }

    onSaved(data);
    setSaving(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(15, 23, 42, 0.45)",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        className="worker-edit-modal"
        style={{
          width: "min(920px, 100%)",
          maxHeight: "92dvh",
          overflow: "auto",
          overscrollBehavior: "contain",
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #dbeafe",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
          padding: 22,
          display: "grid",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
              Edit Worker
            </div>
            <div style={{ color: "#64748b", fontWeight: 700, marginTop: 4 }}>
              Update the main profile fields.
            </div>
          </div>

          <IconButton
            icon={X}
            onClick={onClose}
            ariaLabel="Close edit worker modal"
            title="Close"
            style={{ width: 38, height: 38 }}
          />
        </div>

        <div
          className="filters-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <Field label="Name">
            <input value={form.name} onChange={(e) => update("name", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => update("phone", formatPhoneInput(e.target.value))}
              placeholder="(317) 555-1234"
              style={inputStyle}
            />
          </Field>

          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Rate">
            <input value={form.rate} onChange={(e) => update("rate", e.target.value)} style={inputStyle} placeholder="$33/hr" />
          </Field>

          <Field label="Per Diem">
            <input value={form.per_diem} onChange={(e) => update("per_diem", e.target.value)} style={inputStyle} placeholder="$10/hr" />
          </Field>

          <Field label="Street Address">
            <input value={form.address} onChange={(e) => update("address", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="ZIP Code">
            <input
              inputMode="numeric"
              value={form.zip_code}
              onChange={(e) => handleZipChange(e.target.value)}
              style={inputStyle}
            />
            {zipLookupStatus ? (
              <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                {zipLookupStatus}
              </div>
            ) : null}
          </Field>

          <Field label="City">
            <input value={form.city} onChange={(e) => update("city", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="State">
            <input
              value={form.state}
              onChange={(e) => {
                const state = e.target.value;
                const locationId = findLocationIdByState(locations, state);
                setForm((prev) => ({
                  ...prev,
                  state,
                  location_id: locationId || prev.location_id,
                }));
              }}
              style={inputStyle}
            />
          </Field>

          <Field label="Trade">
            <select value={form.trade_id} onChange={(e) => update("trade_id", e.target.value)} style={inputStyle}>
              <option value="">Select trade</option>
              {trades.map((trade) => (
                <option key={trade.id} value={trade.id}>
                  {trade.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Location">
            <select value={form.location_id} onChange={(e) => update("location_id", e.target.value)} style={inputStyle}>
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>

          {[
            ["total_experience_years", "Total Experience"],
            ["industrial_experience_years", "Industrial"],
            ["commercial_experience_years", "Commercial"],
            ["residential_experience_years", "Residential"],
          ].map(([field, label]) => (
            <Field key={field} label={label}>
              <input
                type="number"
                min="0"
                value={form[field]}
                onChange={(e) => update(field, e.target.value)}
                style={inputStyle}
              />
            </Field>
          ))}
        </div>

        <div
          className="worker-notes"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <Field label="Strengths">
            <textarea value={form.strengths} onChange={(e) => update("strengths", e.target.value)} style={textareaStyle} />
          </Field>

          <Field label="Needs Improvement">
            <textarea value={form.needs_improvement} onChange={(e) => update("needs_improvement", e.target.value)} style={textareaStyle} />
          </Field>
        </div>

        {error ? (
          <div style={{ color: "#b91c1c", fontWeight: 800 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Button
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            onClick={save}
            disabled={saving}
            tone="dark"
            icon={saving ? Loader2 : null}
            iconClassName={saving ? "spin" : undefined}
          >
            {saving ? "Saving..." : "Save Worker"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const bioInputStyle = {
  width: "100%",
  minHeight: 44,
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#ffffff",
  color: "#0f172a",
};

function CtsBioModal({ worker, onClose, onSaved }) {
  const [bio, setBio] = useState(() => createInitialCtsBio(worker));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (field, value) => setBio((previous) => ({ ...previous, [field]: value }));

  const saveBio = async () => {
    if (!bio.name.trim()) {
      setError("Candidate name is required.");
      return;
    }
    const experiencePercentageTotal = [bio.commercialExperience, bio.industrialExperience, bio.residentialExperience]
      .reduce((sum, value) => sum + Number(value || 0), 0);
    if (experiencePercentageTotal !== 100) {
      setError(`Commercial, industrial, and residential experience must add up to 100%. Current total: ${experiencePercentageTotal}%.`);
      return;
    }

    setSaving(true);
    setError("");
    let uploadedPath = "";
    let insertedId = "";

    try {
      const blob = await buildCtsBioBlob(bio);
      const fileName = sanitizeBioFileName(bio.name);
      const path = `${worker.id}/${crypto.randomUUID()}_bio_${fileName}`;
      const existingBios = (worker.worker_documents || []).filter(
        (document) => getWorkerDocumentCategoryKey(document.document_type)
          === getWorkerDocumentCategoryKey(CTS_BIO_DOCUMENT_LABEL)
      );

      const { error: uploadError } = await supabase.storage
        .from("worker-documents")
        .upload(path, blob, {
          cacheControl: "3600",
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      uploadedPath = path;

      const { data: inserted, error: insertError } = await supabase
        .from("worker_documents")
        .insert({
          worker_id: worker.id,
          file_name: fileName,
          file_path: path,
          file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          file_size: blob.size,
          document_type: CTS_BIO_DOCUMENT_LABEL,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      insertedId = inserted.id;

      if (existingBios.length) {
        const { error: deleteRowsError } = await supabase
          .from("worker_documents")
          .delete()
          .eq("worker_id", worker.id)
          .in("id", existingBios.map((document) => document.id));
        if (deleteRowsError) throw deleteRowsError;
        const { error: removeFilesError } = await supabase.storage
          .from("worker-documents")
          .remove(existingBios.map((document) => document.file_path));
        if (removeFilesError) console.error("The previous BIO file could not be removed.", removeFilesError);
      }

      await onSaved();
      onClose();
    } catch (saveError) {
      if (insertedId) {
        await supabase.from("worker_documents").delete().eq("id", insertedId);
      }
      if (uploadedPath) {
        await supabase.storage.from("worker-documents").remove([uploadedPath]);
      }
      setError(saveError.message || "Could not generate the CTS BIO.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["location", "Location"],
    ["trade", "Trade"], ["totalExperience", "Total experience in trade (years)"],
    ["commercialExperience", "Commercial experience (%)"],
    ["industrialExperience", "Industrial experience (%)"],
    ["residentialExperience", "Residential experience (%)"],
  ];
  const percentageTotal = [bio.commercialExperience, bio.industrialExperience, bio.residentialExperience]
    .reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "min(920px, 100%)", maxHeight: "94dvh", overflow: "auto", background: "white", borderRadius: 22, padding: 22, boxShadow: "0 28px 90px rgba(15,23,42,.28)", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start" }}>
          <div>
            <div style={{ color: "#2563eb", fontSize: 12, fontWeight: 900, letterSpacing: ".1em" }}>CTS CANDIDATE BIO</div>
            <h2 style={{ margin: "6px 0 5px", fontSize: 27 }}>Review before generating</h2>
            <div style={{ color: "#64748b", lineHeight: 1.5 }}>This is an independent copy. Changes here will not modify the candidate profile.</div>
          </div>
          <IconButton icon={X} onClick={onClose} title="Close" aria-label="Close BIO editor" />
        </div>

        <div className="filters-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 13 }}>
          {fields.map(([fieldName, label]) => (
            <Field key={fieldName} label={label}>
              <input
                type={fieldName.includes("Experience") ? "number" : "text"}
                min={fieldName.includes("Experience") ? "0" : undefined}
                max={fieldName !== "totalExperience" && fieldName.includes("Experience") ? "100" : undefined}
                value={bio[fieldName]}
                onChange={(event) => update(fieldName, event.target.value)}
                style={bioInputStyle}
              />
            </Field>
          ))}
        </div>
        <div style={{ color: percentageTotal === 100 ? "#166534" : "#b45309", background: percentageTotal === 100 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${percentageTotal === 100 ? "#bbf7d0" : "#fde68a"}`, borderRadius: 12, padding: "10px 12px", fontWeight: 800 }}>
          Experience distribution: {percentageTotal}% {percentageTotal === 100 ? "✓" : "— must total 100%"}
        </div>

        <div style={{ display: "grid", gap: 13 }}>
          <Field label="Project history — one project per line">
            <textarea value={bio.projects} onChange={(event) => update("projects", event.target.value)} style={{ ...bioInputStyle, minHeight: 105, resize: "vertical" }} />
          </Field>
          <Field label="Strengths — one strength per line">
            <textarea value={bio.strengths} onChange={(event) => update("strengths", event.target.value)} style={{ ...bioInputStyle, minHeight: 130, resize: "vertical" }} />
          </Field>
          <Field label="Certifications">
            <textarea value={bio.certifications} onChange={(event) => update("certifications", event.target.value)} style={{ ...bioInputStyle, minHeight: 76, resize: "vertical" }} />
          </Field>
          <Field label="Languages">
            <input value={bio.languages} onChange={(event) => update("languages", event.target.value)} style={bioInputStyle} />
          </Field>
          <Field label="Closing note">
            <textarea value={bio.notes} onChange={(event) => update("notes", event.target.value)} style={{ ...bioInputStyle, minHeight: 76, resize: "vertical" }} />
          </Field>
        </div>

        {error ? <div style={{ padding: "11px 13px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 800 }}>{error}</div> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={saveBio} disabled={saving} tone="dark" icon={saving ? Loader2 : FileText} iconClassName={saving ? "spin" : undefined}>
            {saving ? "Generating BIO..." : "Generate and save BIO"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkerDocumentsPanel({ worker, documents, onDocumentsChanged, openReminderRequestId = 0 }) {
  const workerId = worker.id;
  const lastReminderRequestRef = useRef(0);
  const [selectedFiles, setSelectedFiles] = useState({ single: null, front: null, back: null });
  const [documentType, setDocumentType] = useState("resume");
  const [otherDescription, setOtherDescription] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTypes, setReminderTypes] = useState([]);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderError, setReminderError] = useState("");
  const [reminderSuccess, setReminderSuccess] = useState("");
  const requiresBothSides = TWO_SIDED_WORKER_DOCUMENT_TYPES.has(documentType);
  const hasRequiredFiles = requiresBothSides
    ? Boolean(selectedFiles.front && selectedFiles.back)
    : Boolean(selectedFiles.single);

  const resetSelectedFiles = () => {
    setSelectedFiles({ single: null, front: null, back: null });
    setFileInputKey((value) => value + 1);
  };

  const selectFile = (side, file) => {
    setSelectedFiles((previous) => ({ ...previous, [side]: file || null }));
    setError("");
    setSuccess("");
  };

  const openReminder = () => {
    setReminderTypes(
      REMINDER_WORKER_DOCUMENT_TYPES
        .filter((type) => type.required && !getWorkerDocumentStatus(documents, type.value).complete)
        .map((type) => type.value)
    );
    setReminderError("");
    setReminderSuccess("");
    setReminderOpen(true);
  };

  useEffect(() => {
    if (!openReminderRequestId || openReminderRequestId === lastReminderRequestRef.current) return;
    lastReminderRequestRef.current = openReminderRequestId;
    setReminderTypes(
      REMINDER_WORKER_DOCUMENT_TYPES
        .filter((type) => type.required && !getWorkerDocumentStatus(documents, type.value).complete)
        .map((type) => type.value)
    );
    setReminderError("");
    setReminderSuccess("");
    setReminderOpen(true);
  }, [documents, openReminderRequestId]);

  const toggleReminderType = (type) => {
    setReminderTypes((previous) => previous.includes(type)
      ? previous.filter((value) => value !== type)
      : [...previous, type]);
  };

  const sendDocumentReminder = async () => {
    if (!reminderTypes.length) return;
    setSendingReminder(true);
    setReminderError("");
    const { data, error: invokeError } = await supabase.functions.invoke("send-document-reminder", {
      body: { mode: "manual", workerId, documentTypes: reminderTypes },
    });
    setSendingReminder(false);
    if (invokeError || data?.error) {
      setReminderError(data?.error || invokeError?.message || "Could not send the reminder.");
      return;
    }
    setReminderOpen(false);
    setReminderSuccess(`Reminder sent to ${worker.email}.`);
  };

  const handleUpload = async () => {
    if (!hasRequiredFiles) return;
    const trimmedOtherDescription = otherDescription.trim();
    if (documentType === "other" && !trimmedOtherDescription) {
      setError("Describe the document when selecting Other.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    const uploadedPaths = [];
    let insertedDocumentIds = [];

    try {
      const uploadedRows = [];
      const baseDocumentLabel = documentType === "other"
        ? `Other: ${trimmedOtherDescription}`
        : getWorkerDocumentLabel(documentType);
      const filesToUpload = requiresBothSides
        ? [["front", selectedFiles.front], ["back", selectedFiles.back]]
        : [["document", selectedFiles.single]];
      const existingDocuments = documents.filter(
        (document) => getWorkerDocumentCategoryKey(document.document_type)
          === getWorkerDocumentCategoryKey(baseDocumentLabel)
      );

      for (const [side, file] of filesToUpload) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${workerId}/${crypto.randomUUID()}_${side}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("worker-documents")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (uploadError) throw uploadError;
        uploadedPaths.push(path);

        uploadedRows.push({
          worker_id: workerId,
          file_name: file.name,
          file_path: path,
          file_type: file.type || null,
          file_size: file.size || null,
          document_type: requiresBothSides
            ? `${baseDocumentLabel} - ${side === "front" ? "Front" : "Back"}`
            : baseDocumentLabel,
        });
      }

      const { data: insertedDocuments, error: insertError } = await supabase
        .from("worker_documents")
        .insert(uploadedRows)
        .select("id");

      if (insertError) throw insertError;
      insertedDocumentIds = (insertedDocuments || []).map((document) => document.id);

      if (existingDocuments.length) {
        const { error: deleteOldRowsError } = await supabase
          .from("worker_documents")
          .delete()
          .eq("worker_id", workerId)
          .in("id", existingDocuments.map((document) => document.id));
        if (deleteOldRowsError) throw deleteOldRowsError;

        const { error: deleteOldFilesError } = await supabase.storage
          .from("worker-documents")
          .remove(existingDocuments.map((document) => document.file_path));
        if (deleteOldFilesError) {
          console.error("Old document files could not be removed after replacement.", deleteOldFilesError);
        }
      }

      resetSelectedFiles();
      if (documentType === "other") setOtherDescription("");
      await onDocumentsChanged();
      setSuccess(existingDocuments.length
        ? `${baseDocumentLabel} replaced successfully.`
        : `${baseDocumentLabel} uploaded successfully.`);
    } catch (err) {
      if (insertedDocumentIds.length) {
        await supabase
          .from("worker_documents")
          .delete()
          .eq("worker_id", workerId)
          .in("id", insertedDocumentIds);
      }
      if (uploadedPaths.length) {
        await supabase.storage.from("worker-documents").remove(uploadedPaths);
      }
      setError(err.message || "Could not upload files.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    setError("");

    try {
      const { data, error } = await supabase.storage
        .from("worker-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Could not download file.");
    } finally {
      setDownloadingId("");
    }
  };

  const handleDelete = async (doc) => {
    const confirmed = window.confirm(`Delete "${doc.file_name}"?`);
    if (!confirmed) return;

    setError("");

    try {
      const { error: storageError } = await supabase.storage
        .from("worker-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("worker_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      onDocumentsChanged();
    } catch (err) {
      setError(err.message || "Could not delete file.");
    }
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontWeight: 800, color: "#0f172a" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Paperclip size={16} /> Documents</span>
        <button
          type="button"
          onClick={openReminder}
          disabled={!worker.email}
          title={worker.email ? "Choose documents and send a reminder" : "This candidate has no email address"}
          style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 12, padding: "9px 12px", fontWeight: 850, cursor: worker.email ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 7, opacity: worker.email ? 1 : .55 }}
        >
          <Mail size={15} /> Remind documents
        </button>
      </div>

      {reminderOpen ? (
        <div style={{ padding: 16, borderRadius: 16, border: "1px solid #bfdbfe", background: "#ffffff", display: "grid", gap: 13 }}>
          <div>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Send document reminder</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Choose what {worker.name || "this candidate"} should upload. Missing required documents are selected automatically.</div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {REMINDER_WORKER_DOCUMENT_TYPES.map((type) => {
              const status = getWorkerDocumentStatus(documents, type.value);
              return (
                <label key={type.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={reminderTypes.includes(type.value)} onChange={() => toggleReminderType(type.value)} />
                  <span style={{ flex: 1, fontWeight: 800 }}>{type.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 850, color: type.required ? "#9a3412" : "#64748b" }}>{type.required ? "REQUIRED" : "OPTIONAL"}</span>
                  <span style={{ fontSize: 11, fontWeight: 850, color: status.complete ? "#166534" : "#b91c1c" }}>{status.complete ? "UPLOADED" : "MISSING"}</span>
                </label>
              );
            })}
          </div>
          {reminderError ? <div style={{ color: "#b91c1c", fontWeight: 750, fontSize: 13 }}>{reminderError}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setReminderOpen(false)} disabled={sendingReminder} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 12, padding: "10px 13px", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={sendDocumentReminder} disabled={sendingReminder || !reminderTypes.length} style={{ border: 0, background: sendingReminder || !reminderTypes.length ? "#94a3b8" : "#1f2c40", color: "#fff", borderRadius: 12, padding: "10px 14px", fontWeight: 850, cursor: sendingReminder || !reminderTypes.length ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
              {sendingReminder ? <Loader2 size={15} className="spin" /> : <Mail size={15} />} {sendingReminder ? "Sending..." : "Send reminder"}
            </button>
          </div>
        </div>
      ) : null}

      {reminderSuccess ? <div style={{ padding: "11px 13px", borderRadius: 13, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontWeight: 750 }}>{reminderSuccess}</div> : null}

      <div
        className="document-upload-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, .8fr) minmax(0, 1.2fr)",
          gap: 12,
        }}
      >
        <select
          value={documentType}
          onChange={(e) => {
            setDocumentType(e.target.value);
            resetSelectedFiles();
            setError("");
            setSuccess("");
          }}
          style={inputStyle}
        >
          {WORKER_DOCUMENT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {documentType === "other" ? (
          <input
            value={otherDescription}
            maxLength={120}
            placeholder="Document description, e.g. Fall Protection"
            onChange={(e) => setOtherDescription(e.target.value)}
            style={inputStyle}
          />
        ) : <div />}

        {requiresBothSides ? (
          <>
            <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 12, fontWeight: 800 }}>
              FRONT (REQUIRED)
              <input key={`front-${fileInputKey}`} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => selectFile("front", e.target.files?.[0])} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 12, fontWeight: 800 }}>
              BACK (REQUIRED)
              <input key={`back-${fileInputKey}`} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => selectFile("back", e.target.files?.[0])} style={inputStyle} />
            </label>
          </>
        ) : (
          <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 12, fontWeight: 800, gridColumn: "1 / -1" }}>
            DOCUMENT (REQUIRED)
            <input key={`single-${fileInputKey}`} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => selectFile("single", e.target.files?.[0])} style={inputStyle} />
          </label>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !hasRequiredFiles || (documentType === "other" && !otherDescription.trim())}
          style={{
            border: "none",
            background: uploading || !hasRequiredFiles ? "#94a3b8" : "#0f172a",
            color: "#ffffff",
            borderRadius: 14,
            padding: "12px 16px",
            fontWeight: 800,
            cursor: uploading || !hasRequiredFiles ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            gridColumn: "1 / -1",
            justifyContent: "center",
          }}
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div style={{ color: "#64748b", fontSize: 13 }}>
        {requiresBothSides
          ? "Both front and back are required for this document type."
          : "Upload one file for this document type."} A new upload replaces the existing document in the same category.
      </div>

      {error ? (
        <div
          className="worker-contact-panel"
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontWeight: 700 }}>
          {success}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {documents.length === 0 ? (
          <div style={{ color: "#64748b" }}>No documents uploaded yet.</div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 14,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{doc.file_name}</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Type: {getWorkerDocumentLabel(doc.document_type)} • Uploaded: {formatDate(doc.uploaded_at)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Download size={14} />
                  {downloadingId === doc.id ? "Downloading..." : "Download"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  style={{
                    border: "1px solid #fecaca",
                    background: "#ffffff",
                    color: "#b91c1c",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function openWorkerCtsForm(worker) {
  const url = buildCtsJotformPrefillUrl({
    worker_name: worker.name,
    worker_phone: worker.phone,
    worker_email: worker.email,
    worker_address: worker.address,
    worker_city: worker.city,
    worker_state: worker.state,
    worker_zip_code: worker.zip_code,
    worker_date_of_birth: worker.date_of_birth,
    class_snapshot: worker.trades?.name,
    worker_total_experience_years: worker.total_experience_years,
    worker_certifications: worker.worker_certifications,
  });
  window.open(url, "_blank", "noopener,noreferrer");
}

function WorkerCard({
  worker,
  trades,
  locations,
  recruiters,
  permissions,
  onStatusSaved,
  onRecruiterSaved,
  onRecruiterNotesSaved,
  onWorkerSaved,
  onWorkerDeleted,
  onDocumentsChanged,
  onWorkerReviewed,
}) {
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [copiedHoursLink, setCopiedHoursLink] = useState(false);
  const [copyingHoursLink, setCopyingHoursLink] = useState(false);
  const [reminderRequestId, setReminderRequestId] = useState(0);
  const [bioOpen, setBioOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const [recruiterUserId, setRecruiterUserId] = useState(worker.recruiter_user_id || "");
  const [savingRecruiter, setSavingRecruiter] = useState(false);
  const [recruiterError, setRecruiterError] = useState("");

  const [status, setStatus] = useState(worker.status || "completed");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusUpdatedAt, setStatusUpdatedAt] = useState(worker.status_updated_at);

  const [recruiterNotes, setRecruiterNotes] = useState(worker.recruiter_notes || "");
  const [notesUpdatedAt, setNotesUpdatedAt] = useState(worker.recruiter_notes_updated_at);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");

  const skills =
    worker.worker_skills?.map((s) => s.skills?.name).filter(Boolean) || [];

  const certifications =
    worker.worker_certifications?.map((c) => c.certifications?.name).filter(Boolean) || [];

  const languages =
    worker.worker_languages
      ?.map((l) =>
        l.language_name === "English" && l.proficiency_percent
          ? `${l.language_name} (${l.proficiency_percent}%)`
          : l.language_name
      )
      .filter(Boolean) || [];

  const projects = [...(worker.worker_projects || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const workerAddress = formatWorkerAddress(worker);
  const rateValue = formatPayValue(worker.rate);
  const perDiemValue = formatPayValue(worker.per_diem);
  const canEditWorkers = !!permissions?.can_edit_workers;
  const canDeleteWorkers = !!permissions?.can_delete_workers;
  const isUnreviewed = isWorkerUnreviewed(worker);
  const qualityIssues = getWorkerQualityIssues(worker);
  const profileUrl = worker.public_profile_slug
    ? `${window.location.origin}/profile/${worker.public_profile_slug}`
    : "";
  const phoneHref = worker.phone ? `tel:${String(worker.phone).replace(/[^\d+]/g, "")}` : "";
  const smsHref = worker.phone ? `sms:${String(worker.phone).replace(/[^\d+]/g, "")}` : "";
  const emailHref = worker.email ? `mailto:${worker.email}` : "";

  const copyProfileLink = async () => {
    if (!profileUrl) {
      alert("This worker does not have a public profile slug yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedProfile(true);
      window.setTimeout(() => setCopiedProfile(false), 1600);
    } catch {
      window.prompt("Copy profile link", profileUrl);
    }
  };

  const copyHoursLink = async () => {
    const assignment = worker.hours_assignment;
    if (!assignment?.id || !assignment?.cts_job_id) {
      alert("This worker needs to be placed in a CTS job before generating an hours link.");
      return;
    }

    setCopyingHoursLink(true);
    try {
      const weekStart = toDateInputValue(startOfWeek(new Date()));
      const nowIso = new Date().toISOString();
      const expiresAtIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
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
          .upsert(
            {
              cts_job_candidate_id: assignment.id,
              cts_job_id: assignment.cts_job_id,
              worker_id: worker.id,
              week_start_date: weekStart,
              revoked_at: null,
              expires_at: expiresAtIso,
            },
            { onConflict: "cts_job_candidate_id,week_start_date" }
          )
          .select("token")
          .single();

        if (createError) throw createError;
        token = createdLink?.token;
      }

      if (!token) throw new Error("Could not generate worker hours link.");

      const hoursUrl = `${WORKER_HOURS_BASE_URL}/worker/hours/${token}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(hoursUrl);
        setCopiedHoursLink(true);
        window.setTimeout(() => setCopiedHoursLink(false), 1600);
      } else {
        window.prompt("Copy hours link", hoursUrl);
      }
    } catch (error) {
      alert(error.message || "Could not copy worker hours link.");
    } finally {
      setCopyingHoursLink(false);
    }
  };

  const markWorkerReviewed = async () => {
    if (!canEditWorkers || !isUnreviewed) return;

    const reviewedAt = new Date().toISOString();
    const { error } = await supabase
      .from("workers")
      .update({ admin_reviewed_at: reviewedAt })
      .eq("id", worker.id)
      .is("admin_reviewed_at", null);

    if (!error) {
      onWorkerReviewed(worker.id, reviewedAt);
    }
  };

  const saveRecruiterOwner = async (newRecruiterUserId) => {
    if (!canEditWorkers) return;
    setRecruiterUserId(newRecruiterUserId);
    setRecruiterError("");
    setSavingRecruiter(true);

    const { error } = await supabase
      .from("workers")
      .update({
        recruiter_user_id: newRecruiterUserId || null,
      })
      .eq("id", worker.id);

    if (error) {
      setRecruiterError(error.message || "Could not update recruiter owner.");
      setRecruiterUserId(worker.recruiter_user_id || "");
    } else {
      onRecruiterSaved(worker.id, newRecruiterUserId || null);
    }

    setSavingRecruiter(false);
  };

  const saveStatus = async (newStatus) => {
    if (!canEditWorkers) return;
    setStatus(newStatus);
    setStatusError("");
    setSavingStatus(true);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("workers")
      .update({
        status: newStatus,
        status_updated_at: nowIso,
      })
      .eq("id", worker.id);

    if (error) {
      setStatusError(error.message || "Could not update status.");
      setStatus(worker.status || "completed");
      setStatusUpdatedAt(worker.status_updated_at);
    } else {
      setStatusUpdatedAt(nowIso);
      onStatusSaved(worker.id, newStatus, nowIso);
    }

    setSavingStatus(false);
  };

  const saveRecruiterNotes = async () => {
    if (!canEditWorkers) return;
    setNotesError("");
    setSavingNotes(true);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("workers")
      .update({
        recruiter_notes: recruiterNotes.trim() || null,
        recruiter_notes_updated_at: nowIso,
      })
      .eq("id", worker.id);

    if (error) {
      setNotesError(error.message || "Could not save recruiter notes.");
    } else {
      setNotesUpdatedAt(nowIso);
      onRecruiterNotesSaved(worker.id, recruiterNotes.trim() || null, nowIso);
    }

    setSavingNotes(false);
  };

  return (
    <Card
      className="worker-card"
      compact
      style={{
        display: "grid",
        gap: 14,
      }}
    >
      <div
        className="worker-top"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div
            className="worker-card-title-row"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 24, lineHeight: 1.15, fontWeight: 900, color: "#0f172a" }}>
                {worker.name}
              </span>
              {isUnreviewed ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    padding: "5px 9px",
                    background: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #86efac",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  New
                </span>
              ) : null}
            </div>

            <div
              className="worker-card-actions"
              style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}
            >
            <IconButton
              icon={ExternalLink}
              title="Open public profile"
              aria-label="Open public profile"
              onClick={() => {
                if (!worker.public_profile_slug) {
                  alert("This worker does not have a public profile slug yet.");
                  return;
                }
                window.open(`/profile/${worker.public_profile_slug}`, "_blank");
              }}
            />

            <div className="worker-desktop-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <IconButton
                icon={ExternalLink}
                title="CTS Form"
                aria-label="Open CTS Form"
                onClick={() => openWorkerCtsForm(worker)}
              />
              {canEditWorkers ? (
                <>
                <IconButton
                  icon={UserRound}
                  title="Manage candidate profile"
                  aria-label="Manage candidate profile"
                  onClick={() => navigate(`/admin/workers/${worker.id}/profile`)}
                />
                <IconButton
                  icon={FileText}
                  title="Generate CTS BIO"
                  aria-label="Generate CTS BIO"
                  onClick={() => setBioOpen(true)}
                />
                <IconButton
                  icon={Mail}
                  title={worker.email ? "Remind candidate to upload documents" : "Candidate has no email address"}
                  aria-label="Remind candidate to upload documents"
                  disabled={!worker.email}
                  onClick={() => {
                    setDetailsOpen(true);
                    setReminderRequestId((value) => value + 1);
                  }}
                />
                <IconButton
                  icon={Pencil}
                  title="Quick edit worker"
                  aria-label="Quick edit worker"
                  onClick={() => setEditOpen(true)}
                />
                </>
              ) : null}

              {canDeleteWorkers ? (
                <IconButton
                  icon={Trash2}
                  tone="danger"
                  title="Delete worker"
                  aria-label="Delete worker"
                  onClick={() => onWorkerDeleted(worker)}
                />
              ) : null}
            </div>

            <div className="worker-mobile-action-menu" style={{ position: "relative" }}>
                <IconButton
                  icon={MoreVertical}
                  title="Candidate actions"
                  aria-label="Candidate actions"
                  aria-expanded={actionMenuOpen}
                  onClick={() => setActionMenuOpen((open) => !open)}
                />
                {actionMenuOpen ? (
                  <div style={{ position: "absolute", top: 42, right: 0, zIndex: 20, width: 230, padding: 7, display: "grid", gap: 3, border: "1px solid #dbeafe", borderRadius: 14, background: "#ffffff", boxShadow: "0 18px 45px rgba(15,23,42,.2)" }}>
                    <button type="button" onClick={() => { setActionMenuOpen(false); openWorkerCtsForm(worker); }} style={mobileActionMenuItemStyle()}><ExternalLink size={16} /> CTS Form</button>
                    {canEditWorkers ? (
                      <>
                        <button type="button" onClick={() => { setActionMenuOpen(false); navigate(`/admin/workers/${worker.id}/profile`); }} style={mobileActionMenuItemStyle()}><UserRound size={16} /> Manage candidate profile</button>
                        <button type="button" onClick={() => { setActionMenuOpen(false); setBioOpen(true); }} style={mobileActionMenuItemStyle()}><FileText size={16} /> Generate CTS BIO</button>
                        <button type="button" disabled={!worker.email} onClick={() => { setActionMenuOpen(false); setDetailsOpen(true); setReminderRequestId((value) => value + 1); }} style={mobileActionMenuItemStyle(!worker.email)}><Mail size={16} /> Remind documents</button>
                        <button type="button" onClick={() => { setActionMenuOpen(false); setEditOpen(true); }} style={mobileActionMenuItemStyle()}><Pencil size={16} /> Quick edit worker</button>
                      </>
                    ) : null}
                    {canDeleteWorkers ? (
                      <button type="button" onClick={() => { setActionMenuOpen(false); onWorkerDeleted(worker); }} style={mobileActionMenuItemStyle(false, true)}><Trash2 size={16} /> Delete worker</button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill dark>
              <Briefcase size={14} />
              {worker.trades?.name || "No trade"}
            </Pill>

            <Pill>
              <MapPin size={14} />
              {worker.locations?.name || "No location"}
            </Pill>

          </div>

          {qualityIssues.length > 0 ? (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {qualityIssues.map((issue) => (
                <span
                  key={issue}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    borderRadius: 999,
                    padding: "6px 9px",
                    background: "#ffedd5",
                    color: "#9a3412",
                    border: "1px solid #fdba74",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  <AlertTriangle size={12} />
                  {issue}
                </span>
              ))}
            </div>
          ) : null}

          <div
            className="worker-meta"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginTop: 4,
            }}
          >
            <MiniMetric label="Total Experience" value={`${worker.total_experience_years || 0} yrs`} />
            <MiniMetric label="Industrial" value={`${worker.industrial_experience_years || 0} yrs`} />
            <MiniMetric label="Commercial" value={`${worker.commercial_experience_years || 0} yrs`} />
            <MiniMetric label="Residential" value={`${worker.residential_experience_years || 0} yrs`} />
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 12,
            display: "grid",
            gap: 9,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
            <Phone size={15} />
            <span>{worker.phone || "No phone"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
            <Mail size={15} />
            <span>{worker.email || "No email"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
            <MapPin size={15} />
            <span>{workerAddress || "No address"}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
            <IconButton
              icon={Phone}
              title="Call worker"
              aria-label="Call worker"
              disabled={!phoneHref}
              onClick={() => phoneHref && (window.location.href = phoneHref)}
            />
            <IconButton
              icon={MessageCircle}
              title="Text worker"
              aria-label="Text worker"
              disabled={!smsHref}
              onClick={() => smsHref && (window.location.href = smsHref)}
            />
            <IconButton
              icon={Mail}
              title="Email worker"
              aria-label="Email worker"
              disabled={!emailHref}
              onClick={() => emailHref && (window.location.href = emailHref)}
            />
            <IconButton
              icon={copiedProfile ? ShieldCheck : Copy}
              title={copiedProfile ? "Profile link copied" : "Copy profile link"}
              aria-label="Copy profile link"
              disabled={!profileUrl}
              onClick={copyProfileLink}
            />
            <IconButton
              icon={copyingHoursLink ? Loader2 : copiedHoursLink ? ShieldCheck : Link2}
              title={copiedHoursLink ? "Hours link copied" : "Copy hours link"}
              aria-label="Copy hours link"
              disabled={copyingHoursLink || !worker.hours_assignment}
              onClick={copyHoursLink}
            />
          </div>

          <Button
            onClick={() => {
              setDetailsOpen((prev) => !prev);
              void markWorkerReviewed();
            }}
            tone={detailsOpen ? "dark" : "neutral"}
            icon={detailsOpen ? ChevronUp : ChevronDown}
            style={{
              marginTop: 4,
              width: "100%",
            }}
          >
            {detailsOpen ? "Hide Details" : "View Details"}
          </Button>
        </div>
      </div>

      <div
        className="worker-dates"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "#ffffff",
            border: "1px solid #dbeafe",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <DollarSign size={18} color="#0f172a" />
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Rate</div>
            <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 22, lineHeight: 1.15 }}>{rateValue}</div>
          </div>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "#ffffff",
            border: "1px solid #dbeafe",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <DollarSign size={18} color="#0f172a" />
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Per Diem</div>
            <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 22, lineHeight: 1.15 }}>{perDiemValue}</div>
          </div>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <FileText size={16} color="#334155" />
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Notes Updated</div>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatDate(notesUpdatedAt)}</div>
          </div>
        </div>
      </div>

      {detailsOpen ? (
        <>
          <div
            className="worker-dates"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CalendarDays size={16} color="#334155" />
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Registered</div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatDate(worker.created_at)}</div>
              </div>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CalendarDays size={16} color="#334155" />
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Status Updated</div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatDate(statusUpdatedAt)}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>Workflow</div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "7px 11px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 800,
                  ...getStatusStyle(status),
                }}
              >
                {formatStatus(status)}
              </span>
            </div>

            <div
              className="filters-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Recruiter">
                <select
                  value={recruiterUserId}
                  onChange={(e) => saveRecruiterOwner(e.target.value)}
                  disabled={savingRecruiter || !canEditWorkers}
                  style={{
                    ...inputStyle,
                    padding: "10px 12px",
                    background: savingRecruiter || !canEditWorkers ? "#f8fafc" : "#ffffff",
                    cursor: savingRecruiter || !canEditWorkers ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">Unassigned</option>
                  {recruiters.map((recruiter) => (
                    <option key={recruiter.user_id} value={recruiter.user_id}>
                      {recruiter.full_name || recruiter.email || recruiter.user_id}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => saveStatus(e.target.value)}
                  disabled={savingStatus || !canEditWorkers}
                  style={{
                    ...inputStyle,
                    padding: "10px 12px",
                    background: savingStatus || !canEditWorkers ? "#f8fafc" : "#ffffff",
                    cursor: savingStatus || !canEditWorkers ? "not-allowed" : "pointer",
                  }}
                  >
                  <option value="completed">Available</option>
                  <option value="rejected">Rejected</option>
                  <option value="hold">Hold</option>
                  <option value="working">Working</option>
                </select>
              </Field>
            </div>

            {savingRecruiter || savingStatus ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 13, fontWeight: 700 }}>
                <Loader2 size={14} className="spin" />
                Saving workflow...
              </div>
            ) : null}

            {recruiterError || statusError ? (
              <div style={{ color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
                {recruiterError || statusError}
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#0f172a" }}>
              <FileText size={16} />
              <span>Recruiter / Admin Notes</span>
            </div>

            <textarea
              value={recruiterNotes}
              onChange={(e) => setRecruiterNotes(e.target.value)}
              placeholder="Internal notes about communication, readiness, interview impression, pay expectations, travel flexibility, etc."
              style={textareaStyle}
              disabled={!canEditWorkers}
            />

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={saveRecruiterNotes}
                disabled={savingNotes || !canEditWorkers}
                style={{
                  border: "none",
                  background: savingNotes || !canEditWorkers ? "#94a3b8" : "#0f172a",
                  color: "#ffffff",
                  borderRadius: 14,
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor: savingNotes || !canEditWorkers ? "not-allowed" : "pointer",
                }}
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>

              {notesError ? (
                <div
                  style={{
                    color: "#b91c1c",
                    fontSize: 13,
                    fontWeight: 700,
                    alignSelf: "center",
                  }}
                >
                  {notesError}
                </div>
              ) : null}
            </div>
          </div>

          <WorkerDocumentsPanel
            worker={worker}
            documents={worker.worker_documents || []}
            onDocumentsChanged={onDocumentsChanged}
            openReminderRequestId={reminderRequestId}
          />

          <div style={{ display: "grid", gap: 16 }}>
            <TagRow
              title="Skills"
              values={skills}
              icon={<Wrench size={16} color="#334155" />}
              emptyLabel="No skills"
            />

            <TagRow
              title="Certifications"
              values={certifications}
              icon={<ShieldCheck size={16} color="#334155" />}
              emptyLabel="No certifications"
            />

            <TagRow
              title="Languages"
              values={languages}
              icon={<Languages size={16} color="#334155" />}
              emptyLabel="No languages"
            />
          </div>

          <div
            className="worker-notes"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={fieldGroupTitleStyle()}>Strengths</div>
              <div style={{ color: "#475569", lineHeight: 1.7 }}>
                {worker.strengths || "No strengths listed."}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={fieldGroupTitleStyle()}>Needs Improvement</div>
              <div style={{ color: "#475569", lineHeight: 1.7 }}>
                {worker.needs_improvement || "No notes listed."}
              </div>
            </div>
          </div>

          <div
            className="worker-actions"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setProjectsOpen(!projectsOpen)}
              style={{
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                width: "fit-content",
              }}
            >
              {projectsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {projectsOpen ? "Hide Projects" : `Projects (${projects.length})`}
            </button>
          </div>

          {projectsOpen ? (
            <div style={{ display: "grid", gap: 12 }}>
              {projects.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    color: "#64748b",
                  }}
                >
                  No project history found.
                </div>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "#f8fbff",
                      padding: 16,
                      borderRadius: 18,
                      border: "1px solid #dbeafe",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>
                      {p.project_name || "Untitled project"}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {p.project_location ? (
                        <span style={pillStyle()}>
                          <MapPin size={14} />
                          {p.project_location}
                        </span>
                      ) : null}

                      {p.duration ? <span style={pillStyle()}>{p.duration}</span> : null}
                    </div>

                    <div style={{ color: "#475569", lineHeight: 1.7 }}>
                      {p.description || "No description."}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {bioOpen ? (
        <CtsBioModal
          worker={worker}
          onClose={() => setBioOpen(false)}
          onSaved={onDocumentsChanged}
        />
      ) : null}

      {editOpen ? (
        <WorkerEditModal
          worker={worker}
          trades={trades}
          locations={locations}
          onClose={() => setEditOpen(false)}
          onSaved={onWorkerSaved}
        />
      ) : null}
    </Card>
  );
}


export default function LegacyAdminPage() {
  const location = useLocation();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [contactIssueFilter, setContactIssueFilter] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [sortBy, setSortBy] = useState("newest_registered");
  const [trades, setTrades] = useState([]);
  const [locations, setLocations] = useState([]);
  const [skills, setSkills] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [recruiterFilter, setRecruiterFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [permissions, setPermissions] = useState({
    can_edit_workers: false,
    can_delete_workers: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get("q");
    if (query) {
      void Promise.resolve().then(() => setSearch(query));
    }
  }, [location.search]);

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    const timeout = window.setTimeout(resetScroll, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("workers")
        .select(`
          *,
          trades(name),
          locations(name),
          worker_languages(language_name, proficiency_percent),
          worker_projects(*),
          worker_skills(skills(id, name)),
          worker_certifications(certifications(name)),
          worker_documents(*)
        `);
      const placedCandidatesData = await supabase
        .from("cts_job_candidates")
        .select("id, worker_id, cts_job_id, candidate_status, updated_at")
        .ilike("candidate_status", "placed");

      const tradesData = await supabase.from("trades").select("*").order("name");
      const locationsData = await supabase.from("locations").select("*").order("name");
      const skillsData = await supabase.from("skills").select("*").order("name");
      const recruitersData = await supabase
        .from("recruiters")
        .select("id, user_id, full_name, email, is_active")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      const permissionsData = await supabase
        .from("admin_permissions")
        .select("can_edit_workers, can_delete_workers")
        .maybeSingle();

      if (!error) {
        const placedCandidates = [...(placedCandidatesData.data || [])].sort(
          (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
        );
        const placedWorkerIds = new Set(
          placedCandidates
            .map((candidate) => candidate.worker_id)
            .filter(Boolean)
        );
        const placedCandidateByWorkerId = new Map();
        placedCandidates.forEach((candidate) => {
          if (candidate.worker_id && !placedCandidateByWorkerId.has(candidate.worker_id)) {
            placedCandidateByWorkerId.set(candidate.worker_id, candidate);
          }
        });
        const syncedWorkers = (data || []).map((worker) => ({
          ...worker,
          hours_assignment: placedCandidateByWorkerId.get(worker.id) || null,
          status: getSyncedWorkerStatus(worker, placedWorkerIds),
        }));
        const statusUpdates = (data || [])
          .map((worker) => ({
            worker,
            status: getSyncedWorkerStatus(worker, placedWorkerIds),
          }))
          .filter(({ worker, status }) => worker.status !== status);

        if (statusUpdates.length > 0) {
          const statusUpdatedAt = new Date().toISOString();
          await Promise.all(
            statusUpdates.map(({ worker, status }) =>
              supabase
                .from("workers")
                .update({ status, status_updated_at: statusUpdatedAt })
                .eq("id", worker.id)
            )
          );
          setWorkers(
            syncedWorkers.map((worker) =>
              statusUpdates.some((item) => item.worker.id === worker.id)
                ? { ...worker, status_updated_at: statusUpdatedAt }
                : worker
            )
          );
        } else {
          setWorkers(syncedWorkers);
        }
      }
      setTrades(tradesData.data || []);
      setLocations(locationsData.data || []);
      setSkills(skillsData.data || []);
      setRecruiters(recruitersData.data || []);
      if (!permissionsData.error && permissionsData.data) {
        setPermissions({
          can_edit_workers: !!permissionsData.data.can_edit_workers,
          can_delete_workers: !!permissionsData.data.can_delete_workers,
        });
      }
      setLoading(false);
    };

    load();
  }, []);

  const reloadWorkerDocuments = async (workerId) => {
    const { data, error } = await supabase
      .from("worker_documents")
      .select("*")
      .eq("worker_id", workerId)
      .order("uploaded_at", { ascending: false });

    if (!error) {
      setWorkers((prev) =>
        prev.map((worker) =>
          worker.id === workerId
            ? { ...worker, worker_documents: data || [] }
            : worker
        )
      );
    }
  };

  const handleStatusSaved = (workerId, newStatus, statusUpdatedAt) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? { ...worker, status: newStatus, status_updated_at: statusUpdatedAt }
          : worker
      )
    );
  };

  const handleRecruiterSaved = (workerId, recruiterUserId) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? {
              ...worker,
              recruiter_user_id: recruiterUserId,
            }
          : worker
      )
    );
  };

  const handleRecruiterNotesSaved = (workerId, notes, notesUpdatedAt) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? {
              ...worker,
              recruiter_notes: notes,
              recruiter_notes_updated_at: notesUpdatedAt,
            }
          : worker
      )
    );
  };

  const handleWorkerReviewed = (workerId, reviewedAt) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? {
              ...worker,
              admin_reviewed_at: reviewedAt,
            }
          : worker
      )
    );
  };

  const handleWorkerSaved = (updatedWorker) => {
    setWorkers((prev) =>
      prev.map((worker) => (worker.id === updatedWorker.id ? updatedWorker : worker))
    );
  };

  const handleWorkerDeleted = async (worker) => {
    if (!permissions.can_delete_workers) return;

    const confirmed = window.confirm(
      `Delete "${worker.name}"? This will remove the worker profile and related admin data.`
    );
    if (!confirmed) return;

    const documentPaths =
      worker.worker_documents?.map((doc) => doc.file_path).filter(Boolean) || [];

    try {
      if (documentPaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("worker-documents")
          .remove(documentPaths);

        if (storageError) throw storageError;
      }

      const { error } = await supabase.rpc("delete_worker_admin", {
        p_worker_id: worker.id,
      });

      if (error) throw error;

      setWorkers((prev) => prev.filter((item) => item.id !== worker.id));
    } catch (err) {
      alert(err.message || "Could not delete worker.");
    }
  };

  const filtered = useMemo(() => {
    const base = workers.filter((w) => {
      const term = search.toLowerCase().trim();

      const matchSearch =
        !term ||
        w.name?.toLowerCase().includes(term) ||
        w.email?.toLowerCase().includes(term) ||
        w.phone?.toLowerCase().includes(term) ||
        w.recruiter_notes?.toLowerCase().includes(term);

      const matchTrade = !tradeFilter || w.trade_id === tradeFilter;
      const matchLocation = !locationFilter || w.location_id === locationFilter;
      const matchStatus = !statusFilter || w.status === statusFilter;
      const matchReview = reviewFilter !== "unreviewed" || isWorkerUnreviewed(w);
      const matchContactIssue =
        !contactIssueFilter ||
        !String(w.phone || "").trim() ||
        !String(w.email || "").trim();
      const matchRecruiter =
        !recruiterFilter ||
        (recruiterFilter === "unassigned"
          ? !w.recruiter_user_id
          : w.recruiter_user_id === recruiterFilter);

      const workerSkillIds =
        w.worker_skills?.map((s) => s.skills?.id).filter(Boolean) || [];

      const matchSkills =
        selectedSkillIds.length === 0 ||
        selectedSkillIds.some((skillId) => workerSkillIds.includes(skillId));

      return (
        matchSearch &&
        matchTrade &&
        matchLocation &&
        matchStatus &&
        matchReview &&
        matchContactIssue &&
        matchRecruiter &&
        matchSkills
      );
    });

    const sorted = [...base].sort((a, b) => {
      if (sortBy === "newest_registered") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }

      if (sortBy === "oldest_registered") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }

      const statusDiff = statusPriority(a.status) - statusPriority(b.status);
      if (statusDiff !== 0) return statusDiff;

      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return sorted;
  }, [
    workers,
    search,
    tradeFilter,
    locationFilter,
    statusFilter,
    reviewFilter,
    contactIssueFilter,
    recruiterFilter,
    selectedSkillIds,
    sortBy,
  ]);

  const holdCount = workers.filter((w) => w.status === "hold").length;
  const rejectedCount = workers.filter((w) => w.status === "rejected").length;
  const completedCount = workers.filter((w) => w.status === "completed").length;
  const workingCount = workers.filter((w) => w.status === "working").length;
  const unreviewedCount = workers.filter(isWorkerUnreviewed).length;
  const missingPhoneEmailCount = workers.filter(
    (w) => !String(w.phone || "").trim() || !String(w.email || "").trim()
  ).length;
  const workflowStatusBadges = [
    { value: "completed", label: "Available", count: completedCount },
    { value: "rejected", label: "Rejected", count: rejectedCount },
    { value: "hold", label: "Hold", count: holdCount },
    { value: "working", label: "Working", count: workingCount },
  ];
  const hasAdvancedFilters =
    !!tradeFilter ||
    !!locationFilter ||
    !!statusFilter ||
    !!reviewFilter ||
    contactIssueFilter ||
    !!recruiterFilter ||
    selectedSkillIds.length > 0 ||
    sortBy !== "newest_registered";

  const clearAdvancedFilters = () => {
    setTradeFilter("");
    setLocationFilter("");
    setStatusFilter("");
    setReviewFilter("");
    setContactIssueFilter(false);
    setRecruiterFilter("");
    setSelectedSkillIds([]);
    setSortBy("newest_registered");
  };

  return (
    <>
      <PageStyles />
<UtsLegacyTopNavBar />
      <div
        className="admin-shell"
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        }}
      >
        <div className="admin-dashboard" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 24 }}>
          <div
            className="admin-panel"
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: 32,
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
              border: "1px solid #dbeafe",
              display: "grid",
              gap: 24,
            }}
          >
            <div
              className="admin-kicker"
              style={{
                display: "inline-flex",
                width: "fit-content",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 999,
                background: "#0f172a",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              Universal Talent Source
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(34px, 5vw, 42px)",
                    lineHeight: 1.08,
                    letterSpacing: 0,
                  }}
                  className="admin-heading"
                >
                  Admin Panel
                </h1>

              </div>

              <p className="admin-subtitle" style={{ margin: 0, color: "#475569", fontSize: 18, lineHeight: 1.7 }}>
                Review, search, filter, sort, and manage workers by workflow status.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 20 }}>Workflow Status</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setReviewFilter((prev) => (prev === "unreviewed" ? "" : "unreviewed"))}
                    aria-pressed={reviewFilter === "unreviewed"}
                    title="Filter unreviewed workers"
                    style={{
                      ...pillStyle(),
                      border: reviewFilter === "unreviewed" ? "1px solid #0f172a" : "1px solid #86efac",
                      background: reviewFilter === "unreviewed" ? "#0f172a" : "#dcfce7",
                      color: reviewFilter === "unreviewed" ? "#ffffff" : "#166534",
                      cursor: "pointer",
                      boxShadow: reviewFilter === "unreviewed" ? "0 10px 24px rgba(15, 23, 42, 0.2)" : "none",
                    }}
                  >
                    New / Unreviewed: {unreviewedCount}
                  </button>
                  {missingPhoneEmailCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setContactIssueFilter((prev) => !prev)}
                      aria-pressed={contactIssueFilter}
                      title="Filter workers missing phone or email"
                      style={{
                        ...pillStyle(),
                        border: contactIssueFilter ? "1px solid #0f172a" : "1px solid #fdba74",
                        background: contactIssueFilter ? "#0f172a" : "#ffedd5",
                        color: contactIssueFilter ? "#ffffff" : "#9a3412",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        cursor: "pointer",
                        boxShadow: contactIssueFilter ? "0 10px 24px rgba(15, 23, 42, 0.2)" : "none",
                        transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                      }}
                    >
                      <AlertTriangle size={15} strokeWidth={2.7} />
                      Missing Phone/Email: {missingPhoneEmailCount}
                    </button>
                  ) : null}
                  <span style={{ ...pillStyle(true), fontSize: 14 }}>
                    Total Workers: {workers.length}
                  </span>
                </div>
              </div>
              <div className="admin-pill-strip" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {statusFilter && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("")}
                    title="Clear workflow status filter"
                    aria-label="Clear workflow status filter"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <X size={17} strokeWidth={2.6} />
                  </button>
                )}
                {workflowStatusBadges.map((badge) => {
                  const statusStyle = getStatusStyle(badge.value);
                  const isSelected = statusFilter === badge.value;

                  return (
                    <button
                      key={badge.value}
                      type="button"
                      onClick={() => setStatusFilter(badge.value)}
                      aria-pressed={isSelected}
                      style={{
                        ...pillStyle(),
                        ...statusStyle,
                        border: isSelected ? "1px solid #0f172a" : statusStyle.border,
                        background: isSelected ? "#0f172a" : statusStyle.background,
                        color: isSelected ? "#ffffff" : statusStyle.color,
                        cursor: "pointer",
                        boxShadow: isSelected ? "0 10px 24px rgba(15, 23, 42, 0.2)" : "none",
                        transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                      }}
                    >
                      {badge.label}: {badge.count}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ position: "relative", width: "100%" }}>
              <input
                placeholder="Search by name, email, phone or notes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setSearch("");
                    e.currentTarget.blur();
                  }
                }}
                style={{
                  ...inputStyle,
                  height: 50,
                  paddingRight: search ? 46 : 14,
                }}
              />

              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  title="Clear search"
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    border: "none",
                    background: "#f1f5f9",
                    color: "#334155",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <div
              className="filters-card"
              style={{
                background: "#f8fbff",
                border: "1px solid #dbeafe",
                borderRadius: 24,
                padding: 18,
                display: "grid",
                gap: filtersOpen ? 18 : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 900, color: "#0f172a" }}>
                    Filtered Results: {filtered.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((prev) => !prev)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#0f172a",
                      fontWeight: 900,
                      fontSize: 18,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: 0,
                    }}
                  >
                    {filtersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    Filters & Sorting
                  </button>
                </div>

                {filtersOpen && hasAdvancedFilters ? (
                  <button
                    type="button"
                    onClick={clearAdvancedFilters}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      borderRadius: 12,
                      padding: "8px 12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <X size={14} />
                    Clear filters
                  </button>
                ) : null}
              </div>

              {filtersOpen ? (
                <>
                  <div
                    className="filters-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                      gap: 14,
                    }}
                  >
                    <select value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)} style={inputStyle}>
                      <option value="">All Trades</option>
                      {trades.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>

                    <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={inputStyle}>
                      <option value="">All Locations</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                      <option value="">All Statuses</option>
                      <option value="completed">Available</option>
                      <option value="rejected">Rejected</option>
                      <option value="hold">Hold</option>
                      <option value="working">Working</option>
                    </select>

                    <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} style={inputStyle}>
                      <option value="">All Reviews</option>
                      <option value="unreviewed">New / Unreviewed</option>
                    </select>

                    <select value={recruiterFilter} onChange={(e) => setRecruiterFilter(e.target.value)} style={inputStyle}>
                      <option value="">All Recruiters</option>
                      <option value="unassigned">Unassigned</option>
                      {recruiters.map((recruiter) => (
                        <option key={recruiter.user_id} value={recruiter.user_id}>
                          {recruiter.full_name || recruiter.email || recruiter.user_id}
                        </option>
                      ))}
                    </select>

                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>
                      <option value="newest_registered">Sort: Newest Registered</option>
                      <option value="oldest_registered">Sort: Oldest Registered</option>
                      <option value="status_priority">Sort: Status Priority</option>
                    </select>
                  </div>

                  <SkillMultiFilter
                    skills={skills}
                    selectedSkillIds={selectedSkillIds}
                    setSelectedSkillIds={setSelectedSkillIds}
                  />
                </>
              ) : null}
            </div>

            <div className="workers-list" style={{ display: "grid", gap: 18 }}>
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 18,
                    borderRadius: 18,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontWeight: 800,
                  }}
                >
                  <Loader2 size={18} className="spin" />
                  Loading workers...
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 18,
                    background: "#ffffff",
                    border: "1px dashed #cbd5e1",
                    color: "#64748b",
                    fontWeight: 700,
                    display: "grid",
                    justifyItems: "start",
                    gap: 12,
                  }}
                >
                  <span>No workers found for the selected filters.</span>
                  {(search || hasAdvancedFilters) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        clearAdvancedFilters();
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#0f172a",
                        borderRadius: 12,
                        padding: "9px 12px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              ) : (
                filtered.map((w) => (
                  <WorkerCard
                    key={w.id}
                    worker={w}
                    trades={trades}
                    locations={locations}
                    recruiters={recruiters}
                    permissions={permissions}
                    onStatusSaved={handleStatusSaved}
                    onRecruiterSaved={handleRecruiterSaved}
                    onRecruiterNotesSaved={handleRecruiterNotesSaved}
                    onWorkerSaved={handleWorkerSaved}
                    onWorkerDeleted={handleWorkerDeleted}
                    onDocumentsChanged={() => reloadWorkerDocuments(w.id)}
                    onWorkerReviewed={handleWorkerReviewed}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <GoToTopButton showAfter={600} />
    </>
  );
}

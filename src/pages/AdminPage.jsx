import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import {
  findLocationIdByState,
  lookupUsZipCode,
  normalizeZipCode,
} from "../lib/addressLookup";
import {
  Users,
  Search,
  Loader2,
  FolderKanban,
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
  FileText,
  Upload,
  Paperclip,
  Trash2,
  Download,
  Pencil,
  ExternalLink,
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
        .availability-grid,
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
          padding: 10px 10px calc(28px + env(safe-area-inset-bottom)) !important;
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

        .admin-pill-strip > span {
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
          grid-template-columns: 1fr !important;
        }

        .worker-card-actions {
          justify-content: flex-start !important;
        }
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

function fieldGroupTitleStyle() {
  return {
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  };
}

function getStatusStyle(status) {
  switch (status) {
    case "onboarding":
      return {
        background: "#e0f2fe",
        color: "#0c4a6e",
        border: "1px solid #7dd3fc",
      };
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
    case "pending":
    default:
      return {
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      };
  }
}

function getAvailabilityStyle(availability) {
  switch (availability) {
    case "available_soon":
      return {
        background: "#e0f2fe",
        color: "#0c4a6e",
        border: "1px solid #7dd3fc",
      };
    case "on_project":
      return {
        background: "#ede9fe",
        color: "#5b21b6",
        border: "1px solid #c4b5fd",
      };
    case "unavailable":
    default:
      return {
        background: "#f1f5f9",
        color: "#334155",
        border: "1px solid #cbd5e1",
      };
  }
}

function formatStatus(status) {
  switch (status) {
    case "onboarding":
      return "OnBoarding";
    case "hold":
      return "Hold";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    case "working":
      return "Working";
    case "pending":
    default:
      return "Pending";
  }
}

function formatAvailability(availability) {
  switch (availability) {
    case "available_soon":
      return "Available";
    case "on_project":
      return "On Project";
    case "unavailable":
    default:
      return "Unavailable";
  }
}

function statusPriority(status) {
  switch (status) {
    case "pending":
      return 1;
    case "onboarding":
      return 2;
    case "working":
      return 3;
    case "hold":
      return 4;
    case "completed":
      return 5;
    case "rejected":
      return 6;
    default:
      return 99;
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function StatCard({ icon, label, value }) {
  return (
    <Card compact style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#334155" }}>
        {icon}
        <div style={{ fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: "#0f172a" }}>{value}</div>
    </Card>
  );
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

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
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
        worker_languages(language_name),
        worker_projects(*),
        worker_skills(skills(id, name)),
        worker_certifications(certifications(name)),
        worker_documents(*)
      `)
      .single();

    if (error) {
      setError(error.message || "Could not update worker.");
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
            <input value={form.phone} onChange={(e) => update("phone", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} style={inputStyle} />
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

function WorkerDocumentsPanel({ workerId, documents, onDocumentsChanged }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState("resume");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");

  const handleUpload = async () => {
    if (!selectedFiles.length) return;

    setUploading(true);
    setError("");

    try {
      const uploadedRows = [];

      for (const file of selectedFiles) {
        const safeName = file.name.replace(/\s+/g, "_");
        const path = `${workerId}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("worker-documents")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (uploadError) throw uploadError;

        uploadedRows.push({
          worker_id: workerId,
          file_name: file.name,
          file_path: path,
          file_type: file.type || null,
          file_size: file.size || null,
          document_type: documentType,
        });
      }

      const { error: insertError } = await supabase
        .from("worker_documents")
        .insert(uploadedRows);

      if (insertError) throw insertError;

      setSelectedFiles([]);
      onDocumentsChanged();
    } catch (err) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#0f172a" }}>
        <Paperclip size={16} />
        <span>Documents</span>
      </div>

      <div
        className="document-upload-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 220px auto",
          gap: 12,
        }}
      >
        <input
          type="file"
          multiple
          onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
          style={inputStyle}
        />

        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          style={inputStyle}
        >
          <option value="resume">Resume</option>
          <option value="osha">OSHA Card</option>
          <option value="certification">Certification</option>
          <option value="license">License</option>
          <option value="id">ID</option>
          <option value="other">Other</option>
        </select>

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          style={{
            border: "none",
            background: uploading || selectedFiles.length === 0 ? "#94a3b8" : "#0f172a",
            color: "#ffffff",
            borderRadius: 14,
            padding: "12px 16px",
            fontWeight: 800,
            cursor: uploading || selectedFiles.length === 0 ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {selectedFiles.length > 0 ? (
        <div style={{ color: "#475569", fontSize: 14 }}>
          {selectedFiles.length} file(s) selected
        </div>
      ) : null}

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
                  Type: {doc.document_type || "other"} • Uploaded: {formatDate(doc.uploaded_at)}
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

function WorkerCard({
  worker,
  trades,
  locations,
  recruiters,
  permissions,
  onStatusSaved,
  onAvailabilitySaved,
  onRecruiterSaved,
  onRecruiterNotesSaved,
  onWorkerSaved,
  onWorkerDeleted,
  onDocumentsChanged,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [recruiterUserId, setRecruiterUserId] = useState(worker.recruiter_user_id || "");
  const [savingRecruiter, setSavingRecruiter] = useState(false);
  const [recruiterError, setRecruiterError] = useState("");

  const [status, setStatus] = useState(worker.status || "pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusUpdatedAt, setStatusUpdatedAt] = useState(worker.status_updated_at);

  const [availability, setAvailability] = useState(
    worker.availability || "available_soon"
  );
  const [availableFrom, setAvailableFrom] = useState(worker.available_from || "");
  const [willingToTravel, setWillingToTravel] = useState(
    worker.willing_to_travel ?? true
  );
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const [recruiterNotes, setRecruiterNotes] = useState(worker.recruiter_notes || "");
  const [notesUpdatedAt, setNotesUpdatedAt] = useState(worker.recruiter_notes_updated_at);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");

  const skills =
    worker.worker_skills?.map((s) => s.skills?.name).filter(Boolean) || [];

  const certifications =
    worker.worker_certifications?.map((c) => c.certifications?.name).filter(Boolean) || [];

  const languages =
    worker.worker_languages?.map((l) => l.language_name).filter(Boolean) || [];

  const projects = [...(worker.worker_projects || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const workerAddress = formatWorkerAddress(worker);
  const canEditWorkers = !!permissions?.can_edit_workers;
  const canDeleteWorkers = !!permissions?.can_delete_workers;

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
      setStatus(worker.status || "pending");
      setAvailability(worker.availability || "available_soon");
      setStatusUpdatedAt(worker.status_updated_at);
    } else {
      setStatusUpdatedAt(nowIso);
      onStatusSaved(worker.id, newStatus, nowIso);

      const updatedAvailability =
        worker.status === "pending" && newStatus !== "pending"
          ? "unavailable"
          : newStatus === "pending"
          ? "available_soon"
          : availability;

      setAvailability(updatedAvailability);

      onAvailabilitySaved(worker.id, {
        availability: updatedAvailability,
        available_from: worker.available_from,
        willing_to_travel: worker.willing_to_travel,
      });
    }

    setSavingStatus(false);
  };

  const saveAvailability = async () => {
    if (!canEditWorkers) return;
    setAvailabilityError("");
    setSavingAvailability(true);

    const { error } = await supabase
      .from("workers")
      .update({
        availability,
        available_from: availableFrom || null,
        willing_to_travel: willingToTravel,
      })
      .eq("id", worker.id);

    if (error) {
      setAvailabilityError(error.message || "Could not update availability.");
    } else {
      onAvailabilitySaved(worker.id, {
        availability,
        available_from: availableFrom || null,
        willing_to_travel: willingToTravel,
      });
    }

    setSavingAvailability(false);
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

  const showAvailabilityTag = status === "pending";

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
            <div style={{ minWidth: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 900, color: "#0f172a" }}>
              {worker.name}
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

            {canEditWorkers ? (
              <IconButton
                icon={Pencil}
                title="Edit worker"
                aria-label="Edit worker"
                onClick={() => setEditOpen(true)}
              />
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

            {showAvailabilityTag ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "7px 11px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 800,
                  ...getAvailabilityStyle(availability),
                }}
              >
                {formatAvailability(availability)}
              </span>
            ) : null}
          </div>

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

          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>
              Recruiter
            </div>

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

            {savingRecruiter ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Loader2 size={14} className="spin" />
                Saving recruiter...
              </div>
            ) : null}

            {recruiterError ? (
              <div
                style={{
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {recruiterError}
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>
              Status
            </div>

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
              <option value="pending">Pending</option>
              <option value="onboarding">OnBoarding</option>
              <option value="hold">Hold</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="working">Working</option>
            </select>

            {savingStatus ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Loader2 size={14} className="spin" />
                Saving status...
              </div>
            ) : null}

            {statusError ? (
              <div
                style={{
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {statusError}
              </div>
            ) : null}
          </div>

          <Button
            onClick={() => setDetailsOpen((prev) => !prev)}
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
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 800, color: "#0f172a" }}>Pending Pool Availability</div>

            <div
              className="availability-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  style={inputStyle}
                  disabled={status !== "pending" || !canEditWorkers}
                >
                  <option value="available_soon">Available</option>
                  <option value="on_project">On Project</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Available From</label>
                <input
                  type="date"
                  value={availableFrom || ""}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  style={inputStyle}
                  disabled={status !== "pending" || !canEditWorkers}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Travel</label>
                <button
                  type="button"
                  onClick={() => {
                    if (status !== "pending" || !canEditWorkers) return;
                    setWillingToTravel((prev) => !prev);
                  }}
                  disabled={status !== "pending" || !canEditWorkers}
                  style={{
                    ...inputStyle,
                    cursor: status !== "pending" || !canEditWorkers ? "not-allowed" : "pointer",
                    textAlign: "left",
                    background:
                      status !== "pending" || !canEditWorkers
                        ? "#f8fafc"
                        : willingToTravel
                        ? "#dcfce7"
                        : "#fee2e2",
                    color:
                      status !== "pending" || !canEditWorkers
                        ? "#94a3b8"
                        : willingToTravel
                        ? "#166534"
                        : "#991b1b",
                    border:
                      status !== "pending" || !canEditWorkers
                        ? "1px solid #e2e8f0"
                        : willingToTravel
                        ? "1px solid #86efac"
                        : "1px solid #fca5a5",
                  }}
                >
                  {!canEditWorkers
                    ? "View Only"
                    : status !== "pending"
                    ? "Availability controlled only for Pending"
                    : willingToTravel
                    ? "Willing to Travel"
                    : "Not Willing to Travel"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={saveAvailability}
                disabled={savingAvailability || status !== "pending" || !canEditWorkers}
                style={{
                  border: "none",
                  background:
                    savingAvailability || status !== "pending" || !canEditWorkers
                      ? "#94a3b8"
                      : "#0f172a",
                  color: "#ffffff",
                  borderRadius: 14,
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor:
                    savingAvailability || status !== "pending" || !canEditWorkers
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {savingAvailability ? "Saving..." : "Save Availability"}
              </button>

              {status !== "pending" ? (
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 700,
                    alignSelf: "center",
                  }}
                >
                  Availability only applies to workers in Pending.
                </div>
              ) : null}

              {availabilityError ? (
                <div
                  style={{
                    color: "#b91c1c",
                    fontSize: 13,
                    fontWeight: 700,
                    alignSelf: "center",
                  }}
                >
                  {availabilityError}
                </div>
              ) : null}
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
            workerId={worker.id}
            documents={worker.worker_documents || []}
            onDocumentsChanged={onDocumentsChanged}
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


export default function AdminPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [sortBy, setSortBy] = useState("status_priority");
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
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("workers")
        .select(`
          *,
          trades(name),
          locations(name),
          worker_languages(language_name),
          worker_projects(*),
          worker_skills(skills(id, name)),
          worker_certifications(certifications(name)),
          worker_documents(*)
        `);

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

      if (!error) setWorkers(data || []);
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

  const handleAvailabilitySaved = (workerId, payload) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? {
              ...worker,
              availability: payload.availability,
              available_from: payload.available_from,
              willing_to_travel: payload.willing_to_travel,
            }
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
      const matchRecruiter =
        !recruiterFilter ||
        (recruiterFilter === "unassigned"
          ? !w.recruiter_user_id
          : w.recruiter_user_id === recruiterFilter);

      const matchAvailability =
        !availabilityFilter ||
        (w.status === "pending" && w.availability === availabilityFilter);

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
        matchRecruiter &&
        matchAvailability &&
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
    availabilityFilter,
    recruiterFilter,
    selectedSkillIds,
    sortBy,
  ]);

  const totalProjects = workers.reduce(
    (acc, worker) => acc + (worker.worker_projects?.length || 0),
    0
  );

  const pendingCount = workers.filter((w) => w.status === "pending").length;
  const onboardingCount = workers.filter((w) => w.status === "onboarding").length;
  const holdCount = workers.filter((w) => w.status === "hold").length;
  const rejectedCount = workers.filter((w) => w.status === "rejected").length;
  const completedCount = workers.filter((w) => w.status === "completed").length;
  const workingCount = workers.filter((w) => w.status === "working").length;

  const poolCount = pendingCount;
  const availableCount = workers.filter(
    (w) => w.status === "pending" && w.availability === "available_soon"
  ).length;
  const onProjectCount = workers.filter(
    (w) => w.status === "pending" && w.availability === "on_project"
  ).length;
  const unavailableCount = workers.filter(
    (w) => w.status === "pending" && w.availability === "unavailable"
  ).length;

  const hasAdvancedFilters =
    !!tradeFilter ||
    !!locationFilter ||
    !!statusFilter ||
    !!availabilityFilter ||
    !!recruiterFilter ||
    selectedSkillIds.length > 0 ||
    sortBy !== "status_priority";

  const clearAdvancedFilters = () => {
    setTradeFilter("");
    setLocationFilter("");
    setStatusFilter("");
    setAvailabilityFilter("");
    setRecruiterFilter("");
    setSelectedSkillIds([]);
    setSortBy("status_priority");
  };

  return (
    <>
      <PageStyles />
<UtsTopNavBar />
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
            <div style={{ display: "grid", gap: 18 }}>
              <div
                className="admin-title-search-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(320px, 560px)",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 28,
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

                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    placeholder="Search by name, email, phone or notes"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
              </div>

              <div style={{ display: "grid", gap: 8 }}>
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

                <p className="admin-subtitle" style={{ margin: 0, color: "#475569", fontSize: 18, lineHeight: 1.7 }}>
                  Review, search, filter, sort, and manage both workflow status and pending-pool availability.
                </p>
              </div>
            </div>

            <div
              className="stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <StatCard
                icon={<Users size={18} />}
                label="Total Workers"
                value={workers.length}
              />
              <StatCard
                icon={<Search size={18} />}
                label="Filtered Results"
                value={filtered.length}
              />
              <StatCard
                icon={<FolderKanban size={18} />}
                label="Projects Logged"
                value={totalProjects}
              />
              <StatCard
                icon={<ShieldCheck size={18} />}
                label="Pool"
                value={poolCount}
              />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>Workflow Status</div>
              <div className="admin-pill-strip" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ ...pillStyle(), ...getStatusStyle("pending") }}>
                  Pending: {pendingCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("onboarding") }}>
                  OnBoarding: {onboardingCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("hold") }}>
                  Hold: {holdCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("rejected") }}>
                  Rejected: {rejectedCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("completed") }}>
                  Completed: {completedCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("working") }}>
                  Working: {workingCount}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>Pending Pool Availability</div>
              <div className="admin-pill-strip" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    ...pillStyle(),
                    background: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #86efac",
                  }}
                >
                  Pool: {poolCount}
                </span>
                <span style={{ ...pillStyle(), ...getAvailabilityStyle("available_soon") }}>
                  Available: {availableCount}
                </span>
                <span style={{ ...pillStyle(), ...getAvailabilityStyle("on_project") }}>
                  On Project: {onProjectCount}
                </span>
                <span style={{ ...pillStyle(), ...getAvailabilityStyle("unavailable") }}>
                  Unavailable: {unavailableCount}
                </span>
              </div>
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
                    <select
                      value={tradeFilter}
                      onChange={(e) => setTradeFilter(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">All Trades</option>
                      {trades.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">All Locations</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="onboarding">OnBoarding</option>
                      <option value="hold">Hold</option>
                      <option value="rejected">Rejected</option>
                      <option value="completed">Completed</option>
                      <option value="working">Working</option>
                    </select>

                    <select
                      value={recruiterFilter}
                      onChange={(e) => setRecruiterFilter(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">All Recruiters</option>
                      <option value="unassigned">Unassigned</option>
                      {recruiters.map((recruiter) => (
                        <option key={recruiter.user_id} value={recruiter.user_id}>
                          {recruiter.full_name || recruiter.email || recruiter.user_id}
                        </option>
                      ))}
                    </select>

                    <select
                      value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">All Pool Availability</option>
                      <option value="available_soon">Available</option>
                      <option value="on_project">On Project</option>
                      <option value="unavailable">Unavailable</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="status_priority">Sort: Status Priority</option>
                      <option value="newest_registered">Sort: Newest Registered</option>
                      <option value="oldest_registered">Sort: Oldest Registered</option>
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
                  }}
                >
                  No workers found for the selected filters.
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
                    onAvailabilitySaved={handleAvailabilitySaved}
                    onRecruiterSaved={handleRecruiterSaved}
                    onRecruiterNotesSaved={handleRecruiterNotesSaved}
                    onWorkerSaved={handleWorkerSaved}
                    onWorkerDeleted={handleWorkerDeleted}
                    onDocumentsChanged={() => reloadWorkerDocuments(w.id)}
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

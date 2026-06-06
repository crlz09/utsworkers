import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Loader2, Lock, Minus, Plus, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

const PRESET_HOURS = [0, 8, 10];
const HOUR_STEP = 0.25;

const copy = {
  en: {
    localeLabel: "English",
    toggleLabel: "Español",
    dateLocale: "en-US",
    dayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    dayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    currentWeek: "Current week",
    previousWeek: "Previous week",
    workerHours: "Worker Hours",
    weeklyHours: "Weekly Hours",
    intro: "Use the secure UTS link to submit hours for the current week or previous week. Future dates stay locked until they become available.",
    week: "Week",
    approvedLocked: "Approved / Locked",
    editable: "Editable",
    loading: "Loading hours link...",
    total: "Total",
    approvedNote: "This week has been approved by UTS and can no longer be edited.",
    availableOnDate: "Available on this date",
    locked: "Locked",
    open: "Open",
    decrease: "Decrease",
    increase: "Increase",
    hours: "hours",
    submitHours: "Submit Hours",
    approved: "Approved",
    noActiveLink: "No active hours link found.",
    mobileSubmit: "Submit Hours",
    thankYou: "Thank you!",
    thankYouCopy: "Your hours were submitted. You can safely close this tab now.",
    submittedTitle: "Hours Submitted!",
    submittedCopy: (weekRange) => `Your hours for ${weekRange} have been sent to UTS. You can keep editing if you need to make a correction before approval.`,
    keepEditing: "Keep editing",
    exit: "Exit",
    loadError: "Could not load this hours link.",
    invalidLink: "This hours link is invalid, expired, or no longer available.",
    fallbackLoaded: "Loaded the original link week. Ask UTS to apply the latest hours-link migration to enable current/previous week switching.",
    saveError: "Could not save hours.",
  },
  es: {
    localeLabel: "Español",
    toggleLabel: "English",
    dateLocale: "es-US",
    dayLabels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    currentWeek: "Semana actual",
    previousWeek: "Semana anterior",
    workerHours: "Horas del Trabajador",
    weeklyHours: "Horas Semanales",
    intro: "Usa el enlace seguro de UTS para enviar tus horas de la semana actual o la semana anterior. Las fechas futuras estarán bloqueadas hasta que estén disponibles.",
    week: "Semana",
    approvedLocked: "Aprobado / Bloqueado",
    editable: "Editable",
    loading: "Cargando enlace de horas...",
    total: "Total",
    approvedNote: "Esta semana ya fue aprobada por UTS y no se puede editar.",
    availableOnDate: "Disponible en esta fecha",
    locked: "Bloqueado",
    open: "Abierto",
    decrease: "Disminuir",
    increase: "Aumentar",
    hours: "horas",
    submitHours: "Enviar Horas",
    approved: "Aprobado",
    noActiveLink: "No se encontró un enlace activo de horas.",
    mobileSubmit: "Enviar Horas",
    thankYou: "¡Gracias!",
    thankYouCopy: "Tus horas fueron enviadas. Ya puedes cerrar esta pestaña con seguridad.",
    submittedTitle: "¡Horas Enviadas!",
    submittedCopy: (weekRange) => `Tus horas para ${weekRange} fueron enviadas a UTS. Puedes seguir editando si necesitas corregir algo antes de la aprobación.`,
    keepEditing: "Seguir editando",
    exit: "Salir",
    loadError: "No se pudo cargar este enlace de horas.",
    invalidLink: "Este enlace de horas no es válido, expiró o ya no está disponible.",
    fallbackLoaded: "Se cargó la semana original del enlace. Pide a UTS aplicar la migración más reciente para habilitar el cambio entre semana actual/anterior.",
    saveError: "No se pudieron guardar las horas.",
  },
};

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        background: #eef4ff;
        color: #0f172a;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      input, button, select { font: inherit; }
      button { -webkit-tap-highlight-color: transparent; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      .worker-topbar {
        background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%);
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .worker-topbar-inner {
        width: min(980px, calc(100vw - 32px));
        min-height: 82px;
        margin: 0 auto;
        display: flex;
        align-items: center;
      }
      .worker-logo { width: auto; height: 54px; display: block; object-fit: contain; }
      .language-toggle {
        margin-left: auto;
        min-height: 42px;
        border: 1px solid rgba(255,255,255,0.26);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.42);
        color: #ffffff;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
        box-shadow: 0 10px 20px rgba(0,0,0,0.12);
      }
      .language-toggle:hover { background: rgba(15, 23, 42, 0.68); }
      .worker-shell {
        width: min(980px, calc(100vw - 32px));
        max-width: calc(100vw - 32px);
        margin: 0 auto;
        padding: 22px 0 112px;
        display: grid;
        gap: 16px;
      }
      .worker-card {
        min-width: 0;
        overflow: hidden;
        background: rgba(255,255,255,0.96);
        border: 1px solid #dbeafe;
        border-radius: 28px;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
        padding: 20px;
      }
      .worker-hero {
        display: grid;
        gap: 18px;
      }
      .worker-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .worker-title {
        margin: 0;
        color: #0f172a;
        font-size: clamp(30px, 7vw, 44px);
        line-height: 1.04;
        font-weight: 950;
        letter-spacing: -0.045em;
      }
      .worker-copy {
        margin: 10px 0 0;
        color: #64748b;
        font-size: 14px;
        line-height: 1.65;
        max-width: 680px;
      }
      .week-panel {
        display: grid;
        gap: 8px;
      }
      .field-label {
        color: #94a3b8;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .week-select {
        width: 100%;
        min-height: 48px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
        border-radius: 16px;
        padding: 10px 12px;
        font-size: 14px;
        font-weight: 800;
        outline: none;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
      }
      .week-select:focus {
        border-color: #60a5fa;
        box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.18);
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 999px;
        padding: 9px 13px;
        font-size: 13px;
        font-weight: 900;
      }
      .status-pill.editable { border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; }
      .status-pill.locked { border: 1px solid #bbf7d0; background: #ecfdf5; color: #047857; }
      .feedback {
        border-radius: 18px;
        padding: 13px 14px;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.45;
      }
      .feedback.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      .feedback.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
      .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px dashed #cbd5e1;
        border-radius: 22px;
        background: #f8fafc;
        color: #475569;
        padding: 28px;
        text-align: center;
        font-size: 14px;
        font-weight: 800;
      }
      .summary-card {
        margin-bottom: 16px;
        border-radius: 24px;
        background: #f8fafc;
        padding: 16px;
      }
      .summary-grid {
        display: grid;
        gap: 12px;
      }
      .worker-name {
        margin: 0;
        color: #0f172a;
        font-size: 24px;
        line-height: 1.1;
        font-weight: 950;
        letter-spacing: -0.035em;
      }
      .project-line {
        margin: 8px 0 0;
        color: #64748b;
        font-size: 14px;
        line-height: 1.5;
      }
      .week-line {
        margin: 5px 0 0;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .total-box {
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #fff;
        padding: 12px 14px;
      }
      .total-label {
        color: #94a3b8;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .total-value {
        margin-top: 2px;
        color: #0f172a;
        font-size: 28px;
        font-weight: 950;
        letter-spacing: -0.04em;
      }
      .approved-note {
        margin: 12px 0 0;
        border: 1px solid #bbf7d0;
        border-radius: 18px;
        background: #ecfdf5;
        color: #166534;
        padding: 12px 14px;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.5;
      }
      .days-list {
        display: grid;
        gap: 12px;
      }
      .day-card {
        border: 1px solid #dbeafe;
        border-radius: 24px;
        background: #fff;
        padding: 15px;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }
      .day-card:not(.disabled):hover {
        transform: translateY(-2px);
        border-color: #bfdbfe;
        box-shadow: 0 16px 30px rgba(30, 64, 175, 0.08);
      }
      .day-card.disabled {
        border-color: #e2e8f0;
        background: #f8fafc;
      }
      .day-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .day-name {
        color: #0f172a;
        font-size: 18px;
        font-weight: 950;
        letter-spacing: -0.02em;
      }
      .day-date {
        margin-top: 2px;
        color: #94a3b8;
        font-size: 13px;
        font-weight: 800;
      }
      .day-status {
        flex: 0 0 auto;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 900;
      }
      .day-status.open { border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; }
      .day-status.future { border: 1px solid #e2e8f0; background: #fff; color: #94a3b8; }
      .day-status.locked { border: 1px solid #bbf7d0; background: #ecfdf5; color: #047857; }
      .stepper {
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) 56px;
        gap: 10px;
        align-items: center;
        margin-top: 14px;
      }
      .step-btn {
        width: 56px;
        height: 56px;
        border: 1px solid #cbd5e1;
        border-radius: 18px;
        background: #fff;
        color: #0f172a;
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05);
        transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
      }
      .step-btn:not(:disabled):hover { border-color: #93c5fd; background: #eff6ff; transform: translateY(-1px); }
      .step-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .hours-input {
        width: 100%;
        min-width: 0;
        height: 56px;
        border: 1px solid #cbd5e1;
        border-radius: 18px;
        background: #fff;
        color: #0f172a;
        text-align: center;
        font-size: 24px;
        font-weight: 950;
        letter-spacing: -0.03em;
        outline: none;
        box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05);
      }
      .hours-input::placeholder { color: #cbd5e1; }
      .hours-input:focus { border-color: #60a5fa; box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.18); }
      .hours-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; box-shadow: none; }
      .preset-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .preset-btn {
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        background: #f8fafc;
        color: #475569;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
        transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
      }
      .preset-btn:not(:disabled):hover { border-color: #bfdbfe; background: #eff6ff; color: #1d4ed8; }
      .preset-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .submit-row {
        display: none;
        justify-content: flex-end;
        margin-top: 18px;
      }
      .primary-btn, .secondary-btn {
        min-height: 48px;
        border-radius: 16px;
        padding: 11px 16px;
        font-size: 14px;
        font-weight: 950;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: transform 160ms ease, background 160ms ease, opacity 160ms ease;
      }
      .primary-btn { border: 1px solid #0f172a; background: #0f172a; color: #fff; box-shadow: 0 12px 22px rgba(15, 23, 42, 0.15); }
      .primary-btn:not(:disabled):hover { transform: translateY(-1px); background: #1e293b; }
      .secondary-btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; }
      .secondary-btn:not(:disabled):hover { background: #f8fafc; }
      .primary-btn:disabled, .secondary-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
      .sticky-submit {
        position: fixed;
        inset-inline: 0;
        bottom: 0;
        z-index: 40;
        border-top: 1px solid #e2e8f0;
        background: rgba(255,255,255,0.96);
        box-shadow: 0 -18px 40px rgba(15, 23, 42, 0.14);
        backdrop-filter: blur(14px);
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
      }
      .sticky-inner {
        width: min(980px, 100%);
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .sticky-total { flex: 1 1 auto; min-width: 0; }
      .sticky-label { color: #94a3b8; font-size: 11px; font-weight: 950; letter-spacing: 0.14em; text-transform: uppercase; }
      .sticky-value { color: #0f172a; font-size: 24px; font-weight: 950; letter-spacing: -0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .submission-backdrop {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(8px);
      }
      .submission-modal {
        width: min(440px, 100%);
        border: 1px solid #dbeafe;
        border-radius: 28px;
        background: #fff;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
        padding: 26px;
        text-align: center;
      }
      .submission-icon {
        width: 62px;
        height: 62px;
        margin: 0 auto 14px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #047857;
        background: #ecfdf5;
        border: 1px solid #bbf7d0;
      }
      .submission-title { margin: 0; color: #0f172a; font-size: 30px; line-height: 1.1; letter-spacing: -0.035em; font-weight: 950; }
      .submission-copy { margin: 10px auto 0; color: #64748b; font-size: 14px; line-height: 1.55; max-width: 340px; }
      .submission-actions { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
      .exit-screen { min-height: calc(100vh - 82px); display: grid; place-items: center; padding: 24px 0 48px; }
      .exit-card { width: min(520px, 100%); text-align: center; }

      @media (min-width: 720px) {
        .worker-shell { padding-bottom: 42px; }
        .worker-card { padding: 24px; }
        .worker-hero { grid-template-columns: minmax(0, 1fr) 310px; align-items: start; }
        .summary-grid { grid-template-columns: minmax(0, 1fr) auto; align-items: start; }
        .total-box { min-width: 190px; text-align: right; }
        .days-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .submit-row { display: flex; }
        .sticky-submit { display: none; }
        .submission-actions { flex-direction: row; justify-content: center; }
      }

      @media (min-width: 1024px) {
        .days-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
    `}</style>
  );
}
function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value, locale = "en-US") {
  return parseDate(value).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function formatWeekRange(weekStart, locale = "en-US") {
  const start = parseDate(weekStart);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString(locale, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
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

function formatHours(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInputHours(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return parsed === 0 ? "0" : "";
  return String(Number(parsed.toFixed(2)));
}

function isRpcSignatureMissing(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("could not find the function") || message.includes("schema cache");
}

export default function WorkerHoursPage() {
  const { token = "" } = useParams();
  const [locale, setLocale] = useState("es");
  const text = copy[locale];
  const today = toDateInputValue(new Date());
  const currentWeek = toDateInputValue(startOfWeek(new Date()));
  const previousWeek = toDateInputValue(addDays(parseDate(currentWeek), -7));
  const weekOptions = useMemo(() => [
    { value: currentWeek, label: `${text.currentWeek} · ${formatWeekRange(currentWeek, text.dateLocale)}` },
    { value: previousWeek, label: `${text.previousWeek} · ${formatWeekRange(previousWeek, text.dateLocale)}` },
  ], [currentWeek, previousWeek, text]);

  const [weekStart, setWeekStart] = useState(currentWeek);
  const [rows, setRows] = useState([]);
  const [values, setValues] = useState({});
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [submittedOpen, setSubmittedOpen] = useState(false);
  const [exited, setExited] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });

    let response = await supabase.rpc("get_worker_hours_link", { p_token: token, p_week_start: weekStart });
    let fallbackMode = false;

    if (response.error && isRpcSignatureMissing(response.error)) {
      response = await supabase.rpc("get_worker_hours_link", { p_token: token });
      fallbackMode = true;
    }

    setLoading(false);

    if (response.error) {
      setRows([]);
      setValues({});
      setReviewStatus("pending");
      setFeedback({ error: response.error.message || text.loadError, success: "" });
      return;
    }

    const nextRows = response.data || [];
    setRows(nextRows);
    setValues(Object.fromEntries(nextRows.map((row) => [row.work_date, row.regular_hours == null ? "" : String(row.regular_hours)])));
    setReviewStatus(nextRows[0]?.review_status || "pending");
    if (fallbackMode && nextRows[0]?.week_start_date && nextRows[0].week_start_date !== weekStart) {
      setWeekStart(nextRows[0].week_start_date);
    }
    if (!nextRows.length) {
      setFeedback({ error: text.invalidLink, success: "" });
    } else if (fallbackMode) {
      setFeedback({
        error: "",
        success: text.fallbackLoaded,
      });
    }
  }, [text, token, weekStart]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const first = rows[0] || {};
  const isApproved = reviewStatus === "approved";
  const total = useMemo(() => Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0), [values]);
  const canSubmit = rows.length > 0 && !isApproved && !saving;

  const isDayDisabled = (workDate) => isApproved || workDate > today;

  const setDayHours = (workDate, nextValue) => {
    setValues((prev) => ({ ...prev, [workDate]: normalizeHours(nextValue) }));
  };

  const stepDayHours = (workDate, delta) => {
    if (isDayDisabled(workDate)) return;
    setValues((prev) => {
      const current = Number(prev[workDate] || 0);
      const next = Math.min(24, Math.max(0, Number((current + delta).toFixed(2))));
      return { ...prev, [workDate]: formatInputHours(next) };
    });
  };

  const saveHours = async () => {
    setSaving(true);
    setFeedback({ error: "", success: "" });
    const entries = rows
      .filter((row) => row.work_date <= today)
      .map((row) => ({
        work_date: row.work_date,
        regular_hours: values[row.work_date] === "" ? null : Number(values[row.work_date] || 0),
      }));
    let response = await supabase.rpc("submit_worker_hours_link", { p_token: token, p_week_start: weekStart, p_entries: entries });
    if (response.error && isRpcSignatureMissing(response.error)) {
      response = await supabase.rpc("submit_worker_hours_link", { p_token: token, p_entries: entries });
    }
    setSaving(false);

    if (response.error) {
      setFeedback({ error: response.error.message || text.saveError, success: "" });
      return;
    }

    await load();
    setSubmittedOpen(true);
  };

  const exitPage = () => {
    setSubmittedOpen(false);
    setExited(true);
    window.setTimeout(() => {
      window.close();
    }, 0);
  };

  return (
    <>
      <PageStyles />
      <header className="worker-topbar">
        <div className="worker-topbar-inner">
          <img className="worker-logo" src={utsLogo} alt="UTS" />
          <button className="language-toggle" type="button" onClick={() => setLocale((prev) => (prev === "en" ? "es" : "en"))} aria-label={text.toggleLabel} title={text.toggleLabel}>{text.toggleLabel}</button>
        </div>
      </header>
      {exited ? (
        <main className="worker-shell exit-screen">
          <section className="worker-card exit-card">
            <div className="submission-icon"><CheckCircle2 size={32} /></div>
            <h1 className="submission-title">{text.thankYou}</h1>
            <p className="submission-copy">{text.thankYouCopy}</p>
          </section>
        </main>
      ) : (
        <main className="worker-shell">
          <section className="worker-card worker-hero">
            <div>
              <div className="worker-kicker"><CalendarDays size={15} /> {text.workerHours}</div>
              <h1 className="worker-title">{text.weeklyHours}</h1>
              <p className="worker-copy">
                {text.intro}
              </p>
            </div>
            <div className="week-panel">
              <label className="field-label" htmlFor="worker-week">{text.week}</label>
              <select className="week-select" id="worker-week" value={weekStart} onChange={(event) => setWeekStart(event.target.value)}>
                {weekOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {isApproved ? (
                <div className="status-pill locked"><Lock size={15} /> {text.approvedLocked}</div>
              ) : (
                <div className="status-pill editable">{text.editable}</div>
              )}
            </div>
          </section>

          {feedback.error ? <div className="feedback error">{feedback.error}</div> : null}
          {feedback.success ? <div className="feedback success">{feedback.success}</div> : null}

          <section className="worker-card">
            {loading ? (
              <div className="empty"><Loader2 className="spin" size={18} /> {text.loading}</div>
            ) : rows.length ? (
              <>
                <div className="summary-card">
                  <div className="summary-grid">
                    <div className="summary-copy">
                      <h2 className="worker-name">{first.worker_name}</h2>
                      <p className="project-line">{[first.project, first.project_location].filter(Boolean).join(" · ")}</p>
                      <p className="week-line">{formatWeekRange(weekStart, text.dateLocale)}</p>
                    </div>
                    <div className="total-box">
                      <div className="total-label">{text.total}</div>
                      <div className="total-value">{formatHours(total)} hrs</div>
                    </div>
                  </div>
                  {isApproved ? <p className="approved-note">{text.approvedNote}</p> : null}
                </div>

                <div className="days-list">
                  {rows.map((row, index) => {
                    const disabled = isDayDisabled(row.work_date);
                    const value = values[row.work_date] ?? "";
                    const isFuture = row.work_date > today;
                    return (
                      <article className={`day-card ${disabled ? "disabled" : ""}`} key={row.work_date}>
                        <div className="day-header">
                          <div>
                            <div className="day-name">{text.dayNames[index]}</div>
                            <div className="day-date">{text.dayLabels[index]} · {formatDate(row.work_date, text.dateLocale)}</div>
                          </div>
                          {isFuture ? (
                            <span className="day-status future">{text.availableOnDate}</span>
                          ) : isApproved ? (
                            <span className="day-status locked">{text.locked}</span>
                          ) : (
                            <span className="day-status open">{text.open}</span>
                          )}
                        </div>

                        <div className="stepper">
                          <button
                            aria-label={`${text.decrease} ${text.dayNames[index]} ${text.hours}`}
                            className="step-btn"
                            disabled={disabled}
                            type="button"
                            onClick={() => stepDayHours(row.work_date, -HOUR_STEP)}
                          >
                            <Minus size={22} strokeWidth={3} />
                          </button>
                          <label className="sr-only" htmlFor={`hours-${row.work_date}`}>{text.dayNames[index]} {text.hours}</label>
                          <input
                            className="hours-input"
                            disabled={disabled}
                            id={`hours-${row.work_date}`}
                            inputMode="decimal"
                            max="24"
                            min="0"
                            pattern="[0-9]*[.,]?[0-9]{0,2}"
                            placeholder={isFuture ? "--" : "0"}
                            step="0.01"
                            type="text"
                            value={value}
                            onBlur={(event) => setDayHours(row.work_date, formatInputHours(event.target.value))}
                            onChange={(event) => setDayHours(row.work_date, event.target.value)}
                          />
                          <button
                            aria-label={`${text.increase} ${text.dayNames[index]} ${text.hours}`}
                            className="step-btn"
                            disabled={disabled}
                            type="button"
                            onClick={() => stepDayHours(row.work_date, HOUR_STEP)}
                          >
                            <Plus size={22} strokeWidth={3} />
                          </button>
                        </div>

                        <div className="preset-row">
                          {PRESET_HOURS.map((preset) => (
                            <button
                              className="preset-btn"
                              disabled={disabled}
                              key={preset}
                              type="button"
                              onClick={() => setDayHours(row.work_date, String(preset))}
                            >
                              {preset}h
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="submit-row">
                  <button className="primary-btn" type="button" onClick={saveHours} disabled={!canSubmit}>
                    {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {isApproved ? text.approved : text.submitHours}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty">{text.noActiveLink}</div>
            )}
          </section>
        </main>
      )}

      {!exited && rows.length ? (
        <div className="sticky-submit">
          <div className="sticky-inner">
            <div className="sticky-total">
              <div className="sticky-label">{text.total}</div>
              <div className="sticky-value">{formatHours(total)} hrs</div>
            </div>
            <button className="primary-btn" type="button" onClick={saveHours} disabled={!canSubmit}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {isApproved ? text.approved : text.mobileSubmit}
            </button>
          </div>
        </div>
      ) : null}

      {submittedOpen ? (
        <div className="submission-backdrop" role="dialog" aria-modal="true" aria-labelledby="hours-submitted-title">
          <div className="submission-modal">
            <div className="submission-icon"><CheckCircle2 size={32} /></div>
            <h2 className="submission-title" id="hours-submitted-title">{text.submittedTitle}</h2>
            <p className="submission-copy">
              {text.submittedCopy(formatWeekRange(weekStart, text.dateLocale))}
            </p>
            <div className="submission-actions">
              <button className="secondary-btn" type="button" onClick={() => setSubmittedOpen(false)}>{text.keepEditing}</button>
              <button className="primary-btn" type="button" onClick={exitPage}>{text.exit}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

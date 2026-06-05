import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, Loader2, Lock, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; max-width: 100%; overflow-x: hidden; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #eef4ff; color: #0f172a; }
      input, button, select { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .worker-topbar { background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%); border-bottom: 1px solid rgba(255,255,255,0.08); }
      .worker-topbar-inner { width: min(1080px, calc(100vw - 32px)); min-height: 86px; margin: 0 auto; display: flex; align-items: center; }
      .worker-topbar img { height: 58px; width: auto; display: block; }
      .worker-shell { width: min(1080px, calc(100vw - 32px)); max-width: calc(100vw - 32px); margin: 0 auto; padding: 26px 0 48px; display: grid; gap: 18px; }
      .card { min-width: 0; overflow: hidden; background: rgba(255,255,255,0.94); border: 1px solid #dbeafe; border-radius: 28px; box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08); padding: 24px; }
      .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .kicker { display: inline-flex; align-items: center; gap: 8px; color: #1d4ed8; font-size: 12px; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
      .title { margin: 0; font-size: clamp(31px, 5vw, 48px); line-height: 1.05; font-weight: 900; letter-spacing: -0.04em; }
      .subtitle { margin: 10px 0 0; color: #64748b; font-size: 15px; line-height: 1.65; max-width: 720px; }
      .week-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
      .week-pill, .locked-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 10px 14px; font-weight: 850; }
      .locked-pill { border-color: #bbf7d0; background: #ecfdf5; color: #047857; }
      .select { min-height: 44px; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 13px; padding: 10px 12px; font-weight: 800; }
      .feedback { border-radius: 16px; padding: 13px 14px; font-weight: 800; }
      .feedback.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      .feedback.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
      .table-scroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .hours-table { width: 100%; min-width: 760px; border-collapse: separate; border-spacing: 0; }
      .hours-table th { background: #eff6ff; color: #1e3a8a; font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px; text-align: left; border-bottom: 1px solid #dbeafe; }
      .hours-table td { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 12px; vertical-align: middle; }
      .hours-input { width: 82px; min-height: 42px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; text-align: center; font-weight: 850; color: #0f172a; background: #fff; }
      .hours-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
      .day-note { margin-top: 6px; color: #94a3b8; font-size: 11px; font-weight: 800; }
      .total { text-align: right; font-size: 22px; font-weight: 900; letter-spacing: -0.03em; }
      .btn { border: 1px solid #0f172a; border-radius: 14px; min-height: 46px; padding: 11px 16px; background: #0f172a; color: #fff; font-size: 14px; font-weight: 850; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
      .btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .empty { border: 1px dashed #cbd5e1; border-radius: 20px; background: #f8fafc; color: #475569; padding: 28px; text-align: center; font-weight: 800; }
      @media (max-width: 720px) { .card { padding: 18px; border-radius: 22px; } .week-tools { justify-content: flex-start; } }
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

function formatDate(value) {
  return parseDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekRange(weekStart) {
  const start = parseDate(weekStart);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function normalizeHours(value) {
  if (value === "" || value == null) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return String(Math.min(parsed, 24));
}

function formatHours(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isRpcSignatureMissing(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("could not find the function") || message.includes("schema cache");
}

export default function WorkerHoursPage() {
  const { token = "" } = useParams();
  const today = toDateInputValue(new Date());
  const currentWeek = toDateInputValue(startOfWeek(new Date()));
  const previousWeek = toDateInputValue(addDays(parseDate(currentWeek), -7));
  const weekOptions = useMemo(() => [
    { value: currentWeek, label: `Current week · ${formatWeekRange(currentWeek)}` },
    { value: previousWeek, label: `Previous week · ${formatWeekRange(previousWeek)}` },
  ], [currentWeek, previousWeek]);

  const [weekStart, setWeekStart] = useState(currentWeek);
  const [rows, setRows] = useState([]);
  const [values, setValues] = useState({});
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });

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
      setFeedback({ error: response.error.message || "Could not load this hours link.", success: "" });
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
      setFeedback({ error: "This hours link is invalid, expired, or no longer available.", success: "" });
    } else if (fallbackMode) {
      setFeedback({
        error: "",
        success: "Loaded the original link week. Ask UTS to apply the latest hours-link migration to enable current/previous week switching.",
      });
    }
  }, [token, weekStart]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const first = rows[0] || {};
  const isApproved = reviewStatus === "approved";
  const total = useMemo(() => Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0), [values]);

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
      setFeedback({ error: response.error.message || "Could not save hours.", success: "" });
      return;
    }

    setFeedback({ error: "", success: `Hours submitted for ${formatWeekRange(weekStart)}.` });
    await load();
  };

  return (
    <>
      <PageStyles />
      <header className="worker-topbar">
        <div className="worker-topbar-inner">
          <img src={utsLogo} alt="UTS" />
        </div>
      </header>
      <main className="worker-shell">
        <section className="card hero">
          <div>
            <div className="kicker"><CalendarDays size={15} /> Worker Hours</div>
            <h1 className="title">Weekly Hours</h1>
            <p className="subtitle">
              Submit your hours from the secure weekly link provided by UTS. You can edit the current week or the previous week until an admin approves it.
            </p>
          </div>
          <div className="week-tools">
            <select className="select" value={weekStart} onChange={(event) => setWeekStart(event.target.value)}>
              {weekOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {isApproved ? <div className="locked-pill"><Lock size={15} /> Approved / Locked</div> : <div className="week-pill">Editable</div>}
          </div>
        </section>

        {feedback.error ? <div className="feedback error">{feedback.error}</div> : null}
        {feedback.success ? <div className="feedback success">{feedback.success}</div> : null}

        <section className="card">
          {loading ? (
            <div className="empty"><Loader2 className="spin" size={18} /> Loading hours link...</div>
          ) : rows.length ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>{first.worker_name}</h2>
                <p className="subtitle" style={{ marginTop: 6 }}>{[first.project, first.project_location, formatWeekRange(weekStart)].filter(Boolean).join(" · ")}</p>
                {isApproved ? <p className="subtitle" style={{ marginTop: 6 }}>This week has been approved by UTS and can no longer be edited.</p> : null}
              </div>
              <div className="table-scroll">
                <table className="hours-table">
                  <thead>
                    <tr>{rows.map((row, index) => <th key={row.work_date}>{DAY_LABELS[index]}<div style={{ marginTop: 4, color: "#64748b" }}>{formatDate(row.work_date)}</div></th>)}<th style={{ textAlign: "right" }}>Total</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      {rows.map((row) => {
                        const disabled = isApproved || row.work_date > today;
                        return (
                          <td key={row.work_date}>
                            <input
                              className="hours-input"
                              inputMode="decimal"
                              disabled={disabled}
                              value={values[row.work_date] ?? ""}
                              onChange={(event) => setValues((prev) => ({ ...prev, [row.work_date]: normalizeHours(event.target.value) }))}
                              aria-label={`${row.work_date} hours`}
                            />
                            {row.work_date > today ? <div className="day-note">Available on this date</div> : null}
                          </td>
                        );
                      })}
                      <td className="total">{formatHours(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button className="btn" type="button" onClick={saveHours} disabled={saving || isApproved}>
                  {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {isApproved ? "Approved" : "Submit Hours"}
                </button>
              </div>
            </>
          ) : (
            <div className="empty">No active hours link found.</div>
          )}
        </section>
      </main>
    </>
  );
}

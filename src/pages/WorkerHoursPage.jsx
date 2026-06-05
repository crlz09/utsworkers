import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, Loader2, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; overflow-x: hidden; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #eef4ff; color: #0f172a; }
      input, button { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .worker-topbar { background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%); border-bottom: 1px solid rgba(255,255,255,0.08); }
      .worker-topbar-inner { width: min(1080px, calc(100% - 36px)); min-height: 86px; margin: 0 auto; display: flex; align-items: center; }
      .worker-topbar img { height: 58px; width: auto; display: block; }
      .worker-shell { width: min(1080px, calc(100% - 36px)); margin: 0 auto; padding: 26px 0 48px; display: grid; gap: 18px; }
      .card { background: rgba(255,255,255,0.94); border: 1px solid #dbeafe; border-radius: 28px; box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08); padding: 24px; }
      .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .kicker { display: inline-flex; align-items: center; gap: 8px; color: #1d4ed8; font-size: 12px; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
      .title { margin: 0; font-size: clamp(31px, 5vw, 48px); line-height: 1.05; font-weight: 900; letter-spacing: -0.04em; }
      .subtitle { margin: 10px 0 0; color: #64748b; font-size: 15px; line-height: 1.65; max-width: 720px; }
      .week-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 10px 14px; font-weight: 850; }
      .feedback { border-radius: 16px; padding: 13px 14px; font-weight: 800; }
      .feedback.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      .feedback.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
      .table-scroll { width: 100%; overflow-x: auto; }
      .hours-table { width: 100%; min-width: 780px; border-collapse: separate; border-spacing: 0; }
      .hours-table th { background: #eff6ff; color: #1e3a8a; font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px; text-align: left; border-bottom: 1px solid #dbeafe; }
      .hours-table td { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 12px; vertical-align: middle; }
      .hours-input { width: 82px; min-height: 42px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; text-align: center; font-weight: 850; color: #0f172a; background: #fff; }
      .total { text-align: right; font-size: 22px; font-weight: 900; letter-spacing: -0.03em; }
      .btn { border: 1px solid #0f172a; border-radius: 14px; min-height: 46px; padding: 11px 16px; background: #0f172a; color: #fff; font-size: 14px; font-weight: 850; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
      .btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .empty { border: 1px dashed #cbd5e1; border-radius: 20px; background: #f8fafc; color: #475569; padding: 28px; text-align: center; font-weight: 800; }
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

export default function WorkerHoursPage() {
  const { token = "" } = useParams();
  const [rows, setRows] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });
    const { data, error } = await supabase.rpc("get_worker_hours_link", { p_token: token });
    setLoading(false);

    if (error) {
      setRows([]);
      setValues({});
      setFeedback({ error: error.message || "Could not load this hours link.", success: "" });
      return;
    }

    setRows(data || []);
    setValues(Object.fromEntries((data || []).map((row) => [row.work_date, row.regular_hours == null ? "" : String(row.regular_hours)])));
    if (!data?.length) setFeedback({ error: "This hours link is invalid, expired, or no longer available.", success: "" });
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const first = rows[0] || {};
  const total = useMemo(() => Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0), [values]);

  const saveHours = async () => {
    setSaving(true);
    setFeedback({ error: "", success: "" });
    const entries = rows.map((row) => ({
      work_date: row.work_date,
      regular_hours: values[row.work_date] === "" ? null : Number(values[row.work_date] || 0),
    }));
    const { error } = await supabase.rpc("submit_worker_hours_link", { p_token: token, p_entries: entries });
    setSaving(false);

    if (error) {
      setFeedback({ error: error.message || "Could not save hours.", success: "" });
      return;
    }

    setFeedback({ error: "", success: `Hours submitted for ${formatWeekRange(first.week_start_date)}.` });
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
              Submit your hours from the secure weekly link provided by UTS. Your submission is reviewed by an admin before billing.
            </p>
          </div>
          {first.week_start_date ? <div className="week-pill">{formatWeekRange(first.week_start_date)}</div> : null}
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
                <p className="subtitle" style={{ marginTop: 6 }}>{[first.project, first.project_location].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="table-scroll">
                <table className="hours-table">
                  <thead>
                    <tr>{rows.map((row, index) => <th key={row.work_date}>{DAY_LABELS[index]}<div style={{ marginTop: 4, color: "#64748b" }}>{formatDate(row.work_date)}</div></th>)}<th style={{ textAlign: "right" }}>Total</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      {rows.map((row) => (
                        <td key={row.work_date}>
                          <input
                            className="hours-input"
                            inputMode="decimal"
                            value={values[row.work_date] ?? ""}
                            onChange={(event) => setValues((prev) => ({ ...prev, [row.work_date]: normalizeHours(event.target.value) }))}
                            aria-label={`${row.work_date} hours`}
                          />
                        </td>
                      ))}
                      <td className="total">{formatHours(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button className="btn" type="button" onClick={saveHours} disabled={saving}>
                  {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Submit Hours
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

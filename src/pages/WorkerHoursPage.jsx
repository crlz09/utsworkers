import React, { useMemo, useState } from "react";
import { ArrowLeft, Briefcase, Loader2, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
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
  return Math.min(parsed, 24).toString();
}

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #eef4ff; color: #0f172a; }
      input, button, select { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .worker-topbar { background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%); border-bottom: 1px solid rgba(255,255,255,0.08); }
      .worker-topbar-inner { width: min(1120px, calc(100% - 36px)); min-height: 78px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .worker-topbar img { height: 56px; width: auto; display: block; }
      .worker-shell { width: min(1120px, calc(100% - 36px)); margin: 0 auto; padding: 24px 0 44px; display: grid; gap: 18px; }
      .card { background: rgba(255,255,255,0.92); border: 1px solid #dbeafe; border-radius: 26px; box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08); padding: 24px; }
      .hero-title { margin: 0; font-size: clamp(30px, 5vw, 44px); line-height: 1.05; font-weight: 900; letter-spacing: -0.035em; }
      .subtitle { margin: 10px 0 0; color: #64748b; line-height: 1.6; font-size: 15px; }
      .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
      .field { display: grid; gap: 7px; }
      .label { color: #64748b; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
      .input { width: 100%; min-height: 46px; border: 1px solid #cbd5e1; border-radius: 14px; background: #fff; color: #0f172a; padding: 11px 13px; outline: none; }
      .btn { border: 1px solid #cbd5e1; border-radius: 14px; min-height: 46px; padding: 11px 14px; background: #fff; color: #0f172a; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
      .btn.dark { background: #0f172a; border-color: #0f172a; color: #fff; }
      .btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .feedback { border-radius: 16px; padding: 13px 14px; font-weight: 800; }
      .feedback.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      .feedback.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
      .table-scroll { width: 100%; overflow-x: auto; margin-top: 18px; }
      table { width: 100%; min-width: 860px; border-collapse: separate; border-spacing: 0; }
      th, td { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 14px; text-align: left; vertical-align: middle; }
      th { background: #eff6ff; color: #1e3a8a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
      .hours-input { width: 76px; min-height: 40px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; text-align: center; font-weight: 800; }
      .worker-name { color: #0f172a; font-weight: 900; }
      .worker-meta { margin-top: 4px; color: #64748b; font-size: 13px; }
      .empty { border: 1px dashed #cbd5e1; border-radius: 18px; background: #f8fafc; color: #475569; padding: 22px; text-align: center; font-weight: 800; }
      @media (max-width: 760px) { .form-grid { grid-template-columns: 1fr; } .card { padding: 18px; border-radius: 20px; } }
    `}</style>
  );
}

export default function WorkerHoursPage() {
  const currentWeek = toDateInputValue(startOfWeek(new Date()));
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });

  const weekOptions = useMemo(() => Array.from({ length: 10 }, (_, index) => {
    const week = toDateInputValue(addDays(parseDate(currentWeek), index * -7));
    return { value: week, label: formatWeekRange(week) };
  }), [currentWeek]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => toDateInputValue(addDays(parseDate(weekStart), index))), [weekStart]);

  const groupedAssignments = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.candidate_id;
      const current = map.get(key) || {
        candidateId: row.candidate_id,
        workerName: row.worker_name,
        project: row.project,
        projectLocation: row.project_location,
        values: {},
      };
      current.values[row.work_date] = row.regular_hours ?? "";
      map.set(key, current);
    });
    return [...map.values()];
  }, [rows]);

  const loadHours = async () => {
    setFeedback({ error: "", success: "" });
    if (!email.trim() || !phone.trim()) {
      setFeedback({ error: "Enter the email and phone number we have on file.", success: "" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("get_worker_hours_assignments", {
      p_email: email.trim(),
      p_phone: phone.trim(),
      p_start: weekStart,
      p_end: days[6],
    });
    setLoading(false);

    if (error) {
      setFeedback({ error: error.message || "Could not load your assignments.", success: "" });
      setRows([]);
      return;
    }

    setRows(data || []);
    if (!data?.length) setFeedback({ error: "No active placed assignments found for this email and phone number.", success: "" });
  };

  const updateHours = (candidateId, workDate, value) => {
    setRows((prev) => prev.map((row) => (
      row.candidate_id === candidateId && row.work_date === workDate
        ? { ...row, regular_hours: value }
        : row
    )));
  };

  const saveHours = async () => {
    setFeedback({ error: "", success: "" });
    const entries = [];
    groupedAssignments.forEach((assignment) => {
      days.forEach((day) => {
        entries.push({
          candidate_id: assignment.candidateId,
          work_date: day,
          regular_hours: assignment.values[day] === "" || assignment.values[day] == null ? null : Number(assignment.values[day] || 0),
        });
      });
    });

    setSaving(true);
    const { error } = await supabase.rpc("upsert_worker_weekly_hours", {
      p_email: email.trim(),
      p_phone: phone.trim(),
      p_entries: entries,
    });
    setSaving(false);

    if (error) {
      setFeedback({ error: error.message || "Could not save hours.", success: "" });
      return;
    }

    setFeedback({ error: "", success: `Hours saved for ${formatWeekRange(weekStart)}.` });
    await loadHours();
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
        <section className="card">
          <button className="btn" type="button" onClick={() => window.location.href = "/login"}>
            <ArrowLeft size={16} /> Portal Login
          </button>
          <h1 className="hero-title" style={{ marginTop: 18 }}>Worker Hours Entry</h1>
          <p className="subtitle">Enter the same email and phone number we have on file. Phone formatting does not matter.</p>
          <div className="form-grid">
            <div className="field"><label className="label">Email</label><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="field"><label className="label">Phone</label><input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 123-4567" /></div>
            <div className="field"><label className="label">Week</label><select className="input" value={weekStart} onChange={(event) => setWeekStart(event.target.value)}>{weekOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn dark" type="button" onClick={loadHours} disabled={loading}>{loading ? <Loader2 className="spin" size={16} /> : <Briefcase size={16} />} Load Assignments</button>
            <button className="btn" type="button" onClick={saveHours} disabled={saving || !groupedAssignments.length}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Save Hours</button>
          </div>
        </section>

        {feedback.error ? <div className="feedback error">{feedback.error}</div> : null}
        {feedback.success ? <div className="feedback success">{feedback.success}</div> : null}

        <section className="card">
          <h2 style={{ margin: 0, fontSize: 24 }}>Week of {formatWeekRange(weekStart)}</h2>
          {groupedAssignments.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Assignment</th>{days.map((day, index) => <th key={day}>{DAY_LABELS[index]}<div style={{ marginTop: 4, color: "#64748b", letterSpacing: 0, textTransform: "none" }}>{formatDate(day)}</div></th>)}</tr></thead>
                <tbody>
                  {groupedAssignments.map((assignment) => (
                    <tr key={assignment.candidateId}>
                      <td><div className="worker-name">{assignment.workerName}</div><div className="worker-meta">{assignment.project}{assignment.projectLocation ? ` · ${assignment.projectLocation}` : ""}</div></td>
                      {days.map((day) => <td key={day}><input className="hours-input" type="number" min="0" max="24" step="0.25" value={assignment.values[day] ?? ""} onChange={(event) => updateHours(assignment.candidateId, day, normalizeHours(event.target.value))} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty" style={{ marginTop: 18 }}>Load your assignments to enter hours.</div>}
        </section>
      </main>
    </>
  );
}

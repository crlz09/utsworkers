import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Printer,
  Save,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

const DAY_FIELDS = [
  ["monday_hours", "Mon"],
  ["tuesday_hours", "Tue"],
  ["wednesday_hours", "Wed"],
  ["thursday_hours", "Thu"],
  ["friday_hours", "Fri"],
  ["saturday_hours", "Sat"],
  ["sunday_hours", "Sun"],
];

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatWeekRange(weekStart) {
  const start = parseDate(weekStart);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatDay(weekStart, index) {
  return addDays(parseDate(weekStart), index).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalizeHours(value) {
  if (value === "" || value == null) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return Math.min(parsed, 24).toString();
}

function formatHours(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function statusLabel(status) {
  if (status === "submitted") return "Submitted";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Open";
}

function formatEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #eef4ff;
        color: #0f172a;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      input, button, textarea { font: inherit; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .worker-topbar {
        position: sticky;
        top: 0;
        z-index: 30;
        padding-top: env(safe-area-inset-top);
        background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%);
        border-bottom: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      }
      .worker-topbar-inner {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        min-height: 72px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .worker-logo {
        height: 54px;
        width: auto;
        display: block;
      }
      .worker-shell {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        padding: 24px 0 48px;
        display: grid;
        gap: 18px;
      }
      .glass-card {
        background: rgba(255,255,255,0.93);
        border: 1px solid #dbeafe;
        border-radius: 20px;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
      }
      .hero-card,
      .assignment-card {
        padding: 22px;
      }
      .hero-top,
      .week-controls,
      .assignment-top,
      .actions-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .hero-title {
        margin: 0;
        font-size: clamp(30px, 5vw, 42px);
        line-height: 1.05;
        letter-spacing: 0;
        font-weight: 950;
      }
      .hero-subtitle {
        margin: 8px 0 0;
        color: #475569;
        font-size: 16px;
        line-height: 1.5;
      }
      .btn,
      .icon-btn {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        min-height: 44px;
        padding: 10px 14px;
        background: #ffffff;
        color: #0f172a;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .btn.dark {
        background: #0f172a;
        border-color: #0f172a;
        color: #ffffff;
      }
      .btn:disabled,
      .icon-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .icon-btn {
        width: 44px;
        padding: 0;
      }
      .week-pill,
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border-radius: 999px;
        padding: 8px 12px;
        font-weight: 900;
        font-size: 13px;
      }
      .week-pill {
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
      }
      .status-pill {
        background: #f8fafc;
        color: #334155;
        border: 1px solid #e2e8f0;
      }
      .status-pill.submitted {
        background: #fff7ed;
        color: #9a3412;
        border-color: #fed7aa;
      }
      .status-pill.approved {
        background: #f0fdf4;
        color: #166534;
        border-color: #bbf7d0;
      }
      .status-pill.rejected {
        background: #fef2f2;
        color: #991b1b;
        border-color: #fecaca;
      }
      .hours-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
      }
      .day-box {
        min-width: 0;
        border: 1px solid #dbeafe;
        background: #f8fbff;
        border-radius: 14px;
        padding: 12px;
        display: grid;
        gap: 8px;
      }
      .day-label {
        color: #1e3a8a;
        font-size: 12px;
        font-weight: 950;
        text-transform: uppercase;
      }
      .day-date {
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
      }
      .hours-input {
        width: 100%;
        min-height: 42px;
        border: 1px solid #cbd5e1;
        border-radius: 11px;
        padding: 9px 10px;
        background: #ffffff;
        color: #0f172a;
        font-weight: 900;
        outline: none;
      }
      .password-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
      }
      .notes-input {
        width: 100%;
        min-height: 82px;
        margin-top: 14px;
        border: 1px solid #cbd5e1;
        border-radius: 13px;
        padding: 12px;
        background: #ffffff;
        color: #0f172a;
        outline: none;
        resize: vertical;
      }
      .feedback-error,
      .feedback-success {
        border-radius: 14px;
        padding: 13px 15px;
        font-weight: 850;
      }
      .feedback-error {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      .feedback-success {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .empty-state {
        padding: 28px;
        text-align: center;
        color: #475569;
        font-weight: 850;
      }
      @media print {
        .worker-topbar,
        .actions-row,
        .week-controls .btn,
        .feedback-error,
        .feedback-success {
          display: none !important;
        }
        body {
          background: #ffffff;
        }
        .worker-shell {
          width: 100%;
          padding: 0;
        }
        .glass-card {
          box-shadow: none;
          border-color: #cbd5e1;
          break-inside: avoid;
        }
      }
      @media (max-width: 860px) {
        .worker-topbar-inner,
        .worker-shell {
          width: min(100%, calc(100% - 28px));
        }
        .worker-logo {
          height: 42px;
        }
        .hours-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 520px) {
        .hours-grid {
          grid-template-columns: 1fr;
        }
        .hero-card,
        .assignment-card {
          padding: 18px;
        }
        .btn {
          width: 100%;
        }
        .actions-row {
          align-items: stretch;
        }
      }
    `}</style>
  );
}

export default function WorkerHoursPage() {
  const currentWeekStart = useMemo(() => toDateInputValue(startOfWeek(new Date())), []);
  const previousWeekStart = useMemo(() => toDateInputValue(addDays(parseDate(currentWeekStart), -7)), [currentWeekStart]);
  const [worker, setWorker] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissionsByCandidate, setSubmissionsByCandidate] = useState(new Map());
  const [drafts, setDrafts] = useState(new Map());
  const [weekStart, setWeekStart] = useState(() => currentWeekStart);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });

  const load = useCallback(async ({ preserveFeedback = false } = {}) => {
    setLoading(true);
    if (!preserveFeedback) setFeedback({ error: "", success: "" });

    const workerRes = await supabase
      .from("workers")
      .select("id, name, email")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (workerRes.error || !workerRes.data?.id) {
      setFeedback({ error: workerRes.error?.message || "This account is not linked to a registered worker.", success: "" });
      setWorker(null);
      setAssignments([]);
      setLoading(false);
      return;
    }

    const currentWorker = workerRes.data;
    setWorker(currentWorker);

    const [candidateRes, submissionRes] = await Promise.all([
      supabase
        .from("cts_job_candidates")
        .select("id, cts_job_id, worker_id, name_snapshot, candidate_status, cts_jobs(id, level_type, city, state)")
        .eq("worker_id", currentWorker.id)
        .eq("candidate_status", "placed")
        .order("updated_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("worker_weekly_hours")
        .select("*")
        .eq("worker_id", currentWorker.id)
        .eq("week_start_date", weekStart),
    ]);

    if (candidateRes.error || submissionRes.error) {
      setFeedback({
        error: candidateRes.error?.message || submissionRes.error?.message || "Could not load weekly hours.",
        success: "",
      });
      setAssignments([]);
      setLoading(false);
      return;
    }

    const nextAssignments = (candidateRes.data || []).map((candidate) => ({
      ...candidate,
      project: candidate.cts_jobs?.level_type || "Unlinked project",
      projectLocation: [candidate.cts_jobs?.city, candidate.cts_jobs?.state].filter(Boolean).join(", "),
      name: candidate.name_snapshot || currentWorker.name || "Worker",
    }));

    const nextSubmissions = new Map();
    const nextDrafts = new Map();
    (submissionRes.data || []).forEach((submission) => {
      nextSubmissions.set(submission.cts_job_candidate_id, submission);
      nextDrafts.set(submission.cts_job_candidate_id, {
        ...Object.fromEntries(DAY_FIELDS.map(([field]) => [field, submission[field] ?? ""])),
        notes: submission.notes || "",
      });
    });

    nextAssignments.forEach((assignment) => {
      if (!nextDrafts.has(assignment.id)) {
        nextDrafts.set(assignment.id, {
          ...Object.fromEntries(DAY_FIELDS.map(([field]) => [field, ""])),
          notes: "",
        });
      }
    });

    setAssignments(nextAssignments);
    setSubmissionsByCandidate(nextSubmissions);
    setDrafts(nextDrafts);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setIsAuthenticated(!!session);
      setCheckingSession(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!checkingSession && isAuthenticated) {
      void Promise.resolve().then(() => load());
    }
  }, [checkingSession, isAuthenticated, load]);

  const handleLogin = async (event) => {
    event.preventDefault();
    const cleanEmail = formatEmail(email);
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setFeedback({ error: "Enter your email and password.", success: "" });
      return;
    }

    setSigningIn(true);
    setFeedback({ error: "", success: "" });

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error) {
      setFeedback({ error: error.message || "Could not sign in.", success: "" });
      setSigningIn(false);
      return;
    }

    setSigningIn(false);
    setEmail("");
    setPassword("");
  };

  const weekTotal = useMemo(() => {
    let total = 0;
    drafts.forEach((draft) => {
      DAY_FIELDS.forEach(([field]) => {
        total += Number(draft[field] || 0);
      });
    });
    return total;
  }, [drafts]);

  const updateDraft = (candidateId, field, value) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(candidateId) || {};
      next.set(candidateId, {
        ...current,
        [field]: field === "notes" ? value : normalizeHours(value),
      });
      return next;
    });
  };

  const goToPreviousWeek = () => {
    setWeekStart((current) => {
      const next = toDateInputValue(addDays(parseDate(current), -7));
      return next < previousWeekStart ? previousWeekStart : next;
    });
  };

  const goToNextWeek = () => {
    setWeekStart((current) => {
      const next = toDateInputValue(addDays(parseDate(current), 7));
      return next > currentWeekStart ? currentWeekStart : next;
    });
  };

  const buildRows = () =>
    assignments
      .filter((assignment) => {
        const submission = submissionsByCandidate.get(assignment.id);
        return !submission || submission.status === "draft";
      })
      .map((assignment) => {
        const draft = drafts.get(assignment.id) || {};
        return {
          worker_id: worker.id,
          cts_job_candidate_id: assignment.id,
          cts_job_id: assignment.cts_job_id,
          week_start_date: weekStart,
          ...Object.fromEntries(DAY_FIELDS.map(([field]) => [field, Number(draft[field] || 0)])),
          notes: draft.notes || null,
          status: "draft",
        };
      });

  const saveWeek = async ({ submit = false } = {}) => {
    if (!worker?.id) return;
    const rows = buildRows();
    if (rows.length === 0) {
      setFeedback({ error: "This week is already closed for all current assignments.", success: "" });
      return;
    }

    if (submit) {
      const confirmed = window.confirm("Close this week? After confirming, you will not be able to edit these hours.");
      if (!confirmed) return;
    }

    setSaving(true);
    setFeedback({ error: "", success: "" });

    const { data, error } = await supabase
      .from("worker_weekly_hours")
      .upsert(rows, { onConflict: "worker_id,cts_job_candidate_id,week_start_date" })
      .select("id");

    if (error) {
      setFeedback({ error: error.message || "Could not save weekly hours.", success: "" });
      setSaving(false);
      return;
    }

    if (submit) {
      const ids = (data || []).map((row) => row.id).filter(Boolean);
      const { error: submitError } = await supabase
        .from("worker_weekly_hours")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .in("id", ids);

      if (submitError) {
        setFeedback({ error: submitError.message || "Could not close the week.", success: "" });
        setSaving(false);
        return;
      }
    }

    await load({ preserveFeedback: true });
    setFeedback({
      error: "",
      success: submit ? "Week closed and sent for approval." : "Weekly hours saved.",
    });
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setWorker(null);
    setAssignments([]);
    setDrafts(new Map());
    setSubmissionsByCandidate(new Map());
    setFeedback({ error: "", success: "" });
  };

  return (
    <>
      <PageStyles />
      <div className="worker-topbar">
        <div className="worker-topbar-inner">
          <img className="worker-logo" src={utsLogo} alt="UTS" />
          {isAuthenticated ? (
            <button className="btn" type="button" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          ) : null}
        </div>
      </div>

      <main className="worker-shell">
        <section className="glass-card hero-card">
          <div className="hero-top">
            <div>
              <h1 className="hero-title">Weekly Hours</h1>
              <p className="hero-subtitle">
                {worker?.name ? `${worker.name}, enter your hours for each day and close the week when everything is correct.` : "Sign in with your email and password to enter your weekly hours."}
              </p>
            </div>
            <span className="week-pill">
              <CalendarDays size={16} />
              {formatWeekRange(weekStart)}
            </span>
          </div>

          <div className="week-controls" style={{ marginTop: 18 }}>
            <button
              className="icon-btn"
              type="button"
              onClick={goToPreviousWeek}
              disabled={!isAuthenticated || weekStart <= previousWeekStart}
              title="Previous week"
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ color: "#475569", fontWeight: 900 }}>
              Week total: <span style={{ color: "#0f172a" }}>{formatHours(weekTotal)} hours</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="icon-btn"
                type="button"
                onClick={goToNextWeek}
                disabled={!isAuthenticated || weekStart >= currentWeekStart}
                title="Next week"
                aria-label="Next week"
              >
                <ChevronRight size={18} />
              </button>
              <button className="btn" type="button" onClick={() => window.print()} disabled={!isAuthenticated}>
                <Printer size={16} />
                Print / PDF
              </button>
            </div>
          </div>
        </section>

        {feedback.error ? <div className="feedback-error">{feedback.error}</div> : null}
        {feedback.success ? <div className="feedback-success">{feedback.success}</div> : null}

        {checkingSession ? (
          <div className="glass-card empty-state">
            <Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
            Checking session...
          </div>
        ) : !isAuthenticated ? (
          <section className="glass-card assignment-card">
            <form onSubmit={handleLogin} style={{ display: "grid", gap: 14, maxWidth: 460 }}>
              <div>
                <div style={{ color: "#0f172a", fontWeight: 950, fontSize: 22 }}>Worker Login</div>
                <div style={{ marginTop: 6, color: "#64748b", fontWeight: 800 }}>
                  Use your email and password. Your initial password is your phone number using digits only.
                </div>
              </div>
              <input
                className="hours-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="worker@example.com"
              />
              <div className="password-row">
                <input
                  className="hours-input"
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value.replace(/\D/g, ""))}
                  placeholder="Phone digits only"
                />
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <button className="btn dark" type="submit" disabled={signingIn}>
                {signingIn ? <Loader2 className="spin" size={16} /> : null}
                Login
              </button>
            </form>
          </section>
        ) : loading ? (
          <div className="glass-card empty-state">
            <Loader2 className="spin" size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
            Loading weekly hours...
          </div>
        ) : assignments.length === 0 ? (
          <div className="glass-card empty-state">No active placed assignment was found for your worker profile.</div>
        ) : (
          <>
            {assignments.map((assignment) => {
              const submission = submissionsByCandidate.get(assignment.id);
              const status = submission?.status || "draft";
              const isClosed = status !== "draft";
              const draft = drafts.get(assignment.id) || {};
              const assignmentTotal = DAY_FIELDS.reduce((sum, [field]) => sum + Number(draft[field] || 0), 0);

              return (
                <section className="glass-card assignment-card" key={assignment.id}>
                  <div className="assignment-top">
                    <div>
                      <div style={{ color: "#0f172a", fontWeight: 950, fontSize: 22 }}>{assignment.project}</div>
                      <div style={{ marginTop: 5, color: "#64748b", fontWeight: 800 }}>
                        {[assignment.projectLocation, `${formatHours(assignmentTotal)} hours`].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className={`status-pill ${status}`}>
                      {isClosed ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="hours-grid">
                    {DAY_FIELDS.map(([field, label], index) => (
                      <label className="day-box" key={field}>
                        <span className="day-label">{label}</span>
                        <span className="day-date">{formatDay(weekStart, index)}</span>
                        <input
                          className="hours-input"
                          type="number"
                          min="0"
                          max="24"
                          step="0.25"
                          value={draft[field] ?? ""}
                          disabled={isClosed}
                          onChange={(event) => updateDraft(assignment.id, field, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>

                  <textarea
                    className="notes-input"
                    value={draft.notes || ""}
                    disabled={isClosed}
                    onChange={(event) => updateDraft(assignment.id, "notes", event.target.value)}
                    placeholder="Notes for this week"
                  />
                </section>
              );
            })}

            <div className="actions-row">
              <button className="btn" type="button" onClick={() => saveWeek()} disabled={saving}>
                {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                Save Draft
              </button>
              <button className="btn dark" type="button" onClick={() => saveWeek({ submit: true })} disabled={saving}>
                {saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                Close Week
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}

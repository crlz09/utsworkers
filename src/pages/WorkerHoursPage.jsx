import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Loader2, Lock, Minus, Plus, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PRESET_HOURS = [0, 8, 10];
const HOUR_STEP = 0.25;

function PageStyles() {
  return (
    <style>{`
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
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
      setFeedback({ error: response.error.message || "Could not save hours.", success: "" });
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
      <header className="bg-[#1f2c40] shadow-sm">
        <div className="mx-auto flex min-h-20 w-full max-w-4xl items-center px-4 sm:px-6">
          <img className="h-12 w-auto sm:h-14" src={utsLogo} alt="UTS" />
        </div>
      </header>
      {exited ? (
        <main className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-xl place-items-center px-4 py-8">
          <section className="w-full rounded-[28px] border border-blue-100 bg-white p-7 text-center shadow-xl shadow-slate-900/10">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 size={32} /></div>
            <h1 className="m-0 text-3xl font-black tracking-[-0.035em] text-slate-900">Thank you!</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">Your hours were submitted. You can safely close this tab now.</p>
          </section>
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-4xl gap-4 px-4 pb-32 pt-5 sm:px-6 sm:pb-10 sm:pt-7">
          <section className="rounded-[28px] border border-blue-100 bg-white/95 p-5 shadow-xl shadow-slate-900/10 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700"><CalendarDays size={15} /> Worker Hours</div>
                <h1 className="m-0 text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-4xl">Weekly Hours</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  Use the secure UTS link to submit hours for the current week or previous week. Future dates stay locked until they become available.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:min-w-72">
                <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400" htmlFor="worker-week">Week</label>
                <select
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  id="worker-week"
                  value={weekStart}
                  onChange={(event) => setWeekStart(event.target.value)}
                >
                  {weekOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {isApproved ? (
                  <div className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700"><Lock size={15} /> Approved / Locked</div>
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-700">Editable</div>
                )}
              </div>
            </div>
          </section>

          {feedback.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{feedback.error}</div> : null}
          {feedback.success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback.success}</div> : null}

          <section className="rounded-[28px] border border-blue-100 bg-white/95 p-4 shadow-xl shadow-slate-900/10 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-600"><Loader2 className="spin" size={18} /> Loading hours link...</div>
            ) : rows.length ? (
              <>
                <div className="mb-5 rounded-3xl bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="m-0 truncate text-2xl font-black tracking-[-0.035em] text-slate-950">{first.worker_name}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {[first.project, first.project_location].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{formatWeekRange(weekStart)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left sm:text-right">
                      <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">Total</div>
                      <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">{formatHours(total)} hrs</div>
                    </div>
                  </div>
                  {isApproved ? <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">This week has been approved by UTS and can no longer be edited.</p> : null}
                </div>

                <div className="grid gap-3">
                  {rows.map((row, index) => {
                    const disabled = isDayDisabled(row.work_date);
                    const value = values[row.work_date] ?? "";
                    const isFuture = row.work_date > today;
                    return (
                      <article
                        className={`rounded-3xl border p-4 shadow-sm transition ${disabled ? "border-slate-200 bg-slate-50" : "border-blue-100 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5"}`}
                        key={row.work_date}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-black tracking-[-0.02em] text-slate-950">{DAY_NAMES[index]}</div>
                            <div className="text-sm font-bold text-slate-400">{DAY_LABELS[index]} · {formatDate(row.work_date)}</div>
                          </div>
                          {isFuture ? (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-400">Available on this date</span>
                          ) : isApproved ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Locked</span>
                          ) : (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Open</span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-[56px_1fr_56px] items-center gap-3">
                          <button
                            aria-label={`Decrease ${DAY_NAMES[index]} hours`}
                            className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
                            disabled={disabled}
                            type="button"
                            onClick={() => stepDayHours(row.work_date, -HOUR_STEP)}
                          >
                            <Minus size={22} strokeWidth={3} />
                          </button>
                          <label className="sr-only" htmlFor={`hours-${row.work_date}`}>{DAY_NAMES[index]} hours</label>
                          <input
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-3 text-center text-2xl font-black tracking-[-0.03em] text-slate-950 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
                            aria-label={`Increase ${DAY_NAMES[index]} hours`}
                            className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
                            disabled={disabled}
                            type="button"
                            onClick={() => stepDayHours(row.work_date, HOUR_STEP)}
                          >
                            <Plus size={22} strokeWidth={3} />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {PRESET_HOURS.map((preset) => (
                            <button
                              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-extrabold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
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

                <div className="mt-5 hidden justify-end sm:flex">
                  <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55" type="button" onClick={saveHours} disabled={!canSubmit}>
                    {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {isApproved ? "Approved" : "Submit Hours"}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-600">No active hours link found.</div>
            )}
          </section>
        </main>
      )}

      {!exited && rows.length ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl shadow-slate-900/20 backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Total</div>
              <div className="truncate text-2xl font-black tracking-[-0.04em] text-slate-950">{formatHours(total)} hrs</div>
            </div>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-900/15 disabled:cursor-not-allowed disabled:opacity-55" type="button" onClick={saveHours} disabled={!canSubmit}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {isApproved ? "Approved" : "Enviar Horas"}
            </button>
          </div>
        </div>
      ) : null}

      {submittedOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="hours-submitted-title">
          <div className="w-full max-w-md rounded-[28px] border border-blue-100 bg-white p-7 text-center shadow-2xl shadow-slate-950/25">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 size={32} /></div>
            <h2 className="m-0 text-3xl font-black tracking-[-0.035em] text-slate-950" id="hours-submitted-title">Hours Submitted!</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
              Your hours for {formatWeekRange(weekStart)} have been sent to UTS. You can keep editing if you need to make a correction before approval.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 transition hover:bg-slate-50" type="button" onClick={() => setSubmittedOpen(false)}>Seguir editando</button>
              <button className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-950 bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800" type="button" onClick={exitPage}>Salir</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

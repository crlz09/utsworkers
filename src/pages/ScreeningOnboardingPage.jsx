import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, Inbox, Loader2, RefreshCw, Upload, X } from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import OnboardingStepTabs from "../components/OnboardingStepTabs";
import CandidateWorkspaceTabs from "../components/CandidateWorkspaceTabs";
import { supabase } from "../lib/supabase";
import {
  SCREENING_BUCKET,
  SCREENING_STAGES,
  buildScreeningEmail,
  normalizeEmail,
  parseScreening,
  screeningAction,
  screeningStage,
} from "../lib/screeningWorkflow";
import "./ScreeningOnboardingPage.css";

const EMPTY = {
  candidate_name: "",
  recipient_email: "",
  confirmation_number: "",
  lab_name: "",
  lab_address: "",
  lab_phone: "",
  testing_hours: "",
  change_contact: "",
};
const FIELD_LABELS = {
  candidate_name: "Candidate name on order",
  recipient_email: "Candidate email",
  confirmation_number: "Confirmation number",
  lab_name: "Laboratory",
  lab_address: "Laboratory address",
  lab_phone: "Laboratory phone",
  testing_hours: "Testing hours",
  change_contact: "Contact for changes",
};
const ORDER_SELECT =
  "*,worker:workers!candidate_screenings_worker_id_fkey(id,name,email),suggested:workers!candidate_screenings_suggested_worker_id_fkey(id,name,email)";
const dateText = (value) => (value ? new Date(value).toLocaleString() : "—");

function OrderFields({ values, onChange, disabled, lockConfirmation = false }) {
  return (
    <div className="screening-fields">
      {Object.entries(FIELD_LABELS).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            required={[
              "candidate_name",
              "recipient_email",
              "confirmation_number",
              "lab_name",
              "lab_address",
            ].includes(key)}
            type={key === "recipient_email" ? "email" : "text"}
            value={values[key] || ""}
            disabled={
              disabled || (key === "confirmation_number" && lockConfirmation)
            }
            onChange={(event) =>
              onChange({ ...values, [key]: event.target.value })
            }
          />
        </label>
      ))}
    </div>
  );
}

function ImportOrder({ onClose, onImported, workerId }) {
  const dialogRef = useRef(null);
  const [values, setValues] = useState(EMPTY);
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState("");
  const [pdf, setPdf] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    return () => previous?.focus?.();
  }, []);
  const dialogKeys = (event) => {
    if (event.key === "Escape" && !busy) {
      event.preventDefault();
      onClose();
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...dialogRef.current.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary",
      ),
    ].filter((element) => element.getClientRects().length);
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  const parse = () =>
    setValues(
      parseScreening({
        subject,
        text: source,
        filename: pdf?.name || "",
        to: values.recipient_email,
      }),
    );
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await screeningAction(
        {
          action: "import",
          ...values,
          source_subject: subject,
          source_text: source,
        },
        pdf,
      );
      await onImported(result.id);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="screening-dialog-backdrop">
      <section
        ref={dialogRef}
        onKeyDown={dialogKeys}
        className="screening-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
      >
        <header>
          <div>
            <h2 id="import-title">Import screening order</h2>
            <p>
              Upload the original ePassport, then verify the candidate in the
              inbox.
              {workerId
                ? " It will not be linked until you review its identity."
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close import"
          >
            <X size={19} />
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            Original ePassport PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={(event) => setPdf(event.target.files?.[0] || null)}
            />
          </label>
          <details>
            <summary>Paste Cheryl's email to fill the instructions</summary>
            <label>
              Email subject
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label>
              Email content
              <textarea
                rows={6}
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </label>
            <button type="button" onClick={parse}>
              Fill from email
            </button>
          </details>
          <OrderFields values={values} onChange={setValues} disabled={busy} />
          {error && (
            <p className="screening-error" role="alert">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="primary" disabled={busy || !pdf}>
              {busy ? "Saving…" : "Save to inbox"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function OrderReview({
  order,
  workers,
  canEdit,
  configuration,
  onRefresh,
  run,
  busy,
}) {
  const [values, setValues] = useState(order);
  const [selectedWorker, setSelectedWorker] = useState(
    order.worker_id || order.suggested_worker_id || "",
  );
  const [candidateSearch, setCandidateSearch] = useState("");
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [language, setLanguage] = useState(order.email_language || "es");
  const [email, setEmail] = useState(() =>
    order.email_body
      ? { subject: order.email_subject, body: order.email_body }
      : buildScreeningEmail(order, order.worker || order.suggested || {}, "es"),
  );
  const [reviewed, setReviewed] = useState(false);
  const [attendanceNote, setAttendanceNote] = useState("");
  const [resultNote, setResultNote] = useState("");
  const [resultPdf, setResultPdf] = useState(null);
  const [providerId, setProviderId] = useState("");
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const worker =
    workers.find((candidate) => candidate.id === selectedWorker) ||
    order.worker ||
    order.suggested;
  const locked = order.send_state !== "none";
  const dirty =
    Object.keys(EMPTY).some(
      (key) => (values[key] || "") !== (order[key] || ""),
    ) || selectedWorker !== order.worker_id;
  const disabled = !canEdit || !!busy;
  useEffect(() => {
    let active = true;
    supabase
      .from("candidate_screening_events")
      .select("id,event,created_at")
      .eq("screening_id", order.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) setHistory(data || []);
      });
    return () => {
      active = false;
    };
  }, [order.id, order.updated_at]);
  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);
  const showPdf = (path, name) =>
    run("pdf", async () => {
      const { data, error } = await supabase.storage
        .from(SCREENING_BUCKET)
        .download(path);
      if (error) throw error;
      setPreview({ url: URL.createObjectURL(data), name });
    });
  const chooseLanguage = (next) => {
    setLanguage(next);
    setEmail(buildScreeningEmail(order, order.worker || {}, next));
    setReviewed(false);
  };
  const save = () =>
    run("save", async () => {
      await screeningAction({
        action: "save",
        id: order.id,
        version: order.updated_at,
        ...values,
        workerId: selectedWorker,
        identityConfirmed,
      });
      await onRefresh(order.id);
    });
  const send = () =>
    run("send", async () => {
      try {
        await screeningAction({
          action: "send",
          id: order.id,
          version: order.updated_at,
          reviewed,
          subject: email.subject,
          emailBody: email.body,
          language,
        });
      } finally {
        await onRefresh(order.id);
      }
    });
  const candidateOptions = workers
    .filter(
      (candidate) =>
        candidate.id === selectedWorker ||
        `${candidate.name} ${candidate.email}`
          .toLowerCase()
          .includes(candidateSearch.toLowerCase()),
    )
    .slice(0, 100);
  if (
    selectedWorker &&
    !candidateOptions.some((candidate) => candidate.id === selectedWorker) &&
    worker
  )
    candidateOptions.unshift(worker);
  return (
    <section className="screening-review">
      <header>
        <div>
          <span className="screening-eyebrow">
            {order.source === "gmail" ? "Imported from Gmail" : "Manual import"}{" "}
            · {dateText(order.received_at)}
          </span>
          <h2>{order.candidate_name || "Review candidate"}</h2>
          <p>Confirmation {order.confirmation_number}</p>
        </div>
        {order.worker_id && (
          <Link to={`/admin/workers/${order.worker_id}/details`}>
            Candidate record ↗
          </Link>
        )}
      </header>
      <ol className="screening-timeline">
        {SCREENING_STAGES.map(([key, label], index) => {
          const time = [
            order.received_at,
            order.sent_at,
            order.attendance_reported_at,
            order.result_received_at,
          ][index];
          return (
            <li key={key} className={time ? "done" : ""}>
              <strong>{label}</strong>
              <span>{time ? dateText(time) : "Pending"}</span>
            </li>
          );
        })}
      </ol>
      <div className="screening-document">
        <FileText size={24} />
        <div>
          <strong>{order.file_name}</strong>
          <span>
            Original ePassport · {(order.file_size / 1024).toFixed(0)} KB
          </span>
        </div>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => showPdf(order.file_path, order.file_name)}
        >
          Review PDF
        </button>
      </div>
      {preview && (
        <div className="screening-pdf">
          <header>
            <strong>{preview.name}</strong>
            <a href={preview.url} download={preview.name}>
              Download PDF
            </a>
            <button type="button" onClick={() => setPreview(null)}>
              Close
            </button>
          </header>
          <iframe src={preview.url} title={preview.name} />
        </div>
      )}
      {order.source_message_id && (
        <a
          target="_blank"
          rel="noreferrer"
          href={`https://mail.google.com/mail/u/?authuser=cmolina%40universaltalentsource.com#all/${encodeURIComponent(order.source_message_id)}`}
        >
          Open original email in Gmail ↗
        </a>
      )}
      <details className="screening-source">
        <summary>Original email instructions</summary>
        <strong>{order.source_subject || "Manually entered order"}</strong>
        <pre>{order.source_text || "No email content provided."}</pre>
      </details>
      <section className="screening-section">
        <h3>1. Verify candidate and instructions</h3>
        <p>
          Compare the name and confirmation number in the PDF with the selected
          candidate. Gmail matches are suggestions until you save.
        </p>
        {!locked && (
          <label>
            Find a candidate
            <input
              type="search"
              value={candidateSearch}
              placeholder="Search by name or email"
              onChange={(event) => setCandidateSearch(event.target.value)}
              disabled={disabled}
            />
          </label>
        )}
        <label>
          Candidate
          <select
            value={selectedWorker}
            disabled={disabled || locked}
            onChange={(event) => {
              setSelectedWorker(event.target.value);
              setIdentityConfirmed(false);
              setReviewed(false);
            }}
          >
            <option value="">Select candidate</option>
            {candidateOptions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} · {candidate.email || "No email"}
              </option>
            ))}
          </select>
        </label>
        <OrderFields
          values={values}
          onChange={(next) => {
            setValues(next);
            setIdentityConfirmed(false);
            setReviewed(false);
          }}
          disabled={disabled || locked}
          lockConfirmation
        />
        {!locked && (
          <>
            <label className="screening-check">
              <input
                type="checkbox"
                checked={identityConfirmed}
                onChange={(event) => setIdentityConfirmed(event.target.checked)}
                disabled={disabled}
              />
              I reviewed the original PDF and confirmed it belongs to this
              candidate.
            </label>
            <button
              className="primary"
              type="button"
              disabled={
                disabled ||
                !identityConfirmed ||
                !selectedWorker ||
                normalizeEmail(worker?.email) !==
                  normalizeEmail(values.recipient_email)
              }
              onClick={save}
            >
              Save verified order to candidate
            </button>
          </>
        )}
        {order.identity_verified_at && (
          <p className="screening-success">
            Identity verified {dateText(order.identity_verified_at)}.
          </p>
        )}
        {selectedWorker &&
          normalizeEmail(worker?.email) !==
            normalizeEmail(values.recipient_email) && (
            <p className="screening-error">
              Order email must match this candidate's profile:{" "}
              {worker?.email || "No profile email"}.
            </p>
          )}
      </section>
      <section className="screening-section">
        <h3>2. Review and send personalized email</h3>
        <p>
          The candidate may already have Cheryl's email. This message provides
          UTS instructions and attaches the original ePassport.
        </p>
        <div className="screening-mail-meta">
          <span>
            <strong>To:</strong>{" "}
            {order.email_to || order.worker?.email || "Verify candidate first"}
          </span>
          <span>
            <strong>From:</strong>{" "}
            {order.email_from || configuration?.sender || "Sender needs configuration"}
          </span>
          <span>
            <strong>Replies:</strong> cmolina@universaltalentsource.com
          </span>
        </div>
        <label>
          Language
          <select
            aria-label="Language"
            value={language}
            onChange={(event) => chooseLanguage(event.target.value)}
            disabled={disabled || locked}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          Subject
          <input
            aria-label="Subject"
            value={email.subject || ""}
            maxLength={250}
            disabled={disabled || locked}
            onChange={(event) => {
              setEmail({ ...email, subject: event.target.value });
              setReviewed(false);
            }}
          />
        </label>
        <label>
          Message
          <textarea
            aria-label="Message"
            rows={14}
            value={email.body || ""}
            maxLength={20000}
            disabled={disabled || locked}
            onChange={(event) => {
              setEmail({ ...email, body: event.target.value });
              setReviewed(false);
            }}
          />
        </label>
        <p className="screening-attachment">
          <FileText size={16} /> Attachment: {order.file_name}
        </p>
        {!locked && (
          <label className="screening-check">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={disabled || dirty || !order.worker_id}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            I reviewed the recipient, message, and attached PDF.
          </label>
        )}
        {dirty && !locked && <p>Save the verified order before sending.</p>}
        {order.send_state === "sent" ? (
          <p className="screening-success">
            Sent {dateText(order.sent_at)} · Provider ID:{" "}
            {order.resend_email_id}
          </p>
        ) : (
          <button
            className="primary"
            type="button"
            disabled={
              disabled ||
              !configuration?.emailConfigured ||
              !order.worker_id ||
              (order.send_state === "none" && (!reviewed || dirty))
            }
            onClick={send}
          >
            {order.send_state === "sending"
              ? "Retry the same saved email"
              : "Send instructions with PDF"}
          </button>
        )}
        {order.send_state === "sending" && (
          <p className="screening-error">
            Delivery has not been confirmed. Retry preserves the exact saved
            message and avoids duplicate sends within 23 hours. After that,
            check Resend before further action.
          </p>
        )}
        {order.send_state === "sending" && (
          <details>
            <summary>Reconcile a send found in Resend</summary>
            <p>
              Find the saved message in Resend. Enter its email ID to verify the
              recipient and message without sending another email.
            </p>
            <label>
              Resend email ID
              <input
                value={providerId}
                onChange={(event) => setProviderId(event.target.value)}
                disabled={disabled}
              />
            </label>
            <button
              type="button"
              disabled={disabled || !providerId.trim()}
              onClick={() =>
                run("reconcile", async () => {
                  await screeningAction({
                    action: "reconcile",
                    id: order.id,
                    version: order.updated_at,
                    providerId,
                  });
                  await onRefresh(order.id);
                })
              }
            >
              Verify provider email
            </button>
          </details>
        )}
        {order.last_send_error && (
          <p className="screening-error">{order.last_send_error}</p>
        )}
      </section>
      <section className="screening-section">
        <h3>3. Follow up</h3>
        <p>
          Attendance is a candidate report. Receiving a result does not
          automatically approve the candidate.
        </p>
        {order.attendance_reported_at ? (
          <p>
            <strong>Attendance reported:</strong> {order.attendance_note}
          </p>
        ) : (
          <>
            <label>
              Attendance report
              <textarea
                rows={2}
                placeholder="Who confirmed attendance, and when?"
                value={attendanceNote}
                onChange={(event) => setAttendanceNote(event.target.value)}
                disabled={disabled}
              />
            </label>
            <button
              type="button"
              disabled={disabled || !order.worker_id || !attendanceNote.trim()}
              onClick={() =>
                run("attendance", async () => {
                  await screeningAction({
                    action: "attendance",
                    id: order.id,
                    version: order.updated_at,
                    note: attendanceNote,
                  });
                  await onRefresh(order.id);
                })
              }
            >
              Record attendance report
            </button>
          </>
        )}
        {order.result_received_at ? (
          <div className="screening-result">
            <p>
              <strong>Result received:</strong> {order.result_note}
            </p>
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                showPdf(order.result_file_path, order.result_file_name)
              }
            >
              View private result PDF
            </button>
          </div>
        ) : (
          <>
            <label>
              Result source and receipt date
              <textarea
                rows={2}
                placeholder="Provider, received date, and relevant context"
                value={resultNote}
                onChange={(event) => setResultNote(event.target.value)}
                disabled={disabled}
              />
            </label>
            <label>
              Provider result PDF
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={disabled}
                onChange={(event) =>
                  setResultPdf(event.target.files?.[0] || null)
                }
              />
            </label>
            <button
              type="button"
              disabled={
                disabled || !order.worker_id || !resultNote.trim() || !resultPdf
              }
              onClick={() =>
                run("result", async () => {
                  await screeningAction(
                    {
                      action: "result",
                      id: order.id,
                      version: order.updated_at,
                      note: resultNote,
                    },
                    resultPdf,
                  );
                  await onRefresh(order.id);
                })
              }
            >
              Save private result
            </button>
          </>
        )}
      </section>
      <details className="screening-section">
        <summary>Order history</summary>
        <ul className="screening-history">
          {history.map((event) => (
            <li key={event.id}>
              <span>{event.event.replaceAll("_", " ")}</span>
              <time>{dateText(event.created_at)}</time>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export default function ScreeningOnboardingPage() {
  const { workerId = "" } = useParams();
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [configuration, setConfiguration] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState("all");
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchOrders = useCallback(
    async (offset = 0) => {
      let query = supabase
        .from("candidate_screenings")
        .select(ORDER_SELECT)
        .order("received_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + 99);
      if (workerId) query = query.eq("worker_id", workerId);
      if (filter === "unassigned") query = query.is("worker_id", null);
      if (filter === "ready")
        query = query.not("worker_id", "is", null).eq("send_state", "none");
      if (filter === "delivery") query = query.eq("send_state", "sending");
      if (filter === "awaiting")
        query = query.eq("send_state", "sent").is("result_received_at", null);
      if (filter === "results")
        query = query.not("result_received_at", "is", null);
      const { data, error: failure } = await query;
      if (failure)
        throw new Error(
          `${failure.message} — The screening database migration may need to be applied.`,
        );
      setOrders((current) => (offset ? [...current, ...data] : data));
      setHasMore(data.length === 100);
      return data;
    },
    [workerId, filter],
  );
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      setSelected(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const [{ data: permissions }, config] = await Promise.all([
          supabase
            .from("admin_permissions")
            .select("can_edit_workers")
            .eq("user_id", user.id)
            .maybeSingle(),
          screeningAction({ action: "configuration" }),
        ]);
        const candidates = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error: failure } = await supabase
            .from("workers")
            .select("id,name,email")
            .order("name")
            .order("id")
            .range(offset, offset + 999);
          if (failure) throw failure;
          candidates.push(...data);
          if (data.length < 1000) break;
        }
        if (!active) return;
        setCanEdit(!!permissions?.can_edit_workers);
        setConfiguration(config);
        setWorkers(candidates);
        const data = await fetchOrders();
        if (active) setSelected(data[0] || null);
      } catch (failure) {
        if (active) setError(failure.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [fetchOrders, refreshKey]);
  const refreshOrder = async (id) => {
    const { data, error: failure } = await supabase
      .from("candidate_screenings")
      .select(ORDER_SELECT)
      .eq("id", id)
      .single();
    if (failure) throw failure;
    if (workerId && data.worker_id !== workerId) {
      setSelected(null);
      await fetchOrders();
      return;
    }
    setSelected(data);
    setOrders((current) =>
      current.some((order) => order.id === id)
        ? current.map((order) => (order.id === id ? data : order))
        : [data, ...current],
    );
  };
  const run = async (kind, work) => {
    if (busy) return;
    setBusy(kind);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  };
  const sync = () =>
    run("sync", async () => {
      const result = await screeningAction({ action: "sync" });
      setNotice(
        `${result.imported} imported · ${result.duplicates} already saved.${result.hasMore ? " More orders available; sync again to continue." : ""}`,
      );
      if (result.errors?.length) setError(result.errors.join("\n"));
      await fetchOrders();
    });
  return (
    <div className="screening-page">
      <UtsTopNavBar />
      {workerId && <CandidateWorkspaceTabs />}
      <main className="screening-shell">
        <header className="screening-page-header">
          <div>
            <span className="screening-eyebrow">Hiring onboarding</span>
            <h1>{workerId ? "Candidate drug tests" : "Screening inbox"}</h1>
            <p>
              Review orders, attach the original ePassport, and follow each
              candidate's progress.
            </p>
          </div>
          <div className="screening-actions">
            {workerId && (
              <Link to="/admin/onboarding">Open screening inbox ↗</Link>
            )}
            <button
              type="button"
              disabled={!!busy || loading}
              onClick={() => setRefreshKey((value) => value + 1)}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              disabled={!canEdit || !!busy}
              onClick={() => setShowImport(true)}
            >
              <Upload size={16} />
              Import PDF
            </button>
            <button
              className="primary"
              type="button"
              disabled={!canEdit || !!busy || !configuration?.gmailConfigured}
              onClick={sync}
            >
              <Inbox size={16} />
              {busy === "sync" ? "Syncing…" : "Sync Gmail"}
            </button>
          </div>
        </header>
        <OnboardingStepTabs />
        {configuration && (
          <div className="screening-connection">
            <span>
              Gmail:{" "}
              {configuration.gmailConfigured
                ? configuration.mailbox
                : "Not connected — manual import available"}
            </span>
            <span>
              Email:{" "}
              {configuration.emailConfigured
                ? "Ready for reviewed sends"
                : "Sender configuration needed"}
            </span>
          </div>
        )}
        {error && (
          <div className="screening-error screening-banner" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="screening-success screening-banner" role="status">
            {notice}
          </div>
        )}
        {loading ? (
          <p className="screening-empty">
            <Loader2 size={22} />
            Loading screening orders…
          </p>
        ) : (
          <div className="screening-layout">
            <aside className="screening-inbox">
              <label>
                Show orders
                <select
                  value={filter}
                  disabled={!!busy}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">All orders</option>
                  <option value="unassigned">
                    Needs candidate verification
                  </option>
                  <option value="ready">Ready to send</option>
                  <option value="delivery">Delivery needs attention</option>
                  <option value="awaiting">Awaiting result</option>
                  <option value="results">Result received</option>
                </select>
              </label>
              {orders.length ? (
                orders.map((order) => (
                  <button
                    type="button"
                    disabled={!!busy}
                    className={`screening-order ${selected?.id === order.id ? "active" : ""}`}
                    key={order.id}
                    onClick={() => {
                      setSelected(order);
                      setError("");
                    }}
                  >
                    <strong>
                      {order.candidate_name || "Unidentified candidate"}
                    </strong>
                    <span>{order.confirmation_number}</span>
                    <small>
                      {!order.worker_id
                        ? "Verify candidate"
                        : order.send_state === "sending"
                          ? "Delivery needs attention"
                          : SCREENING_STAGES.find(
                              ([key]) => key === screeningStage(order),
                            )?.[1]}
                    </small>
                    <time>{dateText(order.received_at)}</time>
                  </button>
                ))
              ) : (
                <p className="screening-empty">
                  No orders in this view.
                  {workerId && (
                    <>
                      {" "}
                      Review new imports in the{" "}
                      <Link to="/admin/onboarding">screening inbox</Link>.
                    </>
                  )}
                </p>
              )}
              {hasMore && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => run("more", () => fetchOrders(orders.length))}
                >
                  Load more orders
                </button>
              )}
            </aside>
            {selected ? (
              <OrderReview
                key={`${selected.id}:${selected.updated_at}`}
                order={selected}
                workers={workers}
                canEdit={canEdit}
                configuration={configuration}
                onRefresh={refreshOrder}
                run={run}
                busy={busy}
              />
            ) : (
              <section className="screening-review screening-empty">
                <FileText size={34} />
                <h2>Select a screening order</h2>
                <p>Sync Gmail or import an ePassport PDF to begin.</p>
              </section>
            )}
          </div>
        )}
      </main>
      {showImport && (
        <ImportOrder
          workerId={workerId}
          onClose={() => setShowImport(false)}
          onImported={async (id) => {
            setShowImport(false);
            if (workerId) {
              setNotice(
                "Order saved to the inbox. Open the screening inbox to verify and link the candidate.",
              );
              await fetchOrders();
            } else await refreshOrder(id);
          }}
        />
      )}
    </div>
  );
}

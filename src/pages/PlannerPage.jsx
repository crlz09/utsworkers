import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ImagePlus,
  LayoutGrid,
  List,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Archive,
  RotateCcw,
  X,
  GripVertical,
  ExternalLink,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import UtsTopNavBar from "../components/UtsTopNavBar";
import QuickNotes from "../components/QuickNotes";
import { supabase } from "../lib/supabase";
import {
  PLANNER_COLUMNS,
  dueState,
  localDateKey,
  matchesPlannerFilter,
  positionBetween,
  validatePlannerImage,
} from "../lib/planner";
import "./PlannerPage.css";

const TASK_SELECT = "*,worker:workers(id,name),job:cts_jobs(id,level_type)";
const newDraft = (status = "pending") => ({
  title: "",
  description: "",
  status,
  priority: "normal",
  due_date: "",
  assignee_id: "",
  worker_id: "",
  job_id: "",
  checklist: [],
});
const formatDate = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";
const nameOf = (member) => member?.full_name || member?.email || "Team member";
const initials = (name) =>
  name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
async function allRows(table, select, decorate = (q) => q) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await decorate(
      supabase.from(table).select(select),
    ).range(start, start + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
function taskPayload(draft) {
  return {
    title: draft.title.trim(),
    description: draft.description,
    status: draft.status,
    priority: draft.priority,
    due_date: draft.due_date || null,
    assignee_id: draft.assignee_id || null,
    worker_id: draft.worker_id || null,
    job_id: draft.job_id || null,
    checklist: draft.checklist,
  };
}
function DueBadge({ task }) {
  const state = dueState(task);
  if (!task.due_date) return null;
  return (
    <span className={`planner-due ${state}`}>
      <CalendarDays size={13} />
      {state === "overdue" ? "Overdue · " : state === "today" ? "Today · " : ""}
      {formatDate(task.due_date)}
    </span>
  );
}

function TaskDialog({ task, members, onClose, onSaved, onArchive }) {
  const ref = useRef(null);
  const [initial, setInitial] = useState(() =>
    task
      ? {
          ...task,
          due_date: task.due_date || "",
          assignee_id: task.assignee_id || "",
          worker_id: task.worker_id || "",
          job_id: task.job_id || "",
        }
      : newDraft(),
  );
  const [draft, setDraft] = useState(initial);
  const [savedTask, setSavedTask] = useState(task?.id ? task : null);
  const [comments, setComments] = useState([]);
  const [images, setImages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const pendingUrls = useRef([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [step, setStep] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateResults, setCandidateResults] = useState([]);
  const [candidateName, setCandidateName] = useState(task?.worker?.name || "");
  const [jobQuery, setJobQuery] = useState("");
  const [jobResults, setJobResults] = useState([]);
  const [jobName, setJobName] = useState(task?.job?.level_type || "");
  const [detailLoading, setDetailLoading] = useState(Boolean(task?.id));
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.user_id, m])),
    [members],
  );
  const dirty =
    JSON.stringify(taskPayload(draft)) !== JSON.stringify(taskPayload(initial));
  const patch = (values) =>
    setDraft((previous) => ({ ...previous, ...values }));
  const close = () => {
    if (busyRef.current) return;
    if (
      (dirty || comment.trim() || step.trim() || pendingImages.length) &&
      !window.confirm("Discard unsaved changes?")
    )
      return;
    onClose();
  };
  useEffect(() => {
    ref.current.showModal();
    const urls = pendingUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (candidateQuery.trim().length < 2) {
        setCandidateResults([]);
        return;
      }
      const escaped = candidateQuery.trim().replace(/[\\%_]/g, "\\$&");
      const { data, error } = await supabase
        .from("workers")
        .select("id,name")
        .ilike("name", `%${escaped}%`)
        .order("name")
        .limit(12);
      if (!cancelled) {
        setCandidateResults(data || []);
        if (error) setError("Could not search candidates.");
      }
    }, 250);
    let cancelled = false;
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidateQuery]);
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (jobQuery.trim().length < 2) {
        setJobResults([]);
        return;
      }
      const escaped = jobQuery.trim().replace(/[\\%_]/g, "\\$&");
      const { data, error } = await supabase
        .from("cts_jobs")
        .select("id,level_type")
        .ilike("level_type", `%${escaped}%`)
        .order("level_type")
        .limit(12);
      if (!cancelled) {
        setJobResults(data || []);
        if (error) setError("Could not search projects.");
      }
    }, 250);
    let cancelled = false;
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobQuery]);
  const loadDetails = useCallback(async () => {
    if (!savedTask?.id) return;

    try {
      const [notes, files] = await Promise.all([
        allRows("planner_comments", "*", (q) =>
          q.eq("task_id", savedTask.id).order("created_at").order("id"),
        ),
        allRows("planner_attachments", "*", (q) =>
          q.eq("task_id", savedTask.id).order("created_at").order("id"),
        ),
      ]);
      let urls = [];
      if (files.length) {
        const result = await supabase.storage
          .from("planner-images")
          .createSignedUrls(
            files.map((f) => f.file_path),
            3600,
          );
        if (result.error) throw result.error;
        urls = result.data;
      }
      setComments(notes);
      setImages(
        files.map((f) => ({
          ...f,
          url: urls.find((u) => u.path === f.file_path)?.signedUrl,
        })),
      );
    } catch (error) {
      setError(error.message || "Could not load task details.");
    } finally {
      setDetailLoading(false);
    }
  }, [savedTask]);
  useEffect(() => {
    const timer = setTimeout(() => void loadDetails(), 0);
    if (!savedTask?.id) return () => clearTimeout(timer);
    let debounce;
    const channel = supabase.channel(`planner-details-${savedTask.id}`);
    for (const table of ["planner_comments", "planner_attachments"])
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `task_id=eq.${savedTask.id}`,
        },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => void loadDetails(), 300);
        },
      );
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      clearTimeout(debounce);
      void supabase.removeChannel(channel);
    };
  }, [loadDetails, savedTask]);
  async function action(work) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (error) {
      setError(error.message || "Could not save. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function save(event) {
    event.preventDefault();
    await action(async () => {
      const submittedDraft =
        step.trim() && draft.checklist.length < 100
          ? {
              ...draft,
              checklist: [
                ...draft.checklist,
                { id: crypto.randomUUID(), text: step.trim(), done: false },
              ],
            }
          : draft;
      const payload = taskPayload(submittedDraft);
      let result;
      if (savedTask) {
        result = await supabase
          .from("planner_tasks")
          .update(payload)
          .eq("id", savedTask.id)
          .eq("updated_at", savedTask.updated_at)
          .select(TASK_SELECT)
          .maybeSingle();
      } else {
        result = await supabase
          .from("planner_tasks")
          .insert({ ...payload, position: Date.now() })
          .select(TASK_SELECT)
          .single();
      }
      if (result.error) throw result.error;
      if (!result.data)
        throw new Error(
          "Someone updated this task. Close and reopen it to see the latest changes; your draft has not been saved.",
        );
      setSavedTask(result.data);
      setDraft(submittedDraft);
      setInitial(submittedDraft);
      setStep("");
      onSaved(result.data);
      for (const image of pendingImages) {
        await persistImage(image.file, result.data.id);
        setPendingImages((previous) =>
          previous.filter((item) => item.url !== image.url),
        );
        URL.revokeObjectURL(image.url);
      }
      if (comment.trim()) {
        const { error: commentError } = await supabase
          .from("planner_comments")
          .insert({ task_id: result.data.id, body: comment.trim() });
        if (commentError) throw commentError;
        setComment("");
      }
      onSaved();
      onClose();
    });
  }
  async function addComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    await action(async () => {
      const { error } = await supabase
        .from("planner_comments")
        .insert({ task_id: savedTask.id, body: comment.trim() });
      if (error) throw error;
      setComment("");
      await loadDetails();
      onSaved();
    });
  }
  async function persistImage(file, taskId) {
    const path = `${taskId}/${crypto.randomUUID()}.${
      file.name
        .split(".")
        .pop()
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 10) || "image"
    }`;
    const { error: uploadError } = await supabase.storage
      .from("planner-images")
      .upload(path, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const { error: metadataError } = await supabase
      .from("planner_attachments")
      .insert({ task_id: taskId, file_path: path, file_name: file.name });
    if (metadataError) {
      await supabase.storage.from("planner-images").remove([path]);
      throw metadataError;
    }
  }
  async function upload(files) {
    if (!files?.length) return;
    await action(async () => {
      for (const file of files) validatePlannerImage(file);
      if (!savedTask) {
        const staged = files.map((file) => {
          const url = URL.createObjectURL(file);
          pendingUrls.current.push(url);
          return { file, url };
        });
        setPendingImages((previous) => [...previous, ...staged]);
        return;
      }
      for (const file of files) await persistImage(file, savedTask.id);
      await loadDetails();
      onSaved();
    });
  }
  async function removeImage(image) {
    if (!window.confirm(`Remove ${image.file_name}?`)) return;
    await action(async () => {
      const { error } = await supabase.storage
        .from("planner-images")
        .remove([image.file_path]);
      if (error) throw error;
      const result = await supabase
        .from("planner_attachments")
        .delete()
        .eq("id", image.id);
      if (result.error) throw result.error;
      await loadDetails();
      onSaved();
    });
  }
  return (
    <dialog
      className="planner-dialog"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      aria-labelledby="planner-dialog-title"
    >
      <div className="planner-dialog-inner">
        <header className="planner-dialog-head">
          <div>
            <span className="planner-eyebrow">UTS PLANNER</span>
            <h2 id="planner-dialog-title">
              {savedTask ? "Task details" : "Create a task"}
            </h2>
          </div>
          <button
            className="planner-icon"
            aria-label="Close task"
            onClick={close}
            disabled={busy}
          >
            <X size={21} />
          </button>
        </header>
        {error && (
          <div className="planner-error" role="alert">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        <form onSubmit={save} id="planner-task-form">
          <label className="planner-field">
            Task title
            <input
              aria-label="Task title"
              autoFocus
              required
              maxLength={200}
              placeholder="What needs to be done?"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <div className="planner-field-grid">
            <label className="planner-field">
              Status
              <select
                aria-label="Status"
                value={draft.status}
                onChange={(e) => patch({ status: e.target.value })}
              >
                {PLANNER_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="planner-field">
              Assigned to
              <select
                aria-label="Assigned to"
                value={draft.assignee_id}
                onChange={(e) => patch({ assignee_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {nameOf(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="planner-field">
              Due date
              <input
                aria-label="Due date"
                type="date"
                value={draft.due_date}
                onChange={(e) => patch({ due_date: e.target.value })}
              />
            </label>
            <label className="planner-field">
              Priority
              <select
                aria-label="Priority"
                value={draft.priority}
                onChange={(e) => patch({ priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <label className="planner-field">
            Notes
            <textarea
              aria-label="Notes"
              rows={4}
              maxLength={20000}
              placeholder="Add context, instructions or follow-up notes…"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </label>
          <section className="planner-detail-section">
            <h3>
              <CheckCircle2 size={17} /> Checklist{" "}
              <span>
                {draft.checklist.filter((s) => s.done).length}/
                {draft.checklist.length}
              </span>
            </h3>
            {draft.checklist.map((item) => (
              <div className="planner-check-item" key={item.id}>
                <input
                  type="checkbox"
                  aria-label={item.text}
                  checked={item.done}
                  onChange={(e) =>
                    patch({
                      checklist: draft.checklist.map((s) =>
                        s.id === item.id ? { ...s, done: e.target.checked } : s,
                      ),
                    })
                  }
                />
                <span className={item.done ? "checked" : ""}>{item.text}</span>
                <button
                  type="button"
                  className="planner-icon"
                  aria-label={`Remove ${item.text}`}
                  onClick={() =>
                    patch({
                      checklist: draft.checklist.filter(
                        (s) => s.id !== item.id,
                      ),
                    })
                  }
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="planner-inline-add">
              <input
                aria-label="New checklist item"
                placeholder="Add a step…"
                value={step}
                maxLength={300}
                onChange={(e) => setStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (step.trim() && draft.checklist.length < 100) {
                      patch({
                        checklist: [
                          ...draft.checklist,
                          {
                            id: crypto.randomUUID(),
                            text: step.trim(),
                            done: false,
                          },
                        ],
                      });
                      setStep("");
                    }
                  }
                }}
              />
              <button
                type="button"
                disabled={!step.trim() || draft.checklist.length >= 100}
                onClick={() => {
                  patch({
                    checklist: [
                      ...draft.checklist,
                      {
                        id: crypto.randomUUID(),
                        text: step.trim(),
                        done: false,
                      },
                    ],
                  });
                  setStep("");
                }}
              >
                <Plus size={17} />
              </button>
            </div>
          </section>
          <section className="planner-detail-section">
            <h3>
              <ExternalLink size={17} /> Link to UTS
            </h3>
            <div className="planner-field-grid">
              <div className="planner-field">
                <label htmlFor="planner-candidate">Candidate</label>
                {draft.worker_id ? (
                  <div className="planner-linked">
                    <Link to={`/admin/workers/${draft.worker_id}/details`}>
                      {candidateName || "Open candidate"}{" "}
                      <ExternalLink size={12} />
                    </Link>
                    <button
                      type="button"
                      className="planner-icon"
                      aria-label="Unlink candidate"
                      onClick={() => {
                        patch({ worker_id: "" });
                        setCandidateName("");
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      id="planner-candidate"
                      value={candidateQuery}
                      placeholder="Search by name (2+ letters)"
                      onChange={(e) => setCandidateQuery(e.target.value)}
                    />
                    {candidateResults.map((c) => (
                      <button
                        className="planner-search-result"
                        type="button"
                        key={c.id}
                        onClick={() => {
                          patch({ worker_id: c.id });
                          setCandidateName(c.name);
                          setCandidateQuery("");
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
              <div className="planner-field">
                <label htmlFor="planner-project">Project</label>
                {draft.job_id ? (
                  <div className="planner-linked">
                    <Link to={`/cts-jobs/${draft.job_id}`}>
                      {jobName || "Open project"} <ExternalLink size={12} />
                    </Link>
                    <button
                      type="button"
                      className="planner-icon"
                      aria-label="Unlink project"
                      onClick={() => {
                        patch({ job_id: "" });
                        setJobName("");
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      id="planner-project"
                      value={jobQuery}
                      placeholder="Search by trade (2+ letters)"
                      onChange={(e) => setJobQuery(e.target.value)}
                    />
                    {jobResults.map((j) => (
                      <button
                        className="planner-search-result"
                        type="button"
                        key={j.id}
                        onClick={() => {
                          patch({ job_id: j.id });
                          setJobName(j.level_type);
                          setJobQuery("");
                        }}
                      >
                        {j.level_type}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </section>
        </form>
        <section className="planner-detail-section">
          <h3>
            <ImagePlus size={17} /> Images
          </h3>
          <>
            <label
              className={`planner-upload ${busy ? "disabled" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!busy) void upload(Array.from(e.dataTransfer.files));
              }}
            >
              <ImagePlus size={23} />
              <strong>
                {busy ? "Working…" : "Drop images here or click to upload"}
              </strong>
              <span>JPG, PNG, WebP, GIF · Up to 10 MB each</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={busy}
                onChange={(e) => {
                  void upload(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </label>
            <div className="planner-image-grid">
              {images.map((image) => (
                <div key={image.id}>
                  {image.url ? (
                    <a href={image.url} target="_blank" rel="noreferrer">
                      <img src={image.url} alt={image.file_name} />
                    </a>
                  ) : (
                    <span>Preview unavailable</span>
                  )}
                  <div>
                    <span title={image.file_name}>{image.file_name}</span>
                    <button
                      className="planner-icon"
                      aria-label={`Remove image ${image.file_name}`}
                      disabled={busy}
                      onClick={() => void removeImage(image)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {pendingImages.length > 0 && (
              <div className="planner-image-grid">
                {pendingImages.map((image) => (
                  <div key={image.url}>
                    <img src={image.url} alt={image.file.name} />
                    <div>
                      <span>{image.file.name}</span>
                      <button
                        className="planner-icon"
                        aria-label={`Remove staged image ${image.file.name}`}
                        disabled={busy}
                        onClick={() => {
                          setPendingImages((previous) =>
                            previous.filter((item) => item.url !== image.url),
                          );
                          URL.revokeObjectURL(image.url);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        </section>
        {savedTask && (
          <section className="planner-detail-section">
            <h3>
              <MessageSquare size={17} /> Activity & comments{" "}
              <span>{comments.length}</span>
            </h3>
            {detailLoading && (
              <p className="planner-muted">Loading activity…</p>
            )}
            <div className="planner-comments">
              {comments.map((note) => (
                <article key={note.id}>
                  <div>
                    <strong>{nameOf(memberById.get(note.created_by))}</strong>
                    <time>{new Date(note.created_at).toLocaleString()}</time>
                  </div>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
            <form className="planner-comment-form" onSubmit={addComment}>
              <textarea
                aria-label="New comment"
                rows={2}
                maxLength={5000}
                placeholder="Leave an update for the team…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                className="planner-secondary"
                disabled={busy || !comment.trim()}
              >
                Post comment <ArrowRight size={15} />
              </button>
            </form>
          </section>
        )}
        <footer className="planner-dialog-footer">
          {savedTask && (
            <button
              className="planner-archive"
              disabled={busy}
              onClick={() => {
                if (
                  (dirty ||
                    comment.trim() ||
                    step.trim() ||
                    pendingImages.length) &&
                  !window.confirm(
                    "Archive this task and discard unsaved changes?",
                  )
                )
                  return;
                void action(async () => {
                  await onArchive(savedTask);
                  onClose();
                });
              }}
            >
              <Archive size={16} /> Archive
            </button>
          )}
          <div>
            <button
              className="planner-secondary"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <button
              className="planner-primary"
              type="submit"
              form="planner-task-form"
              disabled={busy || !draft.title.trim()}
            >
              {busy ? (
                <Loader2 size={16} className="planner-spin" />
              ) : (
                <Check size={16} />
              )}{" "}
              {savedTask ? "Save changes" : "Create task"}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}

export default function PlannerPage() {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [commentCounts, setCommentCounts] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("board");
  const [archiveView, setArchiveView] = useState(false);
  const [dialogTask, setDialogTask] = useState(null);
  const [quickColumn, setQuickColumn] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [busyId, setBusyId] = useState("");
  const busyRef = useRef(false);
  const [dragged, setDragged] = useState("");
  const [dropTarget, setDropTarget] = useState("");
  const [undo, setUndo] = useState(null);
  const loadVersion = useRef(0);
  const [today, setToday] = useState(localDateKey());
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const [rows, files, notes] = await Promise.all([
        allRows("planner_tasks", TASK_SELECT, (q) =>
          q.order("position").order("id"),
        ),
        allRows("planner_attachments", "id,task_id,file_path,file_name", (q) =>
          q.order("id"),
        ),
        allRows("planner_comments", "task_id,id", (q) => q.order("id")),
      ]);
      const signed = files.length
        ? await supabase.storage.from("planner-images").createSignedUrls(
            files.map((f) => f.file_path),
            3600,
          )
        : { data: [] };
      if (signed.error) throw signed.error;
      if (version !== loadVersion.current) return;
      setTasks(rows);
      setAttachments(
        files.map((f) => ({
          ...f,
          url: signed.data?.find((u) => u.path === f.file_path)?.signedUrl,
        })),
      );
      const counts = new Map();
      notes.forEach((n) =>
        counts.set(n.task_id, (counts.get(n.task_id) || 0) + 1),
      );
      setCommentCounts(counts);
      setError("");
      window.dispatchEvent(new Event("uts-planner-changed"));
    } catch (error) {
      if (version === loadVersion.current)
        setError(error.message || "Could not load the planner.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [session, team] = await Promise.all([
          supabase.auth.getUser(),
          supabase.rpc("planner_team_members"),
        ]);
        if (team.error) throw team.error;
        if (active) {
          setUserId(session.data.user?.id || "");
          setMembers(team.data || []);
          await load();
        }
      } catch (error) {
        if (active) {
          setError(error.message);
          setLoading(false);
        }
      }
    }
    void init();
    const refresh = () => {
      setToday(localDateKey());
      if (!document.hidden && !busyRef.current) void load();
    };
    let debounce;
    const channel = supabase.channel("uts-planner-board");
    for (const table of [
      "planner_tasks",
      "planner_comments",
      "planner_attachments",
    ]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(refresh, 300);
        },
      );
    }
    channel.subscribe();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      clearTimeout(debounce);
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.user_id, m])),
    [members],
  );
  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.archived_at),
    [tasks],
  );
  const visible = useMemo(
    () =>
      tasks.filter(
        (t) =>
          Boolean(t.archived_at) === archiveView &&
          matchesPlannerFilter(t, { query, filter, userId, today }),
      ),
    [tasks, archiveView, query, filter, userId, today],
  );
  const filters = [
    ["all", "All tasks", activeTasks.length],
    [
      "mine",
      "My tasks",
      activeTasks.filter((t) => t.assignee_id === userId).length,
    ],
    [
      "today",
      "Today",
      activeTasks.filter((t) => dueState(t, today) === "today").length,
    ],
    [
      "overdue",
      "Overdue",
      activeTasks.filter((t) => dueState(t, today) === "overdue").length,
    ],
    [
      "unassigned",
      "Unassigned",
      activeTasks.filter((t) => !t.assignee_id).length,
    ],
  ];
  async function updateTask(task, values) {
    const { data, error } = await supabase
      .from("planner_tasks")
      .update(values)
      .eq("id", task.id)
      .eq("updated_at", task.updated_at)
      .select(TASK_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      void load();
      throw new Error(
        "This task changed. The board is refreshing; please try again.",
      );
    }
    setTasks((previous) =>
      previous
        .map((t) => (t.id === data.id ? data : t))
        .sort((a, b) => a.position - b.position),
    );
    window.dispatchEvent(new Event("uts-planner-changed"));
    return data;
  }
  async function mutate(id, work) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(id);
    setError("");
    try {
      await work();
    } catch (error) {
      setError(error.message || "Could not save your changes.");
    } finally {
      busyRef.current = false;
      setBusyId("");
    }
  }
  async function move(task, status, beforeId) {
    if (!task || archiveView) return;
    const column = tasks.filter(
      (t) => !t.archived_at && t.status === status && t.id !== task.id,
    );
    const index = beforeId
      ? column.findIndex((t) => t.id === beforeId)
      : column.length;
    const targetIndex = index < 0 ? column.length : index;
    await mutate(task.id, async () => {
      await updateTask(task, {
        status,
        position: positionBetween(
          column[targetIndex - 1]?.position,
          column[targetIndex]?.position,
        ),
      });
      setNotice(
        `Moved to ${PLANNER_COLUMNS.find((c) => c.id === status).label}`,
      );
    });
  }
  async function archive(task) {
    const result = await updateTask(task, {
      archived_at: new Date().toISOString(),
    });
    setUndo(result);
    setNotice("Task archived");
  }
  async function quickAdd(event, column) {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    await mutate("new", async () => {
      const siblings = tasks.filter(
        (t) => !t.archived_at && t.status === column,
      );
      const { data, error } = await supabase
        .from("planner_tasks")
        .insert({
          ...taskPayload(newDraft(column)),
          title: quickTitle.trim(),
          position: positionBetween(siblings.at(-1)?.position, null),
        })
        .select(TASK_SELECT)
        .single();
      if (error) throw error;
      setTasks((previous) =>
        [...previous, data].sort((a, b) => a.position - b.position),
      );
      setQuickTitle("");
      setQuickColumn("");
      setNotice("Task created");
      window.dispatchEvent(new Event("uts-planner-changed"));
    });
  }
  const openTask = (task) => setDialogTask(task);
  function renderCard(task) {
    const files = attachments.filter((a) => a.task_id === task.id);
    const person = memberById.get(task.assignee_id);
    const checklist = task.checklist || [];
    return (
      <article
        key={task.id}
        className={`planner-card ${task.status === "completed" ? "done" : ""} ${dragged === task.id ? "dragging" : ""} ${dropTarget === task.id ? "drop-before" : ""}`}
        draggable={!archiveView && !busyId}
        onDragStart={(e) => {
          if (e.target.closest("button,select,a")) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData("text/plain", task.id);
          e.dataTransfer.effectAllowed = "move";
          setDragged(task.id);
        }}
        onDragEnd={() => {
          setDragged("");
          setDropTarget("");
        }}
        onDragOver={(e) => {
          if (!dragged || dragged === task.id) return;
          e.preventDefault();
          e.stopPropagation();
          setDropTarget(task.id);
        }}
        onDrop={(e) => {
          if (!dragged) return;
          e.preventDefault();
          e.stopPropagation();
          void move(
            tasks.find((t) => t.id === dragged),
            task.status,
            task.id,
          );
          setDragged("");
          setDropTarget("");
        }}
      >
        {files[0]?.url && (
          <button
            className="planner-cover"
            onClick={() => openTask(task)}
            aria-label={`Open images for ${task.title}`}
          >
            <img src={files[0].url} alt={files[0].file_name} loading="lazy" />
          </button>
        )}
        <div className="planner-card-content">
          <div className="planner-card-top">
            <span className={`planner-priority ${task.priority}`}>
              {task.priority === "normal"
                ? "Task"
                : `${task.priority} priority`}
            </span>
            <GripVertical size={14} className="planner-grip" />
          </div>
          <button className="planner-card-title" onClick={() => openTask(task)}>
            {task.title}
          </button>
          {task.description && (
            <p className="planner-card-note">{task.description}</p>
          )}
          {(task.worker || task.job) && (
            <div className="planner-card-links">
              {task.worker && (
                <Link to={`/admin/workers/${task.worker_id}/details`}>
                  {task.worker.name}
                </Link>
              )}
              {task.job && (
                <Link to={`/cts-jobs/${task.job_id}`}>
                  {task.job.level_type}
                </Link>
              )}
            </div>
          )}
          {checklist.length > 0 && (
            <div className="planner-check-progress">
              <div>
                <span>Checklist</span>
                <span>
                  {checklist.filter((s) => s.done).length}/{checklist.length}
                </span>
              </div>
              <progress
                value={checklist.filter((s) => s.done).length}
                max={checklist.length}
              />
            </div>
          )}
          <div className="planner-card-meta">
            <DueBadge task={task} />
            {files.length > 0 && (
              <span title={`${files.length} images`}>
                <ImagePlus size={13} />
                {files.length}
              </span>
            )}
            {commentCounts.get(task.id) > 0 && (
              <span title="Comments">
                <MessageSquare size={13} />
                {commentCounts.get(task.id)}
              </span>
            )}
            {person ? (
              <span
                className="planner-avatar"
                title={nameOf(person)}
                aria-label={`Assigned to ${nameOf(person)}`}
              >
                {initials(nameOf(person))}
              </span>
            ) : (
              <span className="planner-unassigned">Unassigned</span>
            )}
          </div>
          <div className="planner-card-actions">
            {archiveView ? (
              <button
                disabled={!!busyId}
                onClick={() =>
                  void mutate(task.id, async () => {
                    await updateTask(task, { archived_at: null });
                    setNotice("Task restored");
                  })
                }
              >
                <RotateCcw size={13} /> Restore
              </button>
            ) : (
              <>
                <label className="planner-move">
                  <span className="sr-only">Move {task.title}</span>
                  <select
                    aria-label={`Move ${task.title}`}
                    value={task.status}
                    disabled={!!busyId}
                    onChange={(e) => void move(task, e.target.value)}
                  >
                    {PLANNER_COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} />
                </label>
                <button
                  aria-label={`${task.status === "completed" ? "Reopen" : "Complete"} ${task.title}`}
                  disabled={!!busyId}
                  onClick={() =>
                    void move(
                      task,
                      task.status === "completed" ? "pending" : "completed",
                    )
                  }
                >
                  <CheckCircle2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }
  return (
    <>
      <UtsTopNavBar />
      <main className="planner-page">
        <div className="planner-shell">
          <header className="planner-header">
            <div>
              <span className="planner-eyebrow">YOUR TEAM'S WORKSPACE</span>
              <h1>
                <ClipboardList size={30} /> Planner
              </h1>
              <p>
                One place for next steps, follow-ups and everything your team
                needs to get done.
              </p>
            </div>
            <div className="planner-header-actions">
              <QuickNotes userId={userId} />
              <div className="planner-team">
                {members.slice(0, 4).map((m) => (
                  <span
                    className="planner-avatar"
                    key={m.user_id}
                    title={nameOf(m)}
                  >
                    {initials(nameOf(m))}
                  </span>
                ))}
                <span>Shared with your team</span>
              </div>
              <button
                className="planner-primary"
                disabled={loading}
                onClick={() => openTask(newDraft())}
              >
                <Plus size={18} /> New task
              </button>
            </div>
          </header>
          <div className="planner-toolbar">
            <div className="planner-filters">
              {filters.map(([key, label, count]) => (
                <button
                  key={key}
                  className={filter === key && !archiveView ? "active" : ""}
                  onClick={() => {
                    setFilter(key);
                    setArchiveView(false);
                  }}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <div className="planner-tools">
              <label className="planner-search">
                <Search size={16} />
                <input
                  aria-label="Search tasks"
                  placeholder="Search tasks & notes…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <div className="planner-view-switch">
                <button
                  aria-label="Board view"
                  aria-pressed={view === "board"}
                  onClick={() => setView("board")}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <List size={18} />
                </button>
              </div>
              <button
                className={`planner-icon ${archiveView ? "active" : ""}`}
                aria-label="Archived tasks"
                title="Archived tasks"
                onClick={() => {
                  setArchiveView(!archiveView);
                  setFilter("all");
                }}
              >
                <Archive size={17} />
              </button>
              <button
                className="planner-icon"
                aria-label="Refresh board"
                disabled={!!busyId}
                onClick={() => void load()}
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>
          {error && (
            <div className="planner-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button onClick={() => void load()}>Retry</button>
            </div>
          )}
          {undo && (
            <div className="planner-undo">
              <span>“{undo.title}” archived.</span>
              <button
                disabled={!!busyId}
                onClick={() =>
                  void mutate(undo.id, async () => {
                    await updateTask(undo, { archived_at: null });
                    setUndo(null);
                    setNotice("Archive undone");
                  })
                }
              >
                <RotateCcw size={14} /> Undo
              </button>
              <button
                className="planner-icon"
                aria-label="Dismiss undo"
                onClick={() => setUndo(null)}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="planner-loading">
              <Loader2 className="planner-spin" size={28} /> Loading your
              planner…
            </div>
          ) : (
            <>
              <div className="planner-board-caption">
                <span>
                  {archiveView
                    ? "Archived tasks"
                    : `${visible.length} ${visible.length === 1 ? "task" : "tasks"}`}
                </span>
                <span>
                  {archiveView
                    ? "Restore a task to return it to the board."
                    : "Drag cards to organize · Click a title to add details"}
                </span>
              </div>
              {view === "list" || archiveView ? (
                <div className="planner-list">
                  {visible.length ? (
                    [...visible]
                      .sort((a, b) =>
                        (a.due_date || "9999").localeCompare(
                          b.due_date || "9999",
                        ),
                      )
                      .map(renderCard)
                  ) : (
                    <div className="planner-empty">
                      <ClipboardList size={32} />
                      <h3>No tasks here yet</h3>
                      <p>
                        {query || filter !== "all"
                          ? "Try another filter or search."
                          : archiveView
                            ? "Archived tasks will appear here."
                            : "Create your first task to get started."}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="planner-board">
                  {PLANNER_COLUMNS.map((column) => {
                    const rows = visible.filter((t) => t.status === column.id);
                    return (
                      <section
                        key={column.id}
                        className={`planner-column ${dropTarget === column.id ? "drop-column" : ""}`}
                        style={{ "--column-color": column.color }}
                        aria-label={column.label}
                        onDragOver={(e) => {
                          if (!dragged) return;
                          e.preventDefault();
                          setDropTarget(column.id);
                        }}
                        onDrop={(e) => {
                          if (!dragged) return;
                          e.preventDefault();
                          void move(
                            tasks.find((t) => t.id === dragged),
                            column.id,
                          );
                          setDragged("");
                          setDropTarget("");
                        }}
                      >
                        <header>
                          <div>
                            <span className="planner-column-dot" />
                            <h2>{column.label}</h2>
                            <span className="planner-column-count">
                              {rows.length}
                            </span>
                          </div>
                          <button
                            className="planner-icon"
                            aria-label={`Add task to ${column.label}`}
                            onClick={() => {
                              setQuickColumn(column.id);
                              setQuickTitle("");
                            }}
                          >
                            <Plus size={17} />
                          </button>
                        </header>
                        <div className="planner-column-cards">
                          {rows.map(renderCard)}
                          {!rows.length && quickColumn !== column.id && (
                            <button
                              className="planner-column-empty"
                              onClick={() => {
                                setQuickColumn(column.id);
                                setQuickTitle("");
                              }}
                            >
                              <Plus size={21} />
                              <span>
                                {query || filter !== "all"
                                  ? "No matching tasks"
                                  : "Add your first task"}
                              </span>
                            </button>
                          )}
                        </div>
                        {quickColumn === column.id ? (
                          <form
                            className="planner-quick-add"
                            onSubmit={(e) => void quickAdd(e, column.id)}
                          >
                            <input
                              autoFocus
                              aria-label={`New task in ${column.label}`}
                              placeholder="Task title…"
                              maxLength={200}
                              required
                              value={quickTitle}
                              onChange={(e) => setQuickTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setQuickColumn("");
                                  setQuickTitle("");
                                }
                              }}
                            />
                            <div>
                              <button
                                className="planner-primary"
                                disabled={!!busyId || !quickTitle.trim()}
                              >
                                <Plus size={15} /> Add task
                              </button>
                              <button
                                type="button"
                                className="planner-icon"
                                aria-label="Cancel quick add"
                                onClick={() => setQuickColumn("")}
                              >
                                <X size={17} />
                              </button>
                            </div>
                            <span>Press Enter to add · Esc to cancel</span>
                          </form>
                        ) : (
                          <button
                            className="planner-add-card"
                            onClick={() => {
                              setQuickColumn(column.id);
                              setQuickTitle("");
                            }}
                          >
                            <Plus size={16} /> Add task
                          </button>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {notice && (
            <div className="planner-toast" role="status">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}
          {dialogTask && (
            <TaskDialog
              key={dialogTask.id || "new"}
              task={dialogTask}
              members={members}
              onClose={() => setDialogTask(null)}
              onArchive={archive}
              onSaved={(data) => {
                if (data)
                  setTasks((previous) =>
                    [...previous.filter((t) => t.id !== data.id), data].sort(
                      (a, b) => a.position - b.position,
                    ),
                  );
                setNotice(data ? "Task saved" : "Task updated");
                void load();
              }}
            />
          )}
        </div>
      </main>
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  Check,
  ChevronLeft,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { isNoteUnread, markNoteRead } from "../lib/plannerNotes";
import "./QuickNotes.css";

async function rows(table) {
  const result = [];
  for (let from = 0; ; from += 1000) {
    const query = supabase.from(table).select("*");
    const { data, error } = await (
      table === "planner_notes"
        ? query.order("updated_at", { ascending: false }).order("id")
        : query.order("note_id")
    ).range(from, from + 999);
    if (error) throw error;
    result.push(...data);
    if (data.length < 1000) return result;
  }
}
const dateLabel = (value) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
function NoteAttribution({ note }) {
  return (
    <div className="quick-note-attribution">
      <span>
        Created by{" "}
        <strong>{note.created_by_name || "Former team member"}</strong> ·{" "}
        {dateLabel(note.created_at)}
      </span>
      {note.updated_by_name ? (
        <span>
          Modified by <strong>{note.updated_by_name}</strong> ·{" "}
          {dateLabel(note.updated_at)}
        </span>
      ) : (
        <span>Not modified yet</span>
      )}
    </div>
  );
}

export default function QuickNotes({ userId }) {
  const [params, setParams] = useSearchParams();
  const open = params.get("notes") === "1";
  const dialog = useRef(null);
  const [notes, setNotes] = useState([]);
  const [receipts, setReceipts] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [archiveView, setArchiveView] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [undo, setUndo] = useState(null);
  const generation = useRef(0);
  const unread = useMemo(
    () => notes.filter((n) => isNoteUnread(n, receipts.get(n.id))).length,
    [notes, receipts],
  );
  const dirty =
    editing &&
    (draft.title !== (selected?.title || "") ||
      draft.body !== (selected?.body || ""));
  const load = useCallback(async () => {
    const version = ++generation.current;
    try {
      const [list, read] = await Promise.all([
        rows("planner_notes"),
        rows("planner_note_reads"),
      ]);
      if (version !== generation.current) return;
      setNotes(list);
      setReceipts(new Map(read.map((r) => [r.note_id, r.seen_revision])));
      setError("");
    } catch (error) {
      if (version === generation.current)
        setError(error.message || "Could not load quick notes.");
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!userId) return;
    const start = setTimeout(() => void load(), 0);
    let debounce;
    const refresh = () => {
      if (!document.hidden && !busyRef.current) void load();
    };
    const channel = supabase.channel(`quick-notes-${userId}`);
    for (const table of ["planner_notes", "planner_note_reads"])
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(refresh, 250);
        },
      );
    channel.subscribe();
    const poll = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(start);
      clearTimeout(poll);
      clearTimeout(debounce);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    else if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  function toggleOpen(value) {
    if (busyRef.current) return;
    if (!value && dirty && !window.confirm("Discard unsaved note changes?"))
      return;
    const next = new URLSearchParams(params);
    if (value) next.set("notes", "1");
    else next.delete("notes");
    setParams(next, { replace: true });
    if (!value) {
      setSelected(null);
      setEditing(false);
    }
  }
  function back() {
    if (busyRef.current) return;
    if (dirty && !window.confirm("Discard unsaved note changes?")) return;
    setSelected(null);
    setEditing(false);
    setError("");
  }
  async function action(work) {
    if (busyRef.current) return;
    generation.current += 1;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (error) {
      setError(error.message || "Could not save the note.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function readNote(note) {
    setSelected(note);
    setEditing(false);
    if (isNoteUnread(note, receipts.get(note.id)))
      await action(async () => {
        await markNoteRead(supabase, userId, note);
        setReceipts((previous) =>
          new Map(previous).set(note.id, note.revision),
        );
      });
  }
  async function save(event) {
    event.preventDefault();
    await action(async () => {
      const payload = { title: draft.title.trim(), body: draft.body.trim() };
      const request = selected
        ? supabase
            .from("planner_notes")
            .update(payload)
            .eq("id", selected.id)
            .eq("revision", selected.revision)
        : supabase.from("planner_notes").insert(payload);
      const { data, error } = await request.select("*").maybeSingle();
      if (error) throw error;
      if (!data) {
        await load();
        throw new Error(
          "This note was modified by someone else. Your draft is kept here; go back and reopen the latest note before editing.",
        );
      }
      setNotes((previous) => [
        data,
        ...previous.filter((n) => n.id !== data.id),
      ]);
      setSelected(data);
      setEditing(false);
      window.dispatchEvent(new Event("uts-notes-changed"));
      await markNoteRead(supabase, userId, data);
      setReceipts((previous) => new Map(previous).set(data.id, data.revision));
    });
  }
  async function archive(note, restore = false) {
    await action(async () => {
      const { data, error } = await supabase
        .from("planner_notes")
        .update({ archived_at: restore ? null : new Date().toISOString() })
        .eq("id", note.id)
        .eq("revision", note.revision)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        void load();
        throw new Error("This note changed. Refresh and try again.");
      }
      setNotes((previous) => [
        data,
        ...previous.filter((n) => n.id !== data.id),
      ]);
      setSelected(null);
      setEditing(false);
      if (restore) setUndo(null);
      else setUndo(data);
      window.dispatchEvent(new Event("uts-notes-changed"));
      await markNoteRead(supabase, userId, data);
      setReceipts((previous) => new Map(previous).set(data.id, data.revision));
    });
  }
  const visible = notes.filter(
    (note) =>
      Boolean(note.archived_at) === archiveView &&
      (!unreadOnly || isNoteUnread(note, receipts.get(note.id))) &&
      `${note.title} ${note.body}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const latest = selected ? notes.find((n) => n.id === selected.id) : null;
  const changed = selected && latest && latest.revision !== selected.revision;
  return (
    <>
      <button
        className="planner-secondary quick-notes-trigger"
        onClick={() => toggleOpen(true)}
        aria-label={`Quick notes${unread ? `, ${unread} unread` : ""}`}
      >
        <StickyNote size={17} /> Quick notes
        {unread > 0 && (
          <span className="quick-notes-badge">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <dialog
        ref={dialog}
        className="quick-notes-dialog"
        aria-labelledby="quick-notes-title"
        onCancel={(event) => {
          event.preventDefault();
          toggleOpen(false);
        }}
        onClick={(event) => {
          if (event.target === dialog.current) toggleOpen(false);
        }}
      >
        <div className="quick-notes-inner">
          <header>
            <div>
              <span className="planner-eyebrow">SHARED WITH YOUR TEAM</span>
              <h2 id="quick-notes-title">
                <StickyNote size={24} /> Quick notes
                {unread > 0 && (
                  <span className="quick-notes-badge">{unread}</span>
                )}
              </h2>
              <p>A shared scratchpad for ideas, updates and handoffs.</p>
            </div>
            <button
              className="planner-icon"
              aria-label="Close quick notes"
              disabled={busy}
              onClick={() => toggleOpen(false)}
            >
              <X size={20} />
            </button>
          </header>
          {error && (
            <div className="planner-error" role="alert">
              {error}
              <button disabled={busy} onClick={() => void load()}>
                Refresh
              </button>
            </div>
          )}
          {selected || editing ? (
            <>
              <button
                className="quick-notes-back"
                disabled={busy}
                onClick={back}
              >
                <ChevronLeft size={16} /> All notes
              </button>
              {changed && (
                <div className="quick-notes-changed" role="status">
                  A newer version is available.{" "}
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        dirty &&
                        !window.confirm(
                          "Discard this draft and read the updated note?",
                        )
                      )
                        return;
                      void readNote(latest);
                    }}
                  >
                    Read latest version
                  </button>
                </div>
              )}
              {editing ? (
                <form className="quick-note-editor" onSubmit={save}>
                  <label className="planner-field">
                    Title <span>(optional)</span>
                    <input
                      aria-label="Note title"
                      autoFocus
                      maxLength={120}
                      placeholder="Give your note a title…"
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          title: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="planner-field">
                    Note
                    <textarea
                      aria-label="Note text"
                      required
                      maxLength={10000}
                      rows={9}
                      placeholder="Write something for the team…"
                      value={draft.body}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          body: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="quick-note-editor-actions">
                    <button
                      className="planner-secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          dirty &&
                          !window.confirm("Discard unsaved note changes?")
                        )
                          return;
                        if (selected) setEditing(false);
                        else back();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="planner-primary"
                      disabled={
                        busy ||
                        !draft.body.trim() ||
                        (Boolean(selected) && !dirty)
                      }
                    >
                      {busy ? (
                        <Loader2 size={15} className="planner-spin" />
                      ) : (
                        <Check size={15} />
                      )}{" "}
                      Save note
                    </button>
                  </div>
                </form>
              ) : (
                <article className="quick-note-full">
                  <h3>{selected.title || "Untitled note"}</h3>
                  <p>{selected.body}</p>
                  <NoteAttribution note={selected} />
                  <div className="quick-note-full-actions">
                    <button
                      className="planner-secondary"
                      disabled={busy}
                      onClick={() => {
                        setDraft({
                          title: selected.title,
                          body: selected.body,
                        });
                        setEditing(true);
                      }}
                    >
                      Edit note
                    </button>
                    <button
                      className="planner-secondary"
                      disabled={busy}
                      onClick={() =>
                        void archive(selected, Boolean(selected.archived_at))
                      }
                    >
                      {selected.archived_at ? (
                        <RotateCcw size={15} />
                      ) : (
                        <Archive size={15} />
                      )}{" "}
                      {selected.archived_at ? "Restore" : "Archive"}
                    </button>
                  </div>
                </article>
              )}
              {editing && selected && <NoteAttribution note={selected} />}
            </>
          ) : (
            <>
              <div className="quick-notes-controls">
                <div>
                  <button
                    className={!archiveView ? "active" : ""}
                    onClick={() => {
                      setArchiveView(false);
                      setUnreadOnly(false);
                    }}
                  >
                    Notes
                  </button>
                  <button
                    className={archiveView ? "active" : ""}
                    onClick={() => {
                      setArchiveView(true);
                      setUnreadOnly(false);
                    }}
                  >
                    Archive
                  </button>
                </div>
                <button
                  className="planner-primary"
                  disabled={loading || busy}
                  onClick={() => {
                    setSelected(null);
                    setDraft({ title: "", body: "" });
                    setEditing(true);
                  }}
                >
                  <Plus size={15} /> New note
                </button>
              </div>
              <div className="quick-notes-search">
                <Search size={15} />
                <input
                  aria-label="Search quick notes"
                  placeholder="Search notes…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {!archiveView && (
                  <label>
                    <input
                      type="checkbox"
                      checked={unreadOnly}
                      onChange={(event) => setUnreadOnly(event.target.checked)}
                    />{" "}
                    Unread
                  </label>
                )}
              </div>
              {undo && (
                <div className="planner-undo">
                  <span>Note archived</span>
                  <button
                    disabled={busy}
                    onClick={() => void archive(undo, true)}
                  >
                    Undo
                  </button>
                  <button
                    className="planner-icon"
                    aria-label="Dismiss note undo"
                    onClick={() => setUndo(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="quick-notes-list">
                {loading ? (
                  <p className="planner-muted">Loading notes…</p>
                ) : visible.length ? (
                  visible.map((note) => (
                    <article
                      key={note.id}
                      className={`quick-note-card ${isNoteUnread(note, receipts.get(note.id)) ? "unread" : ""}`}
                    >
                      <button
                        className="quick-note-open"
                        disabled={busy}
                        onClick={() => void readNote(note)}
                      >
                        <span>
                          {note.title || note.body.split("\n")[0].slice(0, 90)}
                        </span>
                        {isNoteUnread(note, receipts.get(note.id)) && (
                          <span
                            className="quick-note-unread-dot"
                            aria-label="Unread note"
                          />
                        )}
                        <p>{note.body}</p>
                      </button>
                      <NoteAttribution note={note} />
                      <div className="quick-note-card-actions">
                        <button
                          disabled={busy}
                          onClick={() => void archive(note, archiveView)}
                        >
                          {archiveView ? (
                            <RotateCcw size={13} />
                          ) : (
                            <Archive size={13} />
                          )}{" "}
                          {archiveView ? "Restore" : "Archive"}
                        </button>
                        {!archiveView &&
                          isNoteUnread(note, receipts.get(note.id)) && (
                            <button
                              disabled={busy}
                              onClick={() => void readNote(note)}
                            >
                              <Check size={13} /> Read note
                            </button>
                          )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="quick-notes-empty">
                    <StickyNote size={32} />
                    <h3>
                      {unreadOnly
                        ? "You’re all caught up"
                        : archiveView
                          ? "No archived notes"
                          : "No notes here yet"}
                    </h3>
                    <p>
                      {query
                        ? "Try another search."
                        : archiveView
                          ? "Archived notes can be restored here."
                          : "Add a quick note to share with the team."}
                    </p>
                  </div>
                )}
              </div>
              <p className="quick-notes-read-hint">
                Open a note to mark it read for you. Edits make it unread again.
              </p>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

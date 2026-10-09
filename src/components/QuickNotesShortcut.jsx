import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { supabase } from "../lib/supabase";
import { loadUnreadNoteCount } from "../lib/plannerNotes";
import "./QuickNotes.css";
export default function QuickNotesShortcut({
  onClick,
  className = "uts-ops-icon-btn",
  showLabel = false,
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true,
      debounce;
    const refresh = async () => {
      try {
        const value = await loadUnreadNoteCount(supabase);
        if (active) setCount(value);
      } catch {
        /* The planner shows actionable load errors. */
      }
    };
    void refresh();
    const channel = supabase.channel(`note-shortcut-${crypto.randomUUID()}`);
    for (const table of ["planner_notes", "planner_note_reads"])
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => void refresh(), 250);
        },
      );
    channel.subscribe();
    const poll = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    window.addEventListener("uts-notes-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearTimeout(debounce);
      clearInterval(poll);
      window.removeEventListener("uts-notes-changed", refresh);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, []);
  return (
    <button
      type="button"
      className={`${className} quick-notes-nav-shortcut`}
      title="Quick notes"
      aria-label={`Quick notes${count ? `, ${count} unread` : ""}`}
      onClick={onClick}
    >
      <StickyNote size={18} />
      {showLabel && <span>Quick notes</span>}
      {count > 0 && (
        <span className="quick-notes-nav-badge">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

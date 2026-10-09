export function isNoteUnread(note, seenRevision = 0) {
  return !note.archived_at && Number(note.revision) > Number(seenRevision);
}
export async function loadUnreadNoteCount(client) {
  const { data, error } = await client.rpc("planner_note_unread_count");
  if (error) throw error;
  return Number(data) || 0;
}
export async function markNoteRead(client, userId, note) {
  const { error } = await client
    .from("planner_note_reads")
    .upsert(
      { note_id: note.id, user_id: userId, seen_revision: note.revision },
      { onConflict: "note_id,user_id" },
    );
  if (error) throw error;
  window.dispatchEvent(new Event("uts-notes-changed"));
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { isNoteUnread, loadUnreadNoteCount } from "../src/lib/plannerNotes.js";
test("notes become unread again on newer versions and archived notes never count", () => {
  const note = { revision: 3, archived_at: null };
  assert.equal(isNoteUnread(note), true);
  assert.equal(isNoteUnread(note, 2), true);
  assert.equal(isNoteUnread(note, 3), false);
  assert.equal(isNoteUnread({ ...note, archived_at: "now" }, 0), false);
});
test("one team member reading a version leaves another member unread", () => {
  const note = { revision: 2, archived_at: null };
  const reads = new Map([
    ["andrea", 2],
    ["maria", 1],
  ]);
  assert.equal(isNoteUnread(note, reads.get("andrea")), false);
  assert.equal(isNoteUnread(note, reads.get("maria")), true);
});
test("server unread counters propagate errors instead of inventing a zero", async () => {
  assert.equal(
    await loadUnreadNoteCount({
      rpc: async () => ({ data: "12", error: null }),
    }),
    12,
  );
  await assert.rejects(
    () =>
      loadUnreadNoteCount({
        rpc: async () => ({ data: null, error: new Error("offline") }),
      }),
    /offline/,
  );
});

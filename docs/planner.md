# UTS Planner

The shared operations planner is available at `/admin/planner`. The previous
`/admin/notifications` URL redirects here. Both navigation bars use the Planner
icon and show the number of active, incomplete tasks. The main sidebar also has
a Planner entry.

## Working with tasks

- Add a title directly in any column and press Enter, or use **New task** for details.
- Drag cards between columns or use each card's status selector on mobile or with a keyboard.
- Open a task to edit notes, assignee, priority, due date, checklist, candidate/project links, images and comments.
- Images can be selected or dropped while creating a task. They upload after task creation. Failed uploads can be retried without creating a second task.
- **All tasks**, **My tasks**, **Today**, **Overdue** and **Unassigned** combine with title/notes search.
- **List view** sorts tasks by date, with undated tasks last. Board order is saved independently.
- Complete/reopen a card with its check button. Archive from task details; undo immediately or restore from the archive view.
- Unsaved notes, checklist steps, comments and staged images trigger a discard confirmation when closing the editor.

Task status is independent of candidate status. Moving or completing a task does
not change a candidate's recruiting lifecycle. Existing recruiting events and
notification history remain available for future automation; this version does
not automatically create tasks or send scheduled deadline messages.

## Persistence and access

Apply both migrations:

- `20261009200438_team_planner.sql`
- `20261009201116_planner_live_updates.sql`

`planner_tasks`, `planner_comments` and `planner_attachments` use RLS and explicit
Data API grants. Access requires the same worker-edit or worker-delete permission
as the admin workspace. Candidates, clients and anonymous users cannot access
these records. The restricted directory includes permitted admins, even without
a recruiter profile. Its privileged lookup lives in the non-exposed `private`
schema; the public RPC is a security-invoker wrapper.

Images are stored in the private `planner-images` bucket and displayed through
one-hour signed URLs. Uploads accept JPG, PNG, WebP and GIF up to 10 MB per image.
Archiving retains attachments for restoration. Task writes check `updated_at` to
reject stale edits. Creation timestamps and authors are immutable on update.

Realtime subscriptions refresh the board and open comments/images. A 30-second
poll and window-focus refresh provide a fallback. Draft task fields are never
replaced by background refreshes.

## Verification

Run the repository lint, build and Node tests. `test/planner.test.js` covers
calendar dates, filters, ordering and upload validation.

`scripts/verify-planner-ui.mjs` uses an isolated mock API and Playwright. Set
`UTS_PLAYWRIGHT_MODULE` and, if necessary, `UTS_CHROME_PATH` for your local runtime.
It checks creation with staged images, assignment, dates, checklist, links,
comments, uploads, filters, completion, archive/undo, drag, concurrency errors,
load retry, upload retry without duplication, mobile layout and reload.
Screenshots are written to `tmp/planner-verification/`.

Live database verification was executed in rolled-back transactions using the
`authenticated` role: authorized task/comment writes, directory access,
assignment validation, immutable creator, stale-edit rejection, and denial of
reads and writes for accounts outside the team. No test tasks were retained.

## Shared quick notes

**Quick notes** opens a shared scratchpad from the planner header or navigation.
The navigation shortcut opens `/admin/planner?notes=1`. Team members can create,
read, edit, archive, undo an archive, and restore notes. Titles are optional;
notes support up to 10,000 characters. Search and an Unread filter help locate
notes.

Unread badges are individual and persist across browsers/devices. Opening the
list does not mark its contents read; opening a full note records the exact
revision displayed. Any later edit makes the note unread again. Archived notes
do not contribute to the badge. Authors automatically read their own saved
notes. Realtime subscriptions and polling update counts.

Small attribution lines show creator and last modifier with timestamps. These
fields, author name snapshots and revision numbers are stamped by the database.
Clients cannot spoof them. Concurrent edits retain the draft and provide a
latest-version action. Read receipts are restricted to their owner, cannot
change ownership, cannot reference future revisions, and never move backward.

Migrations: `20261009203251_planner_quick_notes.sql` and
`20261009203350_quick_notes_read_integrity.sql`. The new tables use the existing
admin/recruiter authorization. Live rolled-back tests verified two-user read
isolation, edit attribution, archive counts, stale writes and outside-team
access denial. The browser verification script covers the same note interactions
with an isolated mock API and desktop/mobile screenshots.

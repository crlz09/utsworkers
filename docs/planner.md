# UTS Planner

The shared operations planner is the first tab in **Onboarding → Planner,
Screening, Certs**, at `/admin/onboarding/planner`. The previous `/admin/planner`
and `/admin/notifications` URLs redirect here. The sidebar's Onboarding entry
opens Planner; there is no separate sidebar entry or top-right Planner icon.

## Calendar, recruitment and onboarding

The default view is now an interactive month calendar, with a week option,
previous/next controls, Today, date-specific creation, drag rescheduling and an
unscheduled tray. Board and List remain available. Assignee and status filters
combine with the existing ownership/deadline filters and search. Search also
matches linked candidate names and project titles.

Choose **Weekly** in a task and set a due date. Completing the occurrence creates
one successor seven days after that occurrence's due date. It copies assignment,
candidate, project, priority and checklist text, resetting checklist completion.
Comments and attachments stay on the completed occurrence. Reopening and completing
the same occurrence never duplicates its successor. This is completion-driven
recurrence: future instances are not pre-generated. Stop a series by setting its
open occurrence to Does not repeat, or archiving it.

**Notifications** shows your open assignments plus unassigned tasks due today or
overdue. These are derived in-app alerts refreshed through the existing realtime,
polling and focus refresh. They resolve when the underlying task is completed or
archived; email, push delivery and dismiss/read receipts are not part of these alerts.

Link a candidate to display a readiness panel backed by the existing
`worker_documents`, certificate metadata and latest `candidate_screenings` record.
Required document checks reuse the two-sided document rules. Certificate indicators
mean a file is present, not that validity or project requirements have been verified.
The panel links to candidate details, documents, certificates, screening and the CTS
form. **Add onboarding checklist** adds the standard steps without duplicating them.
Checklist completion remains a manual team attestation, independent of readiness.

Link a CTS project as well to submit the existing `cts_job_candidates` relationship
for internal review. The candidate must already belong to that project. The workflow
is Not submitted → Pending → Approved or Changes requested → Pending on resubmission.
Change requests require a note. Actor IDs and timestamps are stamped by the database,
and updates use `updated_at` to reject concurrent changes. All existing planner team
members may submit and review, including their own submission. This internal approval
does not submit externally, change placement, or certify that documents are valid.
Use the existing CTS form/Jotform and project placement workflows for those actions.

## Architecture and database design

The foundation review found that assignments, statuses, checklists, comments,
attachments, team membership, candidate documents and screening already had working
storage and permission models. They are reused rather than copied into a second
candidate or document store. Existing task IDs and quick notes are preserved.

`planner_calendar_workflows` adds recurrence fields to `planner_tasks`, a unique
parent reference for successor idempotency, and `planner_cts_reviews` referencing
an existing CTS candidate/project relationship. Foreign keys retain referential
integrity. Review RLS uses the same `can_manage_cts_jobs()` permission as the planner;
clients, candidate accounts and anonymous users cannot access it. Explicit grants
allow team reads/inserts/updates, with no authenticated delete grant. Trigger
functions use invoker rights and an empty search path, and cannot be called directly.
Existing task/document/storage RLS remains in effect.

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
notification history remain available. Weekly successors are created on completion;
this version does not send scheduled deadline messages.

## Persistence and access

Planner migrations:

- `20261009200438_team_planner.sql`
- `20261009201116_planner_live_updates.sql`
- `20261017175215_planner_calendar_workflows.sql`

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

**Quick notes** is an independent floating workspace mounted outside the page
routes. Open it from the single shortcut at the bottom of the sidebar, above Sign out,
which replaces Legacy dashboard. On mobile, open the navigation menu first.
There is no top-right or bottom floating launcher. Opening it never navigates
to Planner. The panel remains interactive above page overlays and task dialogs;
it does not block navigation. Drag its header to move it, minimize to keep an
unsaved draft, or close with the existing unsaved-change protection. Open state
and drafts survive navigation between pages in the same browser window. Saved
notes and individual unread state continue to sync across windows/devices through
the existing database, realtime subscriptions and polling. Signing out removes
the workspace. Its styling no longer depends on loading the Planner page.

Team members can create,
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

Quick notes support bullet lists. Select one or more lines and use **Bullet list**
to add/remove bullets. Enter continues a bullet; Enter on an empty bullet exits
the list. Shift+Enter inserts a plain newline. Saved notes render bullets as
semantic lists, while previews display bullet symbols. Notes remain plain text
in storage, so existing notes and author/read tracking continue to work.

## Calendar release verification

The calendar migration was applied to the linked Supabase project on October 17,
2026. `supabase/tests/planner_calendar_workflows.sql` verifies successor date and
checklist reset, duplicate prevention, due-date validation, review transitions,
server attribution, and outside-team/anonymous access denial in a rolled-back
transaction. Node tests cover month/week boundaries, daylight saving and alert
ownership. Browser checks use mocked APIs for calendar/week navigation, dated task
creation, CTS submit/change-request/resubmit/approve, mobile overflow, and the
existing planner and quick-note regression flows. Screenshots are under
`tmp/planner-verification/calendar-{desktop,mobile}.png`.

The navigation update is verified by browser checks asserting the tab order and
absence of sidebar/top-right Planner actions. The same checks edit a note while
navigating Planner → Certs → Planner, minimize/reopen without losing the draft,
drag the panel, and open it above a task modal.

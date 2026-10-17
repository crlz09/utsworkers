# Application navigation and access lifecycle

The October 17 recording showed the sidebar expanding after section clicks and
collapsing three seconds later, repeated loading states, and sections shifting
vertically as their headers appeared/disappeared.

## Persistent operations layout

`OperationsLayout` owns the single `UtsTopNavBar` and an inner Suspense boundary.
All current administrator routes are children of that layout. Page modules own
only their content, so lazy page loading cannot remove the sidebar or header.
The top header renders only when it contains a control (the Overview search or
an explicit action slot). Other sections have no empty white bar. Mobile retains
a floating navigation toggle, and candidate headings stick at the correct offset. Sidebar CSS lives in
`UtsTopNavBar.css`; it is no longer emitted separately by each page.

The sidebar width changes only through its expand/collapse control. Its existing
localStorage preference is retained. Section navigation no longer starts an
automatic collapse timer. Clicking the current section does not navigate again.
Scroll resets once on pathname changes, not on search query updates; Overview's
previous three delayed scroll resets have been removed.

Public registration keeps its public header. Client and worker portals retain
their respective navigation. Legacy dashboard and its unused page/navigation
modules have been removed; `/admin/legacy` redirects to the current Overview.
The sidebar footer contains Quick Notes, Docs, and Sign out in that order.
Docs has no duplicate entry in the main navigation.

## Shared access state

`AccessProvider` owns the session/access lifecycle for route guards, navigation
permissions and global Quick Notes. Initial access is validated through
`getCurrentUserAccess`; protected routes remain gated until that completes.
User changes and sign-out invalidate pending results immediately. Generation
checks prevent earlier requests from restoring stale access.

Repeated sign-in notifications for the same identity and token renewal do not
reload roles or unmount the current view. Permission revalidation runs while the
app is visible after at least one minute, with focus/visibility as additional
triggers. Revalidation keeps the existing page visible; revoked permissions
still cause the appropriate route redirect. API calls are deferred out of the
synchronous auth callback. Initial permission errors expose Retry instead of
silently treating network failures as a signed-out session.

Staff and client sessions resolve their role queries in parallel and do not
attempt to claim a candidate profile. Candidate sessions retain the existing
claim and lookup flow. Supabase RLS remains the authority for data access;
this refactor does not change database permissions or migrations.

## View loading

Overview fetches its independent datasets in parallel, handles request errors
with Retry, and ignores responses after leaving the page. Its metrics display
placeholders during loading instead of temporary zeroes. Loading Overview no
longer updates candidate statuses. Placement changes already synchronize those
statuses through the existing CTS database trigger; display status can still be
computed from placement records without writing during a read.

This is not a cross-route data cache: individual views still fetch their own
current data when opened. The persistent layout separates those fetches from
navigation and authentication, avoiding full application loading screens.

## Verification

`node --test`, ESLint and the production build pass. The existing isolated
browser verification additionally checks:

- Sidebar/header DOM identity across page changes and delayed candidate responses.
- Collapsed/expanded width survives navigation, including the former three-second timer.
- Page navigation and token renewal do not repeat shared permission lookups.
- Staff sessions do not call candidate-profile claiming.
- Overview loading performs no candidate writes.
- Sign-out removes protected navigation and the private notes workspace.
- Planner, note editing, unread state, mobile layout and floating notes regressions.

Screenshots remain local under `tmp/planner-verification/`; video analysis frames
are under `tmp/navigation-review/`. Neither directory is intended for source control.

## Pre-commit review

The final review moved Docs to the footer between Quick Notes and Sign out and
removed the duplicate main-menu entry. Additional fixes prevent cancelled touch
gestures from toggling navigation, close the mobile drawer on history/link
navigation, avoid stale unread-count responses, and avoid displaying the previous
candidate's name while a different record loads. Email fallback lookups escape
LIKE wildcard characters.

Login now shares the access provider's in-flight lookup and always leaves its
checking state when no candidate profile exists. Browser regressions exercise
that recovery, cancelled gestures and the footer order. Existing legacy page and
navigation duplication was removed, while old legacy URLs still redirect safely.

# CTS hiring modes

A CTS candidate assignment (`cts_job_candidates`) has a recruiting status and a
separate hiring mode. In Projects, changing status to **Placed** opens an explicit
choice. Both the dashboard and project detail (including direct placement while
adding a candidate) use the same selector. Cancellation leaves the persisted
status unchanged. Status and mode are saved in one request, with an `updated_at`
condition to reject concurrent edits.

| Mode | Employer | Hourly UTS fee | Placement fee |
| --- | --- | --- | --- |
| Sourcing | CTS | $1 per hour | $50 once per worker |
| Owned | UTS | $5 per hour | None |

Owned means UTS is responsible for payroll and government obligations. This
release records that responsibility; it does not run payroll or calculate tax
obligations. A worker can have different contracts over time, so the mode lives
on the project assignment rather than on the candidate's global profile.

Only permitted UTS team members select/change a mode. Existing client read/write
policies are unchanged; clients cannot choose a new hiring mode. The database
requires a mode for placement, derives `hourly_fee_rate`, and sets assignment
placement fees to $50/$0. Owned assignments cannot be marked placement-paid and
are excluded from propagation of a worker's earlier Sourcing placement payment.
The existing one-time Sourcing payment inheritance is retained.

Assignments with a previous placement or placement billing history are backfilled
as Sourcing to preserve the application's pre-existing $1/hour + $50 behavior.
Other sourced records remain unclassified until placement. Mode changes are
rejected when the assignment has a paid/billed placement or saved invoice lines;
a different contract then needs a new assignment. Historical Owned records, if
any, need an explicit reviewed correction rather than automatic inference.

The mode and employer appear beside status in the project tables, and the mode
is searchable and included in dashboard CSV exports. Owned placement fees display
Not applicable and do not contribute to pending placement-fee counts.

## Billing

New CTS hourly lines use the assignment's mode, including imported CTS hours and
approved time entries. Owned generates no placement-fee line. A placement already billed (even unpaid)
is excluded from new invoice generation, including that worker’s other projects. Saved invoices keep
their stored rates; reopening an old imported-hours invoice does not overwrite its
rate with the current assignment fee. Existing manual line/rate controls retain
their behavior.

## Migration and checks

`20261017191359_hiring_modes.sql` is applied to the linked Supabase project.
`supabase/tests/hiring_modes.sql` verifies pricing, mode-required placement,
Owned payment denial and paid-contract protection in a rolled-back transaction.
No test assignments remain in the database.

Node tests cover terms, missing-mode rejection and invoice rate snapshots.
`scripts/verify-hiring-modes-ui.mjs` uses an isolated mock API to check explicit
choice, both modes, cancellation, mobile layout, project detail and the generated
invoice fees. Screenshots are local under `tmp/hiring-verification/`.

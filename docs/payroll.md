# Payroll preparation

`/payroll` is a supervisor-only preparation workspace for OWNED assignments. It does not submit payroll, change Gusto records or move money.

## Directory refresh

Gusto OAuth remains in the local official CLI, outside the repository and browser. The dashboard uses a dated directory snapshot, not a live Gusto connection.

With Gusto CLI installed and authorized:

```sh
node scripts/export-gusto-payroll-directory.mjs --output /absolute/private/path/gusto-payroll-directory.json
```

In Payroll → Gusto directory, import that JSON. Only names, emails, record IDs, W2/1099 and active status are exported. Keep exported files private and outside Git. The import rejects other companies and older snapshots, and preserves existing links. Removed people become inactive. Import files only from the official local export workflow.

A candidate is linked explicitly by a supervisor. An exact, unique active email match is a suggestion only. One Gusto record can be linked to one UTS candidate. Inactive records and hiring-method differences require attention.

## Pay periods

The period is Monday–Sunday, using the saved UTS WEEK ENDING report at `/invoice/cts-weekly` whose `week_ending` equals period start + six days. Saved reports are the authoritative hours source for Payroll, including reports that have not been invoiced yet. Each source panel shows its saved/invoiced status and revision. The matching report opens directly from Payroll; the invoice view links back to the corresponding payroll period.

`get_payroll_cts_week` reads REG/OT hours and computes employee pay rate as CTS RATE minus the report's UTS fee. Rates in current candidate profiles and project assignments are not rewritten. A project can retain a different current rate from a historical report. DT is zero because UTS WEEK ENDING has no DT field.

Source names are matched against OWNED assignments using exact normalized names or CTS's LAST, FIRST middle-name format. Only a single matching assignment is selected automatically. Duplicate/ambiguous identities require a supervisor to select the assignment in the source-panel mapping controls. Explicit links retain the report's employee and contractor labels, so rearranging report rows does not silently reassign them. Multiple rows for one assignment are summed; multiple pay rates for that assignment block readiness instead of silently averaging the rate. Source names that do not match an OWNED assignment remain visible for review and are not paid.

Drafts retain the source report UUID, revision and a fingerprint of the resolved source rows. Corrected reports or changed row mappings invalidate existing drafts. A database trigger rejects saving against an outdated source. Legacy drafts from the earlier Hours-based view require review against this new source. The page includes current OWNED placements and historical assignments with matched source rows or saved drafts.

Rates default to the net employee rate from the report. Draft edits do not change the report, project rate or profile. OT/DT estimates use 1.5×/2×. Regular hours above 40 across OWNED projects for one W2 worker require review; the UI never silently reallocates overtime. These are review estimates, not a tax or statutory overtime engine.

Positive report Per Diem days × daily rate prefills the weekly total. A zero report total is accepted as zero only when the project also has no Per Diem configured; otherwise the weekly total requires explicit review. This matters because historical payroll reimbursements are not always present in invoice report Per Diem fields. Per Diem is not automatically classified as tax-free reimbursement. Totals exclude employer taxes and benefits.

Gusto's pay-period dates can differ from CTS report dates. The dashboard retains the CTS period identity and does not silently shift it to a Gusto period or submit payments. Historical comparisons use employee REG/OT hours and net hourly rate, not invoice gross wages or check date alone.

CSV exports are review files for Excel, not Gusto upload files. They include source UUID/revision and unresolved issues. Values that could be interpreted as spreadsheet formulas are escaped.

## Database and access

Apply `20261030203043_payroll_workspace.sql` and `20261030204525_payroll_cts_weekly_source.sql`. All payroll tables use RLS and `can_delete_workers()` (the existing supervisor permission), with no anonymous access. No credentials, SSNs, tax IDs or bank information are stored. `import_payroll_gusto_directory` is an invoker function with an explicit supervisor check. The draft trigger validates OWNED assignments and source versions.

The first directory was imported during setup. Future automated background synchronization and Gusto draft submission require a separately deployed backend connection; the local CLI session alone does not authorize or create a production web integration.

## 1099 weekly paystubs

Payroll → **1099 paystubs** prepares independent contractor payment statements using the UTS navy/light-blue Excel template. Select a Monday and a linked employee whose CTS assignment is **1099** and **placed**. This section does not require a Gusto link. Matched payroll hours, employee rate and weekly per diem prefill the form; missing hours/per diem require explicit entry. Rates and amounts can be reviewed for this statement without changing source reports or project rates. OT uses 1.5×; deductions subtract from regular pay + overtime + per diem + extras. Double-time source rows block finalization because this template has no DT line.

The payment date initially defaults to the Friday after the period ends and can be changed. The statement number defaults to `N/A`. Draft previews remain in memory and are not published or saved. Reviewing the confirmation and choosing **Finalize paystub** inserts a final snapshot into `contractor_paystubs`; the database computes the net and captures the current worker/project identity, creator and finalization timestamp. Eligibility is checked again on the server. Finalization makes the statement available to the employee immediately.

**Final history** searches by employee name across all saved periods and provides online views and one-page Letter PDF downloads. Final snapshots cannot be updated or deleted. A correction for the same worker/week requires an explicit confirmation, a reason and the latest final’s ID; it inserts the next version and labels the old version as replaced. Concurrent/accidental duplicate finalizations are rejected. The template version is retained for reproducible historical PDF rendering. Final statements retain references to their worker and assignment, so these referenced records cannot be deleted while their financial history exists.

The employee signs into the existing candidate portal and opens **Paystubs** (`/worker/paystubs`). The navigation item appears once a final exists. The employee can view and download only their own final statements, including earlier/replaced versions. Old records stay available after their assignment changes; new issuance still requires a placed 1099 assignment. Statement links of the form `/worker/paystubs?statement=<UUID>` also enforce the same ownership check. There is no anonymous/public payroll link or payment submission. Emailing a final is a separate explicit supervisor action described below.

Database setup: apply `20261105010721_contractor_weekly_paystubs.sql`. It creates the final-snapshot table, immutable/revision triggers and an invoker history view, with RLS for supervisors and the existing `current_worker_id()` identity. Only supervisors with `can_delete_workers()` may finalize; ordinary employees have read-only access to their own records.

Verification: `node --test test/contractorPaystub.test.js test/payroll.test.js` checks the twelve corrected Excel totals, validation and one-page PDF output. `supabase/tests/contractor_paystubs.sql` exercises actual database permissions, eligibility, server calculations, immutable snapshots and corrections inside a rolled-back transaction (requires two eligible assignments and one supervisor). `scripts/verify-paystubs-ui.mjs` covers the admin/employee flows and mobile layout with API fixtures; set `UTS_PLAYWRIGHT_MODULE` / `UTS_CHROME_PATH` if using an external Playwright installation. It never creates real final statements.

### Email final paystubs

After finalizing, choose **Email paystub**. Alternatively open **Final history**, filter by employee/week, select up to twenty current finals on the page and choose **Email selected**. The review shows each profile email, sender, reply address, subject, message and PDF. Only an explicit reviewed send delivers emails. Each employee receives a private message with their own PDF and authenticated portal link; a batch is a sequence of individual requests, never a shared recipient list. Missing/invalid profile emails and replaced versions are blocked. Correct the profile before reviewing again; Gmail contacts do not automatically overwrite employee data.

The subject follows the existing business-mailbox convention, `Paystub - Week Ending MM/DD/YYYY`. Messages use the UTS style. The app uses the existing Resend service, not the Codex Gmail connector or Gmail's read-only screening OAuth connection. Sending therefore does not add a message to Gmail's Sent folder. Replies go to `cmolina@universaltalentsource.com`.

Deploy the `paystub-email` Edge Function and apply `20261105013057_paystub_email_delivery.sql`. Existing `RESEND_API_KEY`, `WORKER_NOTIFICATION_FROM` and `APP_BASE_URL` secrets are reused. Optional `PAYSTUB_EMAIL_FROM` overrides the sender and must use a verified Resend domain. The review displays the actual configured sender. `verify_jwt=false` is intentional: the handler validates the bearer via `auth.getUser` and requires `can_delete_workers` before any lookup/send. Never expose the service key or Resend key to the browser.

`contractor_paystub_deliveries` stores one attempted message per final. The server generates its PDF from the saved final using the same renderer as downloads. At the first reviewed send, the exact recipient, sender, body and attachment are frozen server-side. Profile/configuration changes invalidate the review. Repeated requests use the same Resend idempotency key and stored payload; already accepted messages are skipped. Unconfirmed attempts may be retried with the same reviewed request for up to 23 hours. After that window, investigate the provider record instead of initiating another send. A new corrected final has a different identity and may be sent separately.

Supervisor history distinguishes not sent, unconfirmed and provider-accepted messages. Acceptance is not an inbox-delivery/bounce confirmation. Employees cannot read delivery logs, and no browser role can read raw request payloads/PDF attachments or write send states. No automatic mail is sent when a final is generated. Existing manual Gmail sends are not imported or resent.

`node --test test/paystubEmail.test.js` tests mail privacy, review changes, duplicate prevention, exact retries and timeout boundaries with mocked transport. `supabase/tests/paystub_email_delivery.sql` checks real grants/RLS and immutable delivery requests in a rolled-back transaction. UI verification includes individual/bulk review, manual confirmation and status updates. These tests send no real emails.

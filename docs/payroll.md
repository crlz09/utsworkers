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

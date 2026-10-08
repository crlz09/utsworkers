# Hiring onboarding: drug screens

**Onboarding** (`/admin/onboarding`) imports and reviews screening orders. Verified orders
also appear in **Candidate → Onboarding**. Gusto integration is a later hiring step.

## Onboarding steps

Onboarding has two tabs: **Screening** (the drug-screen workflow below) and **Certs**.
Certs is available globally at `/admin/onboarding/certs` and per candidate at
`/admin/workers/:workerId/onboarding/certs`. Use **Find a candidate** in the global view: type a name, then select an autocomplete
suggestion with a click or Enter. Suggestions show the email to distinguish similar names.
Optional upload categories are OSHA, MEWP, Fall Arrest, Orientation, and Others.
Each upload has a custom document name; multiple certificates can be appended in
any category. Existing OSHA cards are included, while unrelated Other documents
are not automatically treated as certificates.

Files use the existing private `worker-documents` bucket and document RLS. Metadata
is stored in `document_name` and `onboarding_cert_category`. Certificates are also
visible in candidate Documents and searchable by custom name in Docs. Replacing
a standard document does not remove certificates appended through Certs. Uploading
a certificate does not mark the candidate approved or ready to work.

## Workflow

1. Sync Gmail or import the original ePassport PDF manually. Pasting Cheryl's email can fill
   the laboratory fields. Check the extracted fields before saving.
2. Verify the PDF's name and confirmation against the selected candidate. Gmail matches by
   exact, unique email are suggestions; the administrator must explicitly confirm identity.
3. Save the order to the candidate. The recipient must match the profile's email.
4. Review the Spanish or English message and send it with the original PDF through Resend.
   Replies go to `cmolina@universaltalentsource.com`.
5. Record reported attendance separately from receipt of the provider result document. Receipt of
   a result does not approve a hire. History records each change.

Screening rows and PDFs are separate from ordinary candidate documents. Only candidate
administrators can read them; writes go through the server and require `can_edit_workers`.
Candidate self-service, clients, and public profiles cannot read orders or results.

## Activation

The Supabase backend was deployed and verified on October 7, 2026 in project
`jncbcgprquxsoqqyccqd` (jobere): tables, private storage, server permissions,
`screening-workflow`, Vault credentials, and five daily import times are configured.
Gmail credentials are stored in Edge Function secrets. Google confirmed the business
mailbox, and the first live sync imported five orders without errors.
The existing Resend key and `WORKER_NOTIFICATION_FROM` sender are reused; replies go to Carlos.

The remaining activation step is releasing the frontend through the normal process. Local and remote histories already differed for older features; this
deployment applied only the screening migrations. Review those differences before using
a blanket database push. The commands below are for a future clean environment:

```sh
supabase migration list
supabase db push --dry-run
supabase db push
supabase functions deploy screening-workflow
```

The function has `verify_jwt = false` because it validates each user with `auth.getUser` and
checks permissions itself. A separate cron credential can only import Gmail orders.

Store these as **Supabase Edge Function secrets**, never browser or `VITE_` variables:

| Secret                           | Purpose                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `SCREENING_GOOGLE_CLIENT_ID`     | Gmail OAuth client ID                                                          |
| `SCREENING_GOOGLE_CLIENT_SECRET` | OAuth client secret                                                            |
| `SCREENING_GOOGLE_REFRESH_TOKEN` | Offline authorization for Carlos's business mailbox                            |
| `RESEND_API_KEY`                 | Existing Resend integration; sending and email retrieval access                |
| `SCREENING_EMAIL_FROM`           | Optional sender override; otherwise reuses existing `WORKER_NOTIFICATION_FROM` |
| `SCREENING_SYNC_SECRET`          | Random secret of at least 32 characters for scheduled imports                  |

Use the Supabase dashboard or a secrets file outside the repository:

```sh
supabase secrets set --env-file /absolute/private/path/screening.env
```

The Codex Gmail connector is separate from the application's authorization.

### Connect Gmail

1. Enable Gmail API in the organization's Google Cloud project and configure its OAuth
   consent screen (internal for Workspace, when available).
2. Create an OAuth client and register the exact redirect URI used by your authorization tool.
3. Authorize **cmolina@universaltalentsource.com** with only
   `https://www.googleapis.com/auth/gmail.readonly`, `access_type=offline`, and
   `prompt=consent`. The authorization tool must validate state and exchange the code on its
   server. Save the returned refresh token and client credentials as the secrets above.
4. Click **Sync Gmail**. The server refreshes access tokens and verifies the connected mailbox.

Initial sync covers the prior 90 days, 15 messages per call. Repeat when more orders are
available. Subsequent complete syncs overlap the prior two days. Original Cheryl messages
are selected; Jerry's forwards are excluded. Message IDs and confirmation numbers deduplicate.

A failed message appears in the sync error banner with its ID and reason. Successful orders
on the same page stay saved. Import the problematic order manually with its confirmation,
then sync again; the duplicate check resolves it and allows pagination to continue. Revoked
or expired authorization is shown as a Gmail connection error.

### Periodic imports

The production job and its Vault secrets are already configured. For another environment,
enable `pg_cron`, `pg_net`, and Vault. In Vault, configure `screening_sync_url` with the HTTPS
function endpoint and `screening_sync_secret` with the same secret as the function's
`SCREENING_SYNC_SECRET`. Enter the values in the dashboard rather than SQL history. Apply the `screening_five_daily_syncs` migration after configuring Vault.

Imports run daily at **08:00, 11:50, 14:00, 16:00, and 18:00** in
`America/Indiana/Indianapolis`. The previous ten-minute job is removed. Five named
cron jobs each include both possible UTC hours and check the local time before
making an HTTP request, so there are exactly five scheduled syncs per day across
standard time and daylight saving time. The alternate UTC execution is a SQL no-op.

The schedule imports only. Emails require administrator review and an explicit send action.
Inspect `cron.job_run_details` and `net._http_response` for failures; restrict access to these
operational logs. A interrupted sync holds its lease for at most four minutes before retry.

## Send recovery

An attempted send locks its reviewed recipient, subject, body, and original attachment. Each
order has a deterministic Resend idempotency key. If a response is lost, **Retry the same
saved email** resubmits the identical request. The original PDF's SHA-256 is checked again.

Resend retains keys for 24 hours; resend attempts stop after 23 hours. Locate an uncertain
send in Resend and use **Reconcile a send found in Resend** with its provider email ID. The
server checks the ID, recipient, subject, text, and send window before recording the original
send without another email. Provider acceptance does not guarantee inbox delivery.

Bounce webhooks, automatic candidate reminders, and Gusto synchronization are outside this
first workflow. Result receipt is tracked with a separate private PDF, never the public bundle.

## Verification

```sh
npm run build
node --test
npx deno check --node-modules-dir=none --no-lock supabase/functions/screening-workflow/index.ts
npx deno test --node-modules-dir=none --no-lock --allow-env --allow-read --allow-sys supabase/tests/*.check.ts
```

The database test executes the migration in disposable PostgreSQL (PGlite), verifying roles
and RLS even with older broad storage policies. API tests intercept all external calls and
simulate a lost response after provider acceptance. The parser tests use synthetic candidates.

With a local Vite server and Playwright:

```sh
UTS_CHROME_PATH='/path/to/chrome' node scripts/verify-screening-ui.mjs
```

`UTS_PLAYWRIGHT_MODULE` can identify an installed Playwright module; `UTS_DEV_URL` defaults to
`http://127.0.0.1:5173`; `UTS_SCREENING_SCREENSHOTS` controls screenshot output. The browser
test mocks every Supabase request and verifies desktop/mobile layout and the reviewed send
flow. It does not contact Gmail or send real email. After activation, verify OAuth and delivery
with an internal test candidate before live use.

References: [Gmail sync](https://developers.google.com/workspace/gmail/api/guides/sync),
[offline OAuth](https://developers.google.com/identity/protocols/oauth2/web-server#offline),
[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[private storage](https://supabase.com/docs/guides/storage/security/access-control).

Screening results accept PDF, JPG, PNG, and WebP files up to 10 MB, including
candidate-submitted photos. Record the source and receipt date. Images preview
inline and keep their original image format in the private screening bucket;
Docs uses the stored result MIME type and size. The ePassport import and email
attachment remain restricted to the original PDF.

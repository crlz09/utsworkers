# Admin document library

**Docs** at `/admin/docs` lists uploaded files across candidates. Search by candidate name,
email, filename, custom certificate name, document type/description, or screening confirmation. Search matches metadata,
not the text inside PDF/image files. Choose a type or use the OSHA Card / Others quick filters.
Results are ordered newest first and paginated in groups of 50, with full-library counts.

OSHA legacy values (`osha`, `osha_card`) and OSHA Card front/back files share the OSHA Card
category. Other descriptions share Others and remain searchable. Categories represent the
stored document classification: an `Other: OSHA 10` file remains under Others. Counts are
individual uploaded files, so front/back files count separately.

Sources are `worker_documents` (including saved BIOs) and `candidate_screenings` original
PDFs and result PDFs or images. Unlinked screening orders display the original candidate name/email
and a pending verification label. Candidate links go to the relevant document or onboarding
workspace. Open creates a private signed URL valid for 60 seconds; Download uses the existing
Storage authorization. The library does not mutate documents or their classifications.

## Authorization and deployment

The page is behind `AdminRoute`. The `search_admin_documents(text,text,integer)` RPC also
requires `can_manage_worker_documents()` before reading data. It is `SECURITY INVOKER`, uses
an empty search path, and preserves existing row-level policies. Anonymous execute privilege
is revoked. Non-admin authenticated users cannot use the global search, including counts.
Existing candidate access to their own uploads remains available.

The `admin_document_library` migration is deployed to the existing Supabase project. Deploy
frontend changes through the normal Git/Vercel process. Do not run a blanket database push
without reviewing the older local/remote migration differences.

## Verification

- `supabase/tests/admin_docs.check.ts`: actual SQL migration, anonymous/non-admin denial,
  grouping, literal search, cross-source records, and complete pagination of 1,107 files.
- `scripts/verify-admin-docs-ui.mjs`: local browser with mocked Supabase/Storage; verifies
  search, filters, pagination, private file opening, downloads, failure recovery, responsive
  layout, and non-admin redirect. Set `UTS_PLAYWRIGHT_MODULE` and optionally `UTS_CHROME_PATH`.
- Live database verified as an authenticated admin: 587 files, 73 OSHA files, 39 Others at
  deployment time; private buckets and function permissions checked.

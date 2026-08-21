-- The simplified recruiting workflow only supports four candidate states.
-- Preserve terminal states and normalize retired intermediate states to sourced.

update public.cts_job_candidates
set candidate_status = 'sourced',
    updated_at = now()
where candidate_status not in ('sourced', 'placed', 'rejected', 'on_hold');

alter table public.cts_job_candidates
drop constraint if exists cts_job_candidates_candidate_status_check;

alter table public.cts_job_candidates
add constraint cts_job_candidates_candidate_status_check
check (candidate_status in ('sourced', 'placed', 'rejected', 'on_hold'));

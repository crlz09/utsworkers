-- Persist every accepted CTS Jotform submission and route the candidate to the
-- Default project inbox. Writes come exclusively from the webhook service role.
create table if not exists public.cts_jotform_submissions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  cts_job_candidate_id uuid references public.cts_job_candidates(id) on delete set null,
  form_id text not null,
  submission_id text not null unique,
  submitted_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create index if not exists cts_jotform_submissions_worker_id_idx
  on public.cts_jotform_submissions (worker_id, submitted_at desc);

alter table public.cts_jotform_submissions enable row level security;
revoke all on table public.cts_jotform_submissions from public, anon, authenticated;
grant select on table public.cts_jotform_submissions to authenticated;
grant all on table public.cts_jotform_submissions to service_role;

drop policy if exists "CTS Jotform submissions readable by admins" on public.cts_jotform_submissions;
create policy "CTS Jotform submissions readable by admins"
on public.cts_jotform_submissions for select to authenticated
using ((select public.can_manage_cts_jobs()));

-- The project may already have been created manually. This statement only
-- provides the inbox when it is missing.
insert into public.cts_jobs (
  level_type, client_name, status, priority, details, internal_notes
)
select
  'Default', 'CTS', 'open', 'normal',
  'Temporary inbox for candidates whose CTS Jotform was submitted successfully.',
  'Candidates remain sourced here until assigned to their final CTS project.'
where not exists (
  select 1 from public.cts_jobs where lower(trim(level_type)) = 'default'
);

create unique index if not exists cts_jobs_single_default_inbox_idx
  on public.cts_jobs ((lower(trim(level_type))))
  where lower(trim(level_type)) = 'default';

-- Once a candidate is placed in a real project, remove the temporary Default
-- assignment. The submission audit row remains available in the candidate file.
create or replace function public.remove_default_cts_inbox_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.candidate_status = 'placed' and new.worker_id is not null then
    delete from public.cts_job_candidates candidate
    using public.cts_jobs job
    where candidate.cts_job_id = job.id
      and lower(trim(job.level_type)) = 'default'
      and candidate.worker_id = new.worker_id
      and candidate.id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_remove_default_cts_inbox_assignment on public.cts_job_candidates;
create trigger trg_remove_default_cts_inbox_assignment
after insert or update of candidate_status on public.cts_job_candidates
for each row
when (new.candidate_status = 'placed')
execute function public.remove_default_cts_inbox_assignment();

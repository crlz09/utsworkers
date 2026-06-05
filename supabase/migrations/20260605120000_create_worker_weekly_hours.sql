create or replace function public.current_worker_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select w.id
  from public.workers w
  where lower(w.email) = lower(auth.jwt() ->> 'email')
  order by w.created_at desc nulls last
  limit 1;
$$;

revoke all on function public.current_worker_id() from public;
grant execute on function public.current_worker_id() to authenticated;

create table if not exists public.worker_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  cts_job_candidate_id uuid not null references public.cts_job_candidates(id) on delete cascade,
  cts_job_id uuid not null references public.cts_jobs(id) on delete cascade,
  week_start_date date not null,
  monday_hours numeric(5,2) not null default 0 check (monday_hours >= 0 and monday_hours <= 24),
  tuesday_hours numeric(5,2) not null default 0 check (tuesday_hours >= 0 and tuesday_hours <= 24),
  wednesday_hours numeric(5,2) not null default 0 check (wednesday_hours >= 0 and wednesday_hours <= 24),
  thursday_hours numeric(5,2) not null default 0 check (thursday_hours >= 0 and thursday_hours <= 24),
  friday_hours numeric(5,2) not null default 0 check (friday_hours >= 0 and friday_hours <= 24),
  saturday_hours numeric(5,2) not null default 0 check (saturday_hours >= 0 and saturday_hours <= 24),
  sunday_hours numeric(5,2) not null default 0 check (sunday_hours >= 0 and sunday_hours <= 24),
  notes text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (worker_id, cts_job_candidate_id, week_start_date)
);

create index if not exists idx_worker_weekly_hours_status
on public.worker_weekly_hours (status, submitted_at desc);

create index if not exists idx_worker_weekly_hours_worker_week
on public.worker_weekly_hours (worker_id, week_start_date desc);

create or replace function public.set_worker_weekly_hours_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_worker_weekly_hours_updated_at on public.worker_weekly_hours;

create trigger trg_set_worker_weekly_hours_updated_at
before update on public.worker_weekly_hours
for each row
execute function public.set_worker_weekly_hours_updated_at();

alter table public.worker_weekly_hours enable row level security;

revoke all on public.worker_weekly_hours from anon;
grant select, insert, update on public.worker_weekly_hours to authenticated;

drop policy if exists "Workers can read their own worker row" on public.workers;
create policy "Workers can read their own worker row"
on public.workers
for select
to authenticated
using (id = public.current_worker_id());

drop policy if exists "Workers can read their placed assignments" on public.cts_job_candidates;
create policy "Workers can read their placed assignments"
on public.cts_job_candidates
for select
to authenticated
using (
  worker_id = public.current_worker_id()
  and candidate_status = 'placed'
);

drop policy if exists "Workers can read jobs for their placed assignments" on public.cts_jobs;
create policy "Workers can read jobs for their placed assignments"
on public.cts_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.cts_job_candidates c
    where c.cts_job_id = cts_jobs.id
      and c.worker_id = public.current_worker_id()
      and c.candidate_status = 'placed'
  )
);

drop policy if exists "Worker weekly hours readable by owners and admins" on public.worker_weekly_hours;
create policy "Worker weekly hours readable by owners and admins"
on public.worker_weekly_hours
for select
to authenticated
using (
  public.can_manage_cts_jobs()
  or worker_id = public.current_worker_id()
);

drop policy if exists "Workers can create draft weekly hours" on public.worker_weekly_hours;
create policy "Workers can create draft weekly hours"
on public.worker_weekly_hours
for insert
to authenticated
with check (
  worker_id = public.current_worker_id()
  and status = 'draft'
  and exists (
    select 1
    from public.cts_job_candidates c
    where c.id = cts_job_candidate_id
      and c.worker_id = worker_weekly_hours.worker_id
      and c.cts_job_id = worker_weekly_hours.cts_job_id
      and c.candidate_status = 'placed'
  )
);

drop policy if exists "Workers can update open weekly hours" on public.worker_weekly_hours;
create policy "Workers can update open weekly hours"
on public.worker_weekly_hours
for update
to authenticated
using (
  worker_id = public.current_worker_id()
  and status = 'draft'
)
with check (
  worker_id = public.current_worker_id()
  and status in ('draft', 'submitted')
  and reviewed_at is null
  and reviewed_by is null
);

drop policy if exists "Admins can manage worker weekly hours" on public.worker_weekly_hours;
create policy "Admins can manage worker weekly hours"
on public.worker_weekly_hours
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

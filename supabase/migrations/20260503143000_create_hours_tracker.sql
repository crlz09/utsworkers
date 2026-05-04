create table if not exists public.hours_entries (
  id uuid primary key default gen_random_uuid(),
  cts_job_candidate_id uuid not null references public.cts_job_candidates(id) on delete cascade,
  cts_job_id uuid not null references public.cts_jobs(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  work_date date not null,
  week_start_date date not null,
  source text not null check (source in ('admin', 'client')),
  regular_hours numeric(5,2) not null default 0 check (regular_hours >= 0 and regular_hours <= 24),
  notes text,
  submitted_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cts_job_candidate_id, work_date, source)
);

create index if not exists idx_hours_entries_week_source
on public.hours_entries (week_start_date, source);

create index if not exists idx_hours_entries_candidate_date
on public.hours_entries (cts_job_candidate_id, work_date);

create or replace function public.set_hours_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_hours_entries_updated_at on public.hours_entries;

create trigger trg_set_hours_entries_updated_at
before update on public.hours_entries
for each row
execute function public.set_hours_entries_updated_at();

alter table public.hours_entries enable row level security;

revoke all on public.hours_entries from anon;
grant select, insert, update, delete on public.hours_entries to authenticated;

drop policy if exists "Hours entries readable by admins and clients" on public.hours_entries;
create policy "Hours entries readable by admins and clients"
on public.hours_entries
for select
to authenticated
using (
  public.can_manage_cts_jobs()
  or (
    public.can_view_client_cts_jobs()
    and source = 'client'
  )
);

drop policy if exists "Admins can manage admin hours entries" on public.hours_entries;
create policy "Admins can manage admin hours entries"
on public.hours_entries
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (
  public.can_manage_cts_jobs()
  and source = 'admin'
);

drop policy if exists "Clients can manage their client hours entries" on public.hours_entries;
create policy "Clients can manage their client hours entries"
on public.hours_entries
for all
to authenticated
using (
  public.can_view_client_cts_jobs()
  and source = 'client'
)
with check (
  public.can_view_client_cts_jobs()
  and source = 'client'
);

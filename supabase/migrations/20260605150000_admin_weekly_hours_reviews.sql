-- Simplified admin-first hours workflow.
-- Workers no longer need a public hours portal. Admins enter hours in hours_entries
-- and approve each worker/week here before invoicing.

drop function if exists public.upsert_worker_weekly_hours(text, text, jsonb);
drop function if exists public.get_worker_hours_assignments(text, text, date, date);
drop function if exists public.find_worker_for_hours_login(text, text);
drop table if exists public.worker_weekly_hours cascade;

alter table public.hours_entries
drop column if exists admin_reviewed_at;

create table if not exists public.weekly_hours_reviews (
  id uuid primary key default gen_random_uuid(),
  cts_job_candidate_id uuid not null references public.cts_job_candidates(id) on delete cascade,
  cts_job_id uuid not null references public.cts_jobs(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  week_start_date date not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cts_job_candidate_id, week_start_date)
);

create index if not exists idx_weekly_hours_reviews_week_status
on public.weekly_hours_reviews (week_start_date, status);

create index if not exists idx_weekly_hours_reviews_job_week
on public.weekly_hours_reviews (cts_job_id, week_start_date);

create or replace function public.set_weekly_hours_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status in ('reviewed', 'approved') and new.reviewed_at is null then
    new.reviewed_at = now();
  end if;
  if new.status in ('reviewed', 'approved') and new.reviewed_by is null then
    new.reviewed_by = auth.uid();
  end if;
  if new.status = 'approved' and new.approved_at is null then
    new.approved_at = now();
  end if;
  if new.status = 'approved' and new.approved_by is null then
    new.approved_by = auth.uid();
  end if;
  if new.status = 'pending' then
    new.approved_at = null;
    new.approved_by = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_weekly_hours_reviews_updated_at on public.weekly_hours_reviews;
create trigger trg_set_weekly_hours_reviews_updated_at
before insert or update on public.weekly_hours_reviews
for each row
execute function public.set_weekly_hours_reviews_updated_at();

alter table public.weekly_hours_reviews enable row level security;

revoke all on public.weekly_hours_reviews from anon;
grant select, insert, update, delete on public.weekly_hours_reviews to authenticated;

drop policy if exists "Admins can manage weekly hours reviews" on public.weekly_hours_reviews;
create policy "Admins can manage weekly hours reviews"
on public.weekly_hours_reviews
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

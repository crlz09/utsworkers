create table if not exists public.worker_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  cts_job_candidate_id uuid not null references public.cts_job_candidates(id) on delete cascade,
  cts_job_id uuid not null references public.cts_jobs(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  work_date date not null,
  week_start_date date not null,
  regular_hours numeric(5,2) not null default 0 check (regular_hours >= 0 and regular_hours <= 24),
  admin_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cts_job_candidate_id, work_date)
);

create index if not exists idx_worker_weekly_hours_week
on public.worker_weekly_hours (week_start_date);

create index if not exists idx_worker_weekly_hours_candidate_date
on public.worker_weekly_hours (cts_job_candidate_id, work_date);

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
grant select, update on public.worker_weekly_hours to authenticated;

drop policy if exists "Admins can read worker weekly hours" on public.worker_weekly_hours;
create policy "Admins can read worker weekly hours"
on public.worker_weekly_hours
for select
to authenticated
using (public.can_manage_cts_jobs());

drop policy if exists "Admins can review worker weekly hours" on public.worker_weekly_hours;
create policy "Admins can review worker weekly hours"
on public.worker_weekly_hours
for update
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

create or replace function public.get_worker_hours_assignments(
  p_email text,
  p_phone text,
  p_start date,
  p_end date
)
returns table (
  candidate_id uuid,
  job_id uuid,
  worker_id uuid,
  worker_name text,
  worker_phone text,
  worker_email text,
  project text,
  project_location text,
  work_date date,
  regular_hours numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
begin
  select w.id into v_worker_id
  from public.workers w
  where public.normalize_worker_email(w.email) = public.normalize_worker_email(p_email)
    and public.normalize_worker_phone_digits(w.phone) = public.normalize_worker_phone_digits(p_phone)
  limit 1;

  if v_worker_id is null then
    return;
  end if;

  return query
  select
    c.id,
    c.cts_job_id,
    w.id,
    coalesce(c.name_snapshot, w.name, 'Unnamed worker')::text,
    coalesce(c.phone_snapshot, w.phone, '')::text,
    coalesce(w.email, '')::text,
    coalesce(j.level_type, 'Untitled project')::text,
    concat_ws(', ', nullif(j.city, ''), nullif(j.state, ''))::text,
    d.work_date::date,
    wh.regular_hours
  from public.cts_job_candidates c
  join public.workers w on w.id = c.worker_id
  left join public.cts_jobs j on j.id = c.cts_job_id
  cross join generate_series(p_start, p_end, interval '1 day') as d(work_date)
  left join public.worker_weekly_hours wh
    on wh.cts_job_candidate_id = c.id
   and wh.work_date = d.work_date::date
  where c.worker_id = v_worker_id
    and lower(coalesce(c.candidate_status, '')) = 'placed'
  order by coalesce(j.level_type, ''), coalesce(c.name_snapshot, w.name, ''), d.work_date;
end;
$$;

grant execute on function public.get_worker_hours_assignments(text, text, date, date) to anon, authenticated;

create or replace function public.upsert_worker_weekly_hours(
  p_email text,
  p_phone text,
  p_entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
  v_item jsonb;
  v_candidate record;
  v_hours numeric;
  v_work_date date;
  v_count integer := 0;
begin
  select w.id into v_worker_id
  from public.workers w
  where public.normalize_worker_email(w.email) = public.normalize_worker_email(p_email)
    and public.normalize_worker_phone_digits(w.phone) = public.normalize_worker_phone_digits(p_phone)
  limit 1;

  if v_worker_id is null then
    raise exception 'Worker contact information does not match our records.';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) loop
    v_hours := nullif(v_item->>'regular_hours', '')::numeric;
    v_work_date := (v_item->>'work_date')::date;

    select c.id, c.cts_job_id, c.worker_id into v_candidate
    from public.cts_job_candidates c
    where c.id = (v_item->>'candidate_id')::uuid
      and c.worker_id = v_worker_id
      and lower(coalesce(c.candidate_status, '')) = 'placed'
    limit 1;

    if v_candidate.id is null then
      continue;
    end if;

    if v_hours is null then
      delete from public.worker_weekly_hours
      where cts_job_candidate_id = v_candidate.id
        and work_date = v_work_date;
    else
      insert into public.worker_weekly_hours (
        cts_job_candidate_id,
        cts_job_id,
        worker_id,
        work_date,
        week_start_date,
        regular_hours,
        admin_reviewed_at
      ) values (
        v_candidate.id,
        v_candidate.cts_job_id,
        v_candidate.worker_id,
        v_work_date,
        (v_work_date - ((extract(isodow from v_work_date)::int - 1) * interval '1 day'))::date,
        least(greatest(v_hours, 0), 24),
        null
      )
      on conflict (cts_job_candidate_id, work_date)
      do update set
        regular_hours = excluded.regular_hours,
        week_start_date = excluded.week_start_date,
        admin_reviewed_at = null;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.upsert_worker_weekly_hours(text, text, jsonb) to anon, authenticated;

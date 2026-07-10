-- Optional worker submission links.
-- Admins can generate a unique token for one worker/candidate/week from /hours.
-- Worker submissions are stored as source = 'client' and never drive invoicing directly.

create table if not exists public.worker_hours_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  cts_job_candidate_id uuid not null references public.cts_job_candidates(id) on delete cascade,
  cts_job_id uuid not null references public.cts_jobs(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  week_start_date date not null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  revoked_at timestamptz,
  submitted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cts_job_candidate_id, week_start_date)
);

create index if not exists idx_worker_hours_links_token
on public.worker_hours_links (token);

create index if not exists idx_worker_hours_links_candidate_week
on public.worker_hours_links (cts_job_candidate_id, week_start_date);

create or replace function public.set_worker_hours_links_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_worker_hours_links_updated_at on public.worker_hours_links;
create trigger trg_set_worker_hours_links_updated_at
before update on public.worker_hours_links
for each row
execute function public.set_worker_hours_links_updated_at();

alter table public.worker_hours_links enable row level security;

revoke all on public.worker_hours_links from anon;
grant select, insert, update, delete on public.worker_hours_links to authenticated;

drop policy if exists "Admins can manage worker hours links" on public.worker_hours_links;
create policy "Admins can manage worker hours links"
on public.worker_hours_links
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

create or replace function public.get_worker_hours_link(p_token text)
returns table (
  candidate_id uuid,
  job_id uuid,
  worker_id uuid,
  worker_name text,
  worker_phone text,
  worker_email text,
  project text,
  project_location text,
  week_start_date date,
  expires_at timestamptz,
  work_date date,
  regular_hours numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
begin
  select * into v_link
  from public.worker_hours_links l
  where l.token = p_token
    and l.revoked_at is null
    and l.expires_at > now()
  limit 1;

  if v_link.id is null then
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
    v_link.week_start_date::date,
    v_link.expires_at,
    d.work_date::date,
    he.regular_hours
  from public.cts_job_candidates c
  join public.workers w on w.id = c.worker_id
  left join public.cts_jobs j on j.id = c.cts_job_id
  cross join generate_series(v_link.week_start_date, v_link.week_start_date + interval '6 days', interval '1 day') as d(work_date)
  left join public.hours_entries he
    on he.cts_job_candidate_id = c.id
   and he.work_date = d.work_date::date
   and he.source = 'client'
  where c.id = v_link.cts_job_candidate_id
    and lower(coalesce(c.candidate_status, '')) = 'placed'
  order by d.work_date;
end;
$$;

grant execute on function public.get_worker_hours_link(text) to anon, authenticated;

create or replace function public.submit_worker_hours_link(
  p_token text,
  p_entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_item jsonb;
  v_hours numeric;
  v_work_date date;
  v_count integer := 0;
begin
  select * into v_link
  from public.worker_hours_links l
  where l.token = p_token
    and l.revoked_at is null
    and l.expires_at > now()
  limit 1;

  if v_link.id is null then
    raise exception 'This hours link is invalid or expired.';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) loop
    v_hours := nullif(v_item->>'regular_hours', '')::numeric;
    v_work_date := (v_item->>'work_date')::date;

    if v_work_date < v_link.week_start_date or v_work_date > v_link.week_start_date + 6 then
      continue;
    end if;

    if v_hours is null then
      delete from public.hours_entries
      where cts_job_candidate_id = v_link.cts_job_candidate_id
        and work_date = v_work_date
        and source = 'client';
    else
      insert into public.hours_entries (
        cts_job_candidate_id,
        cts_job_id,
        worker_id,
        work_date,
        week_start_date,
        source,
        regular_hours
      ) values (
        v_link.cts_job_candidate_id,
        v_link.cts_job_id,
        v_link.worker_id,
        v_work_date,
        v_link.week_start_date,
        'client',
        least(greatest(v_hours, 0), 24)
      )
      on conflict (cts_job_candidate_id, work_date, source)
      do update set
        regular_hours = excluded.regular_hours,
        week_start_date = excluded.week_start_date;
    end if;

    v_count := v_count + 1;
  end loop;

  update public.worker_hours_links
  set submitted_at = now()
  where id = v_link.id;

  return v_count;
end;
$$;

grant execute on function public.submit_worker_hours_link(text, jsonb) to anon, authenticated;

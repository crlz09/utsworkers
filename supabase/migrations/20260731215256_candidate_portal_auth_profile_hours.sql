alter table public.workers
add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists workers_auth_user_id_unique_idx
on public.workers (auth_user_id)
where auth_user_id is not null;

update public.workers w
set auth_user_id = u.id
from auth.users u
where w.auth_user_id is null
  and nullif(trim(w.email), '') is not null
  and lower(u.email) = lower(w.email)
  and u.email_confirmed_at is not null;

create or replace function public.current_worker_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.id
  from public.workers w
  where w.auth_user_id = (select auth.uid())
     or (
       w.auth_user_id is null
       and lower(w.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
       and coalesce((select auth.jwt() ->> 'email'), '') <> ''
     )
  order by (w.auth_user_id = (select auth.uid())) desc, w.created_at desc
  limit 1;
$$;

revoke all on function public.current_worker_id() from public, anon;
grant execute on function public.current_worker_id() to authenticated;

create or replace function public.claim_current_worker_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users;
  v_worker_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_user
  from auth.users
  where id = (select auth.uid())
    and email_confirmed_at is not null;

  if v_user.id is null or nullif(trim(v_user.email), '') is null then
    raise exception 'A verified email address is required.';
  end if;

  select w.id into v_worker_id
  from public.workers w
  where w.auth_user_id = v_user.id
     or (w.auth_user_id is null and lower(w.email) = lower(v_user.email))
  order by (w.auth_user_id = v_user.id) desc, w.created_at desc
  limit 1
  for update;

  if v_worker_id is null then
    raise exception 'No candidate profile matches this email address.';
  end if;

  update public.workers
  set auth_user_id = v_user.id
  where id = v_worker_id
    and (auth_user_id is null or auth_user_id = v_user.id);

  if not found then
    raise exception 'This candidate profile is already linked to another account.';
  end if;

  return v_worker_id;
end;
$$;

revoke all on function public.claim_current_worker_profile() from public, anon;
grant execute on function public.claim_current_worker_profile() to authenticated;

drop policy if exists "read workers authenticated only" on public.workers;
drop policy if exists "allow insert workers" on public.workers;

drop policy if exists "Workers can read their own profile" on public.workers;
create policy "Workers can read their own profile"
on public.workers
for select
to authenticated
using (id = (select public.current_worker_id()));

create or replace function public.get_current_worker_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'phone', w.phone,
    'email', w.email,
    'address', w.address,
    'zip_code', w.zip_code,
    'city', w.city,
    'state', w.state,
    'trade_id', w.trade_id,
    'trade_name', t.name,
    'location_id', w.location_id,
    'location_name', l.name,
    'total_experience_years', w.total_experience_years,
    'commercial_experience_years', w.commercial_experience_years,
    'industrial_experience_years', w.industrial_experience_years,
    'residential_experience_years', w.residential_experience_years,
    'strengths', w.strengths,
    'needs_improvement', w.needs_improvement,
    'available_from', w.available_from,
    'willing_to_travel', w.willing_to_travel,
    'status', w.status,
    'availability', w.availability,
    'public_profile_slug', w.public_profile_slug
  )
  from public.workers w
  left join public.trades t on t.id = w.trade_id
  left join public.locations l on l.id = w.location_id
  where w.id = (select public.current_worker_id());
$$;

revoke all on function public.get_current_worker_profile() from public, anon;
grant execute on function public.get_current_worker_profile() to authenticated;

create or replace function public.update_current_worker_profile(
  p_name text,
  p_phone text,
  p_address text,
  p_zip_code text,
  p_city text,
  p_state text,
  p_trade_id uuid,
  p_location_id uuid,
  p_total_experience_years numeric,
  p_commercial_experience_years numeric,
  p_industrial_experience_years numeric,
  p_residential_experience_years numeric,
  p_strengths text,
  p_needs_improvement text,
  p_available_from date,
  p_willing_to_travel boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_id uuid := public.current_worker_id();
begin
  if (select auth.uid()) is null or v_worker_id is null then
    raise exception 'Candidate profile access required.';
  end if;

  if nullif(trim(p_name), '') is null or p_trade_id is null or p_location_id is null then
    raise exception 'Name, trade, and location are required.';
  end if;

  update public.workers
  set name = trim(p_name),
      phone = nullif(trim(p_phone), ''),
      address = nullif(trim(p_address), ''),
      zip_code = nullif(trim(p_zip_code), ''),
      city = nullif(trim(p_city), ''),
      state = nullif(trim(p_state), ''),
      trade_id = p_trade_id,
      location_id = p_location_id,
      total_experience_years = least(greatest(coalesce(p_total_experience_years, 0), 0), 60),
      commercial_experience_years = least(greatest(coalesce(p_commercial_experience_years, 0), 0), 60),
      industrial_experience_years = least(greatest(coalesce(p_industrial_experience_years, 0), 0), 60),
      residential_experience_years = least(greatest(coalesce(p_residential_experience_years, 0), 0), 60),
      strengths = nullif(trim(p_strengths), ''),
      needs_improvement = nullif(trim(p_needs_improvement), ''),
      available_from = p_available_from,
      willing_to_travel = coalesce(p_willing_to_travel, false)
  where id = v_worker_id;

  return public.get_current_worker_profile();
end;
$$;

revoke all on function public.update_current_worker_profile(
  text, text, text, text, text, text, uuid, uuid, numeric, numeric, numeric,
  numeric, text, text, date, boolean
) from public, anon;
grant execute on function public.update_current_worker_profile(
  text, text, text, text, text, text, uuid, uuid, numeric, numeric, numeric,
  numeric, text, text, date, boolean
) to authenticated;

create or replace function public.current_worker_hours_assignment()
returns table (candidate_id uuid, job_id uuid, worker_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.cts_job_id, c.worker_id
  from public.cts_job_candidates c
  where c.worker_id = (select public.current_worker_id())
    and lower(coalesce(c.candidate_status, '')) = 'placed'
  order by c.updated_at desc nulls last, c.created_at desc nulls last
  limit 1;
$$;

revoke all on function public.current_worker_hours_assignment() from public, anon;
grant execute on function public.current_worker_hours_assignment() to authenticated;

create or replace function public.get_current_worker_hours(p_week_start date default null)
returns table (
  candidate_id uuid, job_id uuid, worker_id uuid, worker_name text,
  worker_phone text, worker_email text, project text, project_location text,
  week_start_date date, review_status text, expires_at timestamptz,
  work_date date, regular_hours numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment record;
  v_current_week date := date_trunc('week', current_date)::date;
  v_requested_week date := coalesce(p_week_start, date_trunc('week', current_date)::date);
begin
  if (select auth.uid()) is null then raise exception 'Please sign in to access your hours.'; end if;
  if v_requested_week not in (v_current_week, v_current_week - 7) then return; end if;

  select * into v_assignment from public.current_worker_hours_assignment() limit 1;
  if v_assignment.candidate_id is null then return; end if;

  return query
  select c.id, c.cts_job_id, w.id,
    coalesce(c.name_snapshot, w.name, 'Unnamed worker')::text,
    coalesce(c.phone_snapshot, w.phone, '')::text,
    coalesce(w.email, '')::text,
    coalesce(j.level_type, 'Untitled project')::text,
    concat_ws(', ', nullif(j.city, ''), nullif(j.state, ''))::text,
    v_requested_week::date, coalesce(r.status, 'pending')::text,
    null::timestamptz, d.work_date::date, he.regular_hours
  from public.cts_job_candidates c
  join public.workers w on w.id = c.worker_id
  left join public.cts_jobs j on j.id = c.cts_job_id
  cross join generate_series(v_requested_week, v_requested_week + interval '6 days', interval '1 day') d(work_date)
  left join public.hours_entries he on he.cts_job_candidate_id = c.id
    and he.work_date = d.work_date::date and he.source = 'client'
  left join public.weekly_hours_reviews r on r.cts_job_candidate_id = c.id
    and r.week_start_date = v_requested_week
  where c.id = v_assignment.candidate_id
  order by d.work_date;
end;
$$;

revoke all on function public.get_current_worker_hours(date) from public, anon;
grant execute on function public.get_current_worker_hours(date) to authenticated;

create or replace function public.submit_current_worker_hours(p_week_start date, p_entries jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment record;
  v_current_week date := date_trunc('week', current_date)::date;
  v_item jsonb;
  v_hours numeric;
  v_work_date date;
  v_review_status text;
  v_count integer := 0;
begin
  if (select auth.uid()) is null then raise exception 'Please sign in to submit your hours.'; end if;
  if p_week_start not in (v_current_week, v_current_week - 7) then
    raise exception 'Only the current week and previous week can be submitted.';
  end if;

  select * into v_assignment from public.current_worker_hours_assignment() limit 1;
  if v_assignment.candidate_id is null then
    raise exception 'No active placed assignment was found for this worker.';
  end if;

  select r.status into v_review_status
  from public.weekly_hours_reviews r
  where r.cts_job_candidate_id = v_assignment.candidate_id
    and r.week_start_date = p_week_start
  limit 1;
  if v_review_status = 'approved' then raise exception 'This week has already been approved and is locked.'; end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) loop
    v_hours := nullif(v_item->>'regular_hours', '')::numeric;
    v_work_date := (v_item->>'work_date')::date;
    if v_work_date < p_week_start or v_work_date > p_week_start + 6 or v_work_date > current_date then continue; end if;

    if v_hours is null then
      delete from public.hours_entries
      where cts_job_candidate_id = v_assignment.candidate_id
        and work_date = v_work_date and source = 'client';
    else
      insert into public.hours_entries (
        cts_job_candidate_id, cts_job_id, worker_id, work_date,
        week_start_date, source, regular_hours
      ) values (
        v_assignment.candidate_id, v_assignment.job_id, v_assignment.worker_id,
        v_work_date, p_week_start, 'client', least(greatest(v_hours, 0), 24)
      )
      on conflict (cts_job_candidate_id, work_date, source)
      do update set regular_hours = excluded.regular_hours, week_start_date = excluded.week_start_date;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.submit_current_worker_hours(date, jsonb) from public, anon;
grant execute on function public.submit_current_worker_hours(date, jsonb) to authenticated;

notify pgrst, 'reload schema';

-- Worker-submitted hours now reuse the existing hours_entries table with source = 'client'.
-- This avoids depending on the deprecated worker_weekly_hours table while preserving
-- the admin review/reporting flow.

create or replace function public.find_worker_for_hours_login(
  p_email text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
  v_phone_digits text := public.normalize_worker_phone_digits(p_phone);
begin
  select w.id into v_worker_id
  from public.workers w
  where public.normalize_worker_email(w.email) = public.normalize_worker_email(p_email)
    and (
      public.normalize_worker_phone_digits(w.phone) = v_phone_digits
      or (
        length(coalesce(public.normalize_worker_phone_digits(w.phone), '')) >= 10
        and length(coalesce(v_phone_digits, '')) >= 10
        and right(public.normalize_worker_phone_digits(w.phone), 10) = right(v_phone_digits, 10)
      )
    )
  limit 1;

  if v_worker_id is not null then
    return v_worker_id;
  end if;

  select c.worker_id into v_worker_id
  from public.cts_job_candidates c
  join public.workers w on w.id = c.worker_id
  where public.normalize_worker_email(w.email) = public.normalize_worker_email(p_email)
    and (
      public.normalize_worker_phone_digits(c.phone_snapshot) = v_phone_digits
      or (
        length(coalesce(public.normalize_worker_phone_digits(c.phone_snapshot), '')) >= 10
        and length(coalesce(v_phone_digits, '')) >= 10
        and right(public.normalize_worker_phone_digits(c.phone_snapshot), 10) = right(v_phone_digits, 10)
      )
    )
  limit 1;

  return v_worker_id;
end;
$$;

grant execute on function public.find_worker_for_hours_login(text, text) to anon, authenticated;

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
  v_worker_id := public.find_worker_for_hours_login(p_email, p_phone);

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
    he.regular_hours
  from public.cts_job_candidates c
  join public.workers w on w.id = c.worker_id
  left join public.cts_jobs j on j.id = c.cts_job_id
  cross join generate_series(p_start, p_end, interval '1 day') as d(work_date)
  left join public.hours_entries he
    on he.cts_job_candidate_id = c.id
   and he.work_date = d.work_date::date
   and he.source = 'client'
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
  v_worker_id := public.find_worker_for_hours_login(p_email, p_phone);

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
      delete from public.hours_entries
      where cts_job_candidate_id = v_candidate.id
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
        regular_hours,
        admin_reviewed_at
      ) values (
        v_candidate.id,
        v_candidate.cts_job_id,
        v_candidate.worker_id,
        v_work_date,
        (v_work_date - ((extract(isodow from v_work_date)::int - 1) * interval '1 day'))::date,
        'client',
        least(greatest(v_hours, 0), 24),
        null
      )
      on conflict (cts_job_candidate_id, work_date, source)
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

create or replace function public.current_worker_hours_assignment()
returns table (
  candidate_id uuid,
  job_id uuid,
  worker_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.cts_job_id,
    c.worker_id
  from public.cts_job_candidates c
  where c.worker_id = public.current_worker_id()
    and lower(coalesce(c.candidate_status, '')) = 'placed'
  order by c.updated_at desc nulls last, c.created_at desc nulls last
  limit 1;
$$;

revoke all on function public.current_worker_hours_assignment() from public;
grant execute on function public.current_worker_hours_assignment() to authenticated;

create or replace function public.get_current_worker_hours(
  p_week_start date default null
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
  week_start_date date,
  review_status text,
  expires_at timestamptz,
  work_date date,
  regular_hours numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_current_week date := date_trunc('week', current_date)::date;
  v_requested_week date := coalesce(p_week_start, date_trunc('week', current_date)::date);
begin
  if auth.uid() is null then
    raise exception 'Please sign in to access your hours.';
  end if;

  if v_requested_week not in (v_current_week, v_current_week - 7) then
    return;
  end if;

  select * into v_assignment
  from public.current_worker_hours_assignment()
  limit 1;

  if v_assignment.candidate_id is null then
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
    v_requested_week::date,
    coalesce(r.status, 'pending')::text,
    null::timestamptz,
    d.work_date::date,
    he.regular_hours
  from public.cts_job_candidates c
  join public.workers w on w.id = c.worker_id
  left join public.cts_jobs j on j.id = c.cts_job_id
  cross join generate_series(v_requested_week, v_requested_week + interval '6 days', interval '1 day') as d(work_date)
  left join public.hours_entries he
    on he.cts_job_candidate_id = c.id
   and he.work_date = d.work_date::date
   and he.source = 'client'
  left join public.weekly_hours_reviews r
    on r.cts_job_candidate_id = c.id
   and r.week_start_date = v_requested_week
  where c.id = v_assignment.candidate_id
    and lower(coalesce(c.candidate_status, '')) = 'placed'
  order by d.work_date;
end;
$$;

revoke all on function public.get_current_worker_hours(date) from public;
grant execute on function public.get_current_worker_hours(date) to authenticated;

create or replace function public.submit_current_worker_hours(
  p_week_start date,
  p_entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
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
  if auth.uid() is null then
    raise exception 'Please sign in to submit your hours.';
  end if;

  if p_week_start not in (v_current_week, v_current_week - 7) then
    raise exception 'Only the current week and previous week can be submitted.';
  end if;

  select * into v_assignment
  from public.current_worker_hours_assignment()
  limit 1;

  if v_assignment.candidate_id is null then
    raise exception 'No active placed assignment was found for this worker.';
  end if;

  select r.status into v_review_status
  from public.weekly_hours_reviews r
  where r.cts_job_candidate_id = v_assignment.candidate_id
    and r.week_start_date = p_week_start
  limit 1;

  if v_review_status = 'approved' then
    raise exception 'This week has already been approved and is locked.';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) loop
    v_hours := nullif(v_item->>'regular_hours', '')::numeric;
    v_work_date := (v_item->>'work_date')::date;

    if v_work_date < p_week_start or v_work_date > p_week_start + 6 then
      continue;
    end if;

    if v_work_date > current_date then
      continue;
    end if;

    if v_hours is null then
      delete from public.hours_entries
      where cts_job_candidate_id = v_assignment.candidate_id
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
        v_assignment.candidate_id,
        v_assignment.job_id,
        v_assignment.worker_id,
        v_work_date,
        p_week_start,
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

  return v_count;
end;
$$;

revoke all on function public.submit_current_worker_hours(date, jsonb) from public;
grant execute on function public.submit_current_worker_hours(date, jsonb) to authenticated;

notify pgrst, 'reload schema';

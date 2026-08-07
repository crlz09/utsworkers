create or replace function public.import_cts_weekly_hours(
  p_filename text,
  p_file_sha256 text,
  p_rows jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch_id uuid;
  v_row jsonb;
  v_candidate public.cts_job_candidates%rowtype;
  v_week_ending date;
  v_week_start date;
  v_period_start date;
  v_period_end date;
  v_total numeric := 0;
begin
  if not (select public.can_manage_cts_jobs()) then
    raise exception 'Only administrators can import CTS hours';
  end if;

  if coalesce(trim(p_filename), '') = '' or coalesce(trim(p_file_sha256), '') = '' then
    raise exception 'Filename and file fingerprint are required';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'At least one valid hours row is required';
  end if;

  -- Validate the complete replacement before deleting any existing import data.
  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    select * into strict v_candidate
    from public.cts_job_candidates
    where id = (v_row->>'cts_job_candidate_id')::uuid;

    if v_candidate.worker_id is distinct from (v_row->>'worker_id')::uuid
       or v_candidate.cts_job_id is distinct from (v_row->>'cts_job_id')::uuid then
      raise exception 'Candidate assignment does not match worker and project';
    end if;

    v_week_ending := (v_row->>'week_ending_date')::date;
    v_week_start := v_week_ending - 6;
    v_total := v_total
      + coalesce((v_row->>'regular_hours')::numeric, 0)
      + coalesce((v_row->>'overtime_hours')::numeric, 0)
      + coalesce((v_row->>'double_time_hours')::numeric, 0);
    v_period_start := least(coalesce(v_period_start, v_week_start), v_week_start);
    v_period_end := greatest(coalesce(v_period_end, v_week_ending), v_week_ending);
  end loop;

  -- Re-importing the exact same file replaces its previous batch instead of
  -- failing the unique file fingerprint constraint.
  delete from public.cts_hours_import_batches
  where file_sha256 = lower(trim(p_file_sha256));

  -- A newly uploaded spreadsheet is authoritative for every candidate/week
  -- represented in it, even when the previous data came from another file.
  delete from public.cts_hours_import_rows existing
  using (
    select distinct
      (value->>'cts_job_candidate_id')::uuid as candidate_id,
      (value->>'week_ending_date')::date - 6 as week_start_date
    from jsonb_array_elements(p_rows)
  ) replacement
  where existing.cts_job_candidate_id = replacement.candidate_id
    and existing.week_start_date = replacement.week_start_date;

  delete from public.cts_hours_import_batches batch
  where not exists (
    select 1
    from public.cts_hours_import_rows existing
    where existing.batch_id = batch.id
  );

  insert into public.cts_hours_import_batches (
    filename, file_sha256, period_start, period_end, row_count, total_hours
  ) values (
    trim(p_filename), lower(trim(p_file_sha256)), v_period_start, v_period_end,
    jsonb_array_length(p_rows), v_total
  )
  returning id into v_batch_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    select * into strict v_candidate
    from public.cts_job_candidates
    where id = (v_row->>'cts_job_candidate_id')::uuid;

    v_week_ending := (v_row->>'week_ending_date')::date;
    v_week_start := v_week_ending - 6;

    insert into public.cts_hours_import_rows (
      batch_id, source_row_key, cts_job_candidate_id, cts_job_id, worker_id,
      week_start_date, week_ending_date, source_employee_name, source_memo,
      source_customer, source_invoice_number, regular_hours, overtime_hours,
      double_time_hours
    ) values (
      v_batch_id,
      v_row->>'source_row_key',
      v_candidate.id,
      v_candidate.cts_job_id,
      v_candidate.worker_id,
      v_week_start,
      v_week_ending,
      v_row->>'source_employee_name',
      nullif(v_row->>'source_memo', ''),
      nullif(v_row->>'source_customer', ''),
      nullif(v_row->>'source_invoice_number', ''),
      coalesce((v_row->>'regular_hours')::numeric, 0),
      coalesce((v_row->>'overtime_hours')::numeric, 0),
      coalesce((v_row->>'double_time_hours')::numeric, 0)
    );

    insert into public.weekly_hours_reviews (
      cts_job_candidate_id, cts_job_id, worker_id, week_start_date,
      status, reviewed_at, approved_at, notes
    ) values (
      v_candidate.id, v_candidate.cts_job_id, v_candidate.worker_id,
      v_week_start, 'approved', now(), now(),
      'Approved from CTS spreadsheet import: ' || trim(p_filename)
    )
    on conflict (cts_job_candidate_id, week_start_date)
    do update set
      cts_job_id = excluded.cts_job_id,
      worker_id = excluded.worker_id,
      status = 'approved',
      reviewed_at = now(),
      approved_at = now(),
      notes = excluded.notes;
  end loop;

  return v_batch_id;
end;
$$;

revoke all on function public.import_cts_weekly_hours(text, text, jsonb) from public;
revoke all on function public.import_cts_weekly_hours(text, text, jsonb) from anon;
grant execute on function public.import_cts_weekly_hours(text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

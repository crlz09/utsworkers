create or replace function public.import_and_override_cts_weekly_hours(
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
  v_timesheet public.weekly_hours_reviews%rowtype;
  v_affected record;
begin
  if not (select public.can_manage_cts_jobs()) then
    raise exception 'Only administrators can import and override CTS hours';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'At least one valid hours row is required';
  end if;

  for v_timesheet in
    select r.*
    from public.weekly_hours_reviews r
    join (
      select distinct
        (value->>'cts_job_candidate_id')::uuid as candidate_id,
        (value->>'week_ending_date')::date - 6 as week_start_date
      from jsonb_array_elements(p_rows)
      union
      select distinct existing.cts_job_candidate_id, existing.week_start_date
      from public.cts_hours_import_rows existing
      join public.cts_hours_import_batches batch on batch.id = existing.batch_id
      where batch.file_sha256 = lower(trim(p_file_sha256))
    ) affected on affected.candidate_id = r.cts_job_candidate_id
      and affected.week_start_date = r.week_start_date
    where r.status = 'locked'
    for update of r
  loop
    insert into public.timesheet_events (timesheet_id, version, event_type, reason, payload)
    values (
      v_timesheet.id, v_timesheet.version, 'correction_requested',
      'CTS spreadsheet override: ' || trim(p_filename),
      jsonb_build_object('previous_snapshot', v_timesheet.locked_snapshot)
    );

    update public.weekly_hours_reviews
    set status = 'correction_requested', version = version + 1,
        correction_reason = 'CTS spreadsheet override: ' || trim(p_filename),
        official_source = null, locked_at = null, locked_by = null,
        locked_snapshot = null, approved_at = null, approved_by = null
    where id = v_timesheet.id;
  end loop;

  v_batch_id := public.import_cts_weekly_hours(p_filename, p_file_sha256, p_rows);

  for v_affected in
    select distinct
      (value->>'cts_job_candidate_id')::uuid as candidate_id,
      (value->>'week_ending_date')::date - 6 as week_start_date
    from jsonb_array_elements(p_rows)
  loop
    perform public.review_weekly_timesheet(
      v_affected.candidate_id,
      v_affected.week_start_date,
      'locked',
      'cts',
      'CTS is authoritative: imported and overridden from ' || trim(p_filename)
    );
  end loop;

  return v_batch_id;
end;
$$;

revoke all on function public.import_and_override_cts_weekly_hours(text, text, jsonb) from public;
revoke all on function public.import_and_override_cts_weekly_hours(text, text, jsonb) from anon;
grant execute on function public.import_and_override_cts_weekly_hours(text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

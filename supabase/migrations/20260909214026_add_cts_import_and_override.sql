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
  v_row jsonb;
  v_candidate public.cts_job_candidates%rowtype;
  v_timesheet public.weekly_hours_reviews%rowtype;
  v_group record;
  v_week_ending date;
  v_week_start date;
  v_period_start date;
  v_period_end date;
  v_total numeric := 0;
  v_admin_total numeric := 0;
  v_worker_total numeric := 0;
  v_snapshot jsonb := '[]'::jsonb;
begin
  if not (select public.can_manage_cts_jobs()) then
    raise exception 'Only administrators can import and override CTS hours';
  end if;

  if coalesce(trim(p_filename), '') = '' or coalesce(trim(p_file_sha256), '') = '' then
    raise exception 'Filename and file fingerprint are required';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'At least one valid hours row is required';
  end if;

  -- Validate every row before changing existing, potentially locked, data.
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

  -- CTS is authoritative. Temporarily reopen affected locked weeks so their old
  -- CTS rows can be replaced inside this same transaction, preserving an audit event.
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
    for update
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

  delete from public.cts_hours_import_batches
  where file_sha256 = lower(trim(p_file_sha256));

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
    select 1 from public.cts_hours_import_rows existing where existing.batch_id = batch.id
  );

  insert into public.cts_hours_import_batches (
    filename, file_sha256, period_start, period_end, row_count, total_hours
  ) values (
    trim(p_filename), lower(trim(p_file_sha256)), v_period_start, v_period_end,
    jsonb_array_length(p_rows), v_total
  ) returning id into v_batch_id;

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
      v_batch_id, v_row->>'source_row_key', v_candidate.id,
      v_candidate.cts_job_id, v_candidate.worker_id, v_week_start, v_week_ending,
      v_row->>'source_employee_name', nullif(v_row->>'source_memo', ''),
      nullif(v_row->>'source_customer', ''), nullif(v_row->>'source_invoice_number', ''),
      coalesce((v_row->>'regular_hours')::numeric, 0),
      coalesce((v_row->>'overtime_hours')::numeric, 0),
      coalesce((v_row->>'double_time_hours')::numeric, 0)
    );
  end loop;

  -- Approve and lock each affected candidate/week with CTS as the official
  -- source. The stored snapshot is what the invoice flow consumes.
  for v_group in
    select c.cts_job_candidate_id, c.cts_job_id, c.worker_id, c.week_start_date,
      sum(c.regular_hours) as regular_hours,
      sum(c.overtime_hours) as overtime_hours,
      sum(c.double_time_hours) as double_time_hours
    from public.cts_hours_import_rows c
    join (
      select distinct
        (value->>'cts_job_candidate_id')::uuid as candidate_id,
        (value->>'week_ending_date')::date - 6 as week_start_date
      from jsonb_array_elements(p_rows)
    ) affected on affected.candidate_id = c.cts_job_candidate_id
      and affected.week_start_date = c.week_start_date
    group by c.cts_job_candidate_id, c.cts_job_id, c.worker_id, c.week_start_date
  loop
    select coalesce(sum(h.regular_hours), 0) into v_admin_total
    from public.hours_entries h
    where h.cts_job_candidate_id = v_group.cts_job_candidate_id
      and h.week_start_date = v_group.week_start_date and h.source = 'admin';

    select coalesce(sum(h.regular_hours), 0) into v_worker_total
    from public.hours_entries h
    where h.cts_job_candidate_id = v_group.cts_job_candidate_id
      and h.week_start_date = v_group.week_start_date and h.source = 'client';

    select coalesce(jsonb_agg(to_jsonb(snapshot_row) order by source_row_key), '[]'::jsonb)
    into v_snapshot
    from (
      select source_row_key, source_employee_name, source_invoice_number,
        regular_hours, overtime_hours, double_time_hours
      from public.cts_hours_import_rows
      where cts_job_candidate_id = v_group.cts_job_candidate_id
        and week_start_date = v_group.week_start_date
    ) snapshot_row;

    insert into public.weekly_hours_reviews (
      cts_job_candidate_id, cts_job_id, worker_id, week_start_date, status,
      official_source, regular_hours, overtime_hours, double_time_hours,
      submitted_at, submitted_by, reviewed_at, reviewed_by,
      approved_at, approved_by, locked_at, locked_by, locked_snapshot,
      reconciliation, notes, correction_reason
    ) values (
      v_group.cts_job_candidate_id, v_group.cts_job_id, v_group.worker_id,
      v_group.week_start_date, 'locked', 'cts', v_group.regular_hours,
      v_group.overtime_hours, v_group.double_time_hours,
      now(), auth.uid(), now(), auth.uid(), now(), auth.uid(), now(), auth.uid(),
      jsonb_build_object('source', 'cts', 'entries', v_snapshot),
      jsonb_build_object(
        'admin', v_admin_total, 'worker', v_worker_total,
        'cts', v_group.regular_hours + v_group.overtime_hours + v_group.double_time_hours,
        'difference', greatest(v_admin_total, v_worker_total,
          v_group.regular_hours + v_group.overtime_hours + v_group.double_time_hours)
          - least(v_admin_total, v_worker_total,
          v_group.regular_hours + v_group.overtime_hours + v_group.double_time_hours)
      ),
      'Imported and overridden from CTS spreadsheet: ' || trim(p_filename), null
    )
    on conflict (cts_job_candidate_id, week_start_date) do update set
      cts_job_id = excluded.cts_job_id, worker_id = excluded.worker_id,
      status = 'locked', official_source = 'cts',
      regular_hours = excluded.regular_hours,
      overtime_hours = excluded.overtime_hours,
      double_time_hours = excluded.double_time_hours,
      submitted_at = excluded.submitted_at, submitted_by = excluded.submitted_by,
      reviewed_at = excluded.reviewed_at, reviewed_by = excluded.reviewed_by,
      approved_at = excluded.approved_at, approved_by = excluded.approved_by,
      locked_at = excluded.locked_at, locked_by = excluded.locked_by,
      locked_snapshot = excluded.locked_snapshot,
      reconciliation = excluded.reconciliation, notes = excluded.notes,
      correction_reason = null
    returning * into v_timesheet;

    update public.timesheet_exceptions
    set resolved_at = now(), resolved_by = auth.uid(),
        resolution_notes = 'Resolved by authoritative CTS spreadsheet override'
    where timesheet_id = v_timesheet.id and resolved_at is null;

    insert into public.timesheet_events (timesheet_id, version, event_type, reason, payload)
    values (
      v_timesheet.id, v_timesheet.version, 'locked',
      'Authoritative CTS spreadsheet override: ' || trim(p_filename),
      jsonb_build_object('batch_id', v_batch_id, 'official_source', 'cts',
        'snapshot', v_timesheet.locked_snapshot, 'reconciliation', v_timesheet.reconciliation)
    );
  end loop;

  return v_batch_id;
end;
$$;

revoke all on function public.import_and_override_cts_weekly_hours(text, text, jsonb) from public;
revoke all on function public.import_and_override_cts_weekly_hours(text, text, jsonb) from anon;
grant execute on function public.import_and_override_cts_weekly_hours(text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

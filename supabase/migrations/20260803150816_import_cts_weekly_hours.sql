create table if not exists public.cts_hours_import_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_sha256 text not null unique,
  period_start date,
  period_end date,
  row_count integer not null check (row_count > 0),
  total_hours numeric(12,2) not null check (total_hours >= 0),
  imported_by uuid references auth.users(id) on delete set null default auth.uid(),
  imported_at timestamptz not null default now()
);

create table if not exists public.cts_hours_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.cts_hours_import_batches(id) on delete cascade,
  source_row_key text not null,
  cts_job_candidate_id uuid not null references public.cts_job_candidates(id) on delete restrict,
  cts_job_id uuid not null references public.cts_jobs(id) on delete restrict,
  worker_id uuid not null references public.workers(id) on delete restrict,
  week_start_date date not null,
  week_ending_date date not null,
  source_employee_name text not null,
  source_memo text,
  source_customer text,
  source_invoice_number text,
  regular_hours numeric(7,2) not null default 0 check (regular_hours >= 0),
  overtime_hours numeric(7,2) not null default 0 check (overtime_hours >= 0),
  double_time_hours numeric(7,2) not null default 0 check (double_time_hours >= 0),
  total_hours numeric(7,2) generated always as (regular_hours + overtime_hours + double_time_hours) stored,
  created_at timestamptz not null default now(),
  unique (batch_id, source_row_key),
  check (week_ending_date = week_start_date + 6),
  check (regular_hours + overtime_hours + double_time_hours > 0),
  check (regular_hours + overtime_hours + double_time_hours <= 168)
);

create index if not exists cts_hours_import_rows_candidate_week_idx
  on public.cts_hours_import_rows (cts_job_candidate_id, week_start_date);

create index if not exists cts_hours_import_rows_job_week_idx
  on public.cts_hours_import_rows (cts_job_id, week_start_date);

alter table public.cts_hours_import_batches enable row level security;
alter table public.cts_hours_import_rows enable row level security;

revoke all on public.cts_hours_import_batches from anon;
revoke all on public.cts_hours_import_rows from anon;
grant select, insert, delete on public.cts_hours_import_batches to authenticated;
grant select, insert, delete on public.cts_hours_import_rows to authenticated;

drop policy if exists "Admins can manage CTS hours import batches" on public.cts_hours_import_batches;
create policy "Admins can manage CTS hours import batches"
on public.cts_hours_import_batches
for all
to authenticated
using ((select public.can_manage_cts_jobs()))
with check ((select public.can_manage_cts_jobs()));

drop policy if exists "Admins can manage CTS hours import rows" on public.cts_hours_import_rows;
create policy "Admins can manage CTS hours import rows"
on public.cts_hours_import_rows
for all
to authenticated
using ((select public.can_manage_cts_jobs()))
with check ((select public.can_manage_cts_jobs()));

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

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_week_ending := (v_row->>'week_ending_date')::date;
    v_week_start := v_week_ending - 6;
    v_total := v_total
      + coalesce((v_row->>'regular_hours')::numeric, 0)
      + coalesce((v_row->>'overtime_hours')::numeric, 0)
      + coalesce((v_row->>'double_time_hours')::numeric, 0);
    v_period_start := least(coalesce(v_period_start, v_week_start), v_week_start);
    v_period_end := greatest(coalesce(v_period_end, v_week_ending), v_week_ending);
  end loop;

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

    if v_candidate.worker_id is distinct from (v_row->>'worker_id')::uuid
       or v_candidate.cts_job_id is distinct from (v_row->>'cts_job_id')::uuid then
      raise exception 'Candidate assignment does not match worker and project';
    end if;

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

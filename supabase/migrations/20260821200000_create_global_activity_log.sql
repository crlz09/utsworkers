create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null,
  entity_id uuid,
  entity_name text,
  worker_id uuid,
  project_id uuid,
  actor_id uuid,
  actor_name text,
  actor_email text,
  changed_fields text[] not null default '{}',
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_created_at_idx
  on public.audit_events (created_at desc);
create index if not exists audit_events_actor_created_idx
  on public.audit_events (actor_id, created_at desc);
create index if not exists audit_events_worker_created_idx
  on public.audit_events (worker_id, created_at desc)
  where worker_id is not null;
create index if not exists audit_events_project_created_idx
  on public.audit_events (project_id, created_at desc)
  where project_id is not null;
create index if not exists audit_events_entity_created_idx
  on public.audit_events (entity_type, entity_id, created_at desc);

alter table public.audit_events enable row level security;

revoke all on table public.audit_events from public, anon, authenticated;
grant select on table public.audit_events to authenticated;
grant all on table public.audit_events to service_role;

drop policy if exists "Supervisors can read the global activity log" on public.audit_events;
create policy "Supervisors can read the global activity log"
on public.audit_events
for select
to authenticated
using ((select public.can_delete_workers()));

create or replace function public.capture_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_allowed text[] := '{}';
  v_ignored text[] := array['id', 'created_at', 'updated_at'];
  v_changed text[] := '{}';
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_key text;
  v_entity_type text := tg_table_name;
  v_entity_id uuid;
  v_entity_name text;
  v_worker_id uuid;
  v_project_id uuid;
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_actor_email text;
  v_metadata jsonb := '{}'::jsonb;
begin
  case tg_table_name
    when 'workers' then
      v_entity_type := 'candidate';
      v_allowed := array[
        'name', 'status', 'availability', 'recruiter_user_id', 'trade_id', 'location_id',
        'rate', 'per_diem', 'willing_to_travel', 'is_public_profile',
        'total_experience_years', 'commercial_experience_years',
        'industrial_experience_years', 'residential_experience_years',
        'admin_reviewed_at'
      ];
      v_ignored := v_ignored || array['auth_user_id', 'public_profile_slug', 'recruiter_notes', 'recruiter_notes_updated_at'];
      v_worker_id := nullif(v_row ->> 'id', '')::uuid;
      v_entity_name := v_row ->> 'name';
    when 'worker_recruiter_notes' then
      v_entity_type := 'candidate_note';
      v_allowed := array['worker_id'];
      v_ignored := v_ignored || array['note', 'created_by'];
      v_worker_id := nullif(v_row ->> 'worker_id', '')::uuid;
      v_metadata := jsonb_build_object('note_added', true);
    when 'worker_documents' then
      v_entity_type := 'candidate_document';
      v_allowed := array['worker_id', 'file_name', 'file_type', 'file_size', 'document_type', 'uploaded_at'];
      v_ignored := v_ignored || array['file_path'];
      v_worker_id := nullif(v_row ->> 'worker_id', '')::uuid;
      v_entity_name := coalesce(v_row ->> 'document_type', v_row ->> 'file_name');
    when 'worker_document_reminder_log' then
      v_entity_type := 'document_reminder';
      v_allowed := array['worker_id', 'reminder_kind', 'requested_document_types', 'sent_at'];
      v_ignored := v_ignored || array['resend_email_id', 'sent_by'];
      v_worker_id := nullif(v_row ->> 'worker_id', '')::uuid;
      v_metadata := jsonb_build_object('reminder_kind', v_row ->> 'reminder_kind');
    when 'cts_job_candidates' then
      v_entity_type := 'job_placement';
      v_allowed := array[
        'cts_job_id', 'worker_id', 'candidate_status', 'placement_fee_amount',
        'placement_fee_paid', 'placement_fee_paid_at', 'placement_fee_billed_at',
        'placement_fee_invoice_number', 'submitted_at', 'placed_at'
      ];
      v_ignored := v_ignored || array['placement_fee_invoice_id', 'sort_order'];
      v_worker_id := nullif(v_row ->> 'worker_id', '')::uuid;
      v_project_id := nullif(v_row ->> 'cts_job_id', '')::uuid;
      v_entity_name := v_row ->> 'name_snapshot';
    when 'cts_jobs' then
      v_entity_type := 'project';
      v_allowed := array[
        'qty', 'level_type', 'city', 'state', 'start_text', 'language_requirement',
        'bd_rep', 'order_date', 'client_name', 'job_code', 'status', 'priority',
        'is_now', 'is_wait', 'placement_fee_amount'
      ];
      v_ignored := v_ignored || array['last_import_batch_id'];
      v_project_id := nullif(v_row ->> 'id', '')::uuid;
      v_entity_name := v_row ->> 'level_type';
    when 'invoices' then
      v_entity_type := 'invoice';
      v_allowed := array[
        'invoice_number', 'status', 'client_name', 'date_from', 'date_to',
        'invoice_date', 'due_date', 'subtotal', 'total', 'printed_at',
        'finalized_at', 'sent_at', 'paid_at'
      ];
      v_ignored := v_ignored || array['created_by'];
      v_entity_name := v_row ->> 'invoice_number';
    else
      raise exception 'Unsupported audit table: %', tg_table_name;
  end case;

  v_entity_id := nullif(v_row ->> 'id', '')::uuid;

  select coalesce(array_agg(keys.key order by keys.key), '{}')
  into v_changed
  from (
    select key from jsonb_object_keys(v_old) as old_keys(key)
    union
    select key from jsonb_object_keys(v_new) as new_keys(key)
  ) keys
  where not (keys.key = any(v_ignored))
    and (v_old -> keys.key) is distinct from (v_new -> keys.key);

  if tg_op = 'UPDATE' and cardinality(v_changed) = 0 then
    return new;
  end if;

  foreach v_key in array v_allowed loop
    if v_key = any(v_changed) then
      if tg_op <> 'INSERT' then
        v_before := v_before || jsonb_build_object(v_key, v_old -> v_key);
      end if;
      if tg_op <> 'DELETE' then
        v_after := v_after || jsonb_build_object(v_key, v_new -> v_key);
      end if;
    end if;
  end loop;

  if v_actor_id is not null then
    select
      coalesce(
        nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(raw_user_meta_data ->> 'name'), ''),
        email
      ),
      email
    into v_actor_name, v_actor_email
    from auth.users
    where id = v_actor_id;
  end if;

  insert into public.audit_events (
    event_type,
    action,
    entity_type,
    entity_id,
    entity_name,
    worker_id,
    project_id,
    actor_id,
    actor_name,
    actor_email,
    changed_fields,
    before_data,
    after_data,
    metadata
  ) values (
    tg_table_name || '.' || lower(tg_op),
    lower(tg_op),
    v_entity_type,
    v_entity_id,
    v_entity_name,
    v_worker_id,
    v_project_id,
    v_actor_id,
    coalesce(v_actor_name, case when v_actor_id is null then 'System' end),
    v_actor_email,
    v_changed,
    v_before,
    v_after,
    v_metadata
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_audit_event() from public, anon, authenticated;

drop trigger if exists trg_audit_workers on public.workers;
create trigger trg_audit_workers
after insert or update or delete on public.workers
for each row execute function public.capture_audit_event();

drop trigger if exists trg_audit_worker_recruiter_notes on public.worker_recruiter_notes;
create trigger trg_audit_worker_recruiter_notes
after insert or update or delete on public.worker_recruiter_notes
for each row execute function public.capture_audit_event();

drop trigger if exists trg_audit_worker_documents on public.worker_documents;
create trigger trg_audit_worker_documents
after insert or update or delete on public.worker_documents
for each row execute function public.capture_audit_event();

drop trigger if exists trg_audit_worker_document_reminders on public.worker_document_reminder_log;
create trigger trg_audit_worker_document_reminders
after insert or update or delete on public.worker_document_reminder_log
for each row execute function public.capture_audit_event();

drop trigger if exists trg_audit_cts_job_candidates on public.cts_job_candidates;
create trigger trg_audit_cts_job_candidates
after insert or update or delete on public.cts_job_candidates
for each row execute function public.capture_audit_event();

drop trigger if exists trg_audit_cts_jobs on public.cts_jobs;
create trigger trg_audit_cts_jobs
after insert or update or delete on public.cts_jobs
for each row execute function public.capture_audit_event();

drop trigger if exists trg_audit_invoices on public.invoices;
create trigger trg_audit_invoices
after insert or update or delete on public.invoices
for each row execute function public.capture_audit_event();

comment on table public.audit_events is
  'Immutable application activity history. Readable only by supervisors with worker delete permission.';

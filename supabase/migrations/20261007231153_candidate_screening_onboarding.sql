-- Screening records are intentionally separate from public candidate documents.
create table public.candidate_screenings (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.workers(id) on delete restrict,
  suggested_worker_id uuid references public.workers(id) on delete set null,
  source text not null check (source in ('gmail', 'manual')),
  source_message_id text unique,
  source_subject text not null default '',
  source_text text not null default '',
  candidate_name text not null default '',
  recipient_email text not null default '',
  confirmation_number text not null unique check (confirmation_number ~ '^[A-Z0-9-]{4,80}$'),
  lab_name text not null default '',
  lab_address text not null default '',
  lab_phone text not null default '',
  testing_hours text not null default '',
  change_contact text not null default '',
  file_path text not null unique,
  file_name text not null,
  file_sha256 text not null,
  file_size integer not null check (file_size between 1 and 10485760),
  identity_verified_at timestamptz,
  identity_verified_by uuid references auth.users(id),
  received_at timestamptz not null default now(),
  send_state text not null default 'none' check (send_state in ('none', 'sending', 'sent')),
  send_started_at timestamptz,
  sent_at timestamptz,
  sent_by uuid references auth.users(id),
  resend_email_id text,
  email_to text,
  email_from text,
  email_subject text,
  email_body text,
  email_language text check (email_language in ('es', 'en')),
  last_send_error text,
  attendance_reported_at timestamptz,
  attendance_note text,
  result_received_at timestamptz,
  result_note text,
  result_file_path text,
  result_file_name text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check ((worker_id is null and identity_verified_at is null) or (worker_id is not null and identity_verified_at is not null)),
  check (send_state = 'none' or (worker_id is not null and email_to is not null and email_from is not null and email_body is not null and send_started_at is not null)),
  check (send_state <> 'sent' or (sent_at is not null and resend_email_id is not null)),
  check (result_received_at is null or result_file_path is not null)
);
create index candidate_screenings_worker_received_idx on public.candidate_screenings(worker_id, received_at desc);
create table public.candidate_screening_events (
  id uuid primary key default gen_random_uuid(),
  screening_id uuid not null references public.candidate_screenings(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event text not null,
  created_at timestamptz not null default now()
);
create index candidate_screening_events_order_idx on public.candidate_screening_events(screening_id, created_at desc);
alter table public.candidate_screenings enable row level security;
alter table public.candidate_screening_events enable row level security;
revoke all on public.candidate_screenings, public.candidate_screening_events from anon, authenticated;
grant select on public.candidate_screenings, public.candidate_screening_events to authenticated;
grant all on public.candidate_screenings, public.candidate_screening_events to service_role;
create policy "Screening managers can read orders" on public.candidate_screenings
  for select to authenticated using ((select public.can_manage_worker_documents()));
create policy "Screening managers can read history" on public.candidate_screening_events
  for select to authenticated using ((select public.can_manage_worker_documents()));

-- Audit is transactional: recording a milestone cannot succeed without its history entry.
create function public.record_candidate_screening_event()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare event_name text; actor uuid;
begin
  if TG_OP = 'INSERT' then
    event_name := 'order_received'; actor := NEW.created_by;
  else
    NEW.updated_at := clock_timestamp();
    if OLD.worker_id is distinct from NEW.worker_id then
      event_name := 'candidate_verified'; actor := NEW.identity_verified_by;
    elsif OLD.send_state is distinct from NEW.send_state then
      event_name := case when NEW.send_state = 'sent' then 'instructions_sent' else 'send_started' end;
      actor := NEW.sent_by;
    elsif OLD.attendance_reported_at is distinct from NEW.attendance_reported_at then
      event_name := 'attendance_reported'; actor := NEW.updated_by;
    elsif OLD.result_received_at is distinct from NEW.result_received_at then
      event_name := 'result_received'; actor := NEW.updated_by;
    else
      event_name := 'order_updated'; actor := NEW.updated_by;
    end if;
  end if;
  insert into public.candidate_screening_events(screening_id, actor_id, event)
    values (NEW.id, actor, event_name);
  return NEW;
end;
$$;
revoke all on function public.record_candidate_screening_event() from public, anon, authenticated;
grant execute on function public.record_candidate_screening_event() to service_role;
-- AFTER INSERT so the parent row exists; BEFORE UPDATE so updated_at participates in CAS.
create trigger screening_insert_history after insert on public.candidate_screenings
  for each row execute function public.record_candidate_screening_event();
create trigger screening_update_history before update on public.candidate_screenings
  for each row execute function public.record_candidate_screening_event();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-screenings', 'candidate-screenings', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "Screening managers can read PDFs" on storage.objects for select to authenticated
using (bucket_id = 'candidate-screenings' and (select public.can_manage_worker_documents()));
-- Restricts older broad storage policies too. Only the server may upload/change files.
create policy "Restrict screening PDF reads" on storage.objects as restrictive for select to authenticated
using (bucket_id <> 'candidate-screenings' or (select public.can_manage_worker_documents()));
create policy "Screening PDF writes require server" on storage.objects as restrictive for all to authenticated
using (bucket_id <> 'candidate-screenings' or (select public.can_manage_worker_documents()))
with check (bucket_id <> 'candidate-screenings');
create policy "No direct screening PDF deletes" on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'candidate-screenings');
create policy "No anonymous screening files" on storage.objects as restrictive for all to anon
using (bucket_id <> 'candidate-screenings') with check (bucket_id <> 'candidate-screenings');

create table public.screening_sync_state (
  id boolean primary key default true check (id),
  query text,
  next_page_token text,
  last_completed_at timestamptz,
  lock_until timestamptz not null default '1970-01-01'
);
alter table public.screening_sync_state enable row level security;
revoke all on public.screening_sync_state from public, anon, authenticated;
grant all on public.screening_sync_state to service_role;
insert into public.screening_sync_state(id) values (true);

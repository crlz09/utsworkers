create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table public.worker_document_reminder_jobs (
  worker_id uuid primary key references public.workers(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent')),
  attempts integer not null default 0 check (attempts >= 0),
  processing_started_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index worker_document_reminder_jobs_due_idx
on public.worker_document_reminder_jobs (scheduled_at)
where status = 'pending';

create table public.worker_document_reminder_log (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('manual', 'automatic')),
  requested_document_types jsonb not null default '[]'::jsonb,
  sent_by uuid references auth.users(id) on delete set null,
  resend_email_id text,
  sent_at timestamptz not null default now()
);

create index worker_document_reminder_log_worker_sent_idx
on public.worker_document_reminder_log (worker_id, sent_at desc);

alter table public.worker_document_reminder_jobs enable row level security;
alter table public.worker_document_reminder_log enable row level security;

revoke all on public.worker_document_reminder_jobs from public, anon, authenticated;
revoke all on public.worker_document_reminder_log from public, anon, authenticated;
grant all on public.worker_document_reminder_jobs to service_role;
grant all on public.worker_document_reminder_log to service_role;

create or replace function public.queue_new_worker_document_reminder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.worker_document_reminder_jobs (worker_id, scheduled_at)
  values (new.id, new.created_at + interval '24 hours')
  on conflict (worker_id) do nothing;
  return new;
end;
$$;

revoke all on function public.queue_new_worker_document_reminder() from public, anon, authenticated;

drop trigger if exists queue_new_worker_document_reminder on public.workers;
create trigger queue_new_worker_document_reminder
after insert on public.workers
for each row execute function public.queue_new_worker_document_reminder();

select cron.schedule(
  'process-worker-document-reminders',
  '15 * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/send-document-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
      ),
      body := jsonb_build_object('mode', 'automatic'),
      timeout_milliseconds := 15000
    ) as request_id;
  $cron$
);

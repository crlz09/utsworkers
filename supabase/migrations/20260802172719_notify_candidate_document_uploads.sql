-- Candidate document upload notifications are queued in Postgres so multi-file
-- uploads (for example ID front + back) produce one consolidated email.

create table public.worker_document_upload_notification_jobs (
  worker_id uuid primary key references public.workers(id) on delete cascade,
  document_types jsonb not null default '[]'::jsonb,
  file_names jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz not null default (now() + interval '20 seconds'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent')),
  attempts integer not null default 0 check (attempts >= 0),
  processing_started_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index worker_document_upload_notification_jobs_due_idx
on public.worker_document_upload_notification_jobs (scheduled_at)
where status = 'pending';

alter table public.worker_document_upload_notification_jobs enable row level security;
revoke all on public.worker_document_upload_notification_jobs from public, anon, authenticated;

create or replace function public.queue_candidate_document_upload_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only uploads made by the candidate account are notified. Admin uploads do
  -- not match current_worker_id() and therefore do not create email noise.
  if new.worker_id = public.current_worker_id() then
    insert into public.worker_document_upload_notification_jobs (
      worker_id, document_types, file_names, scheduled_at
    ) values (
      new.worker_id,
      jsonb_build_array(coalesce(new.document_type, 'Document')),
      jsonb_build_array(coalesce(new.file_name, 'Document')),
      now() + interval '20 seconds'
    )
    on conflict (worker_id) do update
    set document_types = (
          select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
          from (
            select distinct value
            from jsonb_array_elements_text(
              public.worker_document_upload_notification_jobs.document_types
              || excluded.document_types
            ) as items(value)
          ) unique_values
        ),
        file_names = (
          select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
          from (
            select distinct value
            from jsonb_array_elements_text(
              public.worker_document_upload_notification_jobs.file_names
              || excluded.file_names
            ) as items(value)
          ) unique_values
        ),
        scheduled_at = now() + interval '20 seconds',
        status = 'pending',
        attempts = 0,
        processing_started_at = null,
        sent_at = null,
        last_error = null,
        updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.queue_candidate_document_upload_notification() from public, anon, authenticated;

create trigger queue_candidate_document_upload_notification
after insert on public.worker_documents
for each row execute function public.queue_candidate_document_upload_notification();

select cron.schedule(
  'process-candidate-document-upload-notifications',
  '* * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/notify-document-upload',
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

alter table public.workers
  add column if not exists vetting_completed_at timestamptz,
  add column if not exists vetting_completed_by uuid references auth.users(id) on delete set null;

create index if not exists workers_vetting_completed_at_idx
  on public.workers (vetting_completed_at desc)
  where vetting_completed_at is not null;

create table if not exists public.recruiter_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  notification_type text not null check (notification_type in ('vetting_completed')),
  title text not null,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_user_id, worker_id, notification_type)
);

create index if not exists recruiter_notifications_recipient_unread_idx
  on public.recruiter_notifications (recipient_user_id, created_at desc)
  where read_at is null;

alter table public.recruiter_notifications enable row level security;

revoke all on table public.recruiter_notifications from public, anon, authenticated;
grant select on table public.recruiter_notifications to authenticated;
grant update (read_at) on table public.recruiter_notifications to authenticated;
grant all on table public.recruiter_notifications to service_role;

drop policy if exists "Users can read their own recruiter notifications" on public.recruiter_notifications;
create policy "Users can read their own recruiter notifications"
on public.recruiter_notifications
for select
to authenticated
using (recipient_user_id = (select auth.uid()));

drop policy if exists "Users can mark their own recruiter notifications read" on public.recruiter_notifications;
create policy "Users can mark their own recruiter notifications read"
on public.recruiter_notifications
for update
to authenticated
using (recipient_user_id = (select auth.uid()))
with check (recipient_user_id = (select auth.uid()));

-- The two new recruiters need worker-edit access to add interview notes and
-- complete the vetting handoff. Delete privileges remain admin-only.
insert into public.admin_permissions (user_id, can_edit_workers, can_delete_workers)
select id, true, false
from auth.users
where lower(email) in (
  'andrearamirez@universaltalentsource.com',
  'mariaalana@universaltalentsource.com'
)
on conflict (user_id) do update
set can_edit_workers = true;

create or replace function public.complete_candidate_vetting(p_worker_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_completed_at timestamptz := now();
  v_worker_name text;
  v_note text;
begin
  if v_actor_id is null or not public.can_edit_workers() then
    raise exception 'Worker edit permission is required.';
  end if;

  select w.name, w.vetting_completed_at
  into v_worker_name, v_completed_at
  from public.workers w
  where w.id = p_worker_id
  for update;

  if not found then
    raise exception 'Candidate not found.';
  end if;

  if v_completed_at is not null then
    raise exception 'Vetting is already completed for this candidate.';
  end if;

  select n.note
  into v_note
  from public.worker_recruiter_notes n
  where n.worker_id = p_worker_id
  order by n.created_at desc
  limit 1;

  if nullif(trim(v_note), '') is null then
    raise exception 'Add an interview note before completing vetting.';
  end if;

  select coalesce(
    nullif(trim(r.full_name), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    u.email,
    'Recruiter'
  )
  into v_actor_name
  from auth.users u
  left join public.recruiters r on r.user_id = u.id
  where u.id = v_actor_id;

  v_completed_at := now();

  update public.workers
  set vetting_completed_at = v_completed_at,
      vetting_completed_by = v_actor_id
  where id = p_worker_id;

  insert into public.recruiter_notifications (
    recipient_user_id,
    worker_id,
    notification_type,
    title,
    body,
    created_by,
    created_at
  )
  select distinct
    recipients.user_id,
    p_worker_id,
    'vetting_completed',
    'Vetting completed: ' || coalesce(nullif(trim(v_worker_name), ''), 'Unnamed candidate'),
    coalesce(v_actor_name, 'Recruiter') || ' completed the vetting interview. The candidate is ready for bio, documents, and CTS processing.',
    v_actor_id,
    v_completed_at
  from (
    select u.id as user_id
    from auth.users u
    where lower(u.email) = 'andrearamirez@universaltalentsource.com'

    union

    select ap.user_id
    from public.admin_permissions ap
    where ap.can_delete_workers = true
  ) recipients
  on conflict (recipient_user_id, worker_id, notification_type) do update
  set title = excluded.title,
      body = excluded.body,
      created_by = excluded.created_by,
      created_at = excluded.created_at,
      read_at = null;

  return v_completed_at;
end;
$$;

revoke all on function public.complete_candidate_vetting(uuid) from public, anon;
grant execute on function public.complete_candidate_vetting(uuid) to authenticated;


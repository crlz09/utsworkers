create table if not exists public.worker_recruiter_notes (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  note text not null check (length(trim(note)) > 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists worker_recruiter_notes_worker_created_idx
  on public.worker_recruiter_notes (worker_id, created_at desc);

insert into public.worker_recruiter_notes (worker_id, note, created_at)
select
  worker.id,
  trim(worker.recruiter_notes),
  coalesce(worker.recruiter_notes_updated_at, worker.created_at, now())
from public.workers worker
where nullif(trim(worker.recruiter_notes), '') is not null
  and not exists (
    select 1
    from public.worker_recruiter_notes existing
    where existing.worker_id = worker.id
      and existing.note = trim(worker.recruiter_notes)
  );

alter table public.worker_recruiter_notes enable row level security;

revoke all on table public.worker_recruiter_notes from public, anon;
grant select, insert on table public.worker_recruiter_notes to authenticated;
grant all on table public.worker_recruiter_notes to service_role;

drop policy if exists "Worker recruiter notes readable by worker editors" on public.worker_recruiter_notes;
create policy "Worker recruiter notes readable by worker editors"
on public.worker_recruiter_notes
for select
to authenticated
using ((select public.can_edit_workers()));

drop policy if exists "Worker recruiter notes insertable by worker editors" on public.worker_recruiter_notes;
create policy "Worker recruiter notes insertable by worker editors"
on public.worker_recruiter_notes
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and (select public.can_edit_workers())
);

create or replace function public.sync_latest_worker_recruiter_note()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.workers
  set recruiter_notes = new.note,
      recruiter_notes_updated_at = new.created_at
  where id = new.worker_id;

  return new;
end;
$$;

revoke all on function public.sync_latest_worker_recruiter_note() from public, anon, authenticated;

drop trigger if exists trg_sync_latest_worker_recruiter_note on public.worker_recruiter_notes;
create trigger trg_sync_latest_worker_recruiter_note
after insert on public.worker_recruiter_notes
for each row
execute function public.sync_latest_worker_recruiter_note();

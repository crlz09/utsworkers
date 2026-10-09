create table public.planner_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default '' check (length(title) <= 120),
  body text not null check (length(trim(body)) between 1 and 10000),
  revision bigint not null default 1 check (revision > 0),
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text,
  updated_at timestamptz not null default now()
);
create index planner_notes_active_idx on public.planner_notes(updated_at desc) where archived_at is null;
create index planner_notes_creator_idx on public.planner_notes(created_by);
create index planner_notes_editor_idx on public.planner_notes(updated_by);
create table public.planner_note_reads (
  note_id uuid not null references public.planner_notes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  seen_revision bigint not null check (seen_revision > 0),
  primary key(note_id,user_id)
);
create index planner_note_reads_user_idx on public.planner_note_reads(user_id);
alter table public.planner_notes enable row level security;
alter table public.planner_note_reads enable row level security;
revoke all on public.planner_notes, public.planner_note_reads from public,anon,authenticated;
grant select,insert,update on public.planner_notes, public.planner_note_reads to authenticated;
grant all on public.planner_notes, public.planner_note_reads to service_role;
create policy "Team reads shared notes" on public.planner_notes for select to authenticated using ((select public.can_manage_cts_jobs()));
create policy "Team creates shared notes" on public.planner_notes for insert to authenticated with check ((select public.can_manage_cts_jobs()) and created_by=(select auth.uid()));
create policy "Team edits shared notes" on public.planner_notes for update to authenticated using ((select public.can_manage_cts_jobs())) with check ((select public.can_manage_cts_jobs()));
create policy "Team reads own note receipts" on public.planner_note_reads for select to authenticated using ((select public.can_manage_cts_jobs()) and user_id=(select auth.uid()));
create policy "Team inserts own note receipts" on public.planner_note_reads for insert to authenticated with check ((select public.can_manage_cts_jobs()) and user_id=(select auth.uid()));
create policy "Team updates own note receipts" on public.planner_note_reads for update to authenticated using ((select public.can_manage_cts_jobs()) and user_id=(select auth.uid())) with check ((select public.can_manage_cts_jobs()) and user_id=(select auth.uid()));

-- Metadata and revision come from the authenticated actor, never from client fields.
create function public.stamp_planner_note()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare actor_name text;
begin
  select m.full_name into actor_name from public.planner_team_members() m where m.user_id=auth.uid() limit 1;
  if actor_name is null then raise exception 'UTS team access is required.'; end if;
  if TG_OP='INSERT' then
    NEW.created_by := auth.uid(); NEW.created_by_name := actor_name;
    NEW.created_at := clock_timestamp(); NEW.updated_at := NEW.created_at;
    NEW.updated_by := null; NEW.updated_by_name := null; NEW.revision := 1;
  else
    NEW.created_by := OLD.created_by; NEW.created_by_name := OLD.created_by_name; NEW.created_at := OLD.created_at;
    NEW.updated_by := auth.uid(); NEW.updated_by_name := actor_name;
    NEW.updated_at := clock_timestamp(); NEW.revision := OLD.revision+1;
  end if;
  return NEW;
end;
$$;
revoke all on function public.stamp_planner_note() from public,anon;
create trigger stamp_planner_note before insert or update on public.planner_notes for each row execute function public.stamp_planner_note();
create function public.validate_planner_note_read()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.planner_notes n where n.id=NEW.note_id and n.revision>=NEW.seen_revision) then
    raise exception 'Read receipts must reference an existing note revision.';
  end if;
  if TG_OP='UPDATE' then NEW.seen_revision := greatest(OLD.seen_revision,NEW.seen_revision); end if;
  return NEW;
end;
$$;
revoke all on function public.validate_planner_note_read() from public,anon;
create trigger validate_planner_note_read before insert or update on public.planner_note_reads for each row execute function public.validate_planner_note_read();
create function public.planner_note_unread_count()
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from public.planner_notes n
  left join public.planner_note_reads r on r.note_id=n.id and r.user_id=auth.uid()
  where n.archived_at is null and n.revision>coalesce(r.seen_revision,0);
$$;
revoke all on function public.planner_note_unread_count() from public,anon;
grant execute on function public.planner_note_unread_count() to authenticated;
do $$
declare target text;
begin
  foreach target in array array['planner_notes','planner_note_reads'] loop
    if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
      select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=target
    ) then execute format('alter publication supabase_realtime add table public.%I',target); end if;
  end loop;
end $$;

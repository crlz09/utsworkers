-- Keep privileged directory lookup outside the exposed Data API schema.
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
alter function public.planner_team_members() set schema private;
create function public.planner_team_members()
returns table(user_id uuid, full_name text, email text)
language sql stable security invoker set search_path = '' as $$
  select * from private.planner_team_members();
$$;
revoke all on function public.planner_team_members() from public,anon;
grant execute on function public.planner_team_members() to authenticated;

-- RLS remains the authority for each subscriber; polling is the UI fallback.
do $$
declare target text;
begin
  foreach target in array array['planner_tasks','planner_comments','planner_attachments'] loop
    if exists(select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = target
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target);
    end if;
  end loop;
end $$;

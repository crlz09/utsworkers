-- Remove anonymous execution from privileged RPCs that are not public APIs.
-- Public profile lookup and token-based hours RPCs intentionally remain public.
do $block$
declare
  fn record;
begin
  for fn in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'delete_worker_admin',
        'get_client_cts_dashboard',
        'register_worker_public',
        'sync_worker_status_from_cts_candidate',
        'sync_worker_status_from_cts_candidate_trigger'
      )
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon',
      fn.nspname,
      fn.proname,
      fn.identity_args
    );
  end loop;
end;
$block$;

-- Registration is invoked only by the service-role Edge Function.
do $block$
declare
  fn record;
begin
  for fn in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'register_worker_public'
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from authenticated',
      fn.nspname,
      fn.proname,
      fn.identity_args
    );
    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      fn.nspname,
      fn.proname,
      fn.identity_args
    );
  end loop;
end;
$block$;

-- Trigger functions never need to be callable through PostgREST.
revoke all on function public.sync_worker_status_from_cts_candidate_trigger()
  from public, anon, authenticated;

notify pgrst, 'reload schema';

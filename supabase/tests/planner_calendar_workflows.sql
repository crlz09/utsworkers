-- Run through execute_sql or psql against a migrated development/test database.
-- All fixtures and task/review writes are rolled back.
begin;
create temporary table planner_test_context as
select
  (select user_id from public.admin_permissions where can_edit_workers or can_delete_workers limit 1) as team_id,
  (select id from auth.users where id not in (select user_id from public.admin_permissions where can_edit_workers or can_delete_workers) limit 1) as outside_id,
  (select id from public.cts_job_candidates where id not in (select candidate_id from public.planner_cts_reviews) limit 1) as candidate_id;
grant select on planner_test_context to authenticated;
do $$ begin
  if exists(select 1 from planner_test_context where team_id is null or outside_id is null or candidate_id is null) then
    raise exception 'Tests need a team user, an outside user and a CTS candidate without a review';
  end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',team_id::text,true) from planner_test_context;
do $$ declare task uuid; review uuid; n integer; begin
  insert into public.planner_tasks(title,due_date,recurrence,checklist)
  values ('Calendar verification','2026-10-17','weekly','[{"id":"a","text":"Verify","done":true}]') returning id into task;
  update public.planner_tasks set status='completed' where id=task;
  select count(*) into n from public.planner_tasks where recurrence_parent_id=task
    and due_date='2026-10-24' and status='pending' and checklist->0->>'done'='false';
  if n<>1 then raise exception 'Successor date/checklist failed'; end if;
  update public.planner_tasks set status='pending' where id=task;
  update public.planner_tasks set status='completed' where id=task;
  select count(*) into n from public.planner_tasks where recurrence_parent_id=task;
  if n<>1 then raise exception 'Duplicate successor'; end if;
  begin
    insert into public.planner_tasks(title,recurrence) values ('Invalid weekly task','weekly');
    raise exception 'Weekly task accepted without due date';
  exception when check_violation then null; end;
  insert into public.planner_cts_reviews(candidate_id,submitted_by)
    select candidate_id,team_id from planner_test_context returning id into review;
  begin
    update public.planner_cts_reviews set status='changes_requested' where id=review;
    raise exception 'Empty change request accepted';
  exception when raise_exception then
    if sqlerrm <> 'Add a note explaining the requested changes' then raise; end if;
  end;
  update public.planner_cts_reviews set status='changes_requested',note='Confirm requirements' where id=review;
  update public.planner_cts_reviews set status='pending' where id=review;
  update public.planner_cts_reviews set status='approved',reviewed_by=null where id=review;
  if not exists(select 1 from public.planner_cts_reviews where id=review and reviewed_by=auth.uid() and reviewed_at is not null) then
    raise exception 'Review attribution failed';
  end if;
  begin
    update public.planner_cts_reviews set status='pending' where id=review;
    raise exception 'Approved review reopened';
  exception when raise_exception then
    if sqlerrm <> 'Invalid CTS review transition' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub',outside_id::text,true) from planner_test_context;
do $$ declare n integer; begin
  if exists(select 1 from public.planner_cts_reviews) then raise exception 'Outside-team read allowed'; end if;
  update public.planner_cts_reviews set note='Unauthorized';
  get diagnostics n = row_count;
  if n<>0 then raise exception 'Outside-team update allowed'; end if;
  begin
    insert into public.planner_cts_reviews(candidate_id) select candidate_id from planner_test_context;
    raise exception 'Outside-team insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.planner_cts_reviews;
    raise exception 'Delete allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform 1 from public.planner_cts_reviews;
    raise exception 'Anonymous read allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

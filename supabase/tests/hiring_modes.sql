begin;
select set_config('request.jwt.claim.sub', (select user_id::text from public.admin_permissions where can_edit_workers or can_delete_workers limit 1), true);
set local role authenticated;
do $$ declare owned_id uuid; source_id uuid; missing_id uuid; project uuid; begin
  select id into project from public.cts_jobs limit 1;
  insert into public.cts_job_candidates(cts_job_id,name_snapshot,candidate_status,hiring_mode)
    values(project,'Owned verification','placed','owned') returning id into owned_id;
  if not exists(select 1 from public.cts_job_candidates where id=owned_id and hourly_fee_rate=5 and placement_fee_amount=0 and not placement_fee_paid) then raise exception 'Owned pricing failed'; end if;
  insert into public.cts_job_candidates(cts_job_id,name_snapshot,candidate_status,hiring_mode)
    values(project,'Sourcing verification','placed','sourcing') returning id into source_id;
  if not exists(select 1 from public.cts_job_candidates where id=source_id and hourly_fee_rate=1 and placement_fee_amount=50) then raise exception 'Sourcing pricing failed'; end if;
  begin
    insert into public.cts_job_candidates(cts_job_id,name_snapshot,candidate_status) values(project,'Missing mode','placed');
    raise exception 'Placement accepted without mode';
  exception when raise_exception then
    if sqlerrm <> 'Choose Sourcing or Owned before placing the candidate' then raise; end if;
  end;
  begin
    update public.cts_job_candidates set placement_fee_paid=true where id=owned_id;
    raise exception 'Owned placement payment accepted';
  exception when check_violation then null; end;
  update public.cts_job_candidates set placement_fee_paid=true where id=source_id;
  begin
    update public.cts_job_candidates set hiring_mode='owned' where id=source_id;
    raise exception 'Paid contract mode changed';
  exception when raise_exception then
    if sqlerrm <> 'This assignment has billing history. Create a new assignment for a different hiring contract.' then raise; end if;
  end;
  insert into public.cts_job_candidates(cts_job_id,name_snapshot) values(project,'Unplaced verification') returning id into missing_id;
  update public.cts_job_candidates set candidate_status='placed', hiring_mode='owned' where id=missing_id;
  if not exists(select 1 from public.cts_job_candidates where id=missing_id and hourly_fee_rate=5) then raise exception 'Sourced to owned placement failed'; end if;
end $$;
rollback;

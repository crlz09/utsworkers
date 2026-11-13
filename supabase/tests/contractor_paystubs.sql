-- Integration checks against existing eligible assignments; all inserts roll back.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.admin_permissions where can_delete_workers limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare a record; s public.contractor_paystubs%rowtype; revised public.contractor_paystubs%rowtype; blocked boolean; other_assignment uuid; first_number text; second_number text;
begin
  select c.*,w.email,w.auth_user_id into a from public.cts_job_candidates c join public.workers w on w.id=c.worker_id
    where c.payment_type='1099' and c.candidate_status='placed' and not exists(select 1 from public.admin_permissions ap where ap.user_id=w.auth_user_id and ap.can_delete_workers) limit 1;
  if a.id is null then raise exception 'Test requires a placed 1099 assignment.'; end if;
  first_number := public.next_contractor_paystub_number();
  second_number := public.next_contractor_paystub_number();
  if first_number !~ '^[0-9]{6}-[0-9]{2,}$' or first_number=second_number
    or split_part(second_number,'-',2)::bigint<>split_part(first_number,'-',2)::bigint+1 then
    raise exception 'Control numbers must reserve a distinct daily sequence.';
  end if;
  update public.contractor_paystub_number_counters set last_number=greatest(last_number,99)
    where control_date=(current_timestamp at time zone 'America/Indiana/Indianapolis')::date;
  if split_part(public.next_contractor_paystub_number(),'-',2)::bigint<100 then
    raise exception 'Control numbers must support more than 99 statements per day.';
  end if;
  blocked:=false;
  begin
    insert into public.contractor_paystubs(assignment_id,project_name,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem)
      values(a.id,'  ','2099-01-05','2099-01-11','2099-01-16',40,0,32,0);
  exception when others then blocked:=sqlerrm like '%UTS project name%'; end;
  if not blocked then raise exception 'Blank project accepted.'; end if;
  insert into public.contractor_paystubs(assignment_id,worker_name,project_name,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem,deductions,extras)
    values(a.id,'FORGED NAME','UTS Order 123','2099-01-05','2099-01-11','2099-01-16',40,22,32,600,0,0) returning * into s;
  if s.net_payment<>2936 or s.worker_id<>a.worker_id or s.worker_name='FORGED NAME' or s.project_name<>'UTS Order 123' or s.revision<>1 then raise exception 'Incorrect final snapshot or calculation.'; end if;
  blocked:=false;
  begin
    insert into public.contractor_paystubs(assignment_id,project_name,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem)
      values(a.id,'UTS Order 456',s.period_start,s.period_end,s.payment_date,40,11,32,600);
  exception when others then blocked:=sqlerrm like '%final already exists%'; end;
  if not blocked then raise exception 'Duplicate final was not rejected.'; end if;
  insert into public.contractor_paystubs(assignment_id,project_name,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem,supersedes_id,correction_reason)
    values(a.id,'UTS Order 456',s.period_start,s.period_end,s.payment_date,40,11,32,600,s.id,'Integration test correction') returning * into revised;
  if revised.project_name<>'UTS Order 456' or revised.statement_number=s.statement_number then raise exception 'Project or control number was not preserved.'; end if;
  if revised.revision<>2 or revised.net_payment<>2408 or (select is_current from public.contractor_paystub_history where id=s.id) then raise exception 'Incorrect correction history.'; end if;
  if not (select is_current from public.contractor_paystub_history where id=revised.id) then raise exception 'Latest final is not current.'; end if;
  blocked:=false;
  begin
    insert into public.contractor_paystubs(assignment_id,project_name,statement_number,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem)
      values(a.id,'UTS Order 123',s.statement_number,'2099-01-12','2099-01-18','2099-01-23',40,0,32,0);
  exception when others then blocked:=sqlerrm like '%Statement number already exists%'; end;
  if not blocked then raise exception 'Duplicate statement number accepted.'; end if;
  blocked:=false;
  begin update public.contractor_paystubs set hourly_rate=1 where id=s.id; exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Finals can be updated.'; end if;
  blocked:=false;
  begin delete from public.contractor_paystubs where id=s.id; exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Finals can be deleted.'; end if;
  select id into other_assignment from public.cts_job_candidates where payment_type='W2' and candidate_status='placed' limit 1;
  blocked:=false;
  begin
    insert into public.contractor_paystubs(assignment_id,project_name,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem)
      values(other_assignment,'UTS Order 789',s.period_start,s.period_end,s.payment_date,40,0,30,0);
  exception when others then blocked:=sqlerrm like '%Only placed 1099%'; end;
  if not blocked then raise exception 'W2 assignment accepted.'; end if;
  select id into other_assignment from public.cts_job_candidates where payment_type='1099' and candidate_status<>'placed' limit 1;
  blocked:=false;
  begin
    insert into public.contractor_paystubs(assignment_id,project_name,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem)
      values(other_assignment,'UTS Order 789',s.period_start,s.period_end,s.payment_date,40,0,30,0);
  exception when others then blocked:=sqlerrm like '%Only placed 1099%'; end;
  if not blocked then raise exception 'Non-placed assignment accepted.'; end if;
  select id into other_assignment from public.cts_job_candidates where payment_type='1099' and candidate_status='placed' and worker_id<>a.worker_id limit 1;
  if other_assignment is null then raise exception 'Isolation test requires two eligible workers.'; end if;
  insert into public.contractor_paystubs(assignment_id,project_name,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem)
    values(other_assignment,'UTS Order 789',s.period_start,s.period_end,s.payment_date,40,0,30,0);
  perform set_config('paystub_test.worker_id',a.worker_id::text,true);
  perform set_config('paystub_test.assignment_id',a.id::text,true);
  perform set_config('paystub_test.claims',jsonb_build_object('sub',coalesce(a.auth_user_id,gen_random_uuid()),'email',a.email,'role','authenticated')::text,true);
  perform set_config('paystub_test.record_id',s.id::text,true);
end; $$;
reset role;
select set_config('request.jwt.claims',current_setting('paystub_test.claims'),true);
set local role authenticated;
do $$
declare blocked boolean;
begin
  if public.current_worker_id() is distinct from current_setting('paystub_test.worker_id')::uuid then raise exception 'Worker identity failed.'; end if;
  if (select count(*) from public.contractor_paystub_history where id=current_setting('paystub_test.record_id')::uuid)<>1 then raise exception 'Worker cannot read own final.'; end if;
  if exists(select 1 from public.contractor_paystub_history where worker_id<>public.current_worker_id()) then raise exception 'Worker can read another worker paystub.'; end if;
  blocked:=false;
  begin
    insert into public.contractor_paystubs(assignment_id,project_name,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem)
      values(current_setting('paystub_test.assignment_id')::uuid,'UTS Order 123','2099-01-12','2099-01-18','2099-01-23',40,0,30,0);
  exception when others then blocked:=sqlerrm like '%Supervisor access%'; end;
  if not blocked then raise exception 'Worker can finalize a statement.'; end if;
  blocked:=false;
  begin perform public.next_contractor_paystub_number();
  exception when others then blocked:=sqlerrm like '%Supervisor access%'; end;
  if not blocked then raise exception 'Worker can reserve a statement number.'; end if;
  if exists(select 1 from public.contractor_paystub_number_counters) then raise exception 'Worker can read control counters.'; end if;
  if has_table_privilege('anon','public.contractor_paystubs','select') or has_table_privilege('anon','public.contractor_paystub_history','select') then raise exception 'Anonymous payroll access.'; end if;
end; $$;
reset role;
rollback;
select 'PASS: eligibility, totals, snapshots, duplicate prevention, correction history, immutable finals, worker ownership and anonymous denial; test records rolled back.' as result;

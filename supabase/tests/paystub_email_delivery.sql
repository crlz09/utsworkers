begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.admin_permissions where can_delete_workers limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare a record; stub uuid;
begin
  select c.*,w.auth_user_id,w.email into a from public.cts_job_candidates c join public.workers w on w.id=c.worker_id
    where c.payment_type='1099' and c.candidate_status='placed' and not exists(select 1 from public.admin_permissions ap where ap.user_id=w.auth_user_id and ap.can_delete_workers) limit 1;
  insert into public.contractor_paystubs(assignment_id,period_start,period_end,payment_date,regular_hours,overtime_hours,hourly_rate,per_diem)
    values(a.id,'2099-01-05','2099-01-11','2099-01-16',40,0,32,0) returning id into stub;
  perform set_config('paystub_mail_test.stub',stub::text,true);
  perform set_config('paystub_mail_test.actor',auth.uid()::text,true);
  perform set_config('paystub_mail_test.worker_claims',jsonb_build_object('sub',coalesce(a.auth_user_id,gen_random_uuid()),'email',a.email,'role','authenticated')::text,true);
end; $$;
reset role;
set local role service_role;
insert into public.contractor_paystub_deliveries(paystub_id,email_to,email_from,subject,request_payload,review_key,sent_by)
  values(current_setting('paystub_mail_test.stub')::uuid,'test@example.invalid','test@example.invalid','Test only','{"attachments":[{"content":"TEST ONLY"}]}','test-review',current_setting('paystub_mail_test.actor')::uuid);
do $$
declare blocked boolean:=false;
begin
  begin update public.contractor_paystub_deliveries set email_to='other@example.invalid' where paystub_id=current_setting('paystub_mail_test.stub')::uuid;
  exception when others then blocked:=sqlerrm like '%cannot change its reviewed%'; end;
  if not blocked then raise exception 'An attempted message can be redirected.'; end if;
  update public.contractor_paystub_deliveries set state='sent',sent_at=now(),provider_id=gen_random_uuid()::text where paystub_id=current_setting('paystub_mail_test.stub')::uuid;
  blocked:=false;
  begin update public.contractor_paystub_deliveries set last_error='changed' where paystub_id=current_setting('paystub_mail_test.stub')::uuid;
  exception when others then blocked:=sqlerrm like '%accepted paystub email cannot be changed%'; end;
  if not blocked then raise exception 'An accepted delivery can be altered.'; end if;
end; $$;
reset role;
set local role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.contractor_paystub_deliveries where paystub_id=current_setting('paystub_mail_test.stub')::uuid;
  if n<>1 then raise exception 'Supervisor cannot read delivery status.'; end if;
  if has_column_privilege('authenticated','public.contractor_paystub_deliveries','request_payload','select') then raise exception 'Raw message/PDF is exposed to browser clients.'; end if;
  if has_table_privilege('authenticated','public.contractor_paystub_deliveries','insert') or has_table_privilege('authenticated','public.contractor_paystub_deliveries','update') then raise exception 'Browser can write delivery state.'; end if;
end; $$;
reset role;
select set_config('request.jwt.claims',current_setting('paystub_mail_test.worker_claims'),true);
set local role authenticated;
do $$
begin
  if exists(select 1 from public.contractor_paystub_deliveries) then raise exception 'Worker can read supervisor email delivery logs.'; end if;
  if has_any_column_privilege('anon','public.contractor_paystub_deliveries','select') then raise exception 'Anonymous email log access.'; end if;
end; $$;
reset role;
rollback;
select 'PASS: private attachments, supervisor-only delivery status, no browser writes, frozen attempted messages and immutable sent logs. Test records rolled back; no emails sent.' as result;

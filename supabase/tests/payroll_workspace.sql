begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_permissions where can_delete_workers limit 1),true);
set local role authenticated;
do $$
declare
  v_assignment public.cts_job_candidates%rowtype;
  v_person uuid;
  v_rate text;
  v_week date := date_trunc('week',current_date)::date;
  v_version integer;
  v_snapshot jsonb;
  v_count integer;
  v_line jsonb;
begin
  select * into strict v_assignment from public.cts_job_candidates where hiring_mode='owned' and worker_id is not null limit 1;
  select coalesce((select person_uuid from public.payroll_worker_links where worker_id=v_assignment.worker_id),(select person_uuid from public.payroll_gusto_people p where not exists(select 1 from public.payroll_worker_links l where l.person_uuid=p.person_uuid) limit 1)) into v_person;
  insert into public.payroll_worker_links(worker_id,person_uuid) values(v_assignment.worker_id,v_person) on conflict(worker_id) do update set person_uuid=excluded.person_uuid;
  if not exists(select 1 from public.payroll_worker_links where worker_id=v_assignment.worker_id and person_uuid=v_person) then raise exception 'Link did not persist'; end if;
  select rate into v_rate from public.workers where id=v_assignment.worker_id;
  select e into v_line from jsonb_array_elements(public.get_payroll_cts_week(v_week)->'lines') e where e->>'assignment_id'=v_assignment.id::text;
  v_version := (v_line->>'version')::integer;
  insert into public.payroll_draft_lines(assignment_id,week_start,rate,per_diem_total,source_version,source_report_id,source_signature,notes)
    values(v_assignment.id,v_week,32,125,v_version,(v_line->>'source_report_id')::uuid,v_line->>'source_signature','Rollback verification')
    on conflict(assignment_id,week_start) do update set rate=excluded.rate,per_diem_total=excluded.per_diem_total,source_version=excluded.source_version,source_report_id=excluded.source_report_id,source_signature=excluded.source_signature;
  get diagnostics v_count=row_count;
  if v_count <> 1 then raise exception 'Draft did not save'; end if;
  if (select rate_snapshot from public.cts_job_candidates where id=v_assignment.id) is distinct from v_assignment.rate_snapshot then raise exception 'Draft changed project rate'; end if;
  if (select rate from public.workers where id=v_assignment.worker_id) is distinct from v_rate then raise exception 'Draft changed profile rate'; end if;
  begin
    update public.payroll_draft_lines set source_version=1000000 where assignment_id=v_assignment.id and week_start=v_week;
    raise exception 'Stale source was accepted' using errcode='XX000';
  exception when raise_exception then null;
  end;
  select jsonb_build_object('schema_version',1,'source','gusto-cli','environment','production','company_uuid',d.company_uuid,'company_name',d.company_name,'imported_at',d.imported_at,'people',(select jsonb_agg(jsonb_build_object('person_uuid',p.person_uuid,'name',p.name,'email',p.email,'worker_type',p.worker_type,'active',p.active)) from public.payroll_gusto_people p)) into v_snapshot from public.payroll_gusto_directory d;
  perform public.import_payroll_gusto_directory(v_snapshot);
  if not exists(select 1 from public.payroll_worker_links where worker_id=v_assignment.worker_id) then raise exception 'Import lost links'; end if;
  begin
    perform public.import_payroll_gusto_directory(jsonb_set(v_snapshot,'{company_uuid}',to_jsonb(gen_random_uuid()::text)));
    raise exception 'Another company was accepted' using errcode='XX000';
  exception when raise_exception then null;
  end;
end; $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.payroll_gusto_people) then raise exception 'Non-supervisor can read payroll directory'; end if;
  if exists(select 1 from public.payroll_worker_links) then raise exception 'Non-supervisor can read payroll links'; end if;
  if exists(select 1 from public.payroll_draft_lines) then raise exception 'Non-supervisor can read payroll drafts'; end if;
  begin
    perform public.import_payroll_gusto_directory('{}'::jsonb);
    raise exception 'Non-supervisor imported directory' using errcode='XX000';
  exception when raise_exception then null;
  end;
end; $$;
rollback;
select 'Payroll links, drafts, source versions, roster refresh and RLS passed; test changes rolled back' as result;

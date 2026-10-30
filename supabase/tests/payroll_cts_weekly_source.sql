begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_permissions where can_delete_workers limit 1),true);
set local role authenticated;
do $$
declare
  a public.cts_job_candidates%rowtype;
  v_week date := date_trunc('week', date '2099-01-10')::date;
  v_payload jsonb;
  v_id uuid;
  v_source jsonb;
  v_line jsonb;
  v_updated jsonb;
  v_revision integer;
begin
  if not public.payroll_cts_name_matches('PÉREZ, EXAMPLE Middle','Example Perez') then raise exception 'Reordered name failed'; end if;
  if public.payroll_cts_name_matches('PEREZ, EXAMPLE','Other Perez') then raise exception 'Wrong given name matched'; end if;
  select c.* into strict a from public.cts_job_candidates c where hiring_mode='owned' and worker_id is not null and (select count(*) from public.cts_job_candidates o where o.hiring_mode='owned' and o.worker_id=c.worker_id)=1 limit 1;
  v_payload := jsonb_build_object('weekEnding',v_week+6,'fee',5,'entries',jsonb_build_array(jsonb_build_object('name',a.name_snapshot,'contractor','Payroll rollback test','regular',40,'overtime',5,'rate',37,'perDiemDays',4,'perDiemRate',100)),'adjustments','[]'::jsonb,'deductions','[]'::jsonb,'sourceTotal',null,'notes','Rollback test');
  v_id := public.save_cts_weekly_report(null,null,v_payload);
  v_source := public.get_payroll_cts_week(v_week);
  select e into strict v_line from jsonb_array_elements(v_source->'lines') e where e->>'assignment_id'=a.id::text;
  if (v_line->>'regular_hours')::numeric <> 40 or (v_line->>'overtime_hours')::numeric <> 5 or (v_line->>'rate')::numeric <> 32 or (v_line->>'per_diem_total')::numeric <> 400 then raise exception 'Report hours, net rate or Per Diem mismatch'; end if;
  insert into public.payroll_draft_lines(assignment_id,week_start,rate,per_diem_total,source_version,source_report_id,source_signature)
    values(a.id,v_week,32,400,(v_line->>'version')::integer,v_id,v_line->>'source_signature');
  v_revision := (v_source->'report'->>'revision')::integer;
  v_payload := jsonb_set(v_payload,'{entries,0,overtime}','8'::jsonb);
  perform public.save_cts_weekly_report(v_id,v_revision,v_payload);
  v_updated := public.get_payroll_cts_week(v_week);
  if v_updated->'lines'->0->>'source_signature' = v_line->>'source_signature' then raise exception 'Correction did not invalidate source signature'; end if;
  begin
    update public.payroll_draft_lines set notes='stale attempt' where assignment_id=a.id and week_start=v_week;
    raise exception 'Stale draft was accepted' using errcode='XX000';
  exception when raise_exception then null;
  end;
  if (select rate_snapshot from public.cts_job_candidates where id=a.id) is distinct from a.rate_snapshot then raise exception 'Source relation changed project rate'; end if;
  perform public.link_payroll_cts_source(v_id,(v_updated->'report'->>'revision')::integer,a.name_snapshot,'Payroll rollback test',a.id);
  if not exists(select 1 from public.payroll_cts_source_links where report_id=v_id and assignment_id=a.id) then raise exception 'Explicit source link failed'; end if;
  v_payload := jsonb_set(v_payload,'{entries}',(v_payload->'entries') || jsonb_build_array(jsonb_set(v_payload->'entries'->0,'{rate}','38'::jsonb)));
  perform public.save_cts_weekly_report(v_id,(v_updated->'report'->>'revision')::integer,v_payload);
  v_updated := public.get_payroll_cts_week(v_week);
  if jsonb_array_length(v_updated->'lines') <> 1 or (v_updated->'lines'->0->>'regular_hours')::numeric <> 80 then raise exception 'Split source rows not aggregated correctly'; end if;
  if not (v_updated->'lines'->0->>'rate_conflict')::boolean or v_updated->'lines'->0->>'rate' is not null then raise exception 'Conflicting rates were silently averaged'; end if;
end; $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.payroll_cts_source_links) then raise exception 'Unauthorized source links read'; end if;
  begin
    perform public.get_payroll_cts_week(date '2026-10-19');
    raise exception 'Unauthorized CTS payroll source read' using errcode='XX000';
  exception when raise_exception then null;
  end;
end; $$;
rollback;
select 'CTS weekly relationship, matching, pay rates, Per Diem, stale-draft protection and RLS passed (rolled back)' as result;

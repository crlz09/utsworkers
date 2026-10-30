-- Relate invoice source rows to OWNED assignments without rewriting finalized reports.
create table public.payroll_cts_source_links (
  report_id uuid not null references public.cts_weekly_reports(id) on delete cascade,
  source_name text not null,
  source_contractor text not null,
  assignment_id uuid not null references public.cts_job_candidates(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key(report_id, source_name, source_contractor)
);
create index payroll_cts_source_links_assignment_idx on public.payroll_cts_source_links(assignment_id);
alter table public.payroll_cts_source_links enable row level security;
revoke all on public.payroll_cts_source_links from anon;
grant select,insert,update,delete on public.payroll_cts_source_links to authenticated;
create policy "Supervisors manage CTS payroll source links" on public.payroll_cts_source_links for all to authenticated using ((select public.can_delete_workers())) with check ((select public.can_delete_workers()));

alter table public.payroll_draft_lines
  add column source_report_id uuid references public.cts_weekly_reports(id) on delete restrict,
  add column source_signature text;

-- Deterministic identity matching, including CTS's LAST, FIRST middle-name format.
-- Ambiguous results are never assigned automatically.
create function public.payroll_normalize_name(p text) returns text
language sql stable security invoker set search_path = '' as $$
  select btrim(regexp_replace(lower(public.unaccent(coalesce(p,''))), '[^a-z0-9]+',' ','g'));
$$;
create function public.payroll_cts_name_matches(p_source text, p_candidate text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select public.payroll_normalize_name(p_source) <> '' and (
    public.payroll_normalize_name(p_source) = public.payroll_normalize_name(p_candidate)
    or (strpos(p_source,',') > 0
      and split_part(public.payroll_normalize_name(split_part(p_source,',',2)),' ',1) <> ''
      and split_part(public.payroll_normalize_name(split_part(p_source,',',2)),' ',1) = any(string_to_array(public.payroll_normalize_name(p_candidate),' '))
      and string_to_array(public.payroll_normalize_name(split_part(p_source,',',1)),' ') <@ string_to_array(public.payroll_normalize_name(p_candidate),' '))
  );
$$;

create function public.get_payroll_cts_week(p_week_start date) returns jsonb
language plpgsql volatile security invoker set search_path = '' as $$
declare v_report public.cts_weekly_reports%rowtype; v_entries jsonb; v_lines jsonb;
begin
  if not (select public.can_delete_workers()) then raise exception 'Supervisor access required.'; end if;
  if extract(isodow from p_week_start) <> 1 then raise exception 'Select a Monday week start.'; end if;
  select * into v_report from public.cts_weekly_reports where week_ending=p_week_start+6;
  if not found then return jsonb_build_object('report',null,'entries','[]'::jsonb,'lines','[]'::jsonb); end if;
  with entries as (
    select e.value, e.ordinality-1 as row_index from jsonb_array_elements(v_report.payload->'entries') with ordinality e
  ), candidates as (
    select e.*, a.ids, manual.id as manual_id
    from entries e
    left join lateral (
      select array_agg(c.id order by c.id) as ids from public.cts_job_candidates c
      left join public.workers w on w.id=c.worker_id
      where c.hiring_mode='owned' and (public.payroll_cts_name_matches(e.value->>'name',c.name_snapshot) or public.payroll_cts_name_matches(e.value->>'name',w.name))
    ) a on true
    left join public.payroll_cts_source_links l on l.report_id=v_report.id and l.source_name=e.value->>'name' and l.source_contractor=e.value->>'contractor'
    left join public.cts_job_candidates manual on manual.id=l.assignment_id and manual.hiring_mode='owned'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'row_index',row_index,'name',value->>'name','contractor',value->>'contractor',
    'assignment_id',coalesce(manual_id,case when cardinality(ids)=1 then ids[1] end),
    'match',case when manual_id is not null then 'manual' when cardinality(ids)=1 then 'name' when cardinality(ids)>1 then 'ambiguous' else 'unmatched' end,
    'candidate_ids',coalesce(to_jsonb(ids),'[]'::jsonb),
    'regular',(value->>'regular')::numeric,'overtime',(value->>'overtime')::numeric,
    'cts_rate',(value->>'rate')::numeric,'employee_rate',(value->>'rate')::numeric-(v_report.payload->>'fee')::numeric,
    'per_diem_total',round((value->>'perDiemDays')::numeric*(value->>'perDiemRate')::numeric,2)
  ) order by row_index),'[]'::jsonb) into v_entries from candidates;
  select coalesce(jsonb_agg(line order by assignment_id),'[]'::jsonb) into v_lines from (
    select e->>'assignment_id' assignment_id, jsonb_build_object(
      'assignment_id',e->>'assignment_id','source_report_id',v_report.id,'version',v_report.revision,
      'official_source','cts_weekly','status','approved',
      'regular_hours',sum((e->>'regular')::numeric),'overtime_hours',sum((e->>'overtime')::numeric),'double_time_hours',0,
      'rate',case when min((e->>'employee_rate')::numeric)=max((e->>'employee_rate')::numeric) then min((e->>'employee_rate')::numeric) end,
      'per_diem_total',sum((e->>'per_diem_total')::numeric),
      'rate_conflict',min((e->>'employee_rate')::numeric)<>max((e->>'employee_rate')::numeric),
      'source_signature',md5(jsonb_build_object('report',v_report.id,'revision',v_report.revision,'rows',jsonb_agg(e order by (e->>'row_index')::integer))::text)
    ) line from jsonb_array_elements(v_entries) e where e->>'assignment_id' is not null group by e->>'assignment_id'
  ) grouped;
  return jsonb_build_object('report',jsonb_build_object('id',v_report.id,'week_ending',v_report.week_ending,'revision',v_report.revision,'invoiced',v_report.invoice_id is not null,'fee',v_report.payload->'fee'),'entries',v_entries,'lines',v_lines);
end; $$;

create function public.link_payroll_cts_source(p_report_id uuid,p_revision integer,p_source_name text,p_source_contractor text,p_assignment_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare r public.cts_weekly_reports%rowtype;
begin
  if not (select public.can_delete_workers()) then raise exception 'Supervisor access required.'; end if;
  select * into r from public.cts_weekly_reports where id=p_report_id for update;
  if not found or r.revision <> p_revision then raise exception 'Report changed. Refresh before linking.'; end if;
  if not exists(select 1 from jsonb_array_elements(r.payload->'entries') e where e->>'name'=p_source_name and e->>'contractor'=p_source_contractor) then raise exception 'Source row is no longer in this report.'; end if;
  if not exists(select 1 from public.cts_job_candidates where id=p_assignment_id and hiring_mode='owned') then raise exception 'Choose an OWNED assignment.'; end if;
  insert into public.payroll_cts_source_links(report_id,source_name,source_contractor,assignment_id)
    values(p_report_id,p_source_name,p_source_contractor,p_assignment_id)
    on conflict(report_id,source_name,source_contractor) do update set assignment_id=excluded.assignment_id,updated_at=now();
end; $$;

create or replace function public.check_payroll_draft_source()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_source jsonb; v_line jsonb;
begin
  if not exists(select 1 from public.cts_job_candidates where id=new.assignment_id and hiring_mode='owned') then raise exception 'Payroll drafts require an OWNED assignment.'; end if;
  -- Lock the source revision while recording its payroll draft.
  perform 1 from public.cts_weekly_reports where week_ending=new.week_start+6 for share;
  v_source := public.get_payroll_cts_week(new.week_start);
  select e into v_line from jsonb_array_elements(v_source->'lines') e where e->>'assignment_id'=new.assignment_id::text;
  if new.source_report_id is distinct from (v_line->>'source_report_id')::uuid
     or new.source_version is distinct from (v_line->>'version')::integer
     or new.source_signature is distinct from v_line->>'source_signature' then
    raise exception 'CTS weekly source changed. Refresh the payroll view before saving.';
  end if;
  new.updated_at := now();return new;
end; $$;
revoke all on function public.payroll_normalize_name(text),public.payroll_cts_name_matches(text,text),public.get_payroll_cts_week(date),public.link_payroll_cts_source(uuid,integer,text,text,uuid) from public, anon;
grant execute on function public.payroll_normalize_name(text),public.payroll_cts_name_matches(text,text),public.get_payroll_cts_week(date),public.link_payroll_cts_source(uuid,integer,text,text,uuid) to authenticated;
notify pgrst,'reload schema';

-- Source reports remain separate from daily timesheets; invoice creation is atomic.
create or replace function public.cts_weekly_invoice_lines(p jsonb) returns jsonb
language plpgsql immutable security invoker set search_path = '' as $$
declare e jsonb; a jsonb; k text; n numeric; fee numeric; rate numeric; result jsonb := '[]';
begin
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'entries') is distinct from 'array'
     or jsonb_typeof(p->'adjustments') is distinct from 'array' then raise exception 'Invalid report'; end if;
  if jsonb_array_length(p->'entries') < 1 or jsonb_array_length(p->'entries') > 500 then raise exception 'Report requires 1–500 employees'; end if;
  if jsonb_typeof(p->'fee') is distinct from 'number' then raise exception 'Invalid fee'; end if;
  fee := (p->>'fee')::numeric;
  if fee < 0 or fee > 10000 then raise exception 'Invalid fee'; end if;
  for e in select value from jsonb_array_elements(p->'entries') loop
    if nullif(trim(e->>'name'),'') is null or nullif(trim(e->>'contractor'),'') is null then raise exception 'Employee and contractor required'; end if;
    foreach k in array array['regular','overtime','rate','perDiemDays','perDiemRate'] loop
      if jsonb_typeof(e->k) is distinct from 'number' then raise exception 'Invalid %', k; end if;
      n := (e->>k)::numeric;
      if n < 0 or n > 1000000 then raise exception 'Invalid %', k; end if;
    end loop;
    if (e->>'regular')::numeric > 40 or (e->>'rate')::numeric < fee then raise exception 'Check regular hours and CTS RATE'; end if;
    if (e->>'regular')::numeric > 0 then
      result := result || jsonb_build_array(jsonb_build_object('line_type','hours','product_service_name','Regular hours','worker_name',e->>'name','project_name',e->>'contractor','qty',(e->>'regular')::numeric,'rate',(e->>'rate')::numeric,'amount',round((e->>'regular')::numeric*(e->>'rate')::numeric,2)));
    end if;
    if (e->>'overtime')::numeric > 0 then
      rate := round(((e->>'rate')::numeric-fee)*1.5+fee,2);
      result := result || jsonb_build_array(jsonb_build_object('line_type','hours','product_service_name','Overtime hours','worker_name',e->>'name','project_name',e->>'contractor','qty',(e->>'overtime')::numeric,'rate',rate,'amount',round((e->>'overtime')::numeric*rate,2)));
    end if;
    if (e->>'perDiemDays')::numeric > 0 and (e->>'perDiemRate')::numeric > 0 then
      result := result || jsonb_build_array(jsonb_build_object('line_type','hours','product_service_name','Per diem','worker_name',e->>'name','project_name',e->>'contractor','qty',(e->>'perDiemDays')::numeric,'rate',(e->>'perDiemRate')::numeric,'amount',round((e->>'perDiemDays')::numeric*(e->>'perDiemRate')::numeric,2)));
    end if;
  end loop;
  for a in select value from jsonb_array_elements(p->'adjustments') loop
    if nullif(trim(a->>'description'),'') is null or jsonb_typeof(a->'amount') is distinct from 'number' then raise exception 'Invalid additional charge'; end if;
    n := (a->>'amount')::numeric;
    if n < 0 or n > 1000000 then raise exception 'Invalid additional charge'; end if;
    if n > 0 then result := result || jsonb_build_array(jsonb_build_object('line_type','hours','product_service_name','Reimbursement / additional charge','worker_name','','project_name',a->>'description','qty',1,'rate',n,'amount',round(n,2))); end if;
  end loop;
  if jsonb_array_length(result) = 0 then raise exception 'No billable lines'; end if;
  return result;
end $$;

create table if not exists public.cts_weekly_reports (
 id uuid primary key default gen_random_uuid(),
 week_ending date not null unique,
 payload jsonb not null,
 total numeric(12,2) not null check(total > 0),
 revision integer not null default 1,
 invoice_id uuid unique references public.invoices(id) on delete restrict,
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.cts_weekly_reports enable row level security;
revoke all on public.cts_weekly_reports from anon;
grant select, insert, update on public.cts_weekly_reports to authenticated;
drop policy if exists "CTS weekly reports staff access" on public.cts_weekly_reports;
create policy "CTS weekly reports staff access" on public.cts_weekly_reports for all to authenticated
using ((select public.can_manage_cts_jobs())) with check ((select public.can_manage_cts_jobs()));

create or replace function public.validate_cts_weekly_report() returns trigger language plpgsql security invoker set search_path = '' as $$
declare lines jsonb; calculated numeric;
begin
 if tg_op = 'UPDATE' and old.invoice_id is not null then raise exception 'Invoiced reports are locked'; end if;
 if (new.payload->>'weekEnding')::date is distinct from new.week_ending then raise exception 'Week ending mismatch'; end if;
 lines := public.cts_weekly_invoice_lines(new.payload);
 select sum((v->>'amount')::numeric) into calculated from jsonb_array_elements(lines) v;
 new.total := calculated;
 if jsonb_typeof(new.payload->'sourceTotal') = 'number' and abs(calculated-(new.payload->>'sourceTotal')::numeric) > 0.01 and nullif(trim(new.payload->>'notes'),'') is null then raise exception 'Explain the difference from the source total in notes'; end if;
 if new.invoice_id is not null and (tg_op='INSERT' or new.invoice_id is distinct from old.invoice_id) then
   if not exists(select 1 from public.invoices i where i.id=new.invoice_id and i.total=calculated) then raise exception 'Invoice total mismatch'; end if;
 end if;
 if tg_op='UPDATE' then new.revision := old.revision+1; end if;
 new.updated_at := now();
 return new;
end $$;
drop trigger if exists validate_cts_weekly_report on public.cts_weekly_reports;
create trigger validate_cts_weekly_report before insert or update on public.cts_weekly_reports for each row execute function public.validate_cts_weekly_report();

create or replace function public.save_cts_weekly_report(p_id uuid, p_revision integer, p_payload jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
 if not (select public.can_manage_cts_jobs()) then raise exception 'Access denied'; end if;
 if p_id is null then
   insert into public.cts_weekly_reports(week_ending,payload,total) values ((p_payload->>'weekEnding')::date,p_payload,1) returning id into v_id;
 else
   update public.cts_weekly_reports set week_ending=(p_payload->>'weekEnding')::date,payload=p_payload
   where id=p_id and revision=p_revision and invoice_id is null returning id into v_id;
   if v_id is null then raise exception 'Report changed or is invoiced. Reload before editing.'; end if;
 end if;
 return v_id;
end $$;

create or replace function public.invoice_cts_weekly_report(p_id uuid,p_revision integer,p_invoice jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare r public.cts_weekly_reports; lines jsonb; v_id uuid; meta jsonb;
begin
 if not (select public.can_manage_cts_jobs()) then raise exception 'Access denied'; end if;
 select * into r from public.cts_weekly_reports where id=p_id for update;
 if not found then raise exception 'Report not found'; end if;
 if r.invoice_id is not null then return r.invoice_id; end if;
 if r.revision is distinct from p_revision then raise exception 'Report changed. Reload before invoicing.'; end if;
 if nullif(trim(p_invoice->>'invoice_number'),'') is null or nullif(trim(p_invoice->>'client_name'),'') is null then raise exception 'Invoice number and client required'; end if;
 if nullif(p_invoice->>'due_date','')::date < nullif(p_invoice->>'invoice_date','')::date then raise exception 'Due date precedes invoice date'; end if;
 lines := public.cts_weekly_invoice_lines(r.payload);
 select jsonb_agg(value || jsonb_build_object('details','CTS week ending '||r.week_ending::text)) into lines from jsonb_array_elements(lines);
 meta := p_invoice || jsonb_build_object('status','finalized','date_from',r.week_ending-6,'date_to',r.week_ending,'subtotal',r.total,'total',r.total);
 v_id := public.create_invoice_snapshot(meta,lines);
 update public.cts_weekly_reports set invoice_id=v_id where id=r.id;
 return v_id;
end $$;
revoke all on function public.cts_weekly_invoice_lines(jsonb), public.validate_cts_weekly_report(), public.save_cts_weekly_report(uuid,integer,jsonb), public.invoice_cts_weekly_report(uuid,integer,jsonb) from public, anon;
grant execute on function public.cts_weekly_invoice_lines(jsonb), public.save_cts_weekly_report(uuid,integer,jsonb), public.invoice_cts_weekly_report(uuid,integer,jsonb) to authenticated;
notify pgrst,'reload schema';

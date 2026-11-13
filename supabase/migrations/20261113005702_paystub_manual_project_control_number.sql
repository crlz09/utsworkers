-- Project names are entered using UTS order names, independently of CTS.
-- Existing final snapshots remain unchanged. New numbers are reserved for drafts;
-- abandoned drafts can leave gaps, but numbers are never recycled.
create table public.contractor_paystub_number_counters (
  control_date date primary key,
  last_number bigint not null check (last_number > 0)
);
alter table public.contractor_paystub_number_counters enable row level security;
revoke all on public.contractor_paystub_number_counters from public, anon, authenticated;
grant select, insert, update on public.contractor_paystub_number_counters to authenticated;
create policy "Supervisors manage paystub control numbers"
  on public.contractor_paystub_number_counters for all to authenticated
  using ((select public.can_delete_workers()))
  with check ((select public.can_delete_workers()));

create index contractor_paystubs_statement_number on public.contractor_paystubs(statement_number);

create function public.next_contractor_paystub_number()
returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_date date := (current_timestamp at time zone 'America/Indiana/Indianapolis')::date;
  v_next bigint;
  v_number text;
begin
  if (select auth.uid()) is null or not coalesce((select public.can_delete_workers()),false) then
    raise exception 'Supervisor access is required to generate a statement number.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('contractor-paystub-number',0));
  loop
    insert into public.contractor_paystub_number_counters(control_date,last_number)
      values(v_date,1)
      on conflict(control_date) do update
        set last_number=public.contractor_paystub_number_counters.last_number+1
      returning last_number into v_next;
    v_number := to_char(v_date,'MMDDYY') || '-' || lpad(v_next::text,greatest(2,length(v_next::text)),'0');
    exit when not exists(select 1 from public.contractor_paystubs where statement_number=v_number);
  end loop;
  return v_number;
end; $$;
revoke all on function public.next_contractor_paystub_number() from public, anon, authenticated;
grant execute on function public.next_contractor_paystub_number() to authenticated;

alter table public.contractor_paystubs alter column statement_number drop default;

create or replace function public.prepare_contractor_paystub()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_assignment record; v_latest public.contractor_paystubs%rowtype;
begin
  if (select auth.uid()) is null or not coalesce((select public.can_delete_workers()),false) then
    raise exception 'Supervisor access is required to finalize a paystub.';
  end if;
  select c.worker_id,c.payment_type,c.candidate_status,w.name into v_assignment
    from public.cts_job_candidates c join public.workers w on w.id=c.worker_id
    where c.id=new.assignment_id for share of c;
  if v_assignment.worker_id is null or v_assignment.payment_type is distinct from '1099' or v_assignment.candidate_status is distinct from 'placed' then
    raise exception 'Only placed 1099 contractors can receive a paystub.';
  end if;
  new.worker_id := v_assignment.worker_id;
  new.worker_name := v_assignment.name;
  new.project_name := btrim(coalesce(new.project_name,''));
  if length(new.project_name) not between 1 and 200 then
    raise exception 'Enter the UTS project name (up to 200 characters).';
  end if;
  -- Serialize versions per worker/week, including simultaneous first finalizations.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.worker_id::text || ':' || new.period_start::text,0));
  select * into v_latest from public.contractor_paystubs
    where worker_id=new.worker_id and period_start=new.period_start order by revision desc limit 1;
  if v_latest.id is not null then
    if new.supersedes_id is distinct from v_latest.id or nullif(btrim(new.correction_reason),'') is null then
      raise exception 'A final already exists for this week. Refresh and explicitly create a corrected version with a reason.';
    end if;
    new.revision := v_latest.revision + 1;
  else
    if new.supersedes_id is not null then raise exception 'The previous final does not belong to this worker and week.'; end if;
    new.revision := 1;
  end if;
  new.created_by := (select auth.uid());
  new.finalized_at := now();
  new.template_version := 1;
  -- The same lock is used by the allocator, so manual numbers cannot race it.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('contractor-paystub-number',0));
  new.statement_number := nullif(btrim(new.statement_number),'');
  if new.statement_number is null or new.statement_number = 'N/A' then
    new.statement_number := public.next_contractor_paystub_number();
  end if;
  if exists(select 1 from public.contractor_paystubs where statement_number=new.statement_number) then
    raise exception 'Statement number already exists. Enter a different number.';
  end if;
  return new;
end; $$;

notify pgrst, 'reload schema';

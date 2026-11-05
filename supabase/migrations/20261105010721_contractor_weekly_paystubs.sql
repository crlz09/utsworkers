-- Only finalized statements are persisted; drafts remain in the preparation form.
create table public.contractor_paystubs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.cts_job_candidates(id),
  worker_id uuid not null references public.workers(id),
  worker_name text not null,
  project_name text not null,
  period_start date not null check (extract(isodow from period_start) = 1),
  period_end date not null check (period_end = period_start + 6),
  payment_date date not null,
  statement_number text not null default 'N/A' check (length(statement_number) between 1 and 100),
  regular_hours numeric(10,2) not null check (regular_hours between 0 and 999999.99),
  overtime_hours numeric(10,2) not null check (overtime_hours between 0 and 999999.99),
  hourly_rate numeric(10,2) not null check (hourly_rate > 0 and hourly_rate <= 999999.99),
  per_diem numeric(12,2) not null check (per_diem between 0 and 999999.99),
  deductions numeric(12,2) not null default 0 check (deductions between 0 and 999999.99),
  extras numeric(12,2) not null default 0 check (extras between 0 and 999999.99),
  net_payment numeric(16,2) generated always as (
    round(regular_hours * hourly_rate,2) + round(overtime_hours * hourly_rate * 1.5,2) + per_diem + extras - deductions
  ) stored,
  payment_method text not null default '' check (length(payment_method) <= 100),
  notes text not null default '' check (length(notes) <= 500),
  revision integer not null default 1 check (revision > 0),
  supersedes_id uuid unique references public.contractor_paystubs(id),
  correction_reason text not null default '' check (length(correction_reason) <= 500),
  template_version integer not null default 1 check (template_version = 1),
  finalized_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  unique(worker_id,period_start,revision)
);
create index contractor_paystubs_history on public.contractor_paystubs(worker_id,period_start desc,revision desc);
create index contractor_paystubs_finalized on public.contractor_paystubs(finalized_at desc,id);
create index contractor_paystubs_assignment on public.contractor_paystubs(assignment_id);
create index contractor_paystubs_creator on public.contractor_paystubs(created_by);

alter table public.contractor_paystubs enable row level security;
revoke all on public.contractor_paystubs from anon, authenticated;
grant select, insert on public.contractor_paystubs to authenticated;
create policy "Supervisors read final paystubs" on public.contractor_paystubs for select to authenticated
  using ((select public.can_delete_workers()));
create policy "Workers read only their own final paystubs" on public.contractor_paystubs for select to authenticated
  using (worker_id = (select public.current_worker_id()));
create policy "Supervisors finalize paystubs" on public.contractor_paystubs for insert to authenticated
  with check ((select public.can_delete_workers()) and created_by = (select auth.uid()));

create function public.prepare_contractor_paystub()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_assignment record; v_latest public.contractor_paystubs%rowtype;
begin
  if (select auth.uid()) is null or not coalesce((select public.can_delete_workers()),false) then
    raise exception 'Supervisor access is required to finalize a paystub.';
  end if;
  select c.worker_id,c.payment_type,c.candidate_status,w.name,j.level_type into v_assignment
    from public.cts_job_candidates c join public.workers w on w.id=c.worker_id
    join public.cts_jobs j on j.id=c.cts_job_id
    where c.id=new.assignment_id for share of c;
  if v_assignment.worker_id is null or v_assignment.payment_type is distinct from '1099' or v_assignment.candidate_status is distinct from 'placed' then
    raise exception 'Only placed 1099 contractors can receive a paystub.';
  end if;
  new.worker_id := v_assignment.worker_id;
  new.worker_name := v_assignment.name;
  new.project_name := v_assignment.level_type;
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
  new.statement_number := coalesce(nullif(btrim(new.statement_number),''),'N/A');
  return new;
end; $$;
revoke all on function public.prepare_contractor_paystub() from public, anon, authenticated;
create trigger prepare_contractor_paystub before insert on public.contractor_paystubs
  for each row execute function public.prepare_contractor_paystub();

create function public.protect_final_contractor_paystub()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Final paystubs cannot be changed or deleted. Create a corrected version instead.';
end; $$;
revoke all on function public.protect_final_contractor_paystub() from public, anon, authenticated;
create trigger protect_final_contractor_paystub before update or delete on public.contractor_paystubs
  for each row execute function public.protect_final_contractor_paystub();
create view public.contractor_paystub_history with (security_invoker = true) as
  select s.*, not exists(select 1 from public.contractor_paystubs newer where newer.supersedes_id=s.id) as is_current
  from public.contractor_paystubs s;
revoke all on public.contractor_paystub_history from anon, authenticated;
grant select on public.contractor_paystub_history to authenticated;
notify pgrst, 'reload schema';

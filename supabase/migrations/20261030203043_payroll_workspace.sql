-- Payroll preparation only. No Gusto credentials or payment submissions are stored here.
create table public.payroll_gusto_directory (
  singleton boolean primary key default true check (singleton),
  company_uuid uuid not null unique,
  company_name text not null,
  imported_at timestamptz not null
);
create table public.payroll_gusto_people (
  person_uuid uuid primary key,
  company_uuid uuid not null references public.payroll_gusto_directory(company_uuid),
  name text not null,
  email text,
  worker_type text not null check (worker_type in ('W2','1099')),
  active boolean not null default true,
  imported_at timestamptz not null
);
create table public.payroll_worker_links (
  worker_id uuid primary key references public.workers(id) on delete cascade,
  person_uuid uuid not null unique references public.payroll_gusto_people(person_uuid),
  updated_at timestamptz not null default now()
);
create table public.payroll_draft_lines (
  assignment_id uuid not null references public.cts_job_candidates(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  rate numeric(10,2) check (rate > 0),
  per_diem_total numeric(12,2) check (per_diem_total >= 0),
  source_version integer,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (assignment_id, week_start)
);

alter table public.payroll_gusto_directory enable row level security;
alter table public.payroll_gusto_people enable row level security;
alter table public.payroll_worker_links enable row level security;
alter table public.payroll_draft_lines enable row level security;
revoke all on public.payroll_gusto_directory, public.payroll_gusto_people, public.payroll_worker_links, public.payroll_draft_lines from anon;
grant select, insert, update, delete on public.payroll_gusto_directory, public.payroll_gusto_people, public.payroll_worker_links, public.payroll_draft_lines to authenticated;
create policy "Supervisors manage payroll directory" on public.payroll_gusto_directory for all to authenticated using ((select public.can_delete_workers())) with check ((select public.can_delete_workers()));
create policy "Supervisors manage payroll people" on public.payroll_gusto_people for all to authenticated using ((select public.can_delete_workers())) with check ((select public.can_delete_workers()));
create policy "Supervisors manage payroll links" on public.payroll_worker_links for all to authenticated using ((select public.can_delete_workers())) with check ((select public.can_delete_workers()));
create policy "Supervisors manage payroll drafts" on public.payroll_draft_lines for all to authenticated using ((select public.can_delete_workers())) with check ((select public.can_delete_workers()));

-- One atomic directory refresh. Existing links survive a person leaving the roster,
-- but the inactive record blocks payroll review until it is resolved.
create function public.import_payroll_gusto_directory(p_snapshot jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_company uuid; v_time timestamptz;
begin
  if not (select public.can_delete_workers()) then raise exception 'Supervisor access required.'; end if;
  if p_snapshot->>'source' is distinct from 'gusto-cli' or p_snapshot->>'environment' is distinct from 'production'
     or p_snapshot->>'schema_version' is distinct from '1' or jsonb_typeof(p_snapshot->'people') is distinct from 'array'
     or nullif(btrim(p_snapshot->>'company_name'),'') is null then raise exception 'Invalid Gusto directory file.'; end if;
  v_company := (p_snapshot->>'company_uuid')::uuid;
  v_time := (p_snapshot->>'imported_at')::timestamptz;
  if v_company is null or v_time is null or v_time > now() + interval '5 minutes' then raise exception 'Invalid directory metadata.'; end if;
  if exists (select 1 from public.payroll_gusto_directory where company_uuid <> v_company) then raise exception 'This directory belongs to a different Gusto company.'; end if;
  if exists (select 1 from public.payroll_gusto_directory where imported_at > v_time) then raise exception 'A newer Gusto directory is already imported.'; end if;
  if exists (select 1 from jsonb_array_elements(p_snapshot->'people') p where nullif(btrim(p->>'name'),'') is null or p->>'worker_type' not in ('W2','1099') or p->>'worker_type' is null or p->>'person_uuid' is null or jsonb_typeof(p->'active') is distinct from 'boolean') then raise exception 'Invalid directory person.'; end if;
  if (select count(*) <> count(distinct p->>'person_uuid') from jsonb_array_elements(p_snapshot->'people') p) then raise exception 'Duplicate Gusto person.'; end if;
  insert into public.payroll_gusto_directory(singleton,company_uuid,company_name,imported_at)
    values(true,v_company,p_snapshot->>'company_name',v_time)
    on conflict(singleton) do update set company_name=excluded.company_name, imported_at=excluded.imported_at;
  update public.payroll_gusto_people set active=false, imported_at=v_time;
  insert into public.payroll_gusto_people(person_uuid,company_uuid,name,email,worker_type,active,imported_at)
    select (p->>'person_uuid')::uuid,v_company,btrim(p->>'name'),nullif(btrim(p->>'email'),''),p->>'worker_type',(p->>'active')::boolean,v_time
    from jsonb_array_elements(p_snapshot->'people') p
    on conflict(person_uuid) do update set name=excluded.name,email=excluded.email,worker_type=excluded.worker_type,active=excluded.active,imported_at=excluded.imported_at;
end; $$;
revoke all on function public.import_payroll_gusto_directory(jsonb) from public, anon;
grant execute on function public.import_payroll_gusto_directory(jsonb) to authenticated;
notify pgrst, 'reload schema';

create function public.check_payroll_draft_source()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_version integer;
begin
  if not exists(select 1 from public.cts_job_candidates where id=new.assignment_id and hiring_mode='owned') then raise exception 'Payroll drafts require an OWNED assignment.'; end if;
  select version into v_version from public.weekly_hours_reviews where cts_job_candidate_id=new.assignment_id and week_start_date=new.week_start for share;
  if new.source_version is distinct from v_version then raise exception 'Hours changed. Refresh the payroll view before saving.'; end if;
  new.updated_at := now();
  return new;
end; $$;
revoke all on function public.check_payroll_draft_source() from public, anon, authenticated;
create trigger payroll_draft_check_source before insert or update on public.payroll_draft_lines for each row execute function public.check_payroll_draft_source();

create table if not exists public.client_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  client_name text not null,
  is_active boolean not null default true,
  can_view_cts_jobs boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.client_users enable row level security;

revoke all on public.client_users from anon;
grant select on public.client_users to authenticated;

drop policy if exists "Client users can read their own access" on public.client_users;
create policy "Client users can read their own access"
on public.client_users
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.can_view_client_cts_jobs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_users
    where user_id = auth.uid()
      and is_active = true
      and can_view_cts_jobs = true
  );
$$;

create or replace function public.can_manage_cts_jobs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_permissions
    where user_id = auth.uid()
      and (
        can_edit_workers = true
        or can_delete_workers = true
      )
  );
$$;

revoke all on function public.can_view_client_cts_jobs() from public;
revoke all on function public.can_manage_cts_jobs() from public;
grant execute on function public.can_view_client_cts_jobs() to authenticated;
grant execute on function public.can_manage_cts_jobs() to authenticated;

alter table public.cts_jobs enable row level security;
alter table public.cts_job_candidates enable row level security;

drop policy if exists "CTS jobs readable by admins and clients" on public.cts_jobs;
create policy "CTS jobs readable by admins and clients"
on public.cts_jobs
for select
to authenticated
using (public.can_manage_cts_jobs() or public.can_view_client_cts_jobs());

drop policy if exists "CTS jobs manageable by admins" on public.cts_jobs;
create policy "CTS jobs manageable by admins"
on public.cts_jobs
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

drop policy if exists "CTS job candidates readable by admins and clients" on public.cts_job_candidates;
create policy "CTS job candidates readable by admins and clients"
on public.cts_job_candidates
for select
to authenticated
using (public.can_manage_cts_jobs() or public.can_view_client_cts_jobs());

drop policy if exists "CTS job candidates manageable by admins" on public.cts_job_candidates;
create policy "CTS job candidates manageable by admins"
on public.cts_job_candidates
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

drop policy if exists "Authenticated users can read workers" on public.workers;
drop policy if exists "Admins can read workers" on public.workers;
create policy "Admins can read workers"
on public.workers
for select
to authenticated
using (public.can_manage_cts_jobs());

drop policy if exists "CTS clients can read assigned workers" on public.workers;
create policy "CTS clients can read assigned workers"
on public.workers
for select
to authenticated
using (
  public.can_view_client_cts_jobs()
  and exists (
    select 1
    from public.cts_job_candidates cjc
    where cjc.worker_id = workers.id
  )
);

create or replace function public.get_client_cts_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_view_client_cts_jobs() then
      jsonb_build_object('jobs', '[]'::jsonb, 'candidates', '[]'::jsonb)
    else
      jsonb_build_object(
        'jobs',
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', j.id,
              'qty', j.qty,
              'level_type', j.level_type,
              'city', j.city,
              'state', j.state,
              'start_text', j.start_text,
              'details', j.details,
              'language_requirement', j.language_requirement,
              'bd_rep', j.bd_rep,
              'updated_at', j.updated_at,
              'status', j.status,
              'priority', j.priority,
              'candidate_count', coalesce(c.count, 0)
            )
            order by j.updated_at desc nulls last, j.created_at desc
          )
          from public.cts_jobs j
          left join (
            select cts_job_id, count(*)::int as count
            from public.cts_job_candidates
            group by cts_job_id
          ) c on c.cts_job_id = j.id
        ), '[]'::jsonb),
        'candidates',
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'name', coalesce(c.name_snapshot, w.name),
              'phone', coalesce(c.phone_snapshot, w.phone),
              'email', w.email,
              'public_profile_slug', w.public_profile_slug,
              'project_id', j.id,
              'project', j.level_type,
              'project_city', j.city,
              'project_state', j.state,
              'status', c.candidate_status,
              'updated_at', coalesce(c.updated_at, c.created_at)
            )
            order by coalesce(c.updated_at, c.created_at) desc
          )
          from public.cts_job_candidates c
          left join public.cts_jobs j on j.id = c.cts_job_id
          left join public.workers w on w.id = c.worker_id
        ), '[]'::jsonb)
      )
  end;
$$;

revoke all on function public.get_client_cts_dashboard() from public;
grant execute on function public.get_client_cts_dashboard() to authenticated;

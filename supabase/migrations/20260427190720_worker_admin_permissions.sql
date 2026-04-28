create table if not exists public.admin_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_edit_workers boolean not null default false,
  can_delete_workers boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admin_permissions enable row level security;

revoke all on public.admin_permissions from anon;
grant select on public.admin_permissions to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_permissions'
      and policyname = 'Users can read their own admin permissions'
  ) then
    create policy "Users can read their own admin permissions"
    on public.admin_permissions
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;
end
$$;

insert into public.admin_permissions (
  user_id,
  can_edit_workers,
  can_delete_workers
)
values (
  'f9fcc620-e7d6-44c7-aff2-86711d5e084e',
  true,
  true
)
on conflict (user_id) do update
set
  can_edit_workers = excluded.can_edit_workers,
  can_delete_workers = excluded.can_delete_workers;

create or replace function public.can_edit_workers()
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
      and can_edit_workers = true
  );
$$;

create or replace function public.can_delete_workers()
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
      and can_delete_workers = true
  );
$$;

revoke all on function public.can_edit_workers() from public;
revoke all on function public.can_delete_workers() from public;
grant execute on function public.can_edit_workers() to authenticated;
grant execute on function public.can_delete_workers() to authenticated;

create or replace function public.delete_worker_admin(p_worker_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_delete_workers() then
    raise exception 'Not allowed to delete workers.';
  end if;

  update public.candidate_interviews
  set worker_id = null,
      linked_at = null
  where worker_id = p_worker_id;

  update public.cts_job_candidates
  set worker_id = null
  where worker_id = p_worker_id;

  delete from public.worker_documents
  where worker_id = p_worker_id;

  delete from public.worker_certifications
  where worker_id = p_worker_id;

  delete from public.worker_skills
  where worker_id = p_worker_id;

  delete from public.worker_languages
  where worker_id = p_worker_id;

  delete from public.worker_projects
  where worker_id = p_worker_id;

  delete from public.workers
  where id = p_worker_id;
end;
$$;

revoke all on function public.delete_worker_admin(uuid) from public;
grant execute on function public.delete_worker_admin(uuid) to authenticated;

alter table public.workers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
      and policyname = 'Authenticated users can read workers'
  ) then
    create policy "Authenticated users can read workers"
    on public.workers
    for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
      and policyname = 'Only permitted admins can update workers'
  ) then
    create policy "Only permitted admins can update workers"
    on public.workers
    for update
    to authenticated
    using (public.can_edit_workers())
    with check (public.can_edit_workers());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
      and policyname = 'Only permitted admins can delete workers'
  ) then
    create policy "Only permitted admins can delete workers"
    on public.workers
    for delete
    to authenticated
    using (public.can_delete_workers());
  end if;
end
$$;

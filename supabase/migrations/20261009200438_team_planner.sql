-- Shared operations board. Candidate lifecycle and notification history remain intact.
create table public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 20000),
  status text not null default 'pending' check (status in ('unassigned','pending','in_progress','waiting','completed')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  due_date date,
  assignee_id uuid references auth.users(id) on delete set null,
  worker_id uuid references public.workers(id) on delete set null,
  job_id uuid references public.cts_jobs(id) on delete set null,
  checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 100),
  position double precision not null default 0,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index planner_tasks_open_idx on public.planner_tasks(status, position) where archived_at is null;
create index planner_tasks_assignee_idx on public.planner_tasks(assignee_id, due_date) where archived_at is null;
create index planner_tasks_worker_idx on public.planner_tasks(worker_id);
create index planner_tasks_job_idx on public.planner_tasks(job_id);
create index planner_tasks_creator_idx on public.planner_tasks(created_by);

create table public.planner_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.planner_tasks(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index planner_comments_task_idx on public.planner_comments(task_id,created_at);
create index planner_comments_author_idx on public.planner_comments(created_by);
create table public.planner_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.planner_tasks(id) on delete cascade,
  file_path text not null unique,
  file_name text not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (split_part(file_path,'/',1) = task_id::text)
);
create index planner_attachments_task_idx on public.planner_attachments(task_id);
create index planner_attachments_author_idx on public.planner_attachments(created_by);

alter table public.planner_tasks enable row level security;
alter table public.planner_comments enable row level security;
alter table public.planner_attachments enable row level security;
revoke all on public.planner_tasks, public.planner_comments, public.planner_attachments from public,anon,authenticated;
grant select,insert,update on public.planner_tasks to authenticated;
grant select,insert on public.planner_comments to authenticated;
grant select,insert,delete on public.planner_attachments to authenticated;
grant all on public.planner_tasks, public.planner_comments, public.planner_attachments to service_role;
create policy "Team reads tasks" on public.planner_tasks for select to authenticated using ((select public.can_manage_cts_jobs()));
create policy "Team creates tasks" on public.planner_tasks for insert to authenticated with check ((select public.can_manage_cts_jobs()) and created_by = (select auth.uid()));
create policy "Team updates tasks" on public.planner_tasks for update to authenticated using ((select public.can_manage_cts_jobs())) with check ((select public.can_manage_cts_jobs()));
create policy "Team reads comments" on public.planner_comments for select to authenticated using ((select public.can_manage_cts_jobs()));
create policy "Team adds comments" on public.planner_comments for insert to authenticated with check ((select public.can_manage_cts_jobs()) and created_by = (select auth.uid()));
create policy "Team reads attachments" on public.planner_attachments for select to authenticated using ((select public.can_manage_cts_jobs()));
create policy "Team adds attachments" on public.planner_attachments for insert to authenticated with check ((select public.can_manage_cts_jobs()) and created_by = (select auth.uid()));
create policy "Team removes attachments" on public.planner_attachments for delete to authenticated using ((select public.can_manage_cts_jobs()));

-- A restricted directory includes admins who do not have a recruiter profile.
create function public.planner_team_members()
returns table(user_id uuid, full_name text, email text)
language sql stable security definer set search_path = '' as $$
  select u.id, coalesce(nullif(r.full_name,''),u.email),u.email
  from auth.users u join public.admin_permissions p on p.user_id = u.id
  left join public.recruiters r on r.user_id = u.id
  where auth.uid() is not null and public.can_manage_cts_jobs()
    and (p.can_edit_workers or p.can_delete_workers)
  order by 2;
$$;
revoke all on function public.planner_team_members() from public,anon;
grant execute on function public.planner_team_members() to authenticated;

create function public.validate_planner_task()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if NEW.assignee_id is not null and not exists (
    select 1 from public.planner_team_members() m where m.user_id = NEW.assignee_id
  ) then raise exception 'Assign tasks to an active UTS team member.'; end if;
  if TG_OP = 'UPDATE' then
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  end if;
  NEW.updated_at := clock_timestamp();
  return NEW;
end;
$$;
revoke all on function public.validate_planner_task() from public,anon;
create trigger validate_planner_task before insert or update on public.planner_tasks for each row execute function public.validate_planner_task();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('planner-images','planner-images',false,10485760,array['image/jpeg','image/png','image/webp','image/gif']);
create policy "Team reads planner images" on storage.objects for select to authenticated using (bucket_id = 'planner-images' and (select public.can_manage_cts_jobs()));
create policy "Team uploads planner images" on storage.objects for insert to authenticated with check (
  bucket_id = 'planner-images' and (select public.can_manage_cts_jobs())
  and exists (select 1 from public.planner_tasks t where t.id::text = split_part(name,'/',1) and t.archived_at is null)
);
create policy "Team removes planner images" on storage.objects for delete to authenticated using (bucket_id = 'planner-images' and (select public.can_manage_cts_jobs()));

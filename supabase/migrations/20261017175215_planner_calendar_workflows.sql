-- Extend the shared planner without replacing task IDs, comments, files or RLS.
alter table public.planner_tasks
  add column recurrence text not null default 'none' check (recurrence in ('none','weekly')),
  add column recurrence_parent_id uuid unique references public.planner_tasks(id) on delete set null,
  add constraint planner_weekly_due_date check (recurrence = 'none' or due_date is not null);

-- One successor per completed occurrence, atomically created under the caller's RLS.
create function public.planner_next_week() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'completed' and old.status <> 'completed'
    and new.recurrence = 'weekly' and new.archived_at is null then
    insert into public.planner_tasks(title,description,status,priority,due_date,
      assignee_id,worker_id,job_id,checklist,position,recurrence,recurrence_parent_id)
    values(new.title,new.description,'pending',new.priority,new.due_date + 7,
      new.assignee_id,new.worker_id,new.job_id,
      coalesce((select jsonb_agg(item || jsonb_build_object('done',false))
        from jsonb_array_elements(new.checklist) item),'[]'::jsonb),
      new.position,'weekly',new.id)
    on conflict (recurrence_parent_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.planner_next_week() from public,anon,authenticated;
create trigger planner_next_week after update on public.planner_tasks
for each row execute function public.planner_next_week();

-- Internal review references the existing CTS candidate/project relationship.
-- Placement and external CTS/Jotform submission remain in their current workflows.
create table public.planner_cts_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.cts_job_candidates(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','changes_requested')),
  note text not null default '' check(length(note) <= 5000),
  submitted_by uuid not null default auth.uid() references auth.users(id),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index planner_cts_reviews_submitter_idx on public.planner_cts_reviews(submitted_by);
create index planner_cts_reviews_reviewer_idx on public.planner_cts_reviews(reviewed_by);
alter table public.planner_cts_reviews enable row level security;
revoke all on public.planner_cts_reviews from public,anon,authenticated;
grant select,insert,update on public.planner_cts_reviews to authenticated;
grant all on public.planner_cts_reviews to service_role;
create policy "Team reads CTS reviews" on public.planner_cts_reviews for select to authenticated
using ((select public.can_manage_cts_jobs()));
create policy "Team submits CTS reviews" on public.planner_cts_reviews for insert to authenticated
with check ((select public.can_manage_cts_jobs()) and submitted_by = (select auth.uid()));
create policy "Team updates CTS reviews" on public.planner_cts_reviews for update to authenticated
using ((select public.can_manage_cts_jobs())) with check ((select public.can_manage_cts_jobs()));
create function public.validate_planner_cts_review() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not public.can_manage_cts_jobs() then
    raise exception 'Team permission required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.cts_job_candidates where id = new.candidate_id) then
    raise exception 'Link the candidate to this CTS project first';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then raise exception 'Submit for review before approval'; end if;
    new.submitted_by := auth.uid(); new.submitted_at := now();
    new.reviewed_by := null; new.reviewed_at := null;
  else
    if new.candidate_id <> old.candidate_id then raise exception 'Candidate link is immutable'; end if;
    new.submitted_by := old.submitted_by; new.submitted_at := old.submitted_at;
    new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
    if new.status is distinct from old.status then
      if new.status = 'pending' and old.status = 'changes_requested' then
        new.submitted_by := auth.uid(); new.submitted_at := now();
        new.reviewed_by := null; new.reviewed_at := null;
      elsif old.status = 'pending' and new.status in ('approved','changes_requested') then
        new.reviewed_by := auth.uid(); new.reviewed_at := now();
      else raise exception 'Invalid CTS review transition'; end if;
    end if;
  end if;
  if new.status = 'changes_requested' and length(trim(new.note)) = 0 then
    raise exception 'Add a note explaining the requested changes';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.validate_planner_cts_review() from public,anon,authenticated;
create trigger validate_planner_cts_review before insert or update on public.planner_cts_reviews
for each row execute function public.validate_planner_cts_review();

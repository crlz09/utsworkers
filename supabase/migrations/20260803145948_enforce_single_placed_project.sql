-- A worker may be sourced for many projects, but can only be placed in one.
-- Keep the most recently placed assignment when repairing historical duplicates.
with ranked_placements as (
  select
    id,
    row_number() over (
      partition by worker_id
      order by
        placed_at desc nulls last,
        updated_at desc nulls last,
        created_at desc nulls last,
        id desc
    ) as placement_rank
  from public.cts_job_candidates
  where worker_id is not null
    and candidate_status = 'placed'
)
update public.cts_job_candidates as candidate
set candidate_status = 'sourced'
from ranked_placements as ranked
where candidate.id = ranked.id
  and ranked.placement_rank > 1;

create unique index if not exists cts_job_candidates_one_placed_per_worker_idx
  on public.cts_job_candidates (worker_id)
  where worker_id is not null
    and candidate_status = 'placed';

create or replace function public.source_other_projects_when_candidate_is_placed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.worker_id is not null and new.candidate_status = 'placed' then
    update public.cts_job_candidates
    set candidate_status = 'sourced'
    where worker_id = new.worker_id
      and id <> new.id
      and candidate_status <> 'sourced';
  end if;

  return new;
end;
$$;

revoke all on function public.source_other_projects_when_candidate_is_placed() from public;
revoke all on function public.source_other_projects_when_candidate_is_placed() from anon;
revoke all on function public.source_other_projects_when_candidate_is_placed() from authenticated;

drop trigger if exists trg_source_other_projects_when_candidate_is_placed
  on public.cts_job_candidates;

create trigger trg_source_other_projects_when_candidate_is_placed
before insert or update of candidate_status, worker_id
on public.cts_job_candidates
for each row
when (new.worker_id is not null and new.candidate_status = 'placed')
execute function public.source_other_projects_when_candidate_is_placed();

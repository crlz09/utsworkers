alter table public.cts_job_candidates
add column if not exists updated_at timestamptz;

update public.cts_job_candidates
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create or replace function public.set_cts_job_candidates_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_cts_job_candidates_updated_at on public.cts_job_candidates;

create trigger trg_set_cts_job_candidates_updated_at
before update on public.cts_job_candidates
for each row
execute function public.set_cts_job_candidates_updated_at();

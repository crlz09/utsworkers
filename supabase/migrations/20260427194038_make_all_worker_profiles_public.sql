alter table public.workers
alter column is_public set default true;

alter table public.workers
alter column is_public_profile set default true;

update public.workers
set
  is_public = true,
  is_public_profile = true
where
  coalesce(is_public, false) = false
  or coalesce(is_public_profile, false) = false;

create or replace function public.force_public_worker_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.is_public = true;
  new.is_public_profile = true;
  return new;
end;
$$;

drop trigger if exists trg_force_public_worker_profile on public.workers;

create trigger trg_force_public_worker_profile
before insert or update on public.workers
for each row
execute function public.force_public_worker_profile();

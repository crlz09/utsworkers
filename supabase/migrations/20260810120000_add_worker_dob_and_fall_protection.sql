alter table public.workers
add column if not exists date_of_birth date;

insert into public.certifications (name)
select 'Fall Protection'
where not exists (
  select 1 from public.certifications
  where lower(btrim(name)) = lower('Fall Protection')
);

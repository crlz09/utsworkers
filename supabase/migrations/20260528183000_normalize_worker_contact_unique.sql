create or replace function public.normalize_worker_email(p_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(btrim(coalesce(p_email, ''))), '')
$$;

create or replace function public.normalize_worker_phone_digits(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) = 11
      and left(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 1) = '1'
      then substring(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') from 2)
    when length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) = 10
      then regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    else null
  end
$$;

create or replace function public.format_worker_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_worker_phone_digits(p_phone) is null then null
    else format(
      '(%s) %s-%s',
      substring(public.normalize_worker_phone_digits(p_phone) from 1 for 3),
      substring(public.normalize_worker_phone_digits(p_phone) from 4 for 3),
      substring(public.normalize_worker_phone_digits(p_phone) from 7 for 4)
    )
  end
$$;

create or replace function public.normalize_worker_contact_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := public.normalize_worker_email(new.email);
  new.phone := public.format_worker_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists trg_normalize_worker_contact_fields on public.workers;
create trigger trg_normalize_worker_contact_fields
before insert or update of email, phone
on public.workers
for each row
execute function public.normalize_worker_contact_fields();

update public.workers
set
  email = public.normalize_worker_email(email),
  phone = public.format_worker_phone(phone);

update public.workers
set email = null
where public.normalize_worker_email(email) in (
  'noemail@123.com',
  'no-email@123.com',
  'noemail@example.com',
  'none@none.com'
);

with duplicate_emails as (
  select
    id,
    row_number() over (
      partition by public.normalize_worker_email(email)
      order by created_at nulls last, id
    ) as duplicate_rank
  from public.workers
  where public.normalize_worker_email(email) is not null
)
update public.workers w
set email = null
from duplicate_emails d
where w.id = d.id
  and d.duplicate_rank > 1;

with duplicate_phones as (
  select
    id,
    row_number() over (
      partition by public.normalize_worker_phone_digits(phone)
      order by created_at nulls last, id
    ) as duplicate_rank
  from public.workers
  where public.normalize_worker_phone_digits(phone) is not null
)
update public.workers w
set phone = null
from duplicate_phones d
where w.id = d.id
  and d.duplicate_rank > 1;

create unique index if not exists workers_email_unique_normalized_idx
on public.workers (public.normalize_worker_email(email))
where public.normalize_worker_email(email) is not null;

create unique index if not exists workers_phone_unique_normalized_idx
on public.workers (public.normalize_worker_phone_digits(phone))
where public.normalize_worker_phone_digits(phone) is not null;

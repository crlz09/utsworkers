-- A placement fee belongs to the candidate, even though CTS assignments are
-- stored per project. Once paid, every current and future assignment inherits
-- the same paid state and payment reference.

create index if not exists cts_job_candidates_paid_worker_idx
  on public.cts_job_candidates (worker_id)
  where worker_id is not null and placement_fee_paid is true;

with canonical_payment as (
  select distinct on (worker_id)
    worker_id,
    placement_fee_paid_at,
    placement_fee_billed_at,
    placement_fee_invoice_number,
    placement_fee_invoice_id
  from public.cts_job_candidates
  where worker_id is not null
    and placement_fee_paid is true
  order by worker_id, placement_fee_paid_at asc nulls last, updated_at asc nulls last, id
)
update public.cts_job_candidates candidate
set placement_fee_paid = true,
    placement_fee_paid_at = coalesce(candidate.placement_fee_paid_at, payment.placement_fee_paid_at),
    placement_fee_billed_at = coalesce(candidate.placement_fee_billed_at, payment.placement_fee_billed_at),
    placement_fee_invoice_number = coalesce(candidate.placement_fee_invoice_number, payment.placement_fee_invoice_number),
    placement_fee_invoice_id = coalesce(candidate.placement_fee_invoice_id, payment.placement_fee_invoice_id)
from canonical_payment payment
where candidate.worker_id = payment.worker_id
  and candidate.placement_fee_paid is not true;

create or replace function public.normalize_worker_placement_fee()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  paid_assignment public.cts_job_candidates%rowtype;
  is_new_payment boolean;
begin
  if new.worker_id is null then
    return new;
  end if;

  select candidate.*
  into paid_assignment
  from public.cts_job_candidates candidate
  where candidate.worker_id = new.worker_id
    and candidate.placement_fee_paid is true
    and candidate.id is distinct from new.id
  order by candidate.placement_fee_paid_at asc nulls last,
           candidate.updated_at asc nulls last,
           candidate.id
  limit 1;

  if found then
    new.placement_fee_paid := true;
    new.placement_fee_paid_at := coalesce(new.placement_fee_paid_at, paid_assignment.placement_fee_paid_at);
    new.placement_fee_billed_at := coalesce(new.placement_fee_billed_at, paid_assignment.placement_fee_billed_at);
    new.placement_fee_invoice_number := coalesce(new.placement_fee_invoice_number, paid_assignment.placement_fee_invoice_number);
    new.placement_fee_invoice_id := coalesce(new.placement_fee_invoice_id, paid_assignment.placement_fee_invoice_id);
    return new;
  end if;

  is_new_payment := new.placement_fee_paid is true
    and (tg_op = 'INSERT' or old.placement_fee_paid is not true);

  if is_new_payment and new.candidate_status <> 'sourced' then
    raise exception 'Placement fee can only be marked paid while candidate status is sourced.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.normalize_worker_placement_fee() from public, anon, authenticated;

drop trigger if exists trg_normalize_worker_placement_fee on public.cts_job_candidates;
create trigger trg_normalize_worker_placement_fee
before insert or update of worker_id, candidate_status, placement_fee_paid,
  placement_fee_paid_at, placement_fee_billed_at,
  placement_fee_invoice_number, placement_fee_invoice_id
on public.cts_job_candidates
for each row
execute function public.normalize_worker_placement_fee();

create or replace function public.propagate_worker_placement_fee()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.worker_id is null or new.placement_fee_paid is not true then
    return new;
  end if;

  update public.cts_job_candidates candidate
  set placement_fee_paid = true,
      placement_fee_paid_at = coalesce(candidate.placement_fee_paid_at, new.placement_fee_paid_at),
      placement_fee_billed_at = coalesce(candidate.placement_fee_billed_at, new.placement_fee_billed_at),
      placement_fee_invoice_number = coalesce(candidate.placement_fee_invoice_number, new.placement_fee_invoice_number),
      placement_fee_invoice_id = coalesce(candidate.placement_fee_invoice_id, new.placement_fee_invoice_id)
  where candidate.worker_id = new.worker_id
    and candidate.id <> new.id
    and candidate.placement_fee_paid is not true;

  return new;
end;
$$;

revoke all on function public.propagate_worker_placement_fee() from public, anon, authenticated;

drop trigger if exists trg_propagate_worker_placement_fee on public.cts_job_candidates;
create trigger trg_propagate_worker_placement_fee
after insert or update of worker_id, placement_fee_paid,
  placement_fee_paid_at, placement_fee_billed_at,
  placement_fee_invoice_number, placement_fee_invoice_id
on public.cts_job_candidates
for each row
when (new.placement_fee_paid is true)
execute function public.propagate_worker_placement_fee();

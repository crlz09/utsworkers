-- Correct the payment gate: placement fees become payable only after the CTS
-- assignment reaches Placed. Previously paid fees remain inherited by every
-- assignment for the worker.

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

  if is_new_payment and new.candidate_status <> 'placed' then
    raise exception 'Placement fee can only be marked paid while candidate status is placed.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.normalize_worker_placement_fee() from public, anon, authenticated;

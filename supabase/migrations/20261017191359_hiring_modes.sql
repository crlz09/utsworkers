-- Hiring mode belongs to a candidate's CTS assignment, not recruiting status.
alter table public.cts_job_candidates
  add column hiring_mode text check (hiring_mode in ('sourcing','owned')),
  add column hourly_fee_rate numeric(12,2) generated always as (
    case hiring_mode when 'sourcing' then 1 when 'owned' then 5 else null end
  ) stored;
-- Existing contracts retain the pre-existing $1/hour + $50 pricing model.
update public.cts_job_candidates set hiring_mode = 'sourcing'
where candidate_status = 'placed' or placed_at is not null or placement_fee_paid or placement_fee_billed_at is not null;
alter table public.cts_job_candidates
  add constraint placed_requires_hiring_mode check(candidate_status <> 'placed' or hiring_mode is not null),
  add constraint owned_has_no_placement_fee check(hiring_mode is distinct from 'owned' or (placement_fee_amount = 0 and not placement_fee_paid));

create function public.validate_hiring_mode() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.hiring_mode is not null and not coalesce(public.can_manage_cts_jobs(),false) then
      raise exception 'UTS must choose the hiring mode' using errcode='42501';
    end if;
  elsif new.hiring_mode is distinct from old.hiring_mode then
    if not coalesce(public.can_manage_cts_jobs(),false) then
      raise exception 'UTS must choose the hiring mode' using errcode='42501';
    end if;
    if old.placement_fee_paid or old.placement_fee_billed_at is not null or
      exists(select 1 from public.invoice_line_items where cts_job_candidate_id=old.id) then
      raise exception 'This assignment has billing history. Create a new assignment for a different hiring contract.';
    end if;
  end if;
  if new.candidate_status = 'placed' and new.hiring_mode is null then
    raise exception 'Choose Sourcing or Owned before placing the candidate';
  end if;
  if new.hiring_mode = 'owned' then new.placement_fee_amount := 0;
  elsif new.hiring_mode = 'sourcing' then new.placement_fee_amount := 50;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_hiring_mode() from public,anon,authenticated;
-- Runs before existing fee normalization and placement triggers.
create trigger trg_a_validate_hiring_mode before insert or update on public.cts_job_candidates
for each row execute function public.validate_hiring_mode();

-- Retain the one-time worker payment inheritance only for Sourcing contracts.
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
  if new.hiring_mode = 'owned' then return new; end if;
  if new.worker_id is null then
    return new;
  end if;

  select candidate.*
  into paid_assignment
  from public.cts_job_candidates candidate
  where candidate.worker_id = new.worker_id
    and candidate.hiring_mode is distinct from 'owned'
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

create or replace function public.propagate_worker_placement_fee()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.hiring_mode = 'owned' then return new; end if;
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
    and candidate.hiring_mode is distinct from 'owned'
    and candidate.id <> new.id
    and candidate.placement_fee_paid is not true;

  return new;
end;
$$;


revoke all on function public.normalize_worker_placement_fee(), public.propagate_worker_placement_fee() from public,anon,authenticated;
notify pgrst, 'reload schema';

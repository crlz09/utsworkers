-- Invoice dashboard and one-time placement fee billing.
-- Placement fee lines are billed when an invoice line is saved and marked paid
-- automatically when the invoice status becomes paid.

alter table public.cts_jobs
add column if not exists placement_fee_amount numeric(12,2) not null default 0;

alter table public.cts_job_candidates
add column if not exists placement_fee_amount numeric(12,2) not null default 0,
add column if not exists placement_fee_billed_at timestamptz,
add column if not exists placement_fee_invoice_number text,
add column if not exists placement_fee_invoice_id uuid,
add column if not exists placement_fee_paid boolean not null default false,
add column if not exists placement_fee_paid_at timestamptz;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  status text not null default 'finalized' check (status in ('printed', 'finalized', 'sent', 'paid')),
  client_name text not null,
  client_address text,
  client_phone text,
  client_email text,
  date_from date,
  date_to date,
  invoice_date date not null default current_date,
  due_date date,
  notes text,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  printed_at timestamptz,
  finalized_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_status_created_at
on public.invoices (status, created_at desc);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  line_type text not null default 'hours' check (line_type in ('hours', 'placement_fee')),
  cts_job_candidate_id uuid references public.cts_job_candidates(id) on delete set null,
  cts_job_id uuid references public.cts_jobs(id) on delete set null,
  worker_id uuid references public.workers(id) on delete set null,
  product_service_name text not null,
  worker_name text,
  project_name text,
  details text,
  qty numeric(12,2) not null default 0,
  rate numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_line_items_invoice_id
on public.invoice_line_items (invoice_id);

create index if not exists idx_invoice_line_items_placement_candidate
on public.invoice_line_items (line_type, cts_job_candidate_id);

create or replace function public.set_invoices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'printed' and new.printed_at is null then
    new.printed_at = now();
  end if;
  if new.status = 'finalized' and new.finalized_at is null then
    new.finalized_at = now();
  end if;
  if new.status = 'sent' and new.sent_at is null then
    new.sent_at = now();
  end if;
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_invoices_updated_at on public.invoices;
create trigger trg_set_invoices_updated_at
before insert or update on public.invoices
for each row
execute function public.set_invoices_updated_at();

create or replace function public.mark_placement_fees_billed_from_line_items()
returns trigger
language plpgsql
as $$
declare
  v_invoice record;
begin
  if new.line_type <> 'placement_fee' or new.cts_job_candidate_id is null then
    return new;
  end if;

  select id, invoice_number, status into v_invoice
  from public.invoices
  where id = new.invoice_id;

  update public.cts_job_candidates
  set placement_fee_billed_at = coalesce(placement_fee_billed_at, now()),
      placement_fee_invoice_number = coalesce(placement_fee_invoice_number, v_invoice.invoice_number),
      placement_fee_invoice_id = coalesce(placement_fee_invoice_id, v_invoice.id),
      placement_fee_paid = case when v_invoice.status = 'paid' then true else placement_fee_paid end,
      placement_fee_paid_at = case when v_invoice.status = 'paid' then coalesce(placement_fee_paid_at, now()) else placement_fee_paid_at end
  where id = new.cts_job_candidate_id;

  return new;
end;
$$;

drop trigger if exists trg_mark_placement_fees_billed_from_line_items on public.invoice_line_items;
create trigger trg_mark_placement_fees_billed_from_line_items
after insert on public.invoice_line_items
for each row
execute function public.mark_placement_fees_billed_from_line_items();

create or replace function public.mark_placement_fees_paid_from_invoice()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and (TG_OP = 'INSERT' or old.status is distinct from 'paid') then
    update public.cts_job_candidates c
    set placement_fee_paid = true,
        placement_fee_paid_at = coalesce(c.placement_fee_paid_at, now()),
        placement_fee_billed_at = coalesce(c.placement_fee_billed_at, now()),
        placement_fee_invoice_number = coalesce(c.placement_fee_invoice_number, new.invoice_number),
        placement_fee_invoice_id = coalesce(c.placement_fee_invoice_id, new.id)
    where exists (
      select 1
      from public.invoice_line_items li
      where li.invoice_id = new.id
        and li.line_type = 'placement_fee'
        and li.cts_job_candidate_id = c.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mark_placement_fees_paid_from_invoice on public.invoices;
create trigger trg_mark_placement_fees_paid_from_invoice
after insert or update on public.invoices
for each row
execute function public.mark_placement_fees_paid_from_invoice();

alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;

revoke all on public.invoices from anon;
revoke all on public.invoice_line_items from anon;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_line_items to authenticated;

drop policy if exists "Admins can manage invoices" on public.invoices;
create policy "Admins can manage invoices"
on public.invoices
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

drop policy if exists "Admins can manage invoice line items" on public.invoice_line_items;
create policy "Admins can manage invoice line items"
on public.invoice_line_items
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

notify pgrst, 'reload schema';

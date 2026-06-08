create table if not exists public.invoice_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoice_clients_name
on public.invoice_clients (lower(name));

create or replace function public.set_invoice_clients_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_invoice_clients_updated_at on public.invoice_clients;

create trigger trg_set_invoice_clients_updated_at
before update on public.invoice_clients
for each row
execute function public.set_invoice_clients_updated_at();

alter table public.invoice_clients enable row level security;

revoke all on public.invoice_clients from anon;
grant select, insert, update, delete on public.invoice_clients to authenticated;

drop policy if exists "Admins can manage invoice clients" on public.invoice_clients;
create policy "Admins can manage invoice clients"
on public.invoice_clients
for all
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

notify pgrst, 'reload schema';

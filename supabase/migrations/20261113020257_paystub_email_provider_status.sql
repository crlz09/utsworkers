-- Provider observations are mutable; the original accepted email stays immutable.
create table public.contractor_paystub_email_status (
  paystub_id uuid primary key references public.contractor_paystub_deliveries(paystub_id),
  provider_status text check (provider_status in ('sent','delivered','delivery_delayed','bounced','complained','opened','clicked','failed','suppressed','scheduled','canceled')),
  checked_at timestamptz not null default now(),
  check_error text not null default ''
);
alter table public.contractor_paystub_email_status enable row level security;
revoke all on public.contractor_paystub_email_status from public,anon,authenticated;
grant select on public.contractor_paystub_email_status to authenticated;
grant all on public.contractor_paystub_email_status to service_role;
create policy "Supervisors read provider delivery status" on public.contractor_paystub_email_status
  for select to authenticated using ((select public.can_delete_workers()));
notify pgrst,'reload schema';

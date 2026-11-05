create table public.contractor_paystub_deliveries (
  id uuid primary key default gen_random_uuid(),
  paystub_id uuid not null unique references public.contractor_paystubs(id),
  email_to text not null,
  email_from text not null,
  subject text not null,
  request_payload jsonb not null,
  review_key text not null,
  state text not null default 'sending' check (state in ('sending','sent')),
  started_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text unique,
  last_error text,
  sent_by uuid not null references auth.users(id),
  check ((state='sent' and sent_at is not null and provider_id is not null) or (state='sending' and sent_at is null and provider_id is null))
);
create index contractor_paystub_deliveries_actor on public.contractor_paystub_deliveries(sent_by);
alter table public.contractor_paystub_deliveries enable row level security;
revoke all on public.contractor_paystub_deliveries from anon,authenticated;
grant select(id,paystub_id,email_to,email_from,subject,state,started_at,sent_at,provider_id,last_error) on public.contractor_paystub_deliveries to authenticated;
grant all on public.contractor_paystub_deliveries to service_role;
create policy "Supervisors view paystub email status" on public.contractor_paystub_deliveries for select to authenticated
  using ((select public.can_delete_workers()));
-- The Edge Function alone may store the exact reviewed message and attachment.
-- Freeze the original request so retries cannot change its recipient or PDF.
create function public.protect_paystub_delivery_request()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if (new.paystub_id,new.email_to,new.email_from,new.subject,new.request_payload,new.review_key,new.started_at,new.sent_by)
     is distinct from (old.paystub_id,old.email_to,old.email_from,old.subject,old.request_payload,old.review_key,old.started_at,old.sent_by)
  then raise exception 'An attempted paystub email cannot change its reviewed recipient, message or attachment.'; end if;
  if old.state='sent' then raise exception 'An accepted paystub email cannot be changed.'; end if;
  return new;
end; $$;
revoke all on function public.protect_paystub_delivery_request() from public,anon,authenticated;
create trigger protect_paystub_delivery_request before update on public.contractor_paystub_deliveries
  for each row execute function public.protect_paystub_delivery_request();
notify pgrst,'reload schema';

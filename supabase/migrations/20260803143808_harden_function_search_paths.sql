-- Fix every application-owned function reported by the Supabase security
-- advisor with a mutable search_path. Built-in/extension functions are not
-- modified here.

create or replace function public.get_jobs_paginated(
  category_filter text,
  range_from integer,
  range_to integer
)
returns setof public.jobs
language sql
set search_path = ''
as $$
  select j.*
  from public.jobs j
  where category_filter is null or j.category = category_filter
  order by j.created_at desc
  offset range_from
  limit range_to - range_from + 1;
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(public.unaccent(coalesce(input, ''))),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

alter function public.format_worker_phone(text) set search_path = '';
alter function public.generate_worker_public_slug(text, text, uuid) set search_path = '';
alter function public.mark_placement_fees_billed_from_line_items() set search_path = '';
alter function public.mark_placement_fees_paid_from_invoice() set search_path = '';
alter function public.normalize_worker_email(text) set search_path = '';
alter function public.normalize_worker_phone_digits(text) set search_path = '';
alter function public.set_hours_entries_updated_at() set search_path = '';
alter function public.set_invoice_clients_updated_at() set search_path = '';
alter function public.set_invoices_updated_at() set search_path = '';
alter function public.set_linked_at() set search_path = '';
alter function public.set_public_on_completed() set search_path = '';
alter function public.set_updated_at() set search_path = '';
alter function public.set_weekly_hours_reviews_updated_at() set search_path = '';
alter function public.set_worker_hours_links_updated_at() set search_path = '';
alter function public.set_worker_public_slug() set search_path = '';
alter function public.set_worker_public_slug_once() set search_path = '';
alter function public.sync_availability_with_status() set search_path = '';

-- Trigger functions are invoked by their triggers, never through PostgREST.
revoke all on function public.mark_placement_fees_billed_from_line_items()
  from public, anon, authenticated;
revoke all on function public.mark_placement_fees_paid_from_invoice()
  from public, anon, authenticated;
revoke all on function public.set_hours_entries_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_invoice_clients_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_invoices_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_linked_at()
  from public, anon, authenticated;
revoke all on function public.set_public_on_completed()
  from public, anon, authenticated;
revoke all on function public.set_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_weekly_hours_reviews_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_worker_hours_links_updated_at()
  from public, anon, authenticated;
revoke all on function public.set_worker_public_slug()
  from public, anon, authenticated;
revoke all on function public.set_worker_public_slug_once()
  from public, anon, authenticated;
revoke all on function public.sync_availability_with_status()
  from public, anon, authenticated;

notify pgrst, 'reload schema';

-- Create an invoice header and all of its final line items atomically. This
-- prevents a finalized invoice from surviving when any line fails validation.
create or replace function public.create_invoice_snapshot(
  p_invoice jsonb,
  p_line_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invoice_id uuid;
begin
  if not (select public.can_manage_cts_jobs()) then
    raise exception 'Invoice access denied';
  end if;

  if jsonb_typeof(p_invoice) <> 'object' then
    raise exception 'Invoice payload must be an object';
  end if;

  if jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) = 0 then
    raise exception 'At least one invoice line is required';
  end if;

  insert into public.invoices (
    invoice_number, status, client_name, client_address,
    client_contact_name, client_phone, client_email,
    date_from, date_to, invoice_date, due_date, notes, subtotal, total
  ) values (
    nullif(trim(p_invoice->>'invoice_number'), ''),
    coalesce(nullif(p_invoice->>'status', ''), 'finalized'),
    nullif(trim(p_invoice->>'client_name'), ''),
    nullif(p_invoice->>'client_address', ''),
    nullif(p_invoice->>'client_contact_name', ''),
    nullif(p_invoice->>'client_phone', ''),
    nullif(p_invoice->>'client_email', ''),
    nullif(p_invoice->>'date_from', '')::date,
    nullif(p_invoice->>'date_to', '')::date,
    coalesce(nullif(p_invoice->>'invoice_date', '')::date, current_date),
    nullif(p_invoice->>'due_date', '')::date,
    nullif(p_invoice->>'notes', ''),
    coalesce((p_invoice->>'subtotal')::numeric, 0),
    coalesce((p_invoice->>'total')::numeric, 0)
  )
  returning id into v_invoice_id;

  insert into public.invoice_line_items (
    invoice_id, line_type, cts_job_candidate_id, cts_job_id, worker_id,
    product_service_name, worker_name, project_name, details, qty, rate, amount
  )
  select
    v_invoice_id,
    coalesce(nullif(item->>'line_type', ''), 'hours'),
    nullif(item->>'cts_job_candidate_id', '')::uuid,
    nullif(item->>'cts_job_id', '')::uuid,
    nullif(item->>'worker_id', '')::uuid,
    nullif(item->>'product_service_name', ''),
    nullif(item->>'worker_name', ''),
    nullif(item->>'project_name', ''),
    nullif(item->>'details', ''),
    coalesce((item->>'qty')::numeric, 0),
    coalesce((item->>'rate')::numeric, 0),
    coalesce((item->>'amount')::numeric, 0)
  from jsonb_array_elements(p_line_items) as item;

  return v_invoice_id;
end;
$$;

revoke all on function public.create_invoice_snapshot(jsonb, jsonb) from public, anon;
grant execute on function public.create_invoice_snapshot(jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';

-- Invoice identity is derived on the server; explicit due dates remain editable.
create or replace function public.invoice_cts_weekly_report(p_id uuid,p_revision integer,p_invoice jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare r public.cts_weekly_reports; lines jsonb; v_id uuid; meta jsonb;
begin
 if not (select public.can_manage_cts_jobs()) then raise exception 'Access denied'; end if;
 select * into r from public.cts_weekly_reports where id=p_id for update;
 if not found then raise exception 'Report not found'; end if;
 if r.invoice_id is not null then return r.invoice_id; end if;
 if r.revision is distinct from p_revision then raise exception 'Report changed. Reload before invoicing.'; end if;
 if nullif(trim(p_invoice->>'client_name'),'') is null then raise exception 'Client required'; end if;
 p_invoice := p_invoice || jsonb_build_object('invoice_number','UTS-CTS-'||to_char(r.week_ending,'YYYYMMDD'), 'invoice_date',coalesce(nullif(p_invoice->>'invoice_date','')::date,current_date));
 p_invoice := p_invoice || jsonb_build_object('due_date',coalesce(nullif(p_invoice->>'due_date','')::date,(p_invoice->>'invoice_date')::date+7));
 if (p_invoice->>'due_date')::date < (p_invoice->>'invoice_date')::date then raise exception 'Due date precedes invoice date'; end if;
 lines := public.cts_weekly_invoice_lines(r.payload);
 select jsonb_agg(value || jsonb_build_object('details','Week Period: '||to_char(r.week_ending-6,'MM/DD/YYYY')||' - '||to_char(r.week_ending,'MM/DD/YYYY'))) into lines from jsonb_array_elements(lines);
 meta := p_invoice || jsonb_build_object('status','finalized','date_from',r.week_ending-6,'date_to',r.week_ending,'subtotal',r.total,'total',r.total);
 v_id := public.create_invoice_snapshot(meta,lines);
 update public.cts_weekly_reports set invoice_id=v_id where id=r.id;
 return v_id;
end $$;

notify pgrst,'reload schema';

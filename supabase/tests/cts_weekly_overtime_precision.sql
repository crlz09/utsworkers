-- Read-only regression checks for fractional-cent hourly rates.
begin;
do $$
declare
  p jsonb := '{"fee":5,"entries":[{"name":"Worker A","contractor":"TEST","regular":40,"overtime":32,"rate":42.25,"perDiemDays":0,"perDiemRate":0},{"name":"Worker B","contractor":"TEST","regular":40,"overtime":32,"rate":40.25,"perDiemDays":0,"perDiemRate":0}],"adjustments":[]}';
  lines jsonb;
  total numeric;
begin
  lines := public.cts_weekly_invoice_lines(p);
  if (lines->1->>'rate')::numeric <> 60.875 or (lines->1->>'amount')::numeric <> 1948
     or (lines->3->>'rate')::numeric <> 57.875 or (lines->3->>'amount')::numeric <> 1852 then
    raise exception 'OT rates lost precision before multiplication';
  end if;
  select sum((v->>'amount')::numeric) into total from jsonb_array_elements(lines) v;
  if total <> 7100 then raise exception 'OT total does not reconcile with Excel'; end if;
  p := jsonb_set(p, '{entries,0,overtime}', '1.25'::jsonb);
  lines := public.cts_weekly_invoice_lines(p);
  if (lines->1->>'amount')::numeric <> 76.09 then
    raise exception 'Final line amount must round to cents';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='invoice_line_items'
               and column_name='rate' and numeric_scale=2) then
    raise exception 'Invoice storage still rounds hourly rates to cents';
  end if;
end $$;
rollback;

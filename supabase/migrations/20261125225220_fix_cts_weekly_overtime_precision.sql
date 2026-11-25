-- Keep fractional cents in hourly rates, rounding only final line amounts.
-- Existing invoice amounts and locked reports remain unchanged.
alter table public.invoice_line_items alter column rate type numeric;

-- Positive deduction inputs become negative invoice lines; older reports remain compatible.
-- Source reports remain separate from daily timesheets; invoice creation is atomic.
create or replace function public.cts_weekly_invoice_lines(p jsonb) returns jsonb
language plpgsql immutable security invoker set search_path = '' as $$
declare e jsonb; a jsonb; k text; n numeric; fee numeric; rate numeric; result jsonb := '[]';
begin
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'entries') is distinct from 'array'
     or jsonb_typeof(p->'adjustments') is distinct from 'array' then raise exception 'Invalid report'; end if;
  if p ? 'deductions' and jsonb_typeof(p->'deductions') is distinct from 'array' then raise exception 'Invalid deductions'; end if;
  if jsonb_array_length(p->'entries') < 1 or jsonb_array_length(p->'entries') > 500 then raise exception 'Report requires 1–500 employees'; end if;
  if jsonb_typeof(p->'fee') is distinct from 'number' then raise exception 'Invalid fee'; end if;
  fee := (p->>'fee')::numeric;
  if fee < 0 or fee > 10000 then raise exception 'Invalid fee'; end if;
  for e in select value from jsonb_array_elements(p->'entries') loop
    if nullif(trim(e->>'name'),'') is null or nullif(trim(e->>'contractor'),'') is null then raise exception 'Employee and contractor required'; end if;
    foreach k in array array['regular','overtime','rate','perDiemDays','perDiemRate'] loop
      if jsonb_typeof(e->k) is distinct from 'number' then raise exception 'Invalid %', k; end if;
      n := (e->>k)::numeric;
      if n < 0 or n > 1000000 then raise exception 'Invalid %', k; end if;
    end loop;
    if (e->>'regular')::numeric > 40 or (e->>'rate')::numeric < fee then raise exception 'Check regular hours and CTS RATE'; end if;
    if (e->>'regular')::numeric > 0 then
      result := result || jsonb_build_array(jsonb_build_object('line_type','hours','product_service_name','Regular hours','worker_name',e->>'name','project_name',e->>'contractor','qty',(e->>'regular')::numeric,'rate',(e->>'rate')::numeric,'amount',round((e->>'regular')::numeric*(e->>'rate')::numeric,2)));
    end if;
    if (e->>'overtime')::numeric > 0 then
      rate := ((e->>'rate')::numeric-fee)*1.5+fee;
      result := result || jsonb_build_array(jsonb_build_object('line_type','hours','product_service_name','Overtime hours','worker_name',e->>'name','project_name',e->>'contractor','qty',(e->>'overtime')::numeric,'rate',rate,'amount',round((e->>'overtime')::numeric*rate,2)));
    end if;
    if (e->>'perDiemDays')::numeric > 0 and (e->>'perDiemRate')::numeric > 0 then
      result := result || jsonb_build_array(jsonb_build_object('line_type','hours','product_service_name','Per diem','worker_name',e->>'name','project_name',e->>'contractor','qty',(e->>'perDiemDays')::numeric,'rate',(e->>'perDiemRate')::numeric,'amount',round((e->>'perDiemDays')::numeric*(e->>'perDiemRate')::numeric,2)));
    end if;
  end loop;
  for a in select value from jsonb_array_elements(p->'adjustments') loop
    if nullif(trim(a->>'description'),'') is null or jsonb_typeof(a->'amount') is distinct from 'number' then raise exception 'Invalid additional charge'; end if;
    n := (a->>'amount')::numeric;
    if n < 0 or n > 1000000 then raise exception 'Invalid additional charge'; end if;
    if n > 0 then result := result || jsonb_build_array(jsonb_build_object('line_type','hours','product_service_name','Reimbursement / additional charge','worker_name','','project_name',a->>'description','qty',1,'rate',n,'amount',round(n,2))); end if;
  end loop;
  for a in select value from jsonb_array_elements(coalesce(p->'deductions','[]'::jsonb)) loop
    if nullif(trim(a->>'description'),'') is null or jsonb_typeof(a->'amount') is distinct from 'number' then raise exception 'Invalid deduction'; end if;
    n := (a->>'amount')::numeric;
    if n < 0 or n > 1000000 then raise exception 'Deduction must be a non-negative amount'; end if;
    if n > 0 then result := result || jsonb_build_array(jsonb_build_object('line_type','manual','product_service_name','Deduction / credit to CTS','worker_name','','project_name',a->>'description','qty',1,'rate',-n,'amount',-round(n,2))); end if;
  end loop;
  if jsonb_array_length(result) = 0 then raise exception 'No billable lines'; end if;
  return result;
end $$;


notify pgrst,'reload schema';

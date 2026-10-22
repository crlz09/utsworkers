-- Transactional integration check. No report or invoice survives this test.
begin;
select set_config('request.jwt.claim.sub', (select user_id::text from public.admin_permissions where can_edit_workers or can_delete_workers limit 1), true);
set local role authenticated;
do $$
declare p jsonb := '{"weekEnding":"2098-10-18","fee":5,"entries":[{"name":"CTS integration test","contractor":"TEST ONLY","regular":40,"overtime":10,"rate":30,"perDiemDays":0,"perDiemRate":0}],"adjustments":[{"description":"Reimbursement test","amount":500}],"sourceTotal":2125,"notes":""}'; r uuid; i uuid; again uuid; n integer;
begin
 if not public.can_manage_cts_jobs() then raise exception 'Test requires an existing admin'; end if;
 r := public.save_cts_weekly_report(null,null,p);
 if (select total from public.cts_weekly_reports where id=r) <> 2125 then raise exception 'Wrong report total'; end if;
 begin perform public.save_cts_weekly_report(null,null,p); raise exception 'Duplicate week accepted'; exception when unique_violation then null; end;
 begin perform public.save_cts_weekly_report(r,0,p); raise exception 'Stale revision accepted'; exception when raise_exception then if sqlerrm <> 'Report changed or is invoiced. Reload before editing.' then raise; end if; end;
 p := p || '{"deductions":[{"description":"Training owed to CTS","amount":300}]}'::jsonb;
 perform public.save_cts_weekly_report(r,1,p);
 if (select total from public.cts_weekly_reports where id=r) <> 1825 then raise exception 'Deduction did not reduce report total'; end if;
 i := public.invoice_cts_weekly_report(r,2,'{"invoice_number":"__CTS_WEEKLY_TEST__","client_name":"TEST ONLY","invoice_date":"2098-10-18","due_date":"","total":1}'::jsonb);
 if (select invoice_number from public.invoices where id=i) <> 'UTS-CTS-20981018' then raise exception 'Server accepted an editable invoice number'; end if;
 if (select due_date from public.invoices where id=i) <> '2098-10-25'::date then raise exception 'Default due date is not seven days later'; end if;
 if (select date_from from public.invoices where id=i) <> '2098-10-12'::date then raise exception 'Wrong week period'; end if;
 if not exists(select 1 from public.invoice_line_items where invoice_id=i and details='Week Period: 10/12/2098 - 10/18/2098') then raise exception 'Missing week period details'; end if;
 if (select total from public.invoices where id=i) <> 1825 then raise exception 'Client overrode invoice total'; end if;
 select count(*) into n from public.invoice_line_items where invoice_id=i;
 if n<>4 then raise exception 'Expected regular, OT, reimbursement and deduction lines'; end if;
 if not exists(select 1 from public.invoice_line_items where invoice_id=i and amount=-300 and rate=-300 and line_type='manual' and project_name='Training owed to CTS') then raise exception 'Missing negative deduction invoice line'; end if;
 again := public.invoice_cts_weekly_report(r,2,'{}');
 if again<>i then raise exception 'Duplicate invoice generated'; end if;
 begin perform public.save_cts_weekly_report(r,3,p); raise exception 'Edited invoiced report'; exception when raise_exception then if sqlerrm <> 'Report changed or is invoiced. Reload before editing.' then raise; end if; end;
 begin update public.cts_weekly_reports set payload=p where id=r; raise exception 'Direct update bypassed invoice lock'; exception when raise_exception then if sqlerrm <> 'Invoiced reports are locked' then raise; end if; end;
end $$;
rollback;
select 'CTS weekly report save, duplicate prevention, optimistic locking, invoice snapshot, deductions, deterministic numbers, seven-day due dates, week periods, totals, and invoice lock passed; all test data rolled back' as verification;

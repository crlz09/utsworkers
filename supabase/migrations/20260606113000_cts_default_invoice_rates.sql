-- Default invoice pricing for CTS client projects.
-- Hourly Fee remains handled in the invoice UI because hourly rates can be overridden per line.
-- Placement Fee is stored at the project level so future invoice generation can use it consistently.

update public.cts_jobs
set placement_fee_amount = 50
where lower(coalesce(client_name, 'cts')) = 'cts'
  and coalesce(placement_fee_amount, 0) = 0;

notify pgrst, 'reload schema';

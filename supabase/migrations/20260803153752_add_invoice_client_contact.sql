alter table public.invoices
add column if not exists client_contact_name text;

update public.invoices
set
  client_address = coalesce(nullif(trim(client_address), ''), '3924 Pendleton Way, Indianapolis, IN 46226'),
  client_contact_name = coalesce(nullif(trim(client_contact_name), ''), 'Jerry Rasberry'),
  client_phone = coalesce(nullif(trim(client_phone), ''), '(317) 377-1988')
where upper(trim(client_name)) = 'CTS';

notify pgrst, 'reload schema';

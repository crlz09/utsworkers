-- The shared secret is generated in Vault, never included in migration source.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'screening_sync_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(48), 'hex'), 'screening_sync_secret', 'Credential restricted to screening Gmail imports');
  end if;
end;
$$;

-- Reuse the endpoint already established for this deployment on subsequent runs.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'screening_sync_url') then
    perform vault.create_secret('https://jncbcgprquxsoqqyccqd.supabase.co/functions/v1/screening-workflow', 'screening_sync_url', 'UTS screening import endpoint');
  end if;
end;
$$;

select cron.schedule(
  'uts-screening-gmail-sync', '*/10 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'screening_sync_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'screening_sync_secret')
    ),
    body := '{"action":"sync"}'::jsonb,
    timeout_milliseconds := 120000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'screening_sync_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'screening_sync_secret');
  $job$
);

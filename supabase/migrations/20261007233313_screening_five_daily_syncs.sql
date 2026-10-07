-- Cron runs in GMT. Each job checks Indianapolis local time before calling Gmail.
-- The alternate UTC hour is a no-op, preserving local times across DST changes.
select cron.unschedule(jobid) from cron.job
where jobname = 'uts-screening-gmail-sync'
   or jobname like 'uts-screening-gmail-sync-%';

do $migration$
declare
  slot record;
begin
  for slot in select * from (values
    ('0800', '0 12,13 * * *', '08:00'),
    ('1150', '50 15,16 * * *', '11:50'),
    ('1400', '0 18,19 * * *', '14:00'),
    ('1600', '0 20,21 * * *', '16:00'),
    ('1800', '0 22,23 * * *', '18:00')
  ) as slots(suffix, schedule, local_time)
  loop
    perform cron.schedule('uts-screening-gmail-sync-' || slot.suffix, slot.schedule,
      format($job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'screening_sync_url'),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'screening_sync_secret')
          ),
          body := '{"action":"sync"}'::jsonb,
          timeout_milliseconds := 120000
        )
        where to_char(now() at time zone 'America/Indiana/Indianapolis', 'HH24:MI') = %L
          and exists (select 1 from vault.decrypted_secrets where name = 'screening_sync_url')
          and exists (select 1 from vault.decrypted_secrets where name = 'screening_sync_secret');
      $job$, slot.local_time)
    );
  end loop;
end;
$migration$;

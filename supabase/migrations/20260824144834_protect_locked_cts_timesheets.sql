drop trigger if exists trg_guard_locked_cts_hours on public.cts_hours_import_rows;
create trigger trg_guard_locked_cts_hours
before insert or update or delete on public.cts_hours_import_rows
for each row execute function public.guard_locked_hours_entries();

alter table public.worker_hours_links
alter column expires_at set default (now() + interval '14 days');

-- Existing links remain usable, but no unauthenticated bearer link should stay
-- active for months. Administrators can generate a fresh link when necessary.
update public.worker_hours_links
set expires_at = least(expires_at, now() + interval '30 days')
where revoked_at is null and expires_at > now() + interval '30 days';

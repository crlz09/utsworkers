update public.workers
set admin_reviewed_at = coalesce(created_at, now())
where admin_reviewed_at is null;

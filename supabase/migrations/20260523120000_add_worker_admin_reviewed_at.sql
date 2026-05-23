alter table public.workers
add column if not exists admin_reviewed_at timestamptz;

create index if not exists workers_admin_reviewed_at_idx
on public.workers (admin_reviewed_at);

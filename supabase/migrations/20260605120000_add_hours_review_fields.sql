alter table public.hours_entries
add column if not exists admin_reviewed_at timestamptz;

create index if not exists idx_hours_entries_admin_reviewed_at
on public.hours_entries (admin_reviewed_at);

-- Existing admin policy is intentionally limited to source = 'admin' writes.
-- This policy lets admins confirm/review client-submitted rows without changing RLS for client users.
drop policy if exists "Admins can review any hours entries" on public.hours_entries;
create policy "Admins can review any hours entries"
on public.hours_entries
for update
to authenticated
using (public.can_manage_cts_jobs())
with check (public.can_manage_cts_jobs());

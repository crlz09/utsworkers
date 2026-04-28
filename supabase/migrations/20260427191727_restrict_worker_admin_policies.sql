drop policy if exists "Authenticated full access workers" on public.workers;
drop policy if exists "allow all workers" on public.workers;
drop policy if exists "update workers status authenticated only" on public.workers;

drop policy if exists "Only permitted admins can update workers" on public.workers;
create policy "Only permitted admins can update workers"
on public.workers
for update
to authenticated
using (public.can_edit_workers())
with check (public.can_edit_workers());

drop policy if exists "Only permitted admins can delete workers" on public.workers;
create policy "Only permitted admins can delete workers"
on public.workers
for delete
to authenticated
using (public.can_delete_workers());

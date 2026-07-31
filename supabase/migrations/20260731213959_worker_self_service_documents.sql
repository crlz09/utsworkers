-- Candidate self-service access to documents linked to their worker profile.
-- Worker accounts are currently associated to profiles by their authenticated email,
-- matching the application access model in src/lib/userAccess.js.

create or replace function public.current_worker_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select w.id
  from public.workers w
  where lower(w.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by w.created_at desc
  limit 1;
$$;

revoke all on function public.current_worker_id() from public;
grant execute on function public.current_worker_id() to authenticated;

create or replace function public.can_manage_worker_documents()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_permissions ap
    where ap.user_id = auth.uid()
      and (ap.can_edit_workers or ap.can_delete_workers)
  );
$$;

revoke all on function public.can_manage_worker_documents() from public;
grant execute on function public.can_manage_worker_documents() to authenticated;

alter table public.worker_documents enable row level security;

drop policy if exists "Workers and admins can read worker documents" on public.worker_documents;
create policy "Workers and admins can read worker documents"
on public.worker_documents
for select
to authenticated
using (
  worker_id = public.current_worker_id()
  or public.can_manage_worker_documents()
);

drop policy if exists "Workers and admins can create worker documents" on public.worker_documents;
create policy "Workers and admins can create worker documents"
on public.worker_documents
for insert
to authenticated
with check (
  worker_id = public.current_worker_id()
  or public.can_manage_worker_documents()
);

drop policy if exists "Workers and admins can delete worker documents" on public.worker_documents;
create policy "Workers and admins can delete worker documents"
on public.worker_documents
for delete
to authenticated
using (
  worker_id = public.current_worker_id()
  or public.can_manage_worker_documents()
);

-- A restrictive policy also constrains any older broad authenticated policies.
drop policy if exists "Limit worker document rows to owner or admin" on public.worker_documents;
create policy "Limit worker document rows to owner or admin"
on public.worker_documents
as restrictive
for all
to authenticated
using (
  worker_id = public.current_worker_id()
  or public.can_manage_worker_documents()
)
with check (
  worker_id = public.current_worker_id()
  or public.can_manage_worker_documents()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-documents',
  'worker-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Workers and admins can read document files" on storage.objects;
create policy "Workers and admins can read document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'worker-documents'
  and (
    (storage.foldername(name))[1] = public.current_worker_id()::text
    or public.can_manage_worker_documents()
  )
);

drop policy if exists "Workers and admins can upload document files" on storage.objects;
create policy "Workers and admins can upload document files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'worker-documents'
  and (
    (storage.foldername(name))[1] = public.current_worker_id()::text
    or public.can_manage_worker_documents()
  )
);

drop policy if exists "Workers and admins can delete document files" on storage.objects;
create policy "Workers and admins can delete document files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'worker-documents'
  and (
    (storage.foldername(name))[1] = public.current_worker_id()::text
    or public.can_manage_worker_documents()
  )
);

drop policy if exists "Limit document files to owner or admin" on storage.objects;
create policy "Limit document files to owner or admin"
on storage.objects
as restrictive
for all
to authenticated
using (
  bucket_id <> 'worker-documents'
  or (storage.foldername(name))[1] = public.current_worker_id()::text
  or public.can_manage_worker_documents()
)
with check (
  bucket_id <> 'worker-documents'
  or (storage.foldername(name))[1] = public.current_worker_id()::text
  or public.can_manage_worker_documents()
);

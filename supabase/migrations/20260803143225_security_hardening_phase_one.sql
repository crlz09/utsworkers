-- Phase 1: close legacy Data API access while preserving the current portal,
-- admin, client, and public-profile flows.

-- geocode_cache is server-side infrastructure and must never be exposed through
-- the Data API.
alter table public.geocode_cache enable row level security;
revoke all on table public.geocode_cache from public, anon, authenticated;
grant all on table public.geocode_cache to service_role;

-- Public registration now goes through the register-worker-public Edge Function.
-- Public profiles are returned by get_public_worker_profile(), so direct table
-- reads would unnecessarily expose every column in workers and its child tables.
drop policy if exists "Public insert workers" on public.workers;
drop policy if exists "Public read worker profile" on public.workers;
revoke all on table public.workers from anon;

drop policy if exists "Public insert worker_languages" on public.worker_languages;
drop policy if exists "insert worker languages" on public.worker_languages;
drop policy if exists "read worker languages" on public.worker_languages;
drop policy if exists "Public insert worker_projects" on public.worker_projects;
drop policy if exists "insert worker projects" on public.worker_projects;
drop policy if exists "read worker projects" on public.worker_projects;
drop policy if exists "Public insert worker_skills" on public.worker_skills;
drop policy if exists "insert worker skills" on public.worker_skills;
drop policy if exists "read worker skills" on public.worker_skills;
drop policy if exists "Authenticated full access skills" on public.worker_skills;
drop policy if exists "Public insert worker_certifications" on public.worker_certifications;
drop policy if exists "insert worker certifications" on public.worker_certifications;
drop policy if exists "read worker certifications" on public.worker_certifications;

revoke all on table public.worker_languages from anon;
revoke all on table public.worker_projects from anon;
revoke all on table public.worker_skills from anon;
revoke all on table public.worker_certifications from anon;

-- Authenticated candidates see only their own rows. Admins see all candidates;
-- CTS clients see child rows only for candidates assigned to their CTS jobs.
create policy "Worker languages readable by authorized users"
on public.worker_languages for select to authenticated
using (
  worker_id = (select public.current_worker_id())
  or (select public.can_manage_cts_jobs())
  or (
    (select public.can_view_client_cts_jobs())
    and exists (
      select 1 from public.cts_job_candidates cjc
      where cjc.worker_id = worker_languages.worker_id
    )
  )
);

create policy "Worker projects readable by authorized users"
on public.worker_projects for select to authenticated
using (
  worker_id = (select public.current_worker_id())
  or (select public.can_manage_cts_jobs())
  or (
    (select public.can_view_client_cts_jobs())
    and exists (
      select 1 from public.cts_job_candidates cjc
      where cjc.worker_id = worker_projects.worker_id
    )
  )
);

create policy "Worker skills readable by authorized users"
on public.worker_skills for select to authenticated
using (
  worker_id = (select public.current_worker_id())
  or (select public.can_manage_cts_jobs())
  or (
    (select public.can_view_client_cts_jobs())
    and exists (
      select 1 from public.cts_job_candidates cjc
      where cjc.worker_id = worker_skills.worker_id
    )
  )
);

create policy "Worker certifications readable by authorized users"
on public.worker_certifications for select to authenticated
using (
  worker_id = (select public.current_worker_id())
  or (select public.can_manage_cts_jobs())
  or (
    (select public.can_view_client_cts_jobs())
    and exists (
      select 1 from public.cts_job_candidates cjc
      where cjc.worker_id = worker_certifications.worker_id
    )
  )
);

-- Portal updates use narrow SECURITY DEFINER RPCs. Direct child-table mutation is
-- unnecessary and made it possible for any signed-in account to alter any worker.
revoke insert, update, delete, truncate, references, trigger
  on table public.worker_languages from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.worker_projects from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.worker_skills from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.worker_certifications from authenticated;
grant select on table public.worker_languages to authenticated;
grant select on table public.worker_projects to authenticated;
grant select on table public.worker_skills to authenticated;
grant select on table public.worker_certifications to authenticated;

-- Remove old policies that bypass the Admin/Client authorization helpers.
drop policy if exists "Authenticated users can delete cts_jobs" on public.cts_jobs;
drop policy if exists "Authenticated users can insert cts_jobs" on public.cts_jobs;
drop policy if exists "Authenticated users can read cts_jobs" on public.cts_jobs;
drop policy if exists "Authenticated users can update cts_jobs" on public.cts_jobs;
drop policy if exists "Authenticated users can delete cts_job_candidates" on public.cts_job_candidates;
drop policy if exists "Authenticated users can insert cts_job_candidates" on public.cts_job_candidates;
drop policy if exists "Authenticated users can read cts_job_candidates" on public.cts_job_candidates;
drop policy if exists "Authenticated users can update cts_job_candidates" on public.cts_job_candidates;

drop policy if exists "Authenticated users can manage recruiters" on public.recruiters;
drop policy if exists "Authenticated users can read recruiters" on public.recruiters;
create policy "Recruiters manageable by admins"
on public.recruiters for all to authenticated
using ((select public.can_manage_cts_jobs()))
with check ((select public.can_manage_cts_jobs()));

-- The retired interview/assessment mini-app had fully public CRUD policies.
-- Keep the data for audit/history, but remove it from the Data API roles.
drop policy if exists "allow all authenticated on candidate_answers" on public.candidate_answers;
drop policy if exists "allow anon insert candidate_answers" on public.candidate_answers;
drop policy if exists "allow all authenticated on candidates_assessment" on public.candidates_assessment;
drop policy if exists "allow anon insert candidates_assessment" on public.candidates_assessment;
drop policy if exists "public delete candidate_interviews" on public.candidate_interviews;
drop policy if exists "public insert candidate_interviews" on public.candidate_interviews;
drop policy if exists "public read candidate_interviews" on public.candidate_interviews;
drop policy if exists "public update candidate_interviews" on public.candidate_interviews;
drop policy if exists "public delete candidate_interview_answers" on public.candidate_interview_answers;
drop policy if exists "public insert candidate_interview_answers" on public.candidate_interview_answers;
drop policy if exists "public read candidate_interview_answers" on public.candidate_interview_answers;
drop policy if exists "public update candidate_interview_answers" on public.candidate_interview_answers;

revoke all on table public.candidate_answers from public, anon, authenticated;
revoke all on table public.candidates_assessment from public, anon, authenticated;
revoke all on table public.candidate_interviews from public, anon, authenticated;
revoke all on table public.candidate_interview_answers from public, anon, authenticated;

-- Remove redundant document policies. The owner/admin policies and the
-- restrictive backstop remain in place.
drop policy if exists "delete worker documents authenticated only" on public.worker_documents;
drop policy if exists "insert worker documents authenticated only" on public.worker_documents;
drop policy if exists "read worker documents authenticated only" on public.worker_documents;

-- Harden authorization helpers against search-path injection and anonymous use.
create or replace function public.can_delete_workers()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_permissions ap
    where ap.user_id = (select auth.uid()) and ap.can_delete_workers = true
  );
$$;

create or replace function public.can_edit_workers()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_permissions ap
    where ap.user_id = (select auth.uid()) and ap.can_edit_workers = true
  );
$$;

create or replace function public.can_manage_cts_jobs()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_permissions ap
    where ap.user_id = (select auth.uid())
      and (ap.can_edit_workers = true or ap.can_delete_workers = true)
  );
$$;

create or replace function public.can_manage_worker_documents()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_permissions ap
    where ap.user_id = (select auth.uid())
      and (ap.can_edit_workers or ap.can_delete_workers)
  );
$$;

create or replace function public.can_view_client_cts_jobs()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.client_users cu
    where cu.user_id = (select auth.uid())
      and cu.is_active = true and cu.can_view_cts_jobs = true
  );
$$;

revoke all on function public.can_delete_workers() from public, anon;
revoke all on function public.can_edit_workers() from public, anon;
revoke all on function public.can_manage_cts_jobs() from public, anon;
revoke all on function public.can_manage_worker_documents() from public, anon;
revoke all on function public.can_view_client_cts_jobs() from public, anon;
grant execute on function public.can_delete_workers() to authenticated, service_role;
grant execute on function public.can_edit_workers() to authenticated, service_role;
grant execute on function public.can_manage_cts_jobs() to authenticated, service_role;
grant execute on function public.can_manage_worker_documents() to authenticated, service_role;
grant execute on function public.can_view_client_cts_jobs() to authenticated, service_role;

notify pgrst, 'reload schema';

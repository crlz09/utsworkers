-- Runs as an existing authorized admin against representative assignments.
-- All mutations, including triggers and audit entries, are rolled back.
begin;
select set_config('request.jwt.claim.sub', (select user_id::text from public.admin_permissions where can_edit_workers limit 1), true);
set local role authenticated;
do $$
declare
  v_assignment public.cts_job_candidates%rowtype;
  v_profile jsonb;
  v_result jsonb;
  v_others jsonb;
  v_after jsonb;
  v_rate text;
  v_new_job uuid;
begin
  select c.* into strict v_assignment from public.cts_job_candidates c
    join public.workers w on w.id = c.worker_id
    where w.trade_id is not null and w.location_id is not null
    order by c.created_at limit 1;
  select jsonb_agg(jsonb_build_array(id, rate_snapshot) order by id) into v_others
    from public.cts_job_candidates where worker_id = v_assignment.worker_id and id <> v_assignment.id;

  update public.cts_job_candidates set rate_snapshot = 32 where id = v_assignment.id;
  select rate into v_rate from public.workers where id = v_assignment.worker_id;
  if v_rate::numeric <> 32 then raise exception 'Assignment rate did not sync to profile'; end if;
  v_profile := public.get_admin_worker_portal_profile(v_assignment.worker_id);
  if (v_profile->>'rate')::numeric <> 32 then raise exception 'Profile RPC did not return rate'; end if;

  -- Saving the complete candidate profile changes the default only.
  v_result := public.update_admin_worker_portal_profile_with_rate(
    p_worker_id => v_assignment.worker_id,
    p_name => v_profile->>'name', p_phone => v_profile->>'phone',
    p_address => v_profile->>'address', p_zip_code => v_profile->>'zip_code',
    p_city => v_profile->>'city', p_state => v_profile->>'state',
    p_trade_id => (v_profile->>'trade_id')::uuid, p_location_id => (v_profile->>'location_id')::uuid,
    p_total_experience_years => (v_profile->>'total_experience_years')::numeric,
    p_commercial_experience_years => (v_profile->>'commercial_experience_years')::numeric,
    p_industrial_experience_years => (v_profile->>'industrial_experience_years')::numeric,
    p_residential_experience_years => (v_profile->>'residential_experience_years')::numeric,
    p_strengths => v_profile->>'strengths', p_needs_improvement => v_profile->>'needs_improvement',
    p_available_from => (v_profile->>'available_from')::date,
    p_willing_to_travel => (v_profile->>'willing_to_travel')::boolean,
    p_languages => v_profile->'languages',
    p_skill_ids => array(select (e->>'id')::uuid from jsonb_array_elements(v_profile->'skills') e),
    p_certification_ids => array(select (e->>'id')::uuid from jsonb_array_elements(v_profile->'certifications') e),
    p_projects => v_profile->'projects', p_date_of_birth => (v_profile->>'date_of_birth')::date,
    p_rate => 35
  );
  if (v_result->>'rate')::numeric <> 35 then raise exception 'Profile rate save failed'; end if;
  if (select rate_snapshot from public.cts_job_candidates where id = v_assignment.id) <> 32 then
    raise exception 'Profile save rewrote existing assignment';
  end if;
  update public.cts_job_candidates set rate_snapshot = 36 where id = v_assignment.id;
  if (public.get_admin_worker_portal_profile(v_assignment.worker_id)->>'rate')::numeric <> 36 then
    raise exception 'Assignment edit did not update profile';
  end if;
  select jsonb_agg(jsonb_build_array(id, rate_snapshot) order by id) into v_after
    from public.cts_job_candidates where worker_id = v_assignment.worker_id and id <> v_assignment.id;
  if v_after is distinct from v_others then raise exception 'Another project rate changed'; end if;
  select j.id into strict v_new_job from public.cts_jobs j
    where not exists (select 1 from public.cts_job_candidates c where c.cts_job_id = j.id and c.worker_id = v_assignment.worker_id)
    limit 1;
  insert into public.cts_job_candidates(cts_job_id, worker_id, name_snapshot, rate_snapshot, payment_type, candidate_status)
    values (v_new_job, v_assignment.worker_id, v_assignment.name_snapshot, 37, 'W2', 'sourced');
  if (public.get_admin_worker_portal_profile(v_assignment.worker_id)->>'rate')::numeric <> 37 then
    raise exception 'New assignment override did not sync to profile';
  end if;
  if (select rate_snapshot from public.cts_job_candidates where id = v_assignment.id) <> 36 then
    raise exception 'New assignment rewrote another project';
  end if;
end;
$$;
rollback;
select 'Profile rate save, assignment sync and project isolation passed (rolled back)' as result;

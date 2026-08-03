-- Let administrators with worker-edit permission manage a candidate through the
-- same portal UI without impersonating the candidate or exposing service keys.

create or replace function public.get_admin_worker_portal_profile(p_worker_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile jsonb;
begin
  if (select auth.uid()) is null or not public.can_edit_workers() then
    raise exception 'Worker edit permission required.';
  end if;

  select jsonb_build_object(
    'id', w.id, 'name', w.name, 'phone', w.phone, 'email', w.email,
    'address', w.address, 'zip_code', w.zip_code, 'city', w.city, 'state', w.state,
    'trade_id', w.trade_id, 'trade_name', t.name,
    'location_id', w.location_id, 'location_name', l.name,
    'total_experience_years', w.total_experience_years,
    'commercial_experience_years', w.commercial_experience_years,
    'industrial_experience_years', w.industrial_experience_years,
    'residential_experience_years', w.residential_experience_years,
    'strengths', w.strengths, 'needs_improvement', w.needs_improvement,
    'available_from', w.available_from, 'willing_to_travel', w.willing_to_travel,
    'status', w.status, 'availability', w.availability,
    'public_profile_slug', w.public_profile_slug,
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.name)
      from public.worker_skills ws join public.skills s on s.id = ws.skill_id
      where ws.worker_id = w.id
    ), '[]'::jsonb),
    'certifications', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
      from public.worker_certifications wc
      join public.certifications c on c.id = wc.certification_id
      where wc.worker_id = w.id
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', wl.language_name,
        'proficiency_percent', wl.proficiency_percent
      ) order by wl.language_name)
      from public.worker_languages wl where wl.worker_id = w.id
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', wp.id, 'project_name', wp.project_name,
        'project_location', wp.project_location, 'duration', wp.duration,
        'description', wp.description, 'sort_order', wp.sort_order
      ) order by wp.sort_order, wp.created_at)
      from public.worker_projects wp where wp.worker_id = w.id
    ), '[]'::jsonb)
  ) into v_profile
  from public.workers w
  left join public.trades t on t.id = w.trade_id
  left join public.locations l on l.id = w.location_id
  where w.id = p_worker_id;

  if v_profile is null then
    raise exception 'Candidate profile not found.';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.get_admin_worker_portal_profile(uuid) from public, anon;
grant execute on function public.get_admin_worker_portal_profile(uuid) to authenticated;

create or replace function public.update_admin_worker_portal_profile(
  p_worker_id uuid,
  p_name text, p_phone text, p_address text, p_zip_code text, p_city text, p_state text,
  p_trade_id uuid, p_location_id uuid,
  p_total_experience_years numeric, p_commercial_experience_years numeric,
  p_industrial_experience_years numeric, p_residential_experience_years numeric,
  p_strengths text, p_needs_improvement text, p_available_from date,
  p_willing_to_travel boolean, p_languages jsonb, p_skill_ids uuid[],
  p_certification_ids uuid[], p_projects jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.can_edit_workers() then
    raise exception 'Worker edit permission required.';
  end if;

  if not exists (select 1 from public.workers where id = p_worker_id) then
    raise exception 'Candidate profile not found.';
  end if;

  update public.workers
  set name = nullif(left(trim(p_name), 160), ''),
      phone = nullif(left(trim(p_phone), 40), ''),
      address = nullif(left(trim(p_address), 240), ''),
      zip_code = nullif(left(trim(p_zip_code), 10), ''),
      city = nullif(left(trim(p_city), 100), ''),
      state = nullif(left(trim(p_state), 100), ''),
      trade_id = p_trade_id,
      location_id = p_location_id,
      total_experience_years = greatest(coalesce(p_total_experience_years, 0), 0),
      commercial_experience_years = greatest(coalesce(p_commercial_experience_years, 0), 0),
      industrial_experience_years = greatest(coalesce(p_industrial_experience_years, 0), 0),
      residential_experience_years = greatest(coalesce(p_residential_experience_years, 0), 0),
      strengths = nullif(left(trim(p_strengths), 2000), ''),
      needs_improvement = nullif(left(trim(p_needs_improvement), 2000), ''),
      available_from = p_available_from,
      willing_to_travel = coalesce(p_willing_to_travel, false)
  where id = p_worker_id;

  delete from public.worker_languages where worker_id = p_worker_id;
  insert into public.worker_languages (worker_id, language_name, proficiency_percent)
  select p_worker_id, left(trim(item->>'name'), 80),
         case when nullif(item->>'proficiency_percent', '') is null then null
              else least(greatest((item->>'proficiency_percent')::integer, 1), 100) end
  from (
    select distinct on (lower(trim(value->>'name'))) value as item
    from jsonb_array_elements(coalesce(p_languages, '[]'::jsonb)) value
    where nullif(trim(value->>'name'), '') is not null
    order by lower(trim(value->>'name')) limit 20
  ) languages;

  delete from public.worker_skills where worker_id = p_worker_id;
  insert into public.worker_skills (worker_id, skill_id)
  select p_worker_id, s.id from public.skills s
  where s.id = any(coalesce(p_skill_ids, array[]::uuid[]));

  delete from public.worker_certifications where worker_id = p_worker_id;
  insert into public.worker_certifications (worker_id, certification_id)
  select p_worker_id, c.id from public.certifications c
  where c.id = any(coalesce(p_certification_ids, array[]::uuid[]));

  delete from public.worker_projects where worker_id = p_worker_id;
  insert into public.worker_projects (
    worker_id, project_name, project_location, duration, description, sort_order
  )
  select p_worker_id,
         nullif(left(trim(project.value->>'project_name'), 160), ''),
         nullif(left(trim(project.value->>'project_location'), 160), ''),
         nullif(left(trim(project.value->>'duration'), 80), ''),
         nullif(left(trim(project.value->>'description'), 2000), ''),
         (project.ordinality - 1)::integer
  from jsonb_array_elements(coalesce(p_projects, '[]'::jsonb))
       with ordinality as project(value, ordinality)
  where project.ordinality <= 20
    and (nullif(trim(project.value->>'project_name'), '') is not null
      or nullif(trim(project.value->>'project_location'), '') is not null
      or nullif(trim(project.value->>'duration'), '') is not null
      or nullif(trim(project.value->>'description'), '') is not null);

  return public.get_admin_worker_portal_profile(p_worker_id);
end;
$$;

revoke all on function public.update_admin_worker_portal_profile(
  uuid, text, text, text, text, text, text, uuid, uuid, numeric, numeric, numeric,
  numeric, text, text, date, boolean, jsonb, uuid[], uuid[], jsonb
) from public, anon;
grant execute on function public.update_admin_worker_portal_profile(
  uuid, text, text, text, text, text, text, uuid, uuid, numeric, numeric, numeric,
  numeric, text, text, date, boolean, jsonb, uuid[], uuid[], jsonb
) to authenticated;

notify pgrst, 'reload schema';

create or replace function public.get_current_worker_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'phone', w.phone,
    'email', w.email,
    'address', w.address,
    'zip_code', w.zip_code,
    'city', w.city,
    'state', w.state,
    'trade_id', w.trade_id,
    'trade_name', t.name,
    'location_id', w.location_id,
    'location_name', l.name,
    'total_experience_years', w.total_experience_years,
    'commercial_experience_years', w.commercial_experience_years,
    'industrial_experience_years', w.industrial_experience_years,
    'residential_experience_years', w.residential_experience_years,
    'strengths', w.strengths,
    'needs_improvement', w.needs_improvement,
    'available_from', w.available_from,
    'willing_to_travel', w.willing_to_travel,
    'status', w.status,
    'availability', w.availability,
    'public_profile_slug', w.public_profile_slug,
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.name)
      from public.worker_skills ws
      join public.skills s on s.id = ws.skill_id
      where ws.worker_id = w.id
    ), '[]'::jsonb),
    'certifications', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
      from public.worker_certifications wc
      join public.certifications c on c.id = wc.certification_id
      where wc.worker_id = w.id
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(
        jsonb_build_object('name', wl.language_name, 'proficiency_percent', wl.proficiency_percent)
        order by wl.language_name
      )
      from public.worker_languages wl
      where wl.worker_id = w.id
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', wp.id,
          'project_name', wp.project_name,
          'project_location', wp.project_location,
          'duration', wp.duration,
          'description', wp.description,
          'sort_order', wp.sort_order
        ) order by wp.sort_order, wp.created_at
      )
      from public.worker_projects wp
      where wp.worker_id = w.id
    ), '[]'::jsonb)
  )
  from public.workers w
  left join public.trades t on t.id = w.trade_id
  left join public.locations l on l.id = w.location_id
  where w.id = (select public.current_worker_id());
$$;

revoke all on function public.get_current_worker_profile() from public, anon;
grant execute on function public.get_current_worker_profile() to authenticated;

create or replace function public.update_current_worker_portal_profile(
  p_name text,
  p_phone text,
  p_address text,
  p_zip_code text,
  p_city text,
  p_state text,
  p_trade_id uuid,
  p_location_id uuid,
  p_total_experience_years numeric,
  p_commercial_experience_years numeric,
  p_industrial_experience_years numeric,
  p_residential_experience_years numeric,
  p_strengths text,
  p_needs_improvement text,
  p_available_from date,
  p_willing_to_travel boolean,
  p_languages jsonb,
  p_skill_ids uuid[],
  p_certification_ids uuid[],
  p_projects jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_id uuid := public.current_worker_id();
begin
  if (select auth.uid()) is null or v_worker_id is null then
    raise exception 'Candidate profile access required.';
  end if;

  perform public.update_current_worker_profile(
    p_name, p_phone, p_address, p_zip_code, p_city, p_state,
    p_trade_id, p_location_id, p_total_experience_years,
    p_commercial_experience_years, p_industrial_experience_years,
    p_residential_experience_years, p_strengths, p_needs_improvement,
    p_available_from, p_willing_to_travel
  );

  delete from public.worker_languages where worker_id = v_worker_id;
  insert into public.worker_languages (worker_id, language_name, proficiency_percent)
  select v_worker_id,
         left(trim(item->>'name'), 80),
         case
           when nullif(item->>'proficiency_percent', '') is null then null
           else least(greatest((item->>'proficiency_percent')::integer, 1), 100)
         end
  from (
    select distinct on (lower(trim(value->>'name'))) value as item
    from jsonb_array_elements(coalesce(p_languages, '[]'::jsonb)) value
    where nullif(trim(value->>'name'), '') is not null
    order by lower(trim(value->>'name'))
    limit 20
  ) languages;

  delete from public.worker_skills where worker_id = v_worker_id;
  insert into public.worker_skills (worker_id, skill_id)
  select v_worker_id, s.id
  from public.skills s
  where s.id = any(coalesce(p_skill_ids, array[]::uuid[]));

  delete from public.worker_certifications where worker_id = v_worker_id;
  insert into public.worker_certifications (worker_id, certification_id)
  select v_worker_id, c.id
  from public.certifications c
  where c.id = any(coalesce(p_certification_ids, array[]::uuid[]));

  delete from public.worker_projects where worker_id = v_worker_id;
  insert into public.worker_projects (
    worker_id, project_name, project_location, duration, description, sort_order
  )
  select v_worker_id,
         nullif(left(trim(project.value->>'project_name'), 160), ''),
         nullif(left(trim(project.value->>'project_location'), 160), ''),
         nullif(left(trim(project.value->>'duration'), 80), ''),
         nullif(left(trim(project.value->>'description'), 2000), ''),
         (project.ordinality - 1)::integer
  from jsonb_array_elements(coalesce(p_projects, '[]'::jsonb))
       with ordinality as project(value, ordinality)
  where project.ordinality <= 20
    and (
      nullif(trim(project.value->>'project_name'), '') is not null
      or nullif(trim(project.value->>'project_location'), '') is not null
      or nullif(trim(project.value->>'duration'), '') is not null
      or nullif(trim(project.value->>'description'), '') is not null
    );

  return public.get_current_worker_profile();
end;
$$;

revoke all on function public.update_current_worker_portal_profile(
  text, text, text, text, text, text, uuid, uuid, numeric, numeric, numeric,
  numeric, text, text, date, boolean, jsonb, uuid[], uuid[], jsonb
) from public, anon;
grant execute on function public.update_current_worker_portal_profile(
  text, text, text, text, text, text, uuid, uuid, numeric, numeric, numeric,
  numeric, text, text, date, boolean, jsonb, uuid[], uuid[], jsonb
) to authenticated;

notify pgrst, 'reload schema';

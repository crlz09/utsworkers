alter table public.workers
add column if not exists address text;

create or replace function public.register_worker_public(
  p_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_location_id uuid,
  p_trade_id uuid,
  p_total_experience_years numeric,
  p_commercial_experience_years numeric,
  p_industrial_experience_years numeric,
  p_residential_experience_years numeric,
  p_strengths text,
  p_needs_improvement text,
  p_available_from date,
  p_willing_to_travel boolean,
  p_languages text[],
  p_skill_ids uuid[],
  p_certification_ids uuid[],
  p_projects jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
  v_project jsonb;
  v_language text;
  v_skill_id uuid;
  v_certification_id uuid;
begin
  insert into public.workers (
    name,
    phone,
    email,
    address,
    location_id,
    trade_id,
    total_experience_years,
    commercial_experience_years,
    industrial_experience_years,
    residential_experience_years,
    strengths,
    needs_improvement,
    status,
    availability,
    available_from,
    willing_to_travel,
    is_public,
    recruiter_notes
  )
  values (
    p_name,
    p_phone,
    p_email,
    p_address,
    p_location_id,
    p_trade_id,
    coalesce(p_total_experience_years, 0),
    coalesce(p_commercial_experience_years, 0),
    coalesce(p_industrial_experience_years, 0),
    coalesce(p_residential_experience_years, 0),
    p_strengths,
    p_needs_improvement,
    'pending',
    'available_soon',
    p_available_from,
    coalesce(p_willing_to_travel, true),
    false,
    null
  )
  returning id into v_worker_id;

  if p_languages is not null then
    foreach v_language in array p_languages loop
      if v_language is not null and btrim(v_language) <> '' then
        insert into public.worker_languages (worker_id, language_name)
        values (v_worker_id, btrim(v_language));
      end if;
    end loop;
  end if;

  if p_skill_ids is not null then
    foreach v_skill_id in array p_skill_ids loop
      if v_skill_id is not null then
        insert into public.worker_skills (worker_id, skill_id)
        values (v_worker_id, v_skill_id);
      end if;
    end loop;
  end if;

  if p_certification_ids is not null then
    foreach v_certification_id in array p_certification_ids loop
      if v_certification_id is not null then
        insert into public.worker_certifications (worker_id, certification_id)
        values (v_worker_id, v_certification_id);
      end if;
    end loop;
  end if;

  if p_projects is not null then
    for v_project in select * from jsonb_array_elements(p_projects)
    loop
      insert into public.worker_projects (
        worker_id,
        project_name,
        project_location,
        duration,
        description,
        sort_order
      )
      values (
        v_worker_id,
        nullif(v_project->>'project_name', ''),
        nullif(v_project->>'project_location', ''),
        nullif(v_project->>'duration', ''),
        nullif(v_project->>'description', ''),
        coalesce((v_project->>'sort_order')::integer, 0)
      );
    end loop;
  end if;

  return v_worker_id;
end;
$$;

revoke all on function public.register_worker_public(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  date,
  boolean,
  text[],
  uuid[],
  uuid[],
  jsonb
) from public;

grant execute on function public.register_worker_public(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  date,
  boolean,
  text[],
  uuid[],
  uuid[],
  jsonb
) to anon, authenticated, service_role;

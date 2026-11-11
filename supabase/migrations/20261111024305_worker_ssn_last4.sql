-- Keep the SSN suffix as text so leading zeros survive round trips.
alter table public.workers
  add column ssn_last4 text
  constraint workers_ssn_last4_check check (ssn_last4 is null or ssn_last4 ~ '^[0-9]{4}$');

comment on column public.workers.ssn_last4 is 'Last four SSN digits for candidate profiles and CTS applications.';

CREATE OR REPLACE FUNCTION public.get_current_worker_profile()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', w.id, 'name', w.name, 'phone', w.phone, 'email', w.email,
    'date_of_birth', w.date_of_birth, 'rate', w.rate, 'ssn_last4', w.ssn_last4,
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
    'skills', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.name) from public.worker_skills ws join public.skills s on s.id = ws.skill_id where ws.worker_id = w.id), '[]'::jsonb),
    'certifications', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name) from public.worker_certifications wc join public.certifications c on c.id = wc.certification_id where wc.worker_id = w.id), '[]'::jsonb),
    'languages', coalesce((select jsonb_agg(jsonb_build_object('name', wl.language_name, 'proficiency_percent', wl.proficiency_percent) order by wl.language_name) from public.worker_languages wl where wl.worker_id = w.id), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id', wp.id, 'project_name', wp.project_name, 'project_location', wp.project_location, 'duration', wp.duration, 'description', wp.description, 'sort_order', wp.sort_order) order by wp.sort_order, wp.created_at) from public.worker_projects wp where wp.worker_id = w.id), '[]'::jsonb)
  )
  from public.workers w
  left join public.trades t on t.id = w.trade_id
  left join public.locations l on l.id = w.location_id
  where w.id = (select public.current_worker_id());
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_worker_portal_profile(p_worker_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_profile jsonb;
begin
  if (select auth.uid()) is null or not public.can_edit_workers() then
    raise exception 'Worker edit permission required.';
  end if;
  select jsonb_build_object(
    'id', w.id, 'name', w.name, 'phone', w.phone, 'email', w.email,
    'date_of_birth', w.date_of_birth, 'rate', w.rate, 'ssn_last4', w.ssn_last4,
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
    'skills', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.name) from public.worker_skills ws join public.skills s on s.id = ws.skill_id where ws.worker_id = w.id), '[]'::jsonb),
    'certifications', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name) from public.worker_certifications wc join public.certifications c on c.id = wc.certification_id where wc.worker_id = w.id), '[]'::jsonb),
    'languages', coalesce((select jsonb_agg(jsonb_build_object('name', wl.language_name, 'proficiency_percent', wl.proficiency_percent) order by wl.language_name) from public.worker_languages wl where wl.worker_id = w.id), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id', wp.id, 'project_name', wp.project_name, 'project_location', wp.project_location, 'duration', wp.duration, 'description', wp.description, 'sort_order', wp.sort_order) order by wp.sort_order, wp.created_at) from public.worker_projects wp where wp.worker_id = w.id), '[]'::jsonb)
  ) into v_profile
  from public.workers w
  left join public.trades t on t.id = w.trade_id
  left join public.locations l on l.id = w.location_id
  where w.id = p_worker_id;
  if v_profile is null then raise exception 'Candidate profile not found.'; end if;
  return v_profile;
end;
$function$;


-- Registration is atomic, including identity fields, and restricted to the Edge Function.
create function public.register_worker_public_with_identity(
  p_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_zip_code text,
  p_city text,
  p_state text,
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
  p_projects jsonb,
  p_language_proficiencies jsonb default '{}'::jsonb,
  p_date_of_birth date default null,
  p_ssn_last4 text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_worker_id uuid;
  v_ssn_last4 text := nullif(btrim(p_ssn_last4), '');
begin
  if p_date_of_birth is null or p_date_of_birth > current_date then
    raise exception 'A valid date of birth is required.';
  end if;
  if v_ssn_last4 is not null and v_ssn_last4 !~ '^[0-9]{4}$' then
    raise exception 'SSN suffix must contain exactly four digits.';
  end if;
  v_worker_id := public.register_worker_public(
    p_name, p_phone, p_email, p_address, p_zip_code, p_city, p_state, p_location_id, p_trade_id, p_total_experience_years, p_commercial_experience_years, p_industrial_experience_years, p_residential_experience_years, p_strengths, p_needs_improvement, p_available_from, p_willing_to_travel, p_languages, p_skill_ids, p_certification_ids, p_projects, p_language_proficiencies
  );
  update public.workers set date_of_birth = p_date_of_birth, ssn_last4 = v_ssn_last4 where id = v_worker_id;
  return v_worker_id;
end;
$$;
revoke all on function public.register_worker_public_with_identity(text,text,text,text,text,text,text,uuid,uuid,numeric,numeric,numeric,numeric,text,text,date,boolean,text[],uuid[],uuid[],jsonb,jsonb,date,text) from public, anon, authenticated;
grant execute on function public.register_worker_public_with_identity(text,text,text,text,text,text,text,uuid,uuid,numeric,numeric,numeric,numeric,text,text,date,boolean,text[],uuid[],uuid[],jsonb,jsonb,date,text) to service_role;

create function public.update_current_worker_portal_profile_with_identity(
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
  p_projects jsonb,
  p_date_of_birth date,
  p_ssn_last4 text,
  p_rate numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_id uuid := public.current_worker_id();
  v_ssn_last4 text := nullif(btrim(p_ssn_last4), '');
begin
  if (select auth.uid()) is null or v_worker_id is null then raise exception 'Candidate profile access required.'; end if;
  if v_ssn_last4 is not null and v_ssn_last4 !~ '^[0-9]{4}$' then
    raise exception 'SSN suffix must contain exactly four digits.';
  end if;
  perform public.update_current_worker_portal_profile_with_rate(
    p_name, p_phone, p_address, p_zip_code, p_city, p_state, p_trade_id, p_location_id, p_total_experience_years, p_commercial_experience_years, p_industrial_experience_years, p_residential_experience_years, p_strengths, p_needs_improvement, p_available_from, p_willing_to_travel, p_languages, p_skill_ids, p_certification_ids, p_projects, p_date_of_birth, p_rate
  );
  update public.workers set ssn_last4 = v_ssn_last4 where id = v_worker_id;
  return public.get_current_worker_profile();
end;
$$;
revoke all on function public.update_current_worker_portal_profile_with_identity(text,text,text,text,text,text,uuid,uuid,numeric,numeric,numeric,numeric,text,text,date,boolean,jsonb,uuid[],uuid[],jsonb,date,text,numeric) from public, anon;
grant execute on function public.update_current_worker_portal_profile_with_identity(text,text,text,text,text,text,uuid,uuid,numeric,numeric,numeric,numeric,text,text,date,boolean,jsonb,uuid[],uuid[],jsonb,date,text,numeric) to authenticated;

create function public.update_admin_worker_portal_profile_with_identity(
  p_worker_id uuid,
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
  p_projects jsonb,
  p_date_of_birth date,
  p_ssn_last4 text,
  p_rate numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ssn_last4 text := nullif(btrim(p_ssn_last4), '');
begin
  if (select auth.uid()) is null or not public.can_edit_workers() then raise exception 'Worker edit permission required.'; end if;
  if v_ssn_last4 is not null and v_ssn_last4 !~ '^[0-9]{4}$' then
    raise exception 'SSN suffix must contain exactly four digits.';
  end if;
  perform public.update_admin_worker_portal_profile_with_rate(
    p_worker_id, p_name, p_phone, p_address, p_zip_code, p_city, p_state, p_trade_id, p_location_id, p_total_experience_years, p_commercial_experience_years, p_industrial_experience_years, p_residential_experience_years, p_strengths, p_needs_improvement, p_available_from, p_willing_to_travel, p_languages, p_skill_ids, p_certification_ids, p_projects, p_date_of_birth, p_rate
  );
  update public.workers set ssn_last4 = v_ssn_last4 where id = p_worker_id;
  return public.get_admin_worker_portal_profile(p_worker_id);
end;
$$;
revoke all on function public.update_admin_worker_portal_profile_with_identity(uuid,text,text,text,text,text,text,uuid,uuid,numeric,numeric,numeric,numeric,text,text,date,boolean,jsonb,uuid[],uuid[],jsonb,date,text,numeric) from public, anon;
grant execute on function public.update_admin_worker_portal_profile_with_identity(uuid,text,text,text,text,text,text,uuid,uuid,numeric,numeric,numeric,numeric,text,text,date,boolean,jsonb,uuid[],uuid[],jsonb,date,text,numeric) to authenticated;

notify pgrst, 'reload schema';

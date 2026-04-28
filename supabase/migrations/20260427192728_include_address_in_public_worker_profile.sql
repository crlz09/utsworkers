drop function if exists public.get_public_worker_profile(text);

create function public.get_public_worker_profile(profile_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'phone', w.phone,
    'email', w.email,
    'address', w.address,
    'trade', t.name,
    'location', l.name,
    'status', w.status,
    'availability', w.availability,
    'available_from', w.available_from,
    'willing_to_travel', w.willing_to_travel,
    'total_experience_years', w.total_experience_years,
    'commercial_experience_years', w.commercial_experience_years,
    'industrial_experience_years', w.industrial_experience_years,
    'residential_experience_years', w.residential_experience_years,
    'strengths', w.strengths,
    'needs_improvement', w.needs_improvement,
    'recruiter_notes', w.recruiter_notes,
    'skills', coalesce((
      select jsonb_agg(s.name order by s.name)
      from public.worker_skills ws
      join public.skills s on s.id = ws.skill_id
      where ws.worker_id = w.id
    ), '[]'::jsonb),
    'certifications', coalesce((
      select jsonb_agg(c.name order by c.name)
      from public.worker_certifications wc
      join public.certifications c on c.id = wc.certification_id
      where wc.worker_id = w.id
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(wl.language_name order by wl.language_name)
      from public.worker_languages wl
      where wl.worker_id = w.id
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(to_jsonb(wp) order by wp.sort_order, wp.created_at)
      from public.worker_projects wp
      where wp.worker_id = w.id
    ), '[]'::jsonb)
  )
  from public.workers w
  left join public.trades t on t.id = w.trade_id
  left join public.locations l on l.id = w.location_id
  where w.public_profile_slug = profile_slug
    and w.is_public = true
  limit 1;
$$;

revoke all on function public.get_public_worker_profile(text) from public;
grant execute on function public.get_public_worker_profile(text) to anon, authenticated, service_role;

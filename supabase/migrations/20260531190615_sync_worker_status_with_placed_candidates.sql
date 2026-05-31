create or replace function public.sync_worker_status_from_cts_candidate(p_worker_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_placed boolean;
  v_current_status text;
begin
  if p_worker_id is null then
    return;
  end if;

  select exists (
    select 1
    from public.cts_job_candidates
    where worker_id = p_worker_id
      and candidate_status = 'placed'
  )
  into v_has_placed;

  select status
  into v_current_status
  from public.workers
  where id = p_worker_id;

  if v_has_placed then
    update public.workers
    set
      status = 'working',
      status_updated_at = now()
    where id = p_worker_id
      and status is distinct from 'working';
  elsif v_current_status in ('working', 'pending', 'onboarding') then
    update public.workers
    set
      status = 'completed',
      status_updated_at = now()
    where id = p_worker_id
      and status is distinct from 'completed';
  end if;
end;
$$;

create or replace function public.sync_worker_status_from_cts_candidate_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_worker_status_from_cts_candidate(old.worker_id);
    return old;
  end if;

  perform public.sync_worker_status_from_cts_candidate(new.worker_id);

  if tg_op = 'UPDATE' and old.worker_id is distinct from new.worker_id then
    perform public.sync_worker_status_from_cts_candidate(old.worker_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_worker_status_from_cts_candidate on public.cts_job_candidates;

create trigger trg_sync_worker_status_from_cts_candidate
after insert or update of candidate_status, worker_id or delete
on public.cts_job_candidates
for each row
execute function public.sync_worker_status_from_cts_candidate_trigger();

update public.workers
set
  status = 'completed',
  status_updated_at = now()
where status in ('pending', 'onboarding');

update public.workers w
set
  status = 'working',
  status_updated_at = now()
where exists (
  select 1
  from public.cts_job_candidates c
  where c.worker_id = w.id
    and c.candidate_status = 'placed'
)
and w.status is distinct from 'working';

update public.workers w
set
  status = 'completed',
  status_updated_at = now()
where w.status = 'working'
and not exists (
  select 1
  from public.cts_job_candidates c
  where c.worker_id = w.id
    and c.candidate_status = 'placed'
);

create or replace function public.register_worker_public(
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
  p_language_proficiencies jsonb default '{}'::jsonb
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
  v_language_proficiency integer;
  v_skill_id uuid;
  v_certification_id uuid;
begin
  insert into public.workers (
    name,
    phone,
    email,
    address,
    zip_code,
    city,
    state,
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
    p_zip_code,
    p_city,
    p_state,
    p_location_id,
    p_trade_id,
    least(greatest(coalesce(p_total_experience_years, 0), 0), 30),
    least(greatest(coalesce(p_commercial_experience_years, 0), 0), 30),
    least(greatest(coalesce(p_industrial_experience_years, 0), 0), 30),
    least(greatest(coalesce(p_residential_experience_years, 0), 0), 30),
    p_strengths,
    p_needs_improvement,
    'completed',
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
        v_language_proficiency := null;

        if lower(btrim(v_language)) = 'english' then
          v_language_proficiency := least(
            greatest(
              coalesce(nullif(p_language_proficiencies->>btrim(v_language), '')::integer, 50),
              1
            ),
            100
          );
        end if;

        insert into public.worker_languages (worker_id, language_name, proficiency_percent)
        values (v_worker_id, btrim(v_language), v_language_proficiency);
      end if;
    end loop;
  end if;

  if p_skill_ids is not null then
    foreach v_skill_id in array p_skill_ids loop
      if v_skill_id is not null then
        insert into public.worker_skills (worker_id, skill_id)
        values (v_worker_id, v_skill_id)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  if p_certification_ids is not null then
    foreach v_certification_id in array p_certification_ids loop
      if v_certification_id is not null then
        insert into public.worker_certifications (worker_id, certification_id)
        values (v_worker_id, v_certification_id)
        on conflict do nothing;
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
        nullif(btrim(v_project->>'project_name'), ''),
        nullif(btrim(v_project->>'project_location'), ''),
        nullif(btrim(v_project->>'duration'), ''),
        nullif(btrim(v_project->>'description'), ''),
        coalesce((v_project->>'sort_order')::integer, 0)
      );
    end loop;
  end if;

  return v_worker_id;
end;
$$;

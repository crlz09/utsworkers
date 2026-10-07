-- Global read-only library. Invoker rights preserve all underlying RLS policies.
create function public.search_admin_documents(
  p_query text default '', p_category text default '', p_page integer default 1
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; page_number integer := greatest(1, least(coalesce(p_page, 1), 1000000));
begin
  if not coalesce(public.can_manage_worker_documents(), false) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if length(coalesce(p_query, '')) > 250 then
    raise exception 'Search must be 250 characters or less' using errcode = '22023';
  end if;
  with raw_documents as (
    select 'worker:' || d.id::text as id, d.worker_id, w.name as candidate_name,
      w.email as candidate_email, d.file_name, d.file_path, d.file_type,
      d.file_size::bigint as file_size, d.document_type, d.uploaded_at,
      'worker-documents'::text as bucket, 'candidate'::text as source,
      ''::text as confirmation_number
    from public.worker_documents d left join public.workers w on w.id = d.worker_id
    union all
    select 'screening:' || s.id::text, s.worker_id,
      coalesce(w.name, s.candidate_name), coalesce(w.email, s.recipient_email),
      s.file_name, s.file_path, 'application/pdf', s.file_size::bigint,
      'Drug Test ePassport', s.received_at, 'candidate-screenings', 'screening', s.confirmation_number
    from public.candidate_screenings s left join public.workers w on w.id = s.worker_id
    union all
    select 'result:' || s.id::text, s.worker_id,
      coalesce(w.name, s.candidate_name), coalesce(w.email, s.recipient_email),
      s.result_file_name, s.result_file_path, 'application/pdf', null::bigint,
      'Drug Test Result', s.result_received_at, 'candidate-screenings', 'screening', s.confirmation_number
    from public.candidate_screenings s left join public.workers w on w.id = s.worker_id
    where s.result_file_path is not null
  ), labeled as (
    select r.*, lower(trim(regexp_replace(coalesce(document_type, ''), '\s+-\s+(front|back)$', '', 'i'))) as type_key
    from raw_documents r
  ), documents as materialized (
    select l.id, l.worker_id, l.candidate_name, l.candidate_email, l.file_name,
      l.file_path, l.file_type, l.file_size, l.document_type, l.uploaded_at,
      l.bucket, l.source, l.confirmation_number,
      case
        when type_key in ('osha','osha_card','osha card') then 'OSHA Card'
        when type_key ~ '^others?($|:)' then 'Others'
        when type_key in ('resume') then 'Resume'
        when type_key in ('id','state_id_or_driver_license','state id or driver license','government id') then 'State ID or Driver License'
        when type_key in ('work_permit','employment_authorization_card','employment authorization card','work permit') then 'Employment Authorization Card'
        when type_key in ('social_security_card','social security card') then 'Social Security Card'
        when type_key='bio' then 'BIO'
        when type_key='certification' then 'Certification'
        when type_key='license' then 'License'
        else coalesce(nullif(trim(document_type), ''), 'Others')
      end as category
    from labeled l
  ), searched as materialized (
    select * from documents
    where trim(coalesce(p_query,'')) = ''
      or strpos(lower(concat_ws(' ',candidate_name,candidate_email,file_name,document_type,category,confirmation_number)), lower(trim(p_query))) > 0
  ), filtered as materialized (
    select * from searched where coalesce(p_category,'')='' or category=p_category
  ), page_rows as (
    select * from filtered order by uploaded_at desc nulls last, id
    limit 50 offset ((page_number - 1)::bigint * 50)
  ), category_counts as (
    select category,count(*) as count from searched group by category
  )
  select jsonb_build_object(
    'documents', coalesce((select jsonb_agg(p order by p.uploaded_at desc nulls last,p.id) from page_rows p),'[]'::jsonb),
    'total', (select count(*) from filtered),
    'total_documents', (select count(*) from documents),
    'search_total', (select count(*) from searched),
    'categories', coalesce((select jsonb_agg(c order by c.category) from category_counts c),'[]'::jsonb),
    'page', page_number, 'page_size',50
  ) into result;
  return result;
end;
$$;
revoke all on function public.search_admin_documents(text,text,integer) from public, anon;
grant execute on function public.search_admin_documents(text,text,integer) to authenticated;

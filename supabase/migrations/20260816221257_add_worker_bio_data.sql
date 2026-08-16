alter table public.worker_documents
  add column if not exists bio_data jsonb;

comment on column public.worker_documents.bio_data is
  'Editable source data for generated CTS candidate BIO documents.';

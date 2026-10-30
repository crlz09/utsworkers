-- Keep historical assignments without a payment preference editable.
alter table public.cts_job_candidates
  add column payment_type text
  constraint cts_job_candidates_payment_type_check
  check (payment_type in ('W2', '1099'));

comment on column public.cts_job_candidates.payment_type is
  'Candidate preferred payment type for this assignment: W2 or 1099. NULL means not yet collected.';

create extension if not exists pgcrypto;

create table if not exists public.public_registration_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  outcome text not null,
  reason text,
  turnstile_error_codes text[] not null default '{}',
  worker_id uuid,
  payload_summary jsonb not null default '{}'::jsonb
);

create index if not exists public_registration_attempts_created_at_idx
  on public.public_registration_attempts (created_at desc);

create index if not exists public_registration_attempts_ip_created_at_idx
  on public.public_registration_attempts (ip_address, created_at desc);

alter table public.public_registration_attempts enable row level security;

revoke all on public.public_registration_attempts from anon, authenticated;

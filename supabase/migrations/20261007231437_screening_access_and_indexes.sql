-- Server-only synchronization state: deny all browser roles explicitly.
create policy "Sync state is server only" on public.screening_sync_state
for all to anon, authenticated using (false) with check (false);

create index candidate_screenings_suggested_worker_idx on public.candidate_screenings(suggested_worker_id);
create index candidate_screenings_created_by_idx on public.candidate_screenings(created_by);
create index candidate_screenings_verified_by_idx on public.candidate_screenings(identity_verified_by);
create index candidate_screenings_sent_by_idx on public.candidate_screenings(sent_by);
create index candidate_screenings_updated_by_idx on public.candidate_screenings(updated_by);
create index candidate_screening_events_actor_idx on public.candidate_screening_events(actor_id);
create index candidate_screenings_received_idx on public.candidate_screenings(received_at desc, id desc);

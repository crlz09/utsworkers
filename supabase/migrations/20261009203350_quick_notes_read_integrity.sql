-- Read receipts can only advance for the same note/user pair.
create or replace function public.validate_planner_note_read()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP='UPDATE' then
    if NEW.note_id<>OLD.note_id or NEW.user_id<>OLD.user_id then
      raise exception 'Read receipt ownership cannot change.';
    end if;
    NEW.seen_revision := greatest(OLD.seen_revision,NEW.seen_revision);
  end if;
  if not exists(select 1 from public.planner_notes n where n.id=NEW.note_id and n.revision>=NEW.seen_revision) then
    raise exception 'Read receipts must reference an existing note revision.';
  end if;
  return NEW;
end;
$$;
revoke all on function public.validate_planner_note_read() from public,anon;

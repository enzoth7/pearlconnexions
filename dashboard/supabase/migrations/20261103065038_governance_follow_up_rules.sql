create function private.guard_maintenance_follow_up() returns trigger language plpgsql set search_path='' as $$
begin
 if old.kind='maintenance' and not private.manages_maintenance() and coalesce(old.data->>'follow_up','')<>'' and
    new.data->>'follow_up' is distinct from old.data->>'follow_up' and
    left(coalesce(new.data->>'follow_up',''),length(old.data->>'follow_up')+1)<>(old.data->>'follow_up')||E'\n' then
    raise exception 'Add a follow-up note without removing previous notes';
 end if;
 return new;
end $$;
create trigger guard_maintenance_follow_up before update on public.qa_records for each row execute function private.guard_maintenance_follow_up();
alter table public.qa_records add constraint risk_owner_review_required check(kind<>'risks' or
 (length(trim(coalesce(data->>'owner','')))>0 and coalesce(data->>'due_on','') ~ '^\d{4}-\d{2}-\d{2}$'));

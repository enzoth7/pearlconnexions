create or replace function public.sign_off_action(action_uuid uuid, signer_name text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_director()) then
    raise exception 'Director access required' using errcode = '42501';
  end if;
  update public.actions set completed_at = current_date where id = action_uuid;
  if not found then raise exception 'Action not found' using errcode = 'P0002'; end if;
  insert into public.action_signoffs(action_id, signed_off_by_name)
  values (action_uuid, signer_name);
end;
$$;

revoke all on function public.sign_off_action(uuid, text) from public, anon;
grant execute on function public.sign_off_action(uuid, text) to authenticated;

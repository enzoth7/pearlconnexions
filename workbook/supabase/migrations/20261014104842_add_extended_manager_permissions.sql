-- Separate sensitive workflow capabilities from general action editing.
-- Existing managers retain the abilities they already had before this split.

alter table public.managers
  add column if not exists can_reassign_actions boolean not null default true,
  add column if not exists can_sign_off_actions boolean not null default true,
  add column if not exists can_manage_logins boolean not null default false;

update public.managers
set can_manage_logins = can_manage_employees
where can_manage_employees and not can_manage_logins;

alter table public.managers
  drop constraint if exists managers_action_permissions_require_edit_check;

alter table public.managers
  add constraint managers_action_permissions_require_edit_check
  check (
    (not can_add_actions or can_edit_actions)
    and (not can_delete_actions or can_edit_actions)
    and (not can_reassign_actions or can_edit_actions)
    and (not can_sign_off_actions or can_edit_actions)
  );

create or replace function private.current_manager_has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.managers manager on manager.id = profile.manager_id
    where profile.id = (select auth.uid())
      and profile.role = 'manager'
      and case requested_permission
        when 'add_actions' then manager.can_add_actions
        when 'edit_actions' then manager.can_edit_actions
        when 'delete_actions' then manager.can_delete_actions
        when 'reassign_actions' then manager.can_reassign_actions
        when 'sign_off_actions' then manager.can_sign_off_actions
        when 'manage_employees' then manager.can_manage_employees
        when 'manage_logins' then manager.can_manage_logins
        else false
      end
  );
$$;

revoke execute on function private.current_manager_has_permission(text)
  from public, anon, service_role;
grant execute on function private.current_manager_has_permission(text)
  to authenticated;

create or replace function private.can_reassign_manager_action(action_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_manager_has_permission('reassign_actions'))
    and (select private.manager_action_in_edit_scope(action_uuid));
$$;

revoke execute on function private.can_reassign_manager_action(uuid)
  from public, anon, service_role;
grant execute on function private.can_reassign_manager_action(uuid)
  to authenticated;

create or replace function private.can_sign_off_manager_action(action_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_manager_has_permission('sign_off_actions'))
    and (select private.manager_action_in_edit_scope(action_uuid));
$$;

revoke execute on function private.can_sign_off_manager_action(uuid)
  from public, anon, service_role;
grant execute on function private.can_sign_off_manager_action(uuid)
  to authenticated;

create or replace function private.prevent_manager_permission_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (select private.is_manager())
     and (
       new.can_add_actions is distinct from old.can_add_actions
       or new.can_edit_actions is distinct from old.can_edit_actions
       or new.can_delete_actions is distinct from old.can_delete_actions
       or new.can_reassign_actions is distinct from old.can_reassign_actions
       or new.can_sign_off_actions is distinct from old.can_sign_off_actions
       or new.can_manage_employees is distinct from old.can_manage_employees
       or new.can_manage_logins is distinct from old.can_manage_logins
     ) then
    raise exception 'Only a director can change manager permissions' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function private.prevent_manager_permission_changes()
  from public, anon, authenticated, service_role;

drop trigger if exists managers_protect_permissions on public.managers;
create trigger managers_protect_permissions
before update of can_add_actions, can_edit_actions, can_delete_actions,
  can_reassign_actions, can_sign_off_actions, can_manage_employees, can_manage_logins
on public.managers
for each row execute function private.prevent_manager_permission_changes();

drop policy if exists "Team manager insert employee" on public.managers;
create policy "Team manager insert employee" on public.managers
  for insert to authenticated
  with check (
    (select private.current_manager_can_manage_employees())
    and parent_manager_id = (select private.current_manager_id())
    and not can_manage_employees
    and can_add_actions
    and can_edit_actions
    and not can_delete_actions
    and can_reassign_actions
    and can_sign_off_actions
    and not can_manage_logins
  );

drop policy if exists "Manager insert" on public.action_participants;
create policy "Manager insert" on public.action_participants
  for insert to authenticated
  with check (
    (select private.can_reassign_manager_action(action_id))
    and manager_id in (select private.managed_manager_ids())
  );

drop policy if exists "Manager update" on public.action_participants;
create policy "Manager update" on public.action_participants
  for update to authenticated
  using ((select private.can_reassign_manager_action(action_id)))
  with check (
    (select private.can_reassign_manager_action(action_id))
    and manager_id in (select private.managed_manager_ids())
  );

drop policy if exists "Manager delete" on public.action_participants;
create policy "Manager delete" on public.action_participants
  for delete to authenticated
  using ((select private.can_reassign_manager_action(action_id)));

drop policy if exists "Manager insert" on public.action_signoffs;
create policy "Manager insert" on public.action_signoffs
  for insert to authenticated
  with check ((select private.can_sign_off_manager_action(action_id)));

drop policy if exists "Manager update" on public.action_signoffs;
create policy "Manager update" on public.action_signoffs
  for update to authenticated
  using ((select private.can_sign_off_manager_action(action_id)))
  with check ((select private.can_sign_off_manager_action(action_id)));

drop policy if exists "Manager delete" on public.action_signoffs;
create policy "Manager delete" on public.action_signoffs
  for delete to authenticated
  using ((select private.can_sign_off_manager_action(action_id)));

create or replace function private.enforce_action_sensitive_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (select private.is_manager())
     and new.completed_at is distinct from old.completed_at
     and not (select private.can_sign_off_manager_action(old.id)) then
    raise exception 'Sign-off permission required' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_action_sensitive_permissions()
  from public, anon, authenticated, service_role;

drop trigger if exists actions_enforce_sensitive_permissions on public.actions;
create trigger actions_enforce_sensitive_permissions
before update of completed_at on public.actions
for each row execute function private.enforce_action_sensitive_permissions();

create or replace function public.sign_off_action(action_uuid uuid, signer_name text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_director())
     and not (select private.can_sign_off_manager_action(action_uuid)) then
    raise exception 'Sign-off permission required' using errcode = '42501';
  end if;

  update public.actions
  set completed_at = current_date
  where id = action_uuid;

  if not found then
    raise exception 'Action not found' using errcode = 'P0002';
  end if;

  insert into public.action_signoffs(action_id, signed_off_by, signed_off_by_name, signed_off_at)
  values (action_uuid, (select auth.uid()), signer_name, now())
  on conflict (action_id) do update
  set signed_off_by = (select auth.uid()),
      signed_off_by_name = excluded.signed_off_by_name,
      signed_off_at = now();
end;
$$;

revoke all on function public.sign_off_action(uuid, text) from public, anon;
grant execute on function public.sign_off_action(uuid, text) to authenticated;

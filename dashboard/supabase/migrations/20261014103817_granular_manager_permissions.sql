-- Granular capabilities for manager accounts. Directors retain implicit full access.
-- Existing managers keep create/edit access, while action deletion becomes director-only
-- until explicitly enabled from the Permissions matrix.

alter table public.managers
  add column if not exists can_add_actions boolean not null default true,
  add column if not exists can_edit_actions boolean not null default true,
  add column if not exists can_delete_actions boolean not null default false;

alter table public.managers
  drop constraint if exists managers_add_actions_requires_edit_check,
  drop constraint if exists managers_action_permissions_require_edit_check;

alter table public.managers
  add constraint managers_action_permissions_require_edit_check
  check (
    (not can_add_actions or can_edit_actions)
    and (not can_delete_actions or can_edit_actions)
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
        when 'manage_employees' then manager.can_manage_employees
        else false
      end
  );
$$;

revoke execute on function private.current_manager_has_permission(text)
  from public, anon, service_role;
grant execute on function private.current_manager_has_permission(text)
  to authenticated;

create or replace function private.manager_action_in_edit_scope(action_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_manager())
    and (
      exists (
        select 1
        from public.actions target_action
        where target_action.id = action_uuid
          and target_action.created_by = (select auth.uid())
      )
      or exists (
        select 1
        from public.action_participants participant
        where participant.action_id = action_uuid
          and participant.responsibility_type <> 'Support'
          and participant.manager_id in (select private.managed_manager_ids())
      )
    );
$$;

revoke execute on function private.manager_action_in_edit_scope(uuid)
  from public, anon, service_role;
grant execute on function private.manager_action_in_edit_scope(uuid)
  to authenticated;

create or replace function private.can_edit_manager_action(action_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_manager_has_permission('edit_actions'))
    and (select private.manager_action_in_edit_scope(action_uuid));
$$;

revoke execute on function private.can_edit_manager_action(uuid)
  from public, anon, service_role;
grant execute on function private.can_edit_manager_action(uuid)
  to authenticated;

create or replace function private.current_manager_can_manage_employees()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_manager_has_permission('manage_employees'));
$$;

revoke execute on function private.current_manager_can_manage_employees()
  from public, anon, service_role;
grant execute on function private.current_manager_can_manage_employees()
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
       or new.can_manage_employees is distinct from old.can_manage_employees
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
before update of can_add_actions, can_edit_actions, can_delete_actions, can_manage_employees
on public.managers
for each row execute function private.prevent_manager_permission_changes();

create or replace function private.can_manage_manager(target_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_director())
    or (
      (select private.current_manager_has_permission('manage_employees'))
      and exists (
        select 1
        from public.managers target
        where target.id = target_manager_id
          and target.parent_manager_id = (select private.current_manager_id())
      )
    );
$$;

revoke execute on function private.can_manage_manager(uuid)
  from public, anon, service_role;
grant execute on function private.can_manage_manager(uuid)
  to authenticated;

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
  );

drop policy if exists "Manager insert" on public.actions;
create policy "Manager insert" on public.actions
  for insert to authenticated
  with check (
    (select private.current_manager_has_permission('add_actions'))
    and created_by = (select auth.uid())
  );

drop policy if exists "Manager update" on public.actions;
create policy "Manager update" on public.actions
  for update to authenticated
  using ((select private.can_edit_manager_action(id)))
  with check ((select private.can_edit_manager_action(id)));

drop policy if exists "Manager delete" on public.actions;
create policy "Manager delete" on public.actions
  for delete to authenticated
  using (
    (select private.current_manager_has_permission('delete_actions'))
    and (select private.manager_action_in_edit_scope(id))
  );

create or replace function public.sign_off_action(action_uuid uuid, signer_name text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_director())
     and not (select private.can_edit_manager_action(action_uuid)) then
    raise exception 'Edit action permission required' using errcode = '42501';
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

-- Managers can edit actions they own and actions owned by anyone in their
-- reporting tree. Support-only assignments remain read-only.

alter table public.actions
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

create index if not exists actions_created_by_idx on public.actions(created_by);

grant select, insert, update, delete
  on public.actions, public.action_participants, public.action_updates, public.action_signoffs
  to authenticated;

create or replace function private.managed_manager_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with recursive current_scope as (
    select p.manager_id
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'manager'
  ), team(id) as (
    select manager_id
    from current_scope
    where manager_id is not null

    union all

    select child.id
    from public.managers child
    join team parent on child.parent_manager_id = parent.id
  )
  select id from team;
$$;

revoke execute on function private.managed_manager_ids()
  from public, anon, service_role;
grant execute on function private.managed_manager_ids()
  to authenticated;

create or replace function private.can_view_manager_action(action_uuid uuid)
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
          and participant.manager_id in (select private.managed_manager_ids())
      )
    );
$$;

revoke execute on function private.can_view_manager_action(uuid)
  from public, anon, service_role;
grant execute on function private.can_view_manager_action(uuid)
  to authenticated;

create or replace function private.can_edit_manager_action(action_uuid uuid)
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

revoke execute on function private.can_edit_manager_action(uuid)
  from public, anon, service_role;
grant execute on function private.can_edit_manager_action(uuid)
  to authenticated;

create or replace function private.can_manage_manager(target_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_director())
    or (
      (select private.is_manager())
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

drop policy if exists "Manager insert" on public.actions;
create policy "Manager insert" on public.actions
  for insert to authenticated
  with check (
    (select private.is_manager())
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
  using ((select private.can_edit_manager_action(id)));

drop policy if exists "Manager insert" on public.action_participants;
create policy "Manager insert" on public.action_participants
  for insert to authenticated
  with check (
    (select private.can_edit_manager_action(action_id))
    and manager_id in (select private.managed_manager_ids())
  );

drop policy if exists "Manager update" on public.action_participants;
create policy "Manager update" on public.action_participants
  for update to authenticated
  using ((select private.can_edit_manager_action(action_id)))
  with check (
    (select private.can_edit_manager_action(action_id))
    and manager_id in (select private.managed_manager_ids())
  );

drop policy if exists "Manager delete" on public.action_participants;
create policy "Manager delete" on public.action_participants
  for delete to authenticated
  using ((select private.can_edit_manager_action(action_id)));

drop policy if exists "Manager insert" on public.action_updates;
create policy "Manager insert" on public.action_updates
  for insert to authenticated
  with check ((select private.can_edit_manager_action(action_id)));

drop policy if exists "Manager update" on public.action_updates;
create policy "Manager update" on public.action_updates
  for update to authenticated
  using ((select private.can_edit_manager_action(action_id)))
  with check ((select private.can_edit_manager_action(action_id)));

drop policy if exists "Manager delete" on public.action_updates;
create policy "Manager delete" on public.action_updates
  for delete to authenticated
  using ((select private.can_edit_manager_action(action_id)));

drop policy if exists "Manager insert" on public.action_signoffs;
create policy "Manager insert" on public.action_signoffs
  for insert to authenticated
  with check ((select private.can_edit_manager_action(action_id)));

drop policy if exists "Manager update" on public.action_signoffs;
create policy "Manager update" on public.action_signoffs
  for update to authenticated
  using ((select private.can_edit_manager_action(action_id)))
  with check ((select private.can_edit_manager_action(action_id)));

drop policy if exists "Manager delete" on public.action_signoffs;
create policy "Manager delete" on public.action_signoffs
  for delete to authenticated
  using ((select private.can_edit_manager_action(action_id)));

create or replace function public.sign_off_action(action_uuid uuid, signer_name text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_director())
     and not (select private.can_edit_manager_action(action_uuid)) then
    raise exception 'Editor access required' using errcode = '42501';
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

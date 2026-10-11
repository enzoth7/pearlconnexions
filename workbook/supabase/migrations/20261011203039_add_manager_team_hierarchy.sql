-- Add scoped team administration for managers.
-- Directors retain full access; opted-in managers can administer direct reports
-- and read progress for their complete reporting tree.

alter table public.managers
  add column if not exists parent_manager_id uuid references public.managers(id) on delete set null,
  add column if not exists can_manage_employees boolean not null default false;

create index if not exists managers_parent_manager_id_idx
  on public.managers(parent_manager_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'managers_cannot_report_to_self'
      and conrelid = 'public.managers'::regclass
  ) then
    alter table public.managers
      add constraint managers_cannot_report_to_self
      check (parent_manager_id is null or parent_manager_id <> id);
  end if;
end $$;

create or replace function private.prevent_manager_reporting_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_manager_id is null then
    return new;
  end if;

  if new.parent_manager_id = new.id then
    raise exception 'A team member cannot report to themselves' using errcode = '23514';
  end if;

  if exists (
    with recursive ancestors(id, parent_manager_id) as (
      select m.id, m.parent_manager_id
      from public.managers m
      where m.id = new.parent_manager_id

      union all

      select parent.id, parent.parent_manager_id
      from public.managers parent
      join ancestors child on parent.id = child.parent_manager_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'This reporting line would create a cycle' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function private.prevent_manager_reporting_cycle()
  from public, anon, authenticated, service_role;

drop trigger if exists managers_prevent_reporting_cycle on public.managers;
create trigger managers_prevent_reporting_cycle
before insert or update of parent_manager_id on public.managers
for each row execute function private.prevent_manager_reporting_cycle();

create or replace function private.current_manager_can_manage_employees()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles p
      join public.managers m on m.id = p.manager_id
      where p.id = (select auth.uid())
        and p.role = 'manager'
        and m.can_manage_employees
    );
$$;

revoke execute on function private.current_manager_can_manage_employees()
  from public, anon, service_role;
grant execute on function private.current_manager_can_manage_employees()
  to authenticated;

create or replace function private.managed_manager_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with recursive current_scope as (
    select p.manager_id, m.can_manage_employees
    from public.profiles p
    join public.managers m on m.id = p.manager_id
    where p.id = (select auth.uid())
      and p.role = 'manager'
  ), team(id, can_descend) as (
    select manager_id, can_manage_employees
    from current_scope
    where manager_id is not null

    union all

    select child.id, team.can_descend
    from public.managers child
    join team on child.parent_manager_id = team.id
    where team.can_descend
  )
  select id from team;
$$;

revoke execute on function private.managed_manager_ids()
  from public, anon, service_role;
grant execute on function private.managed_manager_ids()
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
      (select private.current_manager_can_manage_employees())
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

create or replace function private.can_view_manager_action(action_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_manager())
    and exists (
      select 1
      from public.action_participants ap
      where ap.action_id = action_uuid
        and ap.manager_id in (select private.managed_manager_ids())
    );
$$;

revoke execute on function private.can_view_manager_action(uuid)
  from public, anon, service_role;
grant execute on function private.can_view_manager_action(uuid)
  to authenticated;

create or replace function private.can_view_manager_record(target_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_manager())
    and (
      target_manager_id in (select private.managed_manager_ids())
      or exists (
        select 1
        from public.action_participants target_participant
        where target_participant.manager_id = target_manager_id
          and exists (
            select 1
            from public.action_participants team_participant
            where team_participant.action_id = target_participant.action_id
              and team_participant.manager_id in (select private.managed_manager_ids())
          )
      )
    );
$$;

revoke execute on function private.can_view_manager_record(uuid)
  from public, anon, service_role;
grant execute on function private.can_view_manager_record(uuid)
  to authenticated;

drop policy if exists "Manager select" on public.managers;
create policy "Manager select" on public.managers
  for select to authenticated
  using ((select private.can_view_manager_record(id)));

drop policy if exists "Manager select" on public.profiles;
create policy "Manager select" on public.profiles
  for select to authenticated
  using (
    (select private.is_manager())
    and (
      id = (select auth.uid())
      or manager_id in (select private.managed_manager_ids())
    )
  );

grant select, insert, update, delete on public.managers to authenticated;

drop policy if exists "Director delete" on public.managers;
create policy "Director delete" on public.managers
  for delete to authenticated
  using ((select private.is_director()));

drop policy if exists "Team manager insert employee" on public.managers;
create policy "Team manager insert employee" on public.managers
  for insert to authenticated
  with check (
    (select private.current_manager_can_manage_employees())
    and parent_manager_id = (select private.current_manager_id())
    and not can_manage_employees
  );

drop policy if exists "Team manager update employee" on public.managers;
create policy "Team manager update employee" on public.managers
  for update to authenticated
  using ((select private.can_manage_manager(id)))
  with check (
    parent_manager_id = (select private.current_manager_id())
    and not can_manage_employees
  );

drop policy if exists "Team manager delete employee" on public.managers;
create policy "Team manager delete employee" on public.managers
  for delete to authenticated
  using ((select private.can_manage_manager(id)));

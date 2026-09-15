-- Migration: Add manager role support and settings access
-- 1. Add email column to public.managers
alter table public.managers
  add column if not exists email text;

create index if not exists managers_email_idx on public.managers(email);

-- 2. Add manager_id reference to public.profiles
alter table public.profiles
  add column if not exists manager_id uuid references public.managers(id) on delete set null;

create index if not exists profiles_manager_id_idx on public.profiles(manager_id);

-- 3. Create helper functions
create or replace function private.is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'manager'
  );
$$;

revoke execute on function private.is_manager() from public, anon, service_role;
grant execute on function private.is_manager() to authenticated;

create or replace function private.current_manager_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.manager_id
  from public.profiles p
  where p.id = (select auth.uid());
$$;

revoke execute on function private.current_manager_id() from public, anon, service_role;
grant execute on function private.current_manager_id() to authenticated;

-- 4. RLS policies for role = 'manager'

-- Allow managers to SELECT public.profiles where id = auth.uid() or role = 'director'
create policy "Manager select" on public.profiles
  for select to authenticated
  using (
    (select private.is_manager()) and (
      id = (select auth.uid()) or role = 'director'
    )
  );

-- Allow managers to SELECT public.workstreams (all)
create policy "Manager select" on public.workstreams
  for select to authenticated
  using (
    (select private.is_manager())
  );

-- Allow managers to SELECT public.managers (all, or where id = current_manager_id())
create policy "Manager select" on public.managers
  for select to authenticated
  using (
    (select private.is_manager())
  );

-- Allow managers to SELECT public.actions where id in (select action_id from public.action_participants where manager_id = private.current_manager_id())
create policy "Manager select" on public.actions
  for select to authenticated
  using (
    (select private.is_manager()) and
    id in (
      select action_id
      from public.action_participants
      where manager_id = (select private.current_manager_id())
    )
  );

-- Allow managers to SELECT public.action_participants where action_id in (select action_id from public.action_participants where manager_id = private.current_manager_id())
create policy "Manager select" on public.action_participants
  for select to authenticated
  using (
    (select private.is_manager()) and
    action_id in (
      select action_id
      from public.action_participants
      where manager_id = (select private.current_manager_id())
    )
  );

-- Allow managers to SELECT public.action_updates where action_id in (select action_id from public.action_participants where manager_id = private.current_manager_id())
create policy "Manager select" on public.action_updates
  for select to authenticated
  using (
    (select private.is_manager()) and
    action_id in (
      select action_id
      from public.action_participants
      where manager_id = (select private.current_manager_id())
    )
  );

-- Allow managers to INSERT public.action_updates for actions where they are a participant
create policy "Manager insert" on public.action_updates
  for insert to authenticated
  with check (
    (select private.is_manager()) and
    action_id in (
      select action_id
      from public.action_participants
      where manager_id = (select private.current_manager_id())
    )
  );

-- Allow managers to SELECT public.action_signoffs for actions where they are a participant
create policy "Manager select" on public.action_signoffs
  for select to authenticated
  using (
    (select private.is_manager()) and
    action_id in (
      select action_id
      from public.action_participants
      where manager_id = (select private.current_manager_id())
    )
  );

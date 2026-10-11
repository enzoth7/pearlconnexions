-- Repair a partially-applied team hierarchy migration.
-- The original migration could stop when the pre-existing "Director delete"
-- policy was created a second time, leaving the manager write policies absent.

alter table public.managers enable row level security;

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

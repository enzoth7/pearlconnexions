-- An INSERT ... RETURNING must be able to read its new row in the same statement.
-- The existing helper queries actions and cannot see that row in its statement snapshot.
-- Check ownership on the row directly, while retaining the existing participant scope.
drop policy if exists "Manager select" on public.actions;

create policy "Manager select" on public.actions
  for select to authenticated
  using (
    (select private.is_manager())
    and (
      created_by = (select auth.uid())
      or (select private.can_view_manager_action(id))
    )
  );

grant delete on public.action_participants, public.action_updates, public.actions to authenticated;

create policy "Director delete" on public.actions
  for delete to authenticated
  using ((select private.is_director()));

create policy "Director delete" on public.action_participants
  for delete to authenticated
  using ((select private.is_director()));

create policy "Director delete" on public.action_updates
  for delete to authenticated
  using ((select private.is_director()));

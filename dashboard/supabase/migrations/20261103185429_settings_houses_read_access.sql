-- A visible Settings Houses tab can list homes independently of QA report access.
create policy "Settings Houses read" on public.qa_homes
for select to authenticated using (private.has_workspace_section('settings.houses'));

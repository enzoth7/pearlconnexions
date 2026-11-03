-- Tests run as real application roles and roll back all temporary URL changes.
begin;

do $test$
declare
  admin_id uuid;
  reader_id uuid;
  affected integer;
begin
  select a.user_id into admin_id from public.workspace_access a
  join public.profiles p on p.id = a.user_id
  where a.is_admin and p.role = 'director' limit 1;
  select p.id into reader_id from public.profiles p
  left join public.workspace_access a on a.user_id = p.id
  where p.role = 'manager' and not coalesce(a.is_admin, false) limit 1;
  if admin_id is null or reader_id is null then
    raise exception 'An existing admin and manager are required for this check';
  end if;
  if has_table_privilege('anon', 'public.workspace_links', 'SELECT') then
    raise exception 'Anonymous reads must be denied';
  end if;
  if has_column_privilege('authenticated', 'public.workspace_links', 'id', 'UPDATE') then
    raise exception 'The singleton identity must not be editable';
  end if;

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.workspace_links set dashboard_url = 'https://workbook-pc.vercel.app/?links-verification=1' where id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin update must affect one row'; end if;

  perform set_config('request.jwt.claim.sub', reader_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', reader_id, 'role', 'authenticated')::text, true);
  select count(*) into affected from public.workspace_links;
  if affected <> 1 then raise exception 'A signed-in reader must see the shared links'; end if;
  update public.workspace_links set website_url = 'https://example.invalid/' where id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A manager must not be allowed to edit links'; end if;
  execute 'reset role';
end $test$;

rollback;
select 'Admin updates allowed, manager updates denied, anonymous access denied; changes rolled back' as result;

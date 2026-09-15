begin;

do $$
begin
  if has_table_privilege('anon', 'public.qa_homes', 'select') then
    raise exception 'anon unexpectedly has QA table access';
  end if;
  if has_function_privilege('anon', 'public.qa_save_draft(uuid,bigint,date,jsonb)', 'execute') then
    raise exception 'anon unexpectedly has QA mutation access';
  end if;
end;
$$;

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'assigned-test@example.invalid', '{"provider":"email"}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pending-test@example.invalid', '{"provider":"email"}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'inactive-test@example.invalid', '{"provider":"email"}', '{}', now(), now());

insert into public.qa_members(user_id, email, display_name, active)
values
  ('10000000-0000-0000-0000-000000000001', 'assigned-test@example.invalid', 'Assigned Test', true),
  ('10000000-0000-0000-0000-000000000003', 'inactive-test@example.invalid', 'Inactive Test', false);

insert into public.qa_member_homes(member_id, home_id)
select m.id, h.id from public.qa_members m cross join public.qa_homes h
where m.user_id = '10000000-0000-0000-0000-000000000001' and h.code = 'CH1';

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  if (select count(*) from public.qa_homes) <> 1 then raise exception 'assigned member home visibility failed'; end if;
  if (select count(*) from public.qa_periods where data_class = 'demo') <> 0 then raise exception 'member can see demo periods'; end if;
  if (
    select count(*) from public.qa_submissions s join public.qa_homes h on h.id = s.home_id where h.code = 'CH2'
  ) <> 0 then raise exception 'member can see another home'; end if;
  if (select count(*) from public.qa_submissions) <> 1 then raise exception 'assigned submission visibility failed'; end if;
end;
$$;

reset role;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.qa_homes) <> 0 then raise exception 'pending user can see homes'; end if;
  if (select count(*) from public.qa_submissions) <> 0 then raise exception 'pending user can see submissions'; end if;
end; $$;

reset role;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.qa_homes) <> 0 then raise exception 'inactive user can see homes'; end if;
  if (select count(*) from public.qa_submissions) <> 0 then raise exception 'inactive user can see submissions'; end if;
end; $$;

reset role;
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select id from public.profiles where role = 'director' limit 1), 'role', 'authenticated')::text,
  true
);
set local role authenticated;
do $$ begin
  if (select count(*) from public.qa_homes) <> 7 then raise exception 'director cannot see all homes'; end if;
  if (select count(*) from public.qa_periods where data_class = 'demo') <> 1 then raise exception 'director cannot see demo data'; end if;
  if (select count(*) from public.qa_import_rows) <> 210 then raise exception 'director import trace visibility failed'; end if;
end; $$;

reset role;
rollback;
select 'qa_rls_tests_passed' as result;

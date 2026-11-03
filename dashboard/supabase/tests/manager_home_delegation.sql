begin;
do $$
declare director_id uuid; parent_user uuid; child_user uuid; other_user uuid;
        own_home uuid; other_home uuid; failed boolean;
begin
  select id into director_id from public.profiles where role='director' limit 1;
  select p.id into parent_user from public.profiles p
    join public.managers m on m.id=p.manager_id where m.name='Simmone Reid';
  select p.id into child_user from public.profiles p
    join public.managers m on m.id=p.manager_id where m.name='Shabana Haroon';
  select p.id into other_user from public.profiles p
    join public.managers m on m.id=p.manager_id where m.name='Mike Wright';
  select id into own_home from public.qa_homes where active order by name limit 1;
  select id into other_home from public.qa_homes where active and id<>own_home order by name limit 1;
  if own_home is null or other_home is null or parent_user is null or child_user is null
  then raise exception 'Live home and team fixtures unavailable'; end if;

  perform set_config('request.jwt.claim.sub',director_id::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',director_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.save_workspace_sections(parent_user,
    array['qa.monthly_reports','links.quick_links'],true,false);
  perform public.qa_assign_homes(parent_user,true,array[own_home]);
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',parent_user::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',parent_user,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.save_workspace_sections(child_user,array['qa.monthly_reports'],false,false);
  perform public.qa_assign_homes(child_user,true,array[own_home]);
  failed=false;
  begin perform public.qa_assign_homes(child_user,true,array[other_home]);
  exception when insufficient_privilege then failed=true; end;
  if not failed then raise exception 'Manager assigned a home outside their access'; end if;
  failed=false;
  begin perform public.qa_assign_homes(other_user,true,array[own_home]);
  exception when insufficient_privilege then failed=true; end;
  if not failed then raise exception 'Manager assigned a home to an unrelated user'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',child_user::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',child_user,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not private.has_qa_home_access(own_home)
  then raise exception 'Child cannot access assigned shared home'; end if;
  if private.has_qa_home_access(other_home)
  then raise exception 'Child accessed unassigned home'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',director_id::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',director_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.qa_assign_homes(parent_user,true,array[]::uuid[]);
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',child_user::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',child_user,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if private.has_qa_home_access(own_home)
  then raise exception 'Child retained a home withdrawn from the parent'; end if;
  execute 'reset role';
end $$;
rollback;
select 'home delegation and withdrawal passed; changes rolled back' as result;

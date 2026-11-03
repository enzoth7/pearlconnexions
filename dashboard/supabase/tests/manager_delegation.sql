-- Executed through MCP. All temporary grants and home assignments are rolled back.
begin;
do $$
declare director_id uuid; parent_user uuid; child_user uuid; other_user uuid;
        child_manager uuid; parent_manager uuid; failed boolean; result jsonb;
begin
  select id into director_id from public.profiles where role='director' limit 1;
  select p.id,m.id into parent_user,parent_manager from public.profiles p
    join public.managers m on m.id=p.manager_id where m.name='Simmone Reid';
  select p.id,m.id into child_user,child_manager from public.profiles p
    join public.managers m on m.id=p.manager_id where m.name='Shabana Haroon';
  select p.id into other_user from public.profiles p
    join public.managers m on m.id=p.manager_id where m.name='Mike Wright';
  if director_id is null or parent_user is null or child_user is null or other_user is null
     or not exists(select 1 from public.managers where id=child_manager
       and parent_manager_id=parent_manager)
  then raise exception 'Existing reporting line is unavailable'; end if;

  perform set_config('request.jwt.claim.sub',director_id::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',director_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.save_workspace_sections(parent_user,
    array['links.quick_links','team.organisation_chart'],true,false);
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',parent_user::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',parent_user,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result=public.my_effective_access();
  if not (result->'sections' ? 'team.organisation_chart')
    or not (result->>'can_manage_employees')::boolean
  then raise exception 'Parent did not receive Team and employee management'; end if;
  if exists(select 1 from public.workspace_access where user_id=other_user)
  then raise exception 'Manager can read another manager access'; end if;
  perform public.save_workspace_sections(child_user,
    array['links.quick_links','team.organisation_chart'],true,false);
  if not private.has_workspace_section('team.organisation_chart')
  then raise exception 'Parent lost Team access'; end if;
  if not exists(select 1 from public.team_chart_people())
  then raise exception 'Enabled Team chart is empty'; end if;
  failed=false;
  begin
    perform public.save_workspace_sections(child_user,
      array['qa.monthly_reports'],true,false);
  exception when insufficient_privilege then failed=true; end;
  if not failed then raise exception 'Parent granted a section they cannot open'; end if;
  failed=false;
  begin
    perform public.save_workspace_sections(other_user,array['links.quick_links'],true,false);
  exception when insufficient_privilege then failed=true; end;
  if not failed then raise exception 'Parent changed an unrelated manager'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',child_user::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',child_user,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not private.has_workspace_section('team.organisation_chart')
  then raise exception 'Child cannot open delegated Team'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',director_id::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',director_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.save_workspace_sections(parent_user,
    array['links.quick_links'],false,false);
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',child_user::text,true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub',child_user,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result=public.my_effective_access();
  if result->'sections' ? 'team.organisation_chart'
    or (result->>'workbook')::boolean
  then raise exception 'Child retained access withdrawn from the parent'; end if;
  if exists(select 1 from public.team_chart_people())
  then raise exception 'Hidden Team chart still returned people'; end if;
  execute 'reset role';
end $$;
rollback;
select 'manager delegation and inheritance passed; changes rolled back' as result;

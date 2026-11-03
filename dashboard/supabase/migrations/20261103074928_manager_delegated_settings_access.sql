-- Team may be assigned explicitly, but existing managers receive no automatic grant.
update public.workspace_section_catalog
set director_only = false
where id = 'team.organisation_chart';

create or replace function private.is_direct_employee(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles actor
    join public.managers employee on employee.parent_manager_id = actor.manager_id
    join public.profiles target on target.manager_id = employee.id
    where actor.id = auth.uid() and actor.role = 'manager'
      and target.id = target_user and target.role = 'manager'
      and private.current_manager_has_permission('manage_employees')
  );
$$;
revoke all on function private.is_direct_employee(uuid) from public, anon;
grant execute on function private.is_direct_employee(uuid) to authenticated;

create policy "Manager reads direct employee access" on public.workspace_access
for select to authenticated using (private.is_direct_employee(user_id));
create policy "Manager reads direct employee membership" on public.qa_members
for select to authenticated using (private.is_direct_employee(user_id));
create policy "Manager reads direct employee homes" on public.qa_member_homes
for select to authenticated using (
  exists (select 1 from public.qa_members member where member.id = member_id
    and private.is_direct_employee(member.user_id))
);

-- A delegated section remains available only while every manager above the user
-- still has that section. A director at the top has unrestricted access.
create function private.ancestors_allow_section(target_user uuid, section_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  with recursive chain as (
    select parent.id, parent.parent_manager_id, array[parent.id] path
    from public.profiles target
    join public.managers employee on employee.id = target.manager_id
    join public.managers parent on parent.id = employee.parent_manager_id
    where target.id = target_user and target.role = 'manager'
    union all
    select parent.id, parent.parent_manager_id, chain.path || parent.id
    from chain join public.managers parent on parent.id = chain.parent_manager_id
    where not parent.id = any(chain.path)
  )
  select not exists (
    select 1 from chain
    left join public.profiles p on p.manager_id = chain.id and p.role in ('manager','director')
    left join public.workspace_access a on a.user_id = p.id
    left join public.workspace_section_catalog c on c.id = section_key
    where p.role is distinct from 'director' and not coalesce(
      section_key = any(a.visible_sections) and
      case c.area when 'qa' then a.qa when 'finance' then a.finance
        when 'hr' then a.hr when 'maintenance' then a.maintenance
        when 'team' then true when 'links' then true else false end, false)
  );
$$;
revoke all on function private.ancestors_allow_section(uuid,text) from public, anon;
grant execute on function private.ancestors_allow_section(uuid,text) to authenticated;

create or replace function private.has_workspace_section(section_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    private.is_director() or exists (
      select 1 from public.workspace_access a
      join public.workspace_section_catalog c on c.id = section_key
      where a.user_id = auth.uid() and not c.director_only
        and section_key = any(a.visible_sections)
        and case c.area when 'qa' then a.qa when 'finance' then a.finance
          when 'hr' then a.hr when 'maintenance' then a.maintenance
          when 'team' then true when 'links' then true else false end
        and private.ancestors_allow_section(auth.uid(),section_key)
    )
  );
$$;

create function private.ancestors_allow_workbook(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  with recursive chain as (
    select parent.id, parent.parent_manager_id, array[parent.id] path
    from public.profiles target
    join public.managers employee on employee.id = target.manager_id
    join public.managers parent on parent.id = employee.parent_manager_id
    where target.id = target_user and target.role = 'manager'
    union all
    select parent.id, parent.parent_manager_id, chain.path || parent.id
    from chain join public.managers parent on parent.id = chain.parent_manager_id
    where not parent.id = any(chain.path)
  )
  select not exists (
    select 1 from chain
    left join public.profiles p on p.manager_id = chain.id and p.role in ('manager','director')
    left join public.workspace_access a on a.user_id = p.id
    where p.role is distinct from 'director' and not coalesce(a.workbook,false)
  );
$$;
revoke all on function private.ancestors_allow_workbook(uuid) from public, anon;
grant execute on function private.ancestors_allow_workbook(uuid) to authenticated;

create function private.has_workbook_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    private.is_director() or (
      exists (select 1 from public.profiles p join public.workspace_access a on a.user_id=p.id
        where p.id=auth.uid() and p.role='manager' and a.workbook)
      and private.ancestors_allow_workbook(auth.uid())
    )
  );
$$;
revoke all on function private.has_workbook_access() from public, anon;
grant execute on function private.has_workbook_access() to authenticated;

-- Read-only API for the signed-in user's effective navigation and delegation.
create function public.my_effective_access()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'sections', coalesce((select jsonb_agg(c.id order by c.id) from public.workspace_section_catalog c
      where private.has_workspace_section(c.id)), '[]'::jsonb),
    'workbook', private.has_workbook_access(),
    'can_manage_employees', private.current_manager_has_permission('manage_employees'),
    'can_manage_logins', private.current_manager_has_permission('manage_logins'),
    'maintenance_lead', private.manages_maintenance(),
    'homes', coalesce((select jsonb_agg(h.id) from public.qa_homes h
      where private.has_qa_home_access(h.id)), '[]'::jsonb)
  );
$$;
revoke all on function public.my_effective_access() from public, anon;
grant execute on function public.my_effective_access() to authenticated;

-- Workbook data cannot be queried directly after Workbook access is revoked.
create policy "Workbook access reads actions" on public.actions as restrictive
for select to authenticated using (private.has_workbook_access());
create policy "Workbook access reads participants" on public.action_participants as restrictive
for select to authenticated using (private.has_workbook_access());
create policy "Workbook access reads updates" on public.action_updates as restrictive
for select to authenticated using (private.has_workbook_access());
create policy "Workbook access reads signoffs" on public.action_signoffs as restrictive
for select to authenticated using (private.has_workbook_access());
create policy "Workbook access reads workstreams" on public.workstreams as restrictive
for select to authenticated using (private.has_workbook_access());

create or replace function public.save_workspace_sections(
  target_user uuid, sections text[], workbook_enabled boolean, maintenance_lead boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_manager uuid; director_admin boolean;
begin
  director_admin := private.is_director() and exists(
    select 1 from public.workspace_access where user_id=auth.uid() and is_admin);
  select manager_id into actor_manager from public.profiles
    where id=auth.uid() and role='manager';
  if not director_admin and (
    actor_manager is null or not private.current_manager_has_permission('manage_employees')
    or not private.is_direct_employee(target_user)
  ) then raise exception 'You can only manage your direct employees' using errcode='42501'; end if;
  perform 1 from public.profiles where id=target_user for update;
  if not found then raise exception 'User unavailable'; end if;
  if exists(select 1 from public.profiles where id=target_user and role='director')
  then raise exception 'Director access stays enabled' using errcode='42501'; end if;
  if sections is null or exists(
    select 1 from unnest(sections) key where not exists(
      select 1 from public.workspace_section_catalog c where c.id=key and not c.director_only)
  ) then raise exception 'Unknown or restricted section' using errcode='42501'; end if;
  if not director_admin and (
    exists(select 1 from unnest(sections) key where not private.has_workspace_section(key))
    or (workbook_enabled and not private.has_workbook_access())
    or (maintenance_lead and not private.manages_maintenance())
  ) then raise exception 'Access cannot exceed your own' using errcode='42501'; end if;
  insert into public.workspace_access(
    user_id,qa,workbook,finance,hr,maintenance,can_manage_maintenance,visible_sections
  ) values (
    target_user,
    exists(select 1 from unnest(sections) key where key like 'qa.%'),
    workbook_enabled and exists(select 1 from public.profiles where id=target_user and role='manager'),
    'finance.overview'=any(sections),'hr.overview'=any(sections),
    'maintenance.issues'=any(sections),
    maintenance_lead and 'maintenance.issues'=any(sections),
    array(select distinct unnest(sections))
  )
  on conflict(user_id) do update set
    qa=excluded.qa,workbook=excluded.workbook,finance=excluded.finance,hr=excluded.hr,
    maintenance=excluded.maintenance,can_manage_maintenance=excluded.can_manage_maintenance,
    visible_sections=excluded.visible_sections,updated_at=now();
end $$;

create or replace function public.qa_assign_homes(target_user uuid, enabled boolean, homes uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare member uuid; director_admin boolean;
begin
  director_admin := private.is_director() and exists(
    select 1 from public.workspace_access where user_id=auth.uid() and is_admin);
  if not director_admin and (
    not private.is_direct_employee(target_user)
    or exists(select 1 from unnest(homes) x where not private.has_qa_home_access(x))
  ) then raise exception 'You can only assign your own homes to direct employees' using errcode='42501'; end if;
  if homes is null or exists(select 1 from unnest(homes) x
    where not exists(select 1 from public.qa_homes h where h.id=x))
  then raise exception 'Unknown home'; end if;
  perform 1 from public.profiles where id=target_user for update;
  insert into public.qa_members(user_id,display_name,active,invited_by)
    select id,display_name,enabled,auth.uid() from public.profiles where id=target_user
    on conflict(user_id) do update set active=excluded.active returning id into member;
  if member is null then raise exception 'A login account is required'; end if;
  delete from public.qa_member_homes where member_id=member;
  insert into public.qa_member_homes(member_id,home_id,assigned_by)
    select member,x,auth.uid() from (select distinct unnest(homes) x) t;
end $$;

-- Assignments are also inherited: withdrawing a parent's home takes it away
-- from their direct and indirect employees without rewriting their records.
create function private.ancestors_allow_home(target_user uuid, target_home_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  with recursive chain as (
    select parent.id, parent.parent_manager_id, array[parent.id] path
    from public.profiles target
    join public.managers employee on employee.id=target.manager_id
    join public.managers parent on parent.id=employee.parent_manager_id
    where target.id=target_user and target.role='manager'
    union all
    select parent.id,parent.parent_manager_id,chain.path||parent.id
    from chain join public.managers parent on parent.id=chain.parent_manager_id
    where not parent.id=any(chain.path)
  )
  select not exists(
    select 1 from chain
    left join public.profiles p on p.manager_id=chain.id and p.role in ('manager','director')
    where p.role is distinct from 'director' and not exists(
      select 1 from public.qa_members m join public.qa_member_homes mh on mh.member_id=m.id
      where m.user_id=p.id and m.active and mh.home_id=target_home_id
    )
  );
$$;
revoke all on function private.ancestors_allow_home(uuid,uuid) from public, anon;
grant execute on function private.ancestors_allow_home(uuid,uuid) to authenticated;

create or replace function private.has_qa_home_access(target_home_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.qa_members m
    join public.qa_member_homes mh on mh.member_id=m.id
    left join public.workspace_access a on a.user_id=m.user_id
    where m.user_id=auth.uid() and m.active and mh.home_id=target_home_id
      and coalesce(a.qa,true)
  ) and private.ancestors_allow_home(auth.uid(),target_home_id);
$$;

create or replace function private.has_assigned_home(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.qa_members m join public.qa_member_homes a on a.member_id=m.id
    join public.qa_homes h on h.id=a.home_id
    where m.user_id=auth.uid() and m.active and h.active and h.id=target)
    and private.ancestors_allow_home(auth.uid(),target);
$$;

create function private.ancestors_allow_manager_permission(target_user uuid, requested_permission text)
returns boolean language sql stable security definer set search_path='' as $$
  with recursive chain as (
    select parent.id,parent.parent_manager_id,array[parent.id] path
    from public.profiles target
    join public.managers employee on employee.id=target.manager_id
    join public.managers parent on parent.id=employee.parent_manager_id
    where target.id=target_user and target.role='manager'
    union all
    select parent.id,parent.parent_manager_id,chain.path||parent.id
    from chain join public.managers parent on parent.id=chain.parent_manager_id
    where not parent.id=any(chain.path)
  )
  select not exists(
    select 1 from chain
    left join public.profiles p on p.manager_id=chain.id and p.role in ('manager','director')
    left join public.managers m on m.id=chain.id
    where p.role is distinct from 'director' and not coalesce(
      case requested_permission
        when 'add_actions' then m.can_add_actions
        when 'edit_actions' then m.can_edit_actions
        when 'delete_actions' then m.can_delete_actions
        when 'reassign_actions' then m.can_reassign_actions
        when 'sign_off_actions' then m.can_sign_off_actions
        when 'manage_employees' then m.can_manage_employees
        when 'manage_logins' then m.can_manage_logins
        else false end, false)
  );
$$;
revoke all on function private.ancestors_allow_manager_permission(uuid,text) from public, anon;
grant execute on function private.ancestors_allow_manager_permission(uuid,text) to authenticated;

create or replace function private.current_manager_has_permission(requested_permission text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.profiles p join public.managers m on m.id=p.manager_id
    where p.id=auth.uid() and p.role='manager'
      and case requested_permission
        when 'add_actions' then m.can_add_actions
        when 'edit_actions' then m.can_edit_actions
        when 'delete_actions' then m.can_delete_actions
        when 'reassign_actions' then m.can_reassign_actions
        when 'sign_off_actions' then m.can_sign_off_actions
        when 'manage_employees' then m.can_manage_employees
        when 'manage_logins' then m.can_manage_logins
        else false end
      and private.ancestors_allow_manager_permission(p.id,requested_permission)
  );
$$;

create function private.ancestors_allow_maintenance_lead(target_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  with recursive chain as (
    select parent.id,parent.parent_manager_id,array[parent.id] path
    from public.profiles target join public.managers employee on employee.id=target.manager_id
    join public.managers parent on parent.id=employee.parent_manager_id
    where target.id=target_user and target.role='manager'
    union all
    select parent.id,parent.parent_manager_id,chain.path||parent.id
    from chain join public.managers parent on parent.id=chain.parent_manager_id
    where not parent.id=any(chain.path)
  )
  select not exists(
    select 1 from chain
    left join public.profiles p on p.manager_id=chain.id and p.role in ('manager','director')
    left join public.workspace_access a on a.user_id=p.id
    where p.role is distinct from 'director' and not coalesce(a.maintenance and a.can_manage_maintenance,false)
  );
$$;
revoke all on function private.ancestors_allow_maintenance_lead(uuid) from public,anon;
grant execute on function private.ancestors_allow_maintenance_lead(uuid) to authenticated;

create or replace function private.manages_maintenance()
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_director() or exists(
    select 1 from public.workspace_access a where a.user_id=auth.uid()
      and a.maintenance and a.can_manage_maintenance
      and private.has_workspace_section('maintenance.issues')
      and private.ancestors_allow_maintenance_lead(auth.uid())
  );
$$;

create policy "Workbook access inserts actions" on public.actions as restrictive
for insert to authenticated with check (private.has_workbook_access());
create policy "Workbook access updates actions" on public.actions as restrictive
for update to authenticated using (private.has_workbook_access()) with check (private.has_workbook_access());
create policy "Workbook access deletes actions" on public.actions as restrictive
for delete to authenticated using (private.has_workbook_access());
create policy "Workbook access inserts participants" on public.action_participants as restrictive
for insert to authenticated with check (private.has_workbook_access());
create policy "Workbook access updates participants" on public.action_participants as restrictive
for update to authenticated using (private.has_workbook_access()) with check (private.has_workbook_access());
create policy "Workbook access deletes participants" on public.action_participants as restrictive
for delete to authenticated using (private.has_workbook_access());
create policy "Workbook access inserts updates" on public.action_updates as restrictive
for insert to authenticated with check (private.has_workbook_access());
create policy "Workbook access updates updates" on public.action_updates as restrictive
for update to authenticated using (private.has_workbook_access()) with check (private.has_workbook_access());
create policy "Workbook access deletes updates" on public.action_updates as restrictive
for delete to authenticated using (private.has_workbook_access());
create policy "Workbook access inserts signoffs" on public.action_signoffs as restrictive
for insert to authenticated with check (private.has_workbook_access());
create policy "Workbook access updates signoffs" on public.action_signoffs as restrictive
for update to authenticated using (private.has_workbook_access()) with check (private.has_workbook_access());
create policy "Workbook access deletes signoffs" on public.action_signoffs as restrictive
for delete to authenticated using (private.has_workbook_access());

create function public.team_chart_people()
returns table(id uuid,name text,role_title text,parent_manager_id uuid,include_in_org_chart boolean,director boolean)
language sql stable security definer set search_path='' as $$
  select m.id,m.name,m.role_title,m.parent_manager_id,m.include_in_org_chart,
    exists(select 1 from public.profiles p where p.manager_id=m.id and p.role='director')
  from public.managers m
  where private.has_workspace_section('team.organisation_chart')
    and m.include_in_org_chart
  order by m.name;
$$;
revoke all on function public.team_chart_people() from public,anon;
grant execute on function public.team_chart_people() to authenticated;

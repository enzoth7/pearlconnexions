-- Settings pages have separate visibility from their action permissions.
insert into public.workspace_section_catalog (id, area, director_only) values
  ('settings.users_permissions', 'settings', false),
  ('settings.houses', 'settings', false);

-- Preserve the Settings page that managers with employee-management access could already open.
update public.workspace_access access
set visible_sections = array_append(access.visible_sections, 'settings.users_permissions'),
    updated_at = now()
from public.profiles profile
join public.managers manager on manager.id = profile.manager_id
where access.user_id = profile.id and profile.role = 'manager'
  and manager.can_manage_employees
  and not 'settings.users_permissions' = any(access.visible_sections);

create or replace function private.ancestors_allow_section(target_user uuid, section_key text)
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
    left join public.profiles profile on profile.manager_id = chain.id and profile.role in ('manager','director')
    left join public.workspace_access access on access.user_id = profile.id
    left join public.workspace_section_catalog catalog on catalog.id = section_key
    where profile.role is distinct from 'director' and not coalesce(
      section_key = any(access.visible_sections) and
      case catalog.area
        when 'qa' then access.qa when 'finance' then access.finance
        when 'hr' then access.hr when 'maintenance' then access.maintenance
        when 'team' then true when 'links' then true when 'settings' then true
        else false end, false)
  );
$$;

create or replace function private.has_workspace_section(section_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    private.is_director() or exists (
      select 1 from public.workspace_access access
      join public.workspace_section_catalog catalog on catalog.id = section_key
      where access.user_id = auth.uid() and not catalog.director_only
        and section_key = any(access.visible_sections)
        and case catalog.area
          when 'qa' then access.qa when 'finance' then access.finance
          when 'hr' then access.hr when 'maintenance' then access.maintenance
          when 'team' then true when 'links' then true when 'settings' then true
          else false end
        and private.ancestors_allow_section(auth.uid(), section_key)
    )
  );
$$;

-- Viewing the employee tab does not grant its write capabilities.
create function private.can_view_direct_employee(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and private.has_workspace_section('settings.users_permissions')
    and exists (
      select 1 from public.profiles actor
      join public.managers employee on employee.parent_manager_id = actor.manager_id
      join public.profiles target on target.manager_id = employee.id
      where actor.id = auth.uid() and actor.role = 'manager'
        and target.id = target_user and target.role = 'manager'
    );
$$;
revoke all on function private.can_view_direct_employee(uuid) from public, anon;
grant execute on function private.can_view_direct_employee(uuid) to authenticated;

create policy "Manager views direct employee access" on public.workspace_access
for select to authenticated using (private.can_view_direct_employee(user_id));
create policy "Manager views direct employee membership" on public.qa_members
for select to authenticated using (private.can_view_direct_employee(user_id));
create policy "Manager views direct employee homes" on public.qa_member_homes
for select to authenticated using (
  exists (select 1 from public.qa_members member where member.id = member_id
    and private.can_view_direct_employee(member.user_id))
);

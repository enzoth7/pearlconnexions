-- Each navigation tab has a section key. Existing area grants retain their current tabs.
insert into public.workspace_section_catalog (id, area, director_only) values
  ('qa.follow_up', 'qa', false), ('qa.recurrences', 'qa', false),
  ('workbook.overview', 'workbook', false), ('workbook.calendar', 'workbook', false),
  ('workbook.actions', 'workbook', false), ('workbook.reviews', 'workbook', false),
  ('workbook.archive', 'workbook', false),
  ('finance.expenses', 'finance', false), ('finance.payroll', 'finance', false),
  ('finance.invoices', 'finance', false),
  ('hr.employees', 'hr', false), ('hr.coverage', 'hr', false),
  ('hr.recruitment', 'hr', false),
  ('maintenance.overview', 'maintenance', false),
  ('maintenance.checks', 'maintenance', false),
  ('maintenance.historical', 'maintenance', false);

update public.workspace_access access
set visible_sections = array(
  select distinct section from unnest(
    access.visible_sections ||
    case when access.workbook then array['workbook.overview','workbook.calendar','workbook.actions','workbook.reviews','workbook.archive']::text[] else '{}'::text[] end ||
    case when 'qa.incidents'=any(access.visible_sections) or 'qa.risks'=any(access.visible_sections) then array['qa.follow_up']::text[] else '{}'::text[] end ||
    case when 'qa.incidents'=any(access.visible_sections) then array['qa.recurrences']::text[] else '{}'::text[] end ||
    case when 'finance.overview'=any(access.visible_sections) then array['finance.expenses','finance.payroll','finance.invoices']::text[] else '{}'::text[] end ||
    case when 'hr.overview'=any(access.visible_sections) then array['hr.employees','hr.coverage','hr.recruitment']::text[] else '{}'::text[] end ||
    case when 'maintenance.issues'=any(access.visible_sections) then array['maintenance.overview','maintenance.checks','maintenance.historical']::text[] else '{}'::text[] end
  ) section order by section
), updated_at = now();

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
        when 'qa' then access.qa when 'workbook' then access.workbook
        when 'finance' then access.finance when 'hr' then access.hr
        when 'maintenance' then access.maintenance
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
          when 'qa' then access.qa when 'workbook' then access.workbook
          when 'finance' then access.finance when 'hr' then access.hr
          when 'maintenance' then access.maintenance
          when 'team' then true when 'links' then true when 'settings' then true
          else false end
        and private.ancestors_allow_section(auth.uid(), section_key)
    )
  );
$$;

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
    workbook_enabled and exists(select 1 from public.profiles where id=target_user and role='manager')
      and exists(select 1 from unnest(sections) key where key like 'workbook.%'),
    exists(select 1 from unnest(sections) key where key like 'finance.%'),
    exists(select 1 from unnest(sections) key where key like 'hr.%'),
    exists(select 1 from unnest(sections) key where key like 'maintenance.%'),
    maintenance_lead and 'maintenance.issues'=any(sections),
    array(select distinct unnest(sections))
  )
  on conflict(user_id) do update set
    qa=excluded.qa,workbook=excluded.workbook,finance=excluded.finance,hr=excluded.hr,
    maintenance=excluded.maintenance,can_manage_maintenance=excluded.can_manage_maintenance,
    visible_sections=excluded.visible_sections,updated_at=now();
end $$;

create or replace function private.has_workspace_area(area_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_section_catalog catalog
    where catalog.area = area_key and private.has_workspace_section(catalog.id)
  );
$$;
revoke all on function private.has_workspace_area(text) from public, anon;
grant execute on function private.has_workspace_area(text) to authenticated;

alter policy "Register section read" on public.qa_records using (
  case kind
    when 'maintenance' then private.has_workspace_section('maintenance.overview') or
      private.has_workspace_section('maintenance.issues') or private.has_workspace_section('maintenance.historical')
    when 'incidents' then private.has_workspace_section('qa.incidents') or
      private.has_workspace_section('qa.follow_up') or private.has_workspace_section('qa.recurrences')
    when 'risks' then private.has_workspace_section('qa.risks') or private.has_workspace_section('qa.follow_up')
    else private.has_workspace_section('qa.' || kind)
  end
);
alter policy "People read" on public.qa_people using (
  private.qa_people_access(home_id) or
  ((private.has_workspace_section('qa.follow_up') or private.has_workspace_section('qa.recurrences'))
    and (private.is_director() or private.has_assigned_home(home_id)))
);
alter policy "Historical incident section read" on public.qa_incident_details using (
  private.has_workspace_section('qa.incidents') or private.has_workspace_section('qa.recurrences') or
  private.has_workspace_section('qa.follow_up') or private.has_workspace_section('qa.monthly_reports') or
  private.has_workspace_section('qa.reviews')
);

alter policy "Finance homes" on public.qa_homes using (
  auth.uid() is not null and private.has_workspace_area('finance')
);
alter policy "Finance expenses read" on public.finance_expenses using (
  auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.expenses'))
);
alter policy "Finance expenses insert" on public.finance_expenses with check (
  auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.expenses'))
);
alter policy "Finance expenses update" on public.finance_expenses
  using (auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.expenses')))
  with check (auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.expenses')));
alter policy "Finance payroll read" on public.finance_payroll_periods using (
  auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.payroll'))
);
alter policy "Finance payroll insert" on public.finance_payroll_periods with check (
  auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.payroll'))
);
alter policy "Finance payroll update" on public.finance_payroll_periods
  using (auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.payroll')))
  with check (auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.payroll')));
alter policy "Finance invoices read" on public.finance_invoices using (
  auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.invoices'))
);
alter policy "Finance invoices insert" on public.finance_invoices with check (
  auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.invoices'))
);
alter policy "Finance invoices update" on public.finance_invoices
  using (auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.invoices')))
  with check (auth.uid() is not null and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.invoices')));

alter policy "HR register read" on public.hr_employees using (
  auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.employees'))
);
alter policy "HR register insert" on public.hr_employees with check (
  auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.employees'))
  and (private.is_director() or (private.current_manager_can_manage_employees()
    and manager_id = (select manager_id from public.profiles where id = auth.uid())))
);
alter policy "HR register update" on public.hr_employees
  using (auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.employees'))
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and manager_id = (select manager_id from public.profiles where id = auth.uid()))))
  with check (auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.employees'))
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and manager_id = (select manager_id from public.profiles where id = auth.uid()))));
alter policy "HR coverage homes" on public.qa_homes using (
  private.has_workspace_area('hr') and (private.is_director() or private.has_assigned_home(id))
);
alter policy "HR coverage read" on public.hr_coverage_shifts using (
  auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.coverage'))
  and (private.is_director() or private.has_assigned_home(home_id))
);
alter policy "HR coverage insert" on public.hr_coverage_shifts with check (
  auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.coverage'))
  and (private.is_director() or private.has_assigned_home(home_id))
);
alter policy "HR coverage update" on public.hr_coverage_shifts
  using (auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.coverage'))
    and (private.is_director() or private.has_assigned_home(home_id)))
  with check (auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.coverage'))
    and (private.is_director() or private.has_assigned_home(home_id)));
alter policy "HR recruitment read" on public.hr_recruitment_candidates using (
  auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.recruitment'))
  and (private.is_director() or (private.current_manager_can_manage_employees()
    and owner_manager_id = (select manager_id from public.profiles where id = auth.uid())))
);
alter policy "HR recruitment insert" on public.hr_recruitment_candidates with check (
  auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.recruitment'))
  and (private.is_director() or (private.current_manager_can_manage_employees()
    and owner_manager_id = (select manager_id from public.profiles where id = auth.uid())
    and (home_id is null or private.has_assigned_home(home_id))))
);
alter policy "HR recruitment update" on public.hr_recruitment_candidates
  using (auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.recruitment'))
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and owner_manager_id = (select manager_id from public.profiles where id = auth.uid()))))
  with check (auth.uid() is not null and (private.has_workspace_section('hr.overview') or private.has_workspace_section('hr.recruitment'))
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and owner_manager_id = (select manager_id from public.profiles where id = auth.uid())
      and (home_id is null or private.has_assigned_home(home_id)))));

alter policy "Maintenance checks read" on public.maintenance_safety_checks using (
  auth.uid() is not null and (private.has_workspace_section('maintenance.overview') or private.has_workspace_section('maintenance.checks'))
  and (private.is_director() or private.manages_maintenance() or private.has_assigned_home(home_id))
);
alter policy "Maintenance checks insert" on public.maintenance_safety_checks with check (
  auth.uid() is not null and private.has_workspace_section('maintenance.checks')
  and (private.is_director() or private.manages_maintenance())
);
alter policy "Maintenance checks update" on public.maintenance_safety_checks
  using (auth.uid() is not null and private.has_workspace_section('maintenance.checks')
    and (private.is_director() or private.manages_maintenance()))
  with check (auth.uid() is not null and private.has_workspace_section('maintenance.checks')
    and (private.is_director() or private.manages_maintenance()));

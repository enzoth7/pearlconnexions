-- Finance phase 0: Finance is visible only to the director and the people the
-- director grants it to (today Joel and Ruben). Every finance change is audited and
-- only the director sees those audit rows.

-- 1. One rule for finance access -------------------------------------------------
create or replace function private.can_use_finance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    private.is_director() or exists (
      select 1 from public.workspace_access access
      where access.user_id = auth.uid()
        and access.finance
        and exists (select 1 from unnest(access.visible_sections) key where key like 'finance.%')
    )
  );
$$;
revoke all on function private.can_use_finance() from public, anon;
grant execute on function private.can_use_finance() to authenticated;

-- The browser and the private server ask the database instead of re-implementing the rule.
create or replace function public.my_finance_access()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.can_use_finance(); $$;
revoke all on function public.my_finance_access() from public, anon;
grant execute on function public.my_finance_access() to authenticated;

-- 2. Only the director grants or removes Finance ----------------------------------
-- Managers who manage employees keep managing every other area; an employee's
-- finance sections are left exactly as the director set them.
create or replace function public.save_workspace_sections(target_user uuid, sections text[], workbook_enabled boolean, maintenance_lead boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor_manager uuid; director_admin boolean; current_finance text[];
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

  if not director_admin then
    current_finance := array(
      select key from public.workspace_access access, unnest(access.visible_sections) key
      where access.user_id = target_user and key like 'finance.%');
    if exists(select key from unnest(sections) key where key like 'finance.%'
              except select unnest(current_finance)) then
      raise exception 'Only the director can give Finance access' using errcode='42501';
    end if;
    sections := array(select key from unnest(sections) key where key not like 'finance.%');
    if exists(select 1 from unnest(sections) key where not private.has_workspace_section(key))
       or (workbook_enabled and not private.has_workbook_access())
       or (maintenance_lead and not private.manages_maintenance())
    then raise exception 'Access cannot exceed your own' using errcode='42501'; end if;
    sections := sections || current_finance;
  end if;

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

-- 3. Finance registers: finance access plus the register's own tab ----------------
do $policies$
declare
  register record;
begin
  for register in select * from (values
    ('finance_expenses', 'Finance expenses', 'finance.expenses'),
    ('finance_payroll_periods', 'Finance payroll', 'finance.payroll'),
    ('finance_invoices', 'Finance invoices', 'finance.invoices')
  ) as r(table_name, label, section)
  loop
    execute format('drop policy if exists %I on public.%I', register.label || ' read', register.table_name);
    execute format('drop policy if exists %I on public.%I', register.label || ' insert', register.table_name);
    execute format('drop policy if exists %I on public.%I', register.label || ' update', register.table_name);
    execute format($sql$create policy %I on public.%I for select to authenticated
      using ((select private.can_use_finance()) and (private.has_workspace_section('finance.overview') or private.has_workspace_section(%L)))$sql$,
      register.label || ' read', register.table_name, register.section);
    execute format($sql$create policy %I on public.%I for insert to authenticated
      with check ((select private.can_use_finance()) and (private.has_workspace_section('finance.overview') or private.has_workspace_section(%L)))$sql$,
      register.label || ' insert', register.table_name, register.section);
    execute format($sql$create policy %I on public.%I for update to authenticated
      using ((select private.can_use_finance()) and (private.has_workspace_section('finance.overview') or private.has_workspace_section(%L)))
      with check ((select private.can_use_finance()) and (private.has_workspace_section('finance.overview') or private.has_workspace_section(%L)))$sql$,
      register.label || ' update', register.table_name, register.section, register.section);
  end loop;
end $policies$;

drop policy if exists "Finance homes" on public.qa_homes;
create policy "Finance homes" on public.qa_homes for select to authenticated
  using ((select private.can_use_finance()));

-- 4. Finance attachments: same rule, and the record must exist --------------------
create or replace function private.can_access_attachment(kind text, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case kind
    when 'expense' then private.can_use_finance()
      and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.expenses'))
      and exists (select 1 from public.finance_expenses e where e.id = target)
    when 'invoice' then private.can_use_finance()
      and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.invoices'))
      and exists (select 1 from public.finance_invoices i where i.id = target)
    when 'payroll' then private.can_use_finance()
      and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.payroll'))
      and exists (select 1 from public.finance_payroll_periods p where p.id = target)
    when 'incident' then (select private.is_director()) or exists (
      select 1 from public.qa_records r where r.id = target and (select private.has_qa_home_access(r.home_id))
    )
    else false
  end
$$;

-- 5. Controller email: only finance users, through an audited function ------------
create or replace function public.set_home_controller_email(target_home uuid, new_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_use_finance() then
    raise exception 'Finance access required' using errcode = '42501';
  end if;
  if new_email is null or new_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  update public.qa_homes set controller_email = lower(trim(new_email)) where id = target_home;
  if not found then raise exception 'Home not found' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.set_home_controller_email(uuid, text) from public, anon;
grant execute on function public.set_home_controller_email(uuid, text) to authenticated;

-- 6. Audit every finance change and every attachment -----------------------------
drop trigger if exists audit_finance_expenses on public.finance_expenses;
create trigger audit_finance_expenses after insert or update or delete on public.finance_expenses
  for each row execute function private.log_activity();
drop trigger if exists audit_finance_payroll_periods on public.finance_payroll_periods;
create trigger audit_finance_payroll_periods after insert or update or delete on public.finance_payroll_periods
  for each row execute function private.log_activity();
drop trigger if exists audit_finance_invoices on public.finance_invoices;
create trigger audit_finance_invoices after insert or update or delete on public.finance_invoices
  for each row execute function private.log_activity();
drop trigger if exists audit_record_attachments on public.record_attachments;
create trigger audit_record_attachments after insert or update or delete on public.record_attachments
  for each row execute function private.log_activity();

-- Activity log: finance and attachment rows appear only to the director.
create or replace function public.get_activity_log()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_view_activity_log() then
    raise exception 'Activity log access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'as_of', now(),
    'events', (
      select coalesce(jsonb_agg(to_jsonb(event) order by event.occurred_at desc, event.event_id desc), '[]'::jsonb)
      from (
        select * from (
        select 'change:' || activity.id::text as event_id,
          activity.occurred_at,
          coalesce(profile.display_name, account.email, 'Former user') as user_name,
          activity.table_name,
          activity.operation,
          left(coalesce(
            activity.new_data->>'reference', activity.old_data->>'reference',
            activity.new_data->>'invoice_number', activity.old_data->>'invoice_number',
            activity.new_data->>'name', activity.old_data->>'name',
            activity.new_data->>'display_name', activity.old_data->>'display_name',
            activity.new_data->>'file_name', activity.old_data->>'file_name',
            activity.new_data->>'description', activity.old_data->>'description',
            activity.new_data->>'period_month', activity.old_data->>'period_month',
            target_profile.display_name,
            activity.new_data->'data'->>'title', activity.old_data->'data'->>'title',
            ''), 100) as record_label
        from public.activity_log activity
        left join public.profiles profile on profile.id = activity.actor_id
        left join auth.users account on account.id = activity.actor_id
        left join public.profiles target_profile on target_profile.id = activity.record_id
        where activity.actor_id is not null
          and (
            activity.table_name in (
              'actions', 'action_participants', 'action_updates', 'action_signoffs',
              'managers', 'qa_homes', 'qa_members', 'qa_member_homes',
              'qa_periods', 'qa_submissions', 'qa_records',
              'profiles', 'workspace_access', 'workstreams'
            )
            or (
              private.is_director()
              and activity.table_name in ('finance_expenses', 'finance_payroll_periods', 'finance_invoices', 'record_attachments')
            )
          )
        union all
        select 'login:' || login.session_id::text,
          login.signed_in_at,
          coalesce(profile.display_name, account.email, 'Former user'),
          'sign_in', 'LOGIN', ''
        from public.sign_in_events login
        left join public.profiles profile on profile.id = login.user_id
        left join auth.users account on account.id = login.user_id
        ) combined
        order by combined.occurred_at desc, combined.event_id desc
        limit 200
      ) event
    ),
    'users', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'manager_id', manager.id,
        'user_id', account.id,
        'name', manager.name,
        'email', coalesce(account.email, manager.email),
        'last_sign_in_at', account.last_sign_in_at,
        'sign_in_count', coalesce(counts.sign_in_count, 0)
      ) order by manager.name), '[]'::jsonb)
      from public.managers manager
      left join public.profiles profile on profile.manager_id = manager.id
      left join auth.users account on account.id = profile.id
      left join (
        select user_id, count(*) as sign_in_count
        from public.sign_in_events group by user_id
      ) counts on counts.user_id = account.id
    )
  );
end;
$$;

notify pgrst, 'reload schema';

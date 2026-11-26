-- A recurring task never disappears from the register: besides every month up to
-- the current one, once the latest month is completed and signed off the next
-- month's occurrence is created straight away (with its own deadline).
create or replace function public.generate_recurring_actions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_month date := date_trunc('month', (now() at time zone 'Europe/London'))::date;
  root record;
  target date;
  latest record;
  m date;
  new_id uuid;
  created integer := 0;
  last_day integer;
begin
  for root in
    select a.* from public.actions a
    where a.recurrence = 'monthly' and a.series_id is null and a.recurrence_active
  loop
    target := current_month;
    select o.id, o.period_month, o.completed_at into latest
    from public.actions o
    where o.id = root.id or o.series_id = root.id
    order by o.period_month desc
    limit 1;
    if latest.period_month >= current_month
       and latest.completed_at is not null
       and exists (select 1 from public.action_signoffs s where s.action_id = latest.id) then
      target := (latest.period_month + interval '1 month')::date;
    end if;

    m := (root.period_month + interval '1 month')::date;
    while m <= target loop
      new_id := null;
      if not exists (select 1 from public.actions x where x.series_id = root.id and x.period_month = m) then
        last_day := extract(day from (m + interval '1 month' - interval '1 day'))::integer;
        insert into public.actions (
          reference, workstream_id, title, priority, base_status, date_added, deadline,
          recurrence, recurrence_day, recurrence_active, series_id, period_month
        ) values (
          root.reference || '-' || to_char(m, 'YYMM'), root.workstream_id, root.title, root.priority,
          'Not Started', least(m, (now() at time zone 'Europe/London')::date),
          make_date(extract(year from m)::integer, extract(month from m)::integer, least(root.recurrence_day, last_day)),
          'monthly', root.recurrence_day, true, root.id, m
        )
        on conflict do nothing
        returning id into new_id;

        if new_id is not null then
          insert into public.action_participants (action_id, manager_id, responsibility_type, responsibility_text, source_workbook, source_row)
          select new_id, p.manager_id, p.responsibility_type, p.responsibility_text, 'recurring', p.source_row
          from public.action_participants p where p.action_id = root.id;
          created := created + 1;
        end if;
      end if;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;
  return created;
end;
$$;

revoke all on function public.generate_recurring_actions() from public, anon;
grant execute on function public.generate_recurring_actions() to authenticated, service_role;

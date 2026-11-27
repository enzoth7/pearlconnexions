-- Finance phase 2: the monthly picture from the Business Expenses and Staff Pay
-- Summary spreadsheets, entered by hand for now (an Excel import can fill the same
-- tables later). No staff bank details are stored anywhere.

-- 1. Monthly running costs per house (one row per cost line) ---------------------
create table if not exists public.finance_cost_lines (
  id uuid primary key default gen_random_uuid(),
  period_month date not null check (extract(day from period_month) = 1),
  home_id uuid references public.qa_homes(id), -- null = Office & management
  section text not null check (section in ('Fixed', 'Allowances', 'Variable')),
  description text not null check (length(trim(description)) between 2 and 120),
  amount_gbp numeric(12,2) not null check (amount_gbp >= 0),
  recurring boolean not null default false,
  notes text not null default '' check (length(notes) <= 1000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_cost_lines_month_idx on public.finance_cost_lines(period_month, home_id);

-- 2. Staff pay checklist per person and month (status and amounts, never bank data)
create table if not exists public.finance_payroll_entries (
  id uuid primary key default gen_random_uuid(),
  period_month date not null check (extract(day from period_month) = 1),
  staff_name text not null check (length(trim(staff_name)) between 2 and 120),
  position text not null default '' check (length(position) <= 120),
  invoice_received boolean not null default false,
  timesheet_required boolean not null default true,
  timesheet_received boolean not null default false,
  total_gbp numeric(12,2) not null default 0 check (total_gbp >= 0),
  -- { "<home uuid>": 120.5, "office": 300 }: how the total is shared between houses
  split jsonb not null default '{}'::jsonb check (jsonb_typeof(split) = 'object'),
  paid_on date,
  comments text not null default '' check (length(comments) <= 1000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_month, staff_name)
);
create index if not exists finance_payroll_entries_month_idx on public.finance_payroll_entries(period_month);

-- 3. Monthly expense budget (default on the settings row, overridable per month) --
alter table public.finance_settings
  add column if not exists monthly_expense_budget_gbp numeric(12,2) not null default 35000 check (monthly_expense_budget_gbp >= 0);

-- 4. Copy last month: recurring costs, and the staff list with statuses reset ----
create or replace function public.copy_finance_month(from_month date, to_month date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source date := date_trunc('month', from_month)::date;
  target date := date_trunc('month', to_month)::date;
  costs integer := 0;
  staff integer := 0;
begin
  if not private.can_use_finance() then
    raise exception 'Finance access required' using errcode = '42501';
  end if;
  if source = target then
    raise exception 'Choose a different month to copy from' using errcode = '22023';
  end if;

  insert into public.finance_cost_lines (period_month, home_id, section, description, amount_gbp, recurring)
  select target, line.home_id, line.section, line.description, line.amount_gbp, true
  from public.finance_cost_lines line
  where line.period_month = source and line.recurring
    and not exists (
      select 1 from public.finance_cost_lines existing
      where existing.period_month = target and existing.home_id is not distinct from line.home_id
        and lower(existing.description) = lower(line.description));
  get diagnostics costs = row_count;

  insert into public.finance_payroll_entries (period_month, staff_name, position, timesheet_required, split)
  select target, entry.staff_name, entry.position, entry.timesheet_required, '{}'::jsonb
  from public.finance_payroll_entries entry
  where entry.period_month = source
  on conflict (period_month, staff_name) do nothing;
  get diagnostics staff = row_count;

  return jsonb_build_object('costs', costs, 'staff', staff);
end $$;
revoke all on function public.copy_finance_month(date, date) from public, anon;
grant execute on function public.copy_finance_month(date, date) to authenticated;

-- 5. Guards, access and audit -------------------------------------------------------
drop trigger if exists guard_finance_cost_line on public.finance_cost_lines;
create trigger guard_finance_cost_line before insert or update on public.finance_cost_lines
  for each row execute function private.guard_finance_register();
drop trigger if exists guard_finance_payroll_entry on public.finance_payroll_entries;
create trigger guard_finance_payroll_entry before insert or update on public.finance_payroll_entries
  for each row execute function private.guard_finance_register();

alter table public.finance_cost_lines enable row level security;
alter table public.finance_payroll_entries enable row level security;
grant select, insert, update, delete on public.finance_cost_lines, public.finance_payroll_entries to authenticated;
grant all on public.finance_cost_lines, public.finance_payroll_entries to service_role;

do $policies$
declare
  register record;
begin
  for register in select * from (values
    ('finance_cost_lines', 'finance.expenses'),
    ('finance_payroll_entries', 'finance.payroll')
  ) as r(table_name, section)
  loop
    execute format('drop policy if exists "Finance monthly read" on public.%I', register.table_name);
    execute format('drop policy if exists "Finance monthly write" on public.%I', register.table_name);
    execute format($sql$create policy "Finance monthly read" on public.%I for select to authenticated
      using ((select private.can_use_finance()) and (private.has_workspace_section('finance.overview') or private.has_workspace_section(%L)))$sql$,
      register.table_name, register.section);
    execute format($sql$create policy "Finance monthly write" on public.%I for all to authenticated
      using ((select private.can_use_finance()) and private.has_workspace_section(%L))
      with check ((select private.can_use_finance()) and private.has_workspace_section(%L))$sql$,
      register.table_name, register.section, register.section);
  end loop;
end $policies$;

drop trigger if exists audit_finance_cost_lines on public.finance_cost_lines;
create trigger audit_finance_cost_lines after insert or update or delete on public.finance_cost_lines
  for each row execute function private.log_activity();
drop trigger if exists audit_finance_payroll_entries on public.finance_payroll_entries;
create trigger audit_finance_payroll_entries after insert or update or delete on public.finance_payroll_entries
  for each row execute function private.log_activity();

notify pgrst, 'reload schema';

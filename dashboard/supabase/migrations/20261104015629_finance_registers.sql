create table public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_on date not null,
  home_id uuid references public.qa_homes(id),
  kind text not null check (kind in ('Business expense','Reimbursement')),
  category text not null check (category in ('Agency','Maintenance','Property & utilities','Subsistence','Training','Operations','Other')),
  description text not null check (length(trim(description)) between 2 and 500),
  payee text not null check (length(trim(payee)) between 2 and 120),
  amount_gbp numeric(12,2) not null check (amount_gbp > 0),
  status text not null default 'Pending' check (status in ('Pending','Approved','Paid')),
  due_on date,
  paid_on date,
  notes text not null default '' check (length(notes) <= 4000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'Paid') = (paid_on is not null)),
  check (due_on is null or due_on >= expense_on),
  check (paid_on is null or paid_on >= expense_on)
);
create index finance_expenses_date_idx on public.finance_expenses(expense_on desc);
create index finance_expenses_status_idx on public.finance_expenses(status, due_on);

create table public.finance_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_month date not null unique check (extract(day from period_month) = 1),
  planned_amount_gbp numeric(12,2) check (planned_amount_gbp >= 0),
  actual_amount_gbp numeric(12,2) check (actual_amount_gbp >= 0),
  payslips_processed integer check (payslips_processed >= 0),
  payslips_correct integer check (payslips_correct >= 0),
  incomplete_payments integer check (incomplete_payments >= 0),
  rota_reconciled text not null default 'Pending' check (rota_reconciled in ('Pending','Yes','No')),
  report_sent_on date,
  notes text not null default '' check (length(notes) <= 4000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (payslips_correct is null or payslips_processed is null or payslips_correct <= payslips_processed),
  check (incomplete_payments is null or payslips_processed is null or incomplete_payments <= payslips_processed)
);

create table public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique check (length(trim(invoice_number)) between 2 and 60),
  customer_name text not null check (length(trim(customer_name)) between 2 and 120),
  home_id uuid references public.qa_homes(id),
  period_month date check (period_month is null or extract(day from period_month) = 1),
  issued_on date not null,
  due_on date not null,
  amount_gbp numeric(12,2) not null check (amount_gbp > 0),
  received_gbp numeric(12,2) not null default 0 check (received_gbp >= 0),
  last_received_on date,
  notes text not null default '' check (length(notes) <= 4000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on >= issued_on),
  check (received_gbp <= amount_gbp),
  check ((received_gbp > 0) = (last_received_on is not null)),
  check (last_received_on is null or last_received_on >= issued_on)
);
create index finance_invoices_due_idx on public.finance_invoices(due_on);

create function private.guard_finance_register() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if (new.id, new.created_at) is distinct from (old.id, old.created_at) then
      raise exception 'Record identity cannot change';
    end if;
    if new.version <> old.version + 1 then
      raise exception 'This record changed. Reload before saving.' using errcode = '40001';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger guard_finance_expense before insert or update on public.finance_expenses for each row execute function private.guard_finance_register();
create trigger guard_finance_payroll before insert or update on public.finance_payroll_periods for each row execute function private.guard_finance_register();
create trigger guard_finance_invoice before insert or update on public.finance_invoices for each row execute function private.guard_finance_register();

alter table public.finance_expenses enable row level security;
alter table public.finance_payroll_periods enable row level security;
alter table public.finance_invoices enable row level security;
revoke all on public.finance_expenses, public.finance_payroll_periods, public.finance_invoices from public, anon, authenticated;
grant select, insert, update on public.finance_expenses, public.finance_payroll_periods, public.finance_invoices to authenticated;
grant all on public.finance_expenses, public.finance_payroll_periods, public.finance_invoices to service_role;

create policy "Finance homes" on public.qa_homes for select to authenticated
  using (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance expenses read" on public.finance_expenses for select to authenticated
  using (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance expenses insert" on public.finance_expenses for insert to authenticated
  with check (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance expenses update" on public.finance_expenses for update to authenticated
  using (auth.uid() is not null and private.has_workspace_section('finance.overview'))
  with check (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance payroll read" on public.finance_payroll_periods for select to authenticated
  using (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance payroll insert" on public.finance_payroll_periods for insert to authenticated
  with check (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance payroll update" on public.finance_payroll_periods for update to authenticated
  using (auth.uid() is not null and private.has_workspace_section('finance.overview'))
  with check (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance invoices read" on public.finance_invoices for select to authenticated
  using (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance invoices insert" on public.finance_invoices for insert to authenticated
  with check (auth.uid() is not null and private.has_workspace_section('finance.overview'));
create policy "Finance invoices update" on public.finance_invoices for update to authenticated
  using (auth.uid() is not null and private.has_workspace_section('finance.overview'))
  with check (auth.uid() is not null and private.has_workspace_section('finance.overview'));

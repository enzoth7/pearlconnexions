-- Repeatable finance records for reviewing the three registers and overview.
-- Stable IDs and conflict handling leave edited or later records untouched.
begin;

with examples (code, home_name, expense_on, kind, category, description, payee, amount_gbp, status, due_on, paid_on, notes) as (
  values
    ('01', 'Brambles Acre', date '2026-09-03', 'Business expense', 'Agency', 'Evening shift cover', 'Example Staffing Co.', 3650.00, 'Paid', date '2026-09-25', date '2026-09-20', 'September agency cover.'),
    ('02', 'Coulsdon', date '2026-09-09', 'Business expense', 'Maintenance', 'Fire door closer replacement', 'Example Repairs Ltd', 1850.00, 'Paid', date '2026-09-30', date '2026-09-28', ''),
    ('03', 'Crimsworth', date '2026-09-17', 'Business expense', 'Training', 'First aid refresher course', 'Example Learning', 925.00, 'Paid', date '2026-09-29', date '2026-09-23', ''),
    ('04', 'Friday Rd', date '2026-09-26', 'Business expense', 'Subsistence', 'Household food and essentials', 'Example Supplies', 640.00, 'Paid', date '2026-10-05', date '2026-09-30', ''),
    ('05', 'Heathfields', date '2026-10-04', 'Business expense', 'Agency', 'Weekend shift cover', 'Example Staffing Co.', 4120.00, 'Paid', date '2026-10-25', date '2026-10-20', ''),
    ('06', 'Milne Park', date '2026-10-11', 'Business expense', 'Property & utilities', 'Heating service and utilities', 'Example Property Services', 2400.00, 'Paid', date '2026-10-30', date '2026-10-25', ''),
    ('07', 'Victoria Rd', date '2026-10-18', 'Business expense', 'Operations', 'Office and transport costs', 'Example Operations', 760.00, 'Approved', date '2026-11-15', null::date, 'Payment scheduled.'),
    ('08', 'Brambles Acre', date '2026-10-27', 'Reimbursement', 'Subsistence', 'Travel to appointments', 'Example Claimant 1', 320.00, 'Paid', date '2026-11-05', date '2026-11-02', ''),
    ('09', 'Coulsdon', date '2026-11-01', 'Business expense', 'Agency', 'Night shift cover', 'Example Staffing Co.', 2780.00, 'Pending', date '2026-11-15', null::date, 'Awaiting approval.'),
    ('10', 'Crimsworth', date '2026-11-02', 'Business expense', 'Maintenance', 'Bathroom tap repair', 'Example Repairs Ltd', 980.00, 'Approved', date '2026-11-12', null::date, ''),
    ('11', 'Friday Rd', date '2026-11-03', 'Business expense', 'Subsistence', 'Household essentials', 'Example Supplies', 530.00, 'Pending', date '2026-11-17', null::date, ''),
    ('12', 'Heathfields', date '2026-11-03', 'Business expense', 'Training', 'Safeguarding workshop', 'Example Learning', 410.00, 'Pending', date '2026-11-25', null::date, '')
)
insert into public.finance_expenses
  (id, home_id, expense_on, kind, category, description, payee, amount_gbp, status, due_on, paid_on, notes)
select md5('pearlconnexions:finance:expense:' || examples.code)::uuid, home.id,
  expense_on, kind, category, description, payee, amount_gbp, status, due_on, paid_on, notes
from examples join public.qa_homes home on home.name = examples.home_name
on conflict (id) do nothing;

with examples (code, period_month, planned_amount_gbp, actual_amount_gbp, payslips_processed, payslips_correct, incomplete_payments, rota_reconciled, report_sent_on, notes) as (
  values
    ('09', date '2026-09-01', 101000.00, 103250.00, 45, 44, 1, 'Yes', date '2026-10-06', 'One payment required a correction.'),
    ('10', date '2026-10-01', 104500.00, 106780.00, 46, 46, 0, 'Yes', date '2026-11-03', 'Rota and payroll reconciled.'),
    ('11', date '2026-11-01', 107000.00, null::numeric, null::integer, null::integer, null::integer, 'Pending', null::date, 'Current month awaiting payroll processing.')
)
insert into public.finance_payroll_periods
  (id, period_month, planned_amount_gbp, actual_amount_gbp, payslips_processed, payslips_correct, incomplete_payments, rota_reconciled, report_sent_on, notes)
select md5('pearlconnexions:finance:payroll:' || code)::uuid, period_month,
  planned_amount_gbp, actual_amount_gbp, payslips_processed, payslips_correct,
  incomplete_payments, rota_reconciled, report_sent_on, notes
from examples
on conflict (period_month) do nothing;

with examples (code, home_name, invoice_number, customer_name, period_month, issued_on, due_on, amount_gbp, received_gbp, last_received_on, notes) as (
  values
    ('01', 'Brambles Acre', 'INV-2026-0001', 'Example Local Authority A', date '2026-08-01', date '2026-09-05', date '2026-10-05', 52400.00, 52400.00, date '2026-10-03', ''),
    ('02', 'Coulsdon', 'INV-2026-0002', 'Example Local Authority B', date '2026-08-01', date '2026-09-12', date '2026-10-12', 38700.00, 20000.00, date '2026-10-20', 'Balance remains outstanding.'),
    ('03', 'Crimsworth', 'INV-2026-0003', 'Example Local Authority C', date '2026-08-01', date '2026-09-19', date '2026-10-19', 29500.00, 0.00, null::date, 'Awaiting payment.'),
    ('04', 'Friday Rd', 'INV-2026-0004', 'Example Local Authority A', date '2026-09-01', date '2026-10-04', date '2026-11-04', 54000.00, 54000.00, date '2026-11-02', ''),
    ('05', 'Heathfields', 'INV-2026-0005', 'Example Local Authority B', date '2026-09-01', date '2026-10-10', date '2026-11-10', 42300.00, 0.00, null::date, ''),
    ('06', 'Milne Park', 'INV-2026-0006', 'Example Local Authority C', date '2026-09-01', date '2026-10-21', date '2026-11-21', 36800.00, 12000.00, date '2026-11-01', 'Part payment received.'),
    ('07', 'Victoria Rd', 'INV-2026-0007', 'Example Local Authority A', date '2026-10-01', date '2026-11-02', date '2026-12-02', 56200.00, 0.00, null::date, ''),
    ('08', 'Brambles Acre', 'INV-2026-0008', 'Example Local Authority B', date '2026-10-01', date '2026-11-03', date '2026-12-03', 31600.00, 0.00, null::date, '')
)
insert into public.finance_invoices
  (id, home_id, invoice_number, customer_name, period_month, issued_on, due_on, amount_gbp, received_gbp, last_received_on, notes)
select md5('pearlconnexions:finance:invoice:' || examples.code)::uuid, home.id,
  invoice_number, customer_name, period_month, issued_on, due_on,
  amount_gbp, received_gbp, last_received_on, notes
from examples join public.qa_homes home on home.name = examples.home_name
on conflict (id) do nothing;

commit;

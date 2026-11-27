-- Provisional monthly finance records (fictional people and amounts) for September to
-- November 2026, shaped like Pearl's Business Expenses and Staff Pay Summary sheets.
-- November deliberately shows: over budget, a fixed cost missing, costs on an inactive
-- house, and staff with missing invoices/timesheets; October has one unpaid person.
-- Safe to re-run.
do $seed$
declare
  home record;
  month date;
  homes jsonb := '{}'::jsonb;
  rents jsonb := '{"CH1":3500,"CH2":4750,"CH3":5500,"CH4":3500,"CH5":2700,"CH6":3200,"CH7":2900}';
  bills jsonb := '{"CH1":0,"CH2":286.4,"CH3":312.1,"CH4":268.7,"CH5":244.5,"CH6":259.9,"CH7":231.2}';
  wifi jsonb := '{"CH1":37,"CH2":52.09,"CH3":54,"CH4":89.28,"CH5":74.31,"CH6":38.49,"CH7":32.99}';
  staff record;
begin
  for home in select id, code from public.qa_homes loop
    homes := homes || jsonb_build_object(home.code, home.id);
  end loop;

  if not exists (select 1 from public.finance_cost_lines where period_month between '2026-09-01' and '2026-11-01') then
    foreach month in array array['2026-09-01'::date, '2026-10-01'::date, '2026-11-01'::date] loop
      for home in select id, code, active from public.qa_homes loop
        -- Brambles Acre stopped in October, but its rent still appears in November.
        continue when home.code = 'CH1' and month = '2026-10-01';
        insert into public.finance_cost_lines (period_month, home_id, section, description, amount_gbp, recurring)
        values (month, home.id, 'Fixed', 'Rent', (rents->>home.code)::numeric, true);
        continue when home.code = 'CH1';
        insert into public.finance_cost_lines (period_month, home_id, section, description, amount_gbp, recurring) values
          (month, home.id, 'Fixed', 'Gas, electric and water', (bills->>home.code)::numeric + case month when '2026-11-01' then 38 else 0 end, true),
          (month, home.id, 'Allowances', 'House allowance', 140, true),
          (month, home.id, 'Variable', 'Transport (taxis, Oyster, petrol)', 40 + right(home.code, 1)::integer * 12 + extract(month from month)::integer, false);
        -- Sapphire's broadband is missing in November (a fixed cost that should repeat).
        if not (home.code = 'CH4' and month = '2026-11-01') then
          insert into public.finance_cost_lines (period_month, home_id, section, description, amount_gbp, recurring)
          values (month, home.id, 'Fixed', 'Broadband', (wifi->>home.code)::numeric, true);
        end if;
      end loop;

      -- Hematite: the young person's allowances (recharged to the council on the invoice).
      insert into public.finance_cost_lines (period_month, home_id, section, description, amount_gbp, recurring) values
        (month, (homes->>'CH6')::uuid, 'Allowances', 'Subsistence allowance', case month when '2026-11-01' then 291.6 when '2026-10-01' then 233.28 else 233.28 end, false),
        (month, (homes->>'CH6')::uuid, 'Allowances', 'Hair and clothing allowance', 100, true),
        (month, (homes->>'CH6')::uuid, 'Fixed', 'Council tax', 124, true),
        (month, (homes->>'CH2')::uuid, 'Fixed', 'Council tax', 292, true);

      -- Office & management (no house).
      insert into public.finance_cost_lines (period_month, home_id, section, description, amount_gbp, recurring) values
        (month, null, 'Fixed', 'Office rent', 1100, true),
        (month, null, 'Fixed', 'Payroll software', 489.44, true),
        (month, null, 'Fixed', 'Rota software', 130.49, true),
        (month, null, 'Fixed', 'Insurance', 430.22, true),
        (month, null, 'Fixed', 'Office cleaning', 50, true),
        (month, null, 'Variable', 'Recruitment advertising', case month when '2026-10-01' then 190.2 else 180 end, false);
    end loop;

    -- One-off variable costs.
    insert into public.finance_cost_lines (period_month, home_id, section, description, amount_gbp, recurring, notes) values
      ('2026-09-01', (homes->>'CH3')::uuid, 'Variable', 'Deep clean after move-in', 580, false, ''),
      ('2026-10-01', (homes->>'CH5')::uuid, 'Variable', 'Garden clearance', 320, false, ''),
      ('2026-11-01', (homes->>'CH3')::uuid, 'Variable', 'Boiler replacement', 3200, false, 'Emergency repair, landlord to confirm contribution'),
      ('2026-11-01', (homes->>'CH7')::uuid, 'Variable', 'Washing machine repair', 145, false, ''),
      ('2026-11-01', null, 'Variable', 'Training course (medication)', 650, false, '');
  end if;

  if not exists (select 1 from public.finance_payroll_entries where period_month between '2026-09-01' and '2026-11-01') then
    for staff in select * from (values
      ('Jordan Blake', 'House Lead', 'CH2', 3300, 'home'),
      ('Priya Shah', 'House Lead', 'CH3', 3450, 'home'),
      ('Leon Grant', 'House Lead', 'CH4', 3200, 'home'),
      ('Grace Adeyemi', 'House Lead', 'CH5', 3380, 'home'),
      ('Samuel Okafor', 'House Lead', 'CH6', 3600, 'home'),
      ('Mia Clarke', 'Senior Support Worker', 'CH2', 2600, 'split'),
      ('Tom Fisher', 'Senior Support Worker', 'CH3', 2480, 'split'),
      ('Ella Brooks', 'Support Worker', 'CH4', 1920, 'home'),
      ('Ryan Cole', 'Support Worker', 'CH5', 2050, 'split'),
      ('Noah Bennett', 'Support Worker', 'CH6', 2210, 'home'),
      ('Amara Lewis', 'Support Worker', 'CH7', 1760, 'home'),
      ('Chloe Hart', 'Support Worker', 'CH7', 1340, 'split'),
      ('Daniel Ward', 'Service Co-ordinator', null, 4200, 'office'),
      ('Hannah Moore', 'Office Administrator', null, 1850, 'office')
    ) as s(staff_name, position, home_code, total, kind) loop
      foreach month in array array['2026-09-01'::date, '2026-10-01'::date, '2026-11-01'::date] loop
        insert into public.finance_payroll_entries (period_month, staff_name, position, invoice_received, timesheet_required, timesheet_received, total_gbp, split, paid_on)
        values (
          month, staff.staff_name, staff.position,
          not (month = '2026-11-01' and staff.staff_name in ('Ryan Cole', 'Chloe Hart')),
          staff.kind <> 'office',
          staff.kind <> 'office' and not (month = '2026-11-01' and staff.staff_name = 'Tom Fisher'),
          staff.total + case month when '2026-10-01' then 60 when '2026-11-01' then 120 else 0 end,
          case staff.kind
            when 'office' then jsonb_build_object('office', staff.total + case month when '2026-10-01' then 60 when '2026-11-01' then 120 else 0 end)
            when 'home' then jsonb_build_object(homes->>staff.home_code, staff.total + case month when '2026-10-01' then 60 when '2026-11-01' then 120 else 0 end)
            else jsonb_build_object(homes->>staff.home_code, round((staff.total + case month when '2026-10-01' then 60 when '2026-11-01' then 120 else 0 end) * 0.6, 2),
                                    homes->>'CH7', round((staff.total + case month when '2026-10-01' then 60 when '2026-11-01' then 120 else 0 end) * 0.4, 2))
          end,
          case
            -- November pay goes out mid-December; one October payment is still outstanding.
            when month = '2026-11-01' then null
            when month = '2026-10-01' and staff.staff_name = 'Tom Fisher' then null
            else (month + interval '1 month' + interval '14 days')::date
          end
        );
      end loop;
    end loop;
  end if;

  -- November council income per house (provisional), so the monthly margin is complete.
  insert into public.finance_invoices (invoice_number, customer_name, home_id, period_month, issued_on, due_on, amount_gbp, received_gbp, last_received_on, status, sent_at)
  select v.number, v.customer, (homes->>v.code)::uuid, '2026-11-01', '2026-11-03', '2026-11-30', v.amount, v.received, case when v.received > 0 then '2026-11-20'::date end, 'Sent', '2026-11-03 09:00+00'
  from (values
    ('INV-2026-0009', 'Example Local Authority A', 'CH2', 38700, 38700),
    ('INV-2026-0010', 'Example Local Authority B', 'CH3', 42300, 20000),
    ('INV-2026-0011', 'Example Local Authority A', 'CH4', 29500, 29500),
    ('INV-2026-0012', 'Example Local Authority C', 'CH5', 54000, 0),
    ('INV-2026-0013', 'Example Local Authority B', 'CH6', 31200, 31200),
    ('INV-2026-0014', 'Example Local Authority C', 'CH7', 36800, 0)
  ) as v(number, customer, code, amount, received)
  where not exists (select 1 from public.finance_invoices i where i.invoice_number = v.number);
end $seed$;

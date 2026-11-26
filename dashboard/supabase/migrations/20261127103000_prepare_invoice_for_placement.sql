-- prepare_month_invoices can also prepare a single placement's draft (the "New invoice" action).
drop function if exists public.prepare_month_invoices(date);

create or replace function public.prepare_month_invoices(target_month date, only_placement uuid default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  month_start date := date_trunc('month', target_month)::date;
  month_end date := (date_trunc('month', target_month) + interval '1 month' - interval '1 day')::date;
  mondays integer;
  placement record;
  new_id uuid;
  created integer := 0;
begin
  if not private.can_use_finance() then
    raise exception 'Finance access required' using errcode = '42501';
  end if;
  select count(*) into mondays
    from generate_series(month_start, month_end, interval '1 day') day
    where extract(isodow from day) = 1;

  for placement in
    select p.*, c.name as customer_name, c.payment_terms_days
    from public.finance_placements p
    join public.finance_customers c on c.id = p.customer_id
    where (only_placement is null or p.id = only_placement)
      and (only_placement is not null or (p.active and c.active))
      and (p.start_on is null or p.start_on <= month_end)
      and (p.end_on is null or p.end_on >= month_start)
  loop
    if exists (select 1 from public.finance_invoices i where i.placement_id = placement.id and i.period_start = month_start) then
      continue;
    end if;
    insert into public.finance_invoices (
      invoice_number, customer_name, customer_id, placement_id, home_id,
      period_month, period_start, period_end, issued_on, due_on, amount_gbp, status
    ) values (
      public.next_invoice_number(placement.young_person_initials, month_start),
      placement.customer_name, placement.customer_id, placement.id, placement.home_id,
      month_start, month_start, month_end, current_date, current_date + placement.payment_terms_days, 0, 'Draft'
    ) returning id into new_id;

    insert into public.finance_invoice_lines (invoice_id, position, line_date, quantity, quantity_label, description, unit_price)
    select new_id, line.position::integer, month_start,
      case line.item->>'basis' when 'monday' then mondays else coalesce((line.item->>'quantity')::numeric, 1) end,
      case line.item->>'basis' when 'monday' then 'Monday x' || mondays else nullif(line.item->>'quantity_label', '') end,
      line.item->>'description',
      (line.item->>'unit_price')::numeric
    from jsonb_array_elements(placement.standard_lines) with ordinality as line(item, position)
    where coalesce(line.item->>'description', '') <> ''
      and (line.item->>'basis' is distinct from 'monday' or mondays > 0);

    created := created + 1;
  end loop;
  return created;
end $$;

revoke all on function public.prepare_month_invoices(date, uuid) from public, anon;
grant execute on function public.prepare_month_invoices(date, uuid) to authenticated;

notify pgrst, 'reload schema';

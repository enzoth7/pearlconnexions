-- Finance phase 1: council invoices built from placements, with line items, a
-- Draft -> Approved -> Sent workflow, automatic numbering (PC + initials + MMYY)
-- and totals calculated from the lines. Access follows private.can_use_finance().

-- 1. Councils (customers) ----------------------------------------------------------
create table if not exists public.finance_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 120),
  billing_email text check (billing_email is null or billing_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  contact_name text check (contact_name is null or length(contact_name) <= 120),
  payment_terms_days integer not null default 5 check (payment_terms_days between 0 and 120),
  active boolean not null default true,
  notes text not null default '' check (length(notes) <= 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Placements: one young person (initials + USN only) placed by a council -------
create table if not exists public.finance_placements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.finance_customers(id),
  home_id uuid references public.qa_homes(id),
  young_person_initials text not null check (young_person_initials ~ '^[A-Z]{1,5}$'),
  usn text check (usn is null or length(trim(usn)) between 1 and 40),
  social_worker text check (social_worker is null or length(social_worker) <= 120),
  placement_address text check (placement_address is null or length(placement_address) <= 300),
  start_on date,
  end_on date,
  active boolean not null default true,
  -- [{ "description": "Subsistence", "unit_price": 58.32, "basis": "monday" },
  --  { "description": "Hair & Clothing", "unit_price": 100, "basis": "fixed", "quantity": 1 }]
  standard_lines jsonb not null default '[]'::jsonb check (jsonb_typeof(standard_lines) = 'array'),
  notes text not null default '' check (length(notes) <= 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_on is null or start_on is null or end_on >= start_on)
);
create index if not exists finance_placements_customer_idx on public.finance_placements(customer_id);

-- 3. Company details printed on invoices (single row; only the director edits) ----
create table if not exists public.finance_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  company_name text not null default '',
  trading_name text not null default '',
  address text not null default '',
  company_number text not null default '',
  website text not null default '',
  queries_email text not null default '',
  bank_name text not null default '',
  account_name text not null default '',
  account_number text not null default '',
  sort_code text not null default '',
  thanks_line text not null default 'THANK YOU FOR YOUR BUSINESS!',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Public company details only; bank details are entered in the app, never in source.
insert into public.finance_settings (company_name, trading_name, address, company_number, website)
values ('Pearl Connexions PC CIC', 'Pearl Connexions Care Services', '24 Totterdown Street London SW17 8TA', '13294525', 'www.pearlconnexions.com')
on conflict (singleton) do nothing;

-- 4. Invoices: link to council and placement, period, workflow --------------------
alter table public.finance_invoices
  add column if not exists customer_id uuid references public.finance_customers(id),
  add column if not exists placement_id uuid references public.finance_placements(id),
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists status text not null default 'Draft' check (status in ('Draft', 'Approved', 'Sent')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists sent_at timestamptz,
  add column if not exists sent_to text;

alter table public.finance_invoices drop constraint if exists finance_invoices_amount_gbp_check;
alter table public.finance_invoices drop constraint if exists finance_invoices_amount_by_status;
alter table public.finance_invoices add constraint finance_invoices_amount_by_status
  check (amount_gbp >= 0 and (status = 'Draft' or amount_gbp > 0));
alter table public.finance_invoices drop constraint if exists finance_invoices_period_order;
alter table public.finance_invoices add constraint finance_invoices_period_order
  check (period_end is null or period_start is null or period_end >= period_start);

-- Invoices recorded before this workflow were already issued.
update public.finance_invoices
  set status = 'Sent', sent_at = issued_on::timestamptz, version = version + 1
  where status = 'Draft' and placement_id is null and sent_at is null;

alter table public.finance_invoices drop constraint if exists finance_invoices_sent_has_date;
alter table public.finance_invoices add constraint finance_invoices_sent_has_date
  check ((status = 'Sent') = (sent_at is not null));

create unique index if not exists finance_invoices_placement_period_idx
  on public.finance_invoices(placement_id, period_start) where placement_id is not null;

-- 5. Invoice lines; the invoice total is always the sum of its lines --------------
create table if not exists public.finance_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.finance_invoices(id) on delete cascade,
  position integer not null default 1,
  line_date date,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  quantity_label text check (quantity_label is null or length(quantity_label) <= 60),
  description text not null check (length(trim(description)) between 2 and 200),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  amount numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now()
);
create index if not exists finance_invoice_lines_invoice_idx on public.finance_invoice_lines(invoice_id, position);

create or replace function private.guard_invoice_line()
returns trigger
language plpgsql
set search_path = ''
as $$
declare parent_status text;
begin
  select status into parent_status from public.finance_invoices
    where id = case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  -- A cascade delete of a draft invoice finds no parent any more.
  if parent_status is not null and parent_status <> 'Draft' then
    raise exception 'Only draft invoices can be changed. Move it back to draft first.' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create or replace function private.sum_invoice_lines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target uuid := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
begin
  update public.finance_invoices invoice
    set amount_gbp = coalesce((select sum(line.amount) from public.finance_invoice_lines line where line.invoice_id = target), 0),
        version = invoice.version + 1
    where invoice.id = target;
  return null;
end $$;
revoke all on function private.sum_invoice_lines() from public, anon, authenticated;

drop trigger if exists guard_invoice_line on public.finance_invoice_lines;
create trigger guard_invoice_line before insert or update or delete on public.finance_invoice_lines
  for each row execute function private.guard_invoice_line();
drop trigger if exists sum_invoice_lines on public.finance_invoice_lines;
create trigger sum_invoice_lines after insert or update or delete on public.finance_invoice_lines
  for each row execute function private.sum_invoice_lines();

-- 6. Workflow rules on the invoice itself -----------------------------------------
create or replace function private.guard_invoice_workflow()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'Sent' then
    if new.status <> 'Sent'
       or (new.invoice_number, new.customer_name, new.customer_id, new.placement_id, new.home_id,
           new.period_start, new.period_end, new.period_month, new.issued_on, new.due_on, new.amount_gbp)
          is distinct from
          (old.invoice_number, old.customer_name, old.customer_id, old.placement_id, old.home_id,
           old.period_start, old.period_end, old.period_month, old.issued_on, old.due_on, old.amount_gbp)
    then
      raise exception 'A sent invoice cannot be changed; only payments and notes can be recorded.' using errcode = '42501';
    end if;
  end if;
  if new.status = 'Approved' and old.status is distinct from 'Approved' then
    new.approved_at := now();
    new.approved_by := auth.uid();
  elsif new.status = 'Draft' then
    new.approved_at := null;
    new.approved_by := null;
  end if;
  return new;
end $$;
drop trigger if exists guard_invoice_workflow on public.finance_invoices;
create trigger guard_invoice_workflow before update on public.finance_invoices
  for each row execute function private.guard_invoice_workflow();

-- 7. Numbering and monthly drafts --------------------------------------------------
create or replace function public.next_invoice_number(initials text, period date)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (select 'PC' || upper(initials) || to_char(period, 'MMYY') as number)
  select case
    when not exists (select 1 from public.finance_invoices i where i.invoice_number = base.number) then base.number
    else base.number || '-' || (
      select min(n) from generate_series(2, 99) n
      where not exists (select 1 from public.finance_invoices i where i.invoice_number = base.number || '-' || n))
  end
  from base;
$$;

-- Creates one draft per active placement for the month, with its standard lines.
-- Returns how many drafts were created; existing invoices for that month are left alone.
create or replace function public.prepare_month_invoices(target_month date)
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
    where p.active and c.active
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

revoke all on function public.next_invoice_number(text, date) from public, anon;
revoke all on function public.prepare_month_invoices(date) from public, anon;
grant execute on function public.next_invoice_number(text, date) to authenticated;
grant execute on function public.prepare_month_invoices(date) to authenticated;

-- 8. Guards, access and audit for the new tables -----------------------------------
drop trigger if exists guard_finance_customer on public.finance_customers;
create trigger guard_finance_customer before insert or update on public.finance_customers
  for each row execute function private.guard_finance_register();
drop trigger if exists guard_finance_placement on public.finance_placements;
create trigger guard_finance_placement before insert or update on public.finance_placements
  for each row execute function private.guard_finance_register();
drop trigger if exists guard_finance_settings on public.finance_settings;
create trigger guard_finance_settings before insert or update on public.finance_settings
  for each row execute function private.guard_finance_register();

alter table public.finance_customers enable row level security;
alter table public.finance_placements enable row level security;
alter table public.finance_invoice_lines enable row level security;
alter table public.finance_settings enable row level security;

grant select, insert, update on public.finance_customers, public.finance_placements to authenticated;
grant select, insert, update, delete on public.finance_invoice_lines to authenticated;
grant select, update on public.finance_settings to authenticated;
grant delete on public.finance_invoices to authenticated;
grant all on public.finance_customers, public.finance_placements, public.finance_invoice_lines, public.finance_settings to service_role;

do $policies$
declare
  register text;
begin
  foreach register in array array['finance_customers', 'finance_placements', 'finance_invoice_lines'] loop
    execute format('drop policy if exists "Finance invoicing read" on public.%I', register);
    execute format('drop policy if exists "Finance invoicing insert" on public.%I', register);
    execute format('drop policy if exists "Finance invoicing update" on public.%I', register);
    execute format($sql$create policy "Finance invoicing read" on public.%I for select to authenticated
      using ((select private.can_use_finance()) and (private.has_workspace_section('finance.overview') or private.has_workspace_section('finance.invoices')))$sql$, register);
    execute format($sql$create policy "Finance invoicing insert" on public.%I for insert to authenticated
      with check ((select private.can_use_finance()) and private.has_workspace_section('finance.invoices'))$sql$, register);
    execute format($sql$create policy "Finance invoicing update" on public.%I for update to authenticated
      using ((select private.can_use_finance()) and private.has_workspace_section('finance.invoices'))
      with check ((select private.can_use_finance()) and private.has_workspace_section('finance.invoices'))$sql$, register);
  end loop;
end $policies$;

drop policy if exists "Finance invoice lines delete" on public.finance_invoice_lines;
create policy "Finance invoice lines delete" on public.finance_invoice_lines for delete to authenticated
  using ((select private.can_use_finance()) and private.has_workspace_section('finance.invoices'));
drop policy if exists "Finance draft invoices delete" on public.finance_invoices;
create policy "Finance draft invoices delete" on public.finance_invoices for delete to authenticated
  using (status = 'Draft' and (select private.can_use_finance()) and private.has_workspace_section('finance.invoices'));

drop policy if exists "Finance settings read" on public.finance_settings;
drop policy if exists "Finance settings director update" on public.finance_settings;
create policy "Finance settings read" on public.finance_settings for select to authenticated
  using ((select private.can_use_finance()));
create policy "Finance settings director update" on public.finance_settings for update to authenticated
  using ((select private.is_director())) with check ((select private.is_director()));

drop trigger if exists audit_finance_customers on public.finance_customers;
create trigger audit_finance_customers after insert or update or delete on public.finance_customers
  for each row execute function private.log_activity();
drop trigger if exists audit_finance_placements on public.finance_placements;
create trigger audit_finance_placements after insert or update or delete on public.finance_placements
  for each row execute function private.log_activity();
drop trigger if exists audit_finance_invoice_lines on public.finance_invoice_lines;
create trigger audit_finance_invoice_lines after insert or update or delete on public.finance_invoice_lines
  for each row execute function private.log_activity();
drop trigger if exists audit_finance_settings on public.finance_settings;
create trigger audit_finance_settings after insert or update or delete on public.finance_settings
  for each row execute function private.log_activity();

-- 9. Activity log: every finance table (now and future finance_*) is director-only.
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
              and (activity.table_name like 'finance_%' or activity.table_name = 'record_attachments')
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

-- Joel's 25/11 requests: monthly recurring workbook actions with formal sign-off,
-- file attachments for expenses and incidents, and sending expenses to the
-- neighbourhood controller.

-- 1. Recurring workbook actions ------------------------------------------------
-- A series root is a normal action with recurrence = 'monthly'. Every later month
-- is its own action row (own deadline, own sign-off) pointing to the root.
alter table public.actions drop constraint if exists actions_reference_check;
alter table public.actions add constraint actions_reference_check
  check (reference ~ '^[A-Z]{2}[0-9]{2}(-[0-9]{4})?$');

alter table public.actions
  add column if not exists recurrence text check (recurrence in ('monthly')),
  add column if not exists recurrence_day smallint check (recurrence_day between 1 and 31),
  add column if not exists recurrence_active boolean not null default true,
  add column if not exists series_id uuid references public.actions(id) on delete cascade,
  add column if not exists period_month date check (period_month is null or extract(day from period_month) = 1);

alter table public.actions drop constraint if exists actions_recurrence_shape;
alter table public.actions add constraint actions_recurrence_shape check (
  (recurrence is null and series_id is null and period_month is null)
  or (recurrence = 'monthly' and recurrence_day is not null and period_month is not null)
);

create index if not exists actions_series_idx on public.actions(series_id);
create unique index if not exists actions_series_period_idx
  on public.actions ((coalesce(series_id, id)), period_month) where recurrence is not null;

-- Creates every missing monthly occurrence up to the current London month.
-- Idempotent: the dashboard calls it on load; it only copies existing series roots.
create or replace function public.generate_recurring_actions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target date := date_trunc('month', (now() at time zone 'Europe/London'))::date;
  root record;
  m date;
  new_id uuid;
  created integer := 0;
  last_day integer;
begin
  for root in
    select a.* from public.actions a
    where a.recurrence = 'monthly' and a.series_id is null and a.recurrence_active
  loop
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
          'Not Started', m,
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

-- Managers who can edit a recurring occurrence may mark it completed; it still
-- needs the owner's sign-off before it counts as done.
create or replace function private.enforce_action_sensitive_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (select private.is_manager())
     and new.completed_at is distinct from old.completed_at
     and not (select private.can_sign_off_manager_action(old.id))
     and not (old.recurrence is not null and (select private.can_edit_manager_action(old.id))) then
    raise exception 'Sign-off permission required' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 2. Controller email per home and expense send log ------------------------------
alter table public.qa_homes
  add column if not exists controller_email text
  check (controller_email is null or controller_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

alter table public.finance_expenses
  add column if not exists sent_to text,
  add column if not exists sent_at timestamptz;

-- 3. Attachments (expenses and incident reports) ---------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create table if not exists public.record_attachments (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('expense', 'incident')),
  entity_id uuid not null,
  storage_path text not null unique,
  file_name text not null check (length(file_name) between 1 and 255),
  content_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists record_attachments_entity_idx on public.record_attachments(entity, entity_id);

create or replace function private.can_access_attachment(kind text, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case kind
    when 'expense' then (select private.is_director()) or (select private.has_workspace_section('finance.overview'))
    when 'incident' then (select private.is_director()) or exists (
      select 1 from public.qa_records r where r.id = target and (select private.has_qa_home_access(r.home_id))
    )
    else false
  end
$$;

-- Storage paths are "<entity>/<entity id>/<file>".
create or replace function private.can_access_attachment_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when object_name ~ '^(expense|incident)/[0-9a-f-]{36}/'
      then private.can_access_attachment(split_part(object_name, '/', 1), split_part(object_name, '/', 2)::uuid)
    else false
  end
$$;

revoke all on function private.can_access_attachment(text, uuid) from public, anon;
revoke all on function private.can_access_attachment_path(text) from public, anon;
grant execute on function private.can_access_attachment(text, uuid) to authenticated;
grant execute on function private.can_access_attachment_path(text) to authenticated;

alter table public.record_attachments enable row level security;
grant select, insert, delete on public.record_attachments to authenticated;
grant all on public.record_attachments to service_role;

drop policy if exists "Attachments read" on public.record_attachments;
drop policy if exists "Attachments insert" on public.record_attachments;
drop policy if exists "Attachments delete" on public.record_attachments;
create policy "Attachments read" on public.record_attachments for select to authenticated
  using ((select private.can_access_attachment(entity, entity_id)));
create policy "Attachments insert" on public.record_attachments for insert to authenticated
  with check ((select private.can_access_attachment(entity, entity_id)));
create policy "Attachments delete" on public.record_attachments for delete to authenticated
  using ((select private.can_access_attachment(entity, entity_id)));

drop policy if exists "Attachments objects read" on storage.objects;
drop policy if exists "Attachments objects insert" on storage.objects;
drop policy if exists "Attachments objects delete" on storage.objects;
create policy "Attachments objects read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and private.can_access_attachment_path(name));
create policy "Attachments objects insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and private.can_access_attachment_path(name));
create policy "Attachments objects delete" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and private.can_access_attachment_path(name));

notify pgrst, 'reload schema';

-- Attachments for issued invoices and payroll periods, with the same finance access as expenses.
alter table public.record_attachments drop constraint if exists record_attachments_entity_check;
alter table public.record_attachments add constraint record_attachments_entity_check
  check (entity in ('expense', 'incident', 'invoice', 'payroll'));

create or replace function private.can_access_attachment(kind text, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('expense', 'invoice', 'payroll') then (select private.is_director()) or (select private.has_workspace_section('finance.overview'))
    when kind = 'incident' then (select private.is_director()) or exists (
      select 1 from public.qa_records r where r.id = target and (select private.has_qa_home_access(r.home_id))
    )
    else false
  end
$$;

-- Storage paths are "<entity>/<record id>/<file>".
create or replace function private.can_access_attachment_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when object_name ~ '^(expense|incident|invoice|payroll)/[0-9a-f-]{36}/'
      then private.can_access_attachment(split_part(object_name, '/', 1), split_part(object_name, '/', 2)::uuid)
    else false
  end
$$;

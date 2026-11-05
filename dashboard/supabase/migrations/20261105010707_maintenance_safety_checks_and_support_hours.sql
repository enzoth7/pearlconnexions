-- Current property checks and certificates, scoped to the existing maintenance permission.
create table public.maintenance_safety_checks (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.qa_homes(id),
  check_type text not null check (check_type in ('Gas safety','EICR','PAT','Fire alarm','Emergency lighting','Fire extinguishers','Other')),
  item_label text not null default 'Whole home' check (length(trim(item_label)) between 2 and 120),
  last_completed_on date,
  next_due_on date not null,
  certificate_reference text not null default '' check (length(certificate_reference) <= 120),
  provider text not null default '' check (length(provider) <= 120),
  notes text not null default '' check (length(notes) <= 4000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(home_id, check_type, item_label),
  check (last_completed_on is null or next_due_on >= last_completed_on)
);
create index maintenance_safety_checks_due_idx on public.maintenance_safety_checks(next_due_on);
alter table public.maintenance_safety_checks enable row level security;
revoke all on public.maintenance_safety_checks from public, anon, authenticated;
grant select, insert, update on public.maintenance_safety_checks to authenticated;
grant all on public.maintenance_safety_checks to service_role;
create policy "Maintenance checks read" on public.maintenance_safety_checks for select to authenticated
  using (auth.uid() is not null and private.has_workspace_section('maintenance.issues')
    and (private.is_director() or private.manages_maintenance() or private.has_assigned_home(home_id)));
create policy "Maintenance checks insert" on public.maintenance_safety_checks for insert to authenticated
  with check (auth.uid() is not null and private.has_workspace_section('maintenance.issues')
    and (private.is_director() or private.manages_maintenance()));
create policy "Maintenance checks update" on public.maintenance_safety_checks for update to authenticated
  using (auth.uid() is not null and private.has_workspace_section('maintenance.issues')
    and (private.is_director() or private.manages_maintenance()))
  with check (auth.uid() is not null and private.has_workspace_section('maintenance.issues')
    and (private.is_director() or private.manages_maintenance()));

create function private.guard_maintenance_safety_check() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if (new.id, new.home_id, new.created_at) is distinct from (old.id, old.home_id, old.created_at) then
      raise exception 'Check identity and home cannot change';
    end if;
    if new.version <> old.version + 1 then
      raise exception 'This check changed. Reload before saving.' using errcode = '40001';
    end if;
  end if;
  new.item_label = trim(new.item_label);
  new.updated_at = now();
  return new;
end $$;
create trigger guard_maintenance_safety_check before insert or update on public.maintenance_safety_checks
  for each row execute function private.guard_maintenance_safety_check();

-- Urgent maintenance means an immediate threat to life, with a documented safety response.
alter table public.qa_records add constraint maintenance_urgent_safety_action
  check (kind <> 'maintenance' or schema_version <> 2 or is_draft or data->>'priority' <> 'Urgent'
    or length(trim(coalesce(data->>'critical_action', ''))) > 0) not valid;

-- Separate committed and delivered 1:1 / 2:1 support from aggregate shift hours.
alter table public.hr_coverage_shifts
  add column commissioned_one_to_one_hours numeric(7,2) check (commissioned_one_to_one_hours between 0 and 9999),
  add column delivered_one_to_one_hours numeric(7,2) check (delivered_one_to_one_hours between 0 and 9999),
  add column commissioned_two_to_one_hours numeric(7,2) check (commissioned_two_to_one_hours between 0 and 9999),
  add column delivered_two_to_one_hours numeric(7,2) check (delivered_two_to_one_hours between 0 and 9999);

-- The requirement is explicit per employee; a missing answer remains unknown.
alter table public.hr_employees
  add column medication_competency_required boolean,
  add column medication_competency_expires_on date;

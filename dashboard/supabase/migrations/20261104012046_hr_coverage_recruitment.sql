-- HR coverage and recruitment registers. Missing quantities remain NULL, never zero.
create table public.hr_coverage_shifts (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.qa_homes(id),
  shift_on date not null,
  shift_type text not null check (shift_type in ('Day','Evening','Waking night','Sleep-in','Other')),
  required_staff integer check (required_staff between 0 and 100),
  planned_staff integer check (planned_staff between 0 and 100),
  present_staff integer check (present_staff between 0 and 100),
  agency_staff integer check (agency_staff between 0 and 100),
  overtime_hours numeric(7,2) check (overtime_hours between 0 and 9999),
  commissioned_support_hours numeric(7,2) check (commissioned_support_hours between 0 and 9999),
  delivered_support_hours numeric(7,2) check (delivered_support_hours between 0 and 9999),
  notes text not null default '' check (length(notes) <= 4000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (agency_staff is null or present_staff is null or agency_staff <= present_staff)
);
create index hr_coverage_shifts_home_date_idx on public.hr_coverage_shifts(home_id, shift_on desc);
alter table public.hr_coverage_shifts enable row level security;
revoke all on public.hr_coverage_shifts from public, anon, authenticated;
grant select, insert, update on public.hr_coverage_shifts to authenticated;
grant all on public.hr_coverage_shifts to service_role;

create policy "HR coverage homes" on public.qa_homes for select to authenticated
  using (private.has_workspace_section('hr.overview') and (private.is_director() or private.has_assigned_home(id)));
create policy "HR coverage read" on public.hr_coverage_shifts for select to authenticated
  using (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or private.has_assigned_home(home_id)));
create policy "HR coverage insert" on public.hr_coverage_shifts for insert to authenticated
  with check (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or private.has_assigned_home(home_id)));
create policy "HR coverage update" on public.hr_coverage_shifts for update to authenticated
  using (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or private.has_assigned_home(home_id)))
  with check (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or private.has_assigned_home(home_id)));

create table public.hr_recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null check (length(trim(candidate_name)) between 2 and 120),
  role_title text not null check (length(trim(role_title)) between 2 and 120),
  home_id uuid references public.qa_homes(id),
  owner_manager_id uuid references public.managers(id),
  stage text not null default 'Applied' check (stage in ('Applied','Shortlisted','Interview','References','Offer','Hired','Withdrawn')),
  applied_on date not null,
  interview_on date,
  references_status text not null default 'Pending' check (references_status in ('Pending','In progress','Verified')),
  dbs_status text not null default 'Pending' check (dbs_status in ('Pending','In progress','Cleared','Concern')),
  notes text not null default '' check (length(notes) <= 4000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (interview_on is null or interview_on >= applied_on)
);
create index hr_recruitment_stage_idx on public.hr_recruitment_candidates(stage, applied_on desc);
create index hr_recruitment_owner_idx on public.hr_recruitment_candidates(owner_manager_id);
alter table public.hr_recruitment_candidates enable row level security;
revoke all on public.hr_recruitment_candidates from public, anon, authenticated;
grant select, insert, update on public.hr_recruitment_candidates to authenticated;
grant all on public.hr_recruitment_candidates to service_role;

create policy "HR recruitment read" on public.hr_recruitment_candidates for select to authenticated
  using (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and owner_manager_id = (select manager_id from public.profiles where id = auth.uid()))));
create policy "HR recruitment insert" on public.hr_recruitment_candidates for insert to authenticated
  with check (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and owner_manager_id = (select manager_id from public.profiles where id = auth.uid())
      and (home_id is null or private.has_assigned_home(home_id)))));
create policy "HR recruitment update" on public.hr_recruitment_candidates for update to authenticated
  using (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and owner_manager_id = (select manager_id from public.profiles where id = auth.uid()))))
  with check (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and owner_manager_id = (select manager_id from public.profiles where id = auth.uid())
      and (home_id is null or private.has_assigned_home(home_id)))));

create function private.guard_hr_register() returns trigger language plpgsql set search_path = '' as $$
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
create trigger guard_hr_coverage_shift before insert or update on public.hr_coverage_shifts
  for each row execute function private.guard_hr_register();
create trigger guard_hr_recruitment_candidate before insert or update on public.hr_recruitment_candidates
  for each row execute function private.guard_hr_register();

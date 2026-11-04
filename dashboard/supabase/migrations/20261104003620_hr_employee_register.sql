create table public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  sample_key text unique,
  name text not null check (length(trim(name)) between 2 and 120),
  role_title text not null check (length(trim(role_title)) between 2 and 120),
  home_id uuid references public.qa_homes(id),
  manager_id uuid references public.managers(id),
  contract_type text not null default 'Full time' check (contract_type in ('Full time','Part time','Bank','Agency','Fixed term')),
  employment_status text not null default 'Active' check (employment_status in ('Active','Onboarding','On leave','Suspended','Left')),
  start_on date,
  dbs_expires_on date,
  right_to_work_expires_on date,
  first_aid_expires_on date,
  safeguarding_expires_on date,
  manual_handling_expires_on date,
  supervision_due_on date,
  probation_due_on date,
  induction_complete boolean,
  removed_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hr_employees_home_idx on public.hr_employees(home_id) where removed_at is null;
create index hr_employees_manager_idx on public.hr_employees(manager_id) where removed_at is null;
alter table public.hr_employees enable row level security;
revoke all on public.hr_employees from public, anon, authenticated;
grant select, insert, update on public.hr_employees to authenticated;
grant all on public.hr_employees to service_role;

create policy "HR register read" on public.hr_employees for select to authenticated
  using (auth.uid() is not null and private.has_workspace_section('hr.overview'));
create policy "HR register insert" on public.hr_employees for insert to authenticated
  with check (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and manager_id = (select manager_id from public.profiles where id = auth.uid()))));
create policy "HR register update" on public.hr_employees for update to authenticated
  using (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and manager_id = (select manager_id from public.profiles where id = auth.uid()))))
  with check (auth.uid() is not null and private.has_workspace_section('hr.overview')
    and (private.is_director() or (private.current_manager_can_manage_employees()
      and manager_id = (select manager_id from public.profiles where id = auth.uid()))));

create function private.guard_hr_employee() returns trigger language plpgsql set search_path = '' as $$
begin
  new.name = trim(new.name);
  new.role_title = trim(new.role_title);
  if tg_op = 'UPDATE' then
    if (new.id, new.sample_key, new.created_at) is distinct from (old.id, old.sample_key, old.created_at) then
      raise exception 'Employee identity cannot change';
    end if;
    if new.version <> old.version + 1 then
      raise exception 'This employee changed. Reload before saving.' using errcode = '40001';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger guard_hr_employee before insert or update on public.hr_employees
  for each row execute function private.guard_hr_employee();

insert into public.hr_employees
  (sample_key, name, role_title, home_id, contract_type, employment_status, start_on,
   dbs_expires_on, right_to_work_expires_on, first_aid_expires_on,
   safeguarding_expires_on, manual_handling_expires_on, supervision_due_on,
   probation_due_on, induction_complete)
select example.sample_key, example.name, example.role_title,
  (select id from public.qa_homes order by name offset example.home_offset limit 1),
  example.contract_type, example.employment_status, example.start_on::date,
  example.dbs_expires_on::date, example.right_to_work_expires_on::date,
  example.first_aid_expires_on::date, example.safeguarding_expires_on::date,
  example.manual_handling_expires_on::date, example.supervision_due_on::date,
  example.probation_due_on::date, example.induction_complete
from (values
  ('example-1','Example 1','Support Worker',0,'Full time','Active','2024-02-12','2027-02-12',null,'2027-01-20','2027-03-10','2027-04-14','2026-12-10',null,true),
  ('example-2','Example 2','Senior Support Worker',1,'Full time','Active','2023-09-04','2027-06-04',null,'2026-12-15','2027-02-18','2027-02-18','2026-11-28',null,true),
  ('example-3','Example 3','Support Worker',2,'Part time','Onboarding','2026-10-20','2027-10-20',null,null,'2027-10-20',null,'2026-12-20','2027-01-20',false),
  ('example-4','Example 4','Key Worker',3,'Full time','Active','2022-05-09','2027-05-09',null,'2027-05-09','2027-05-09','2026-11-30','2026-12-05',null,true),
  ('example-5','Example 5','Support Worker',4,'Bank','On leave','2025-07-01','2027-07-01',null,'2027-07-01','2027-07-01','2027-07-01','2027-01-10',null,true)
) as example(sample_key,name,role_title,home_offset,contract_type,employment_status,start_on,
  dbs_expires_on,right_to_work_expires_on,first_aid_expires_on,safeguarding_expires_on,
  manual_handling_expires_on,supervision_due_on,probation_due_on,induction_complete)
on conflict (sample_key) do nothing;

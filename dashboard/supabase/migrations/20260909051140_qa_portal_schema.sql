-- Pearl Connexions QA Portal
-- Isolated from the existing Leadership Dashboard tables.

create extension if not exists pg_cron with schema pg_catalog;

do $$ begin
  create type public.qa_submission_status as enum ('draft', 'submitted', 'approved', 'reopened');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.qa_data_class as enum ('demo', 'live');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.qa_metric_value_kind as enum ('ratio', 'count', 'decimal', 'derived');
exception when duplicate_object then null; end $$;

create table public.qa_homes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^CH[0-9]+$'),
  name text not null unique check (char_length(trim(name)) >= 2),
  provision text not null check (provision in ('Children''s Home', 'Supported Living', 'Supported Accommodation')),
  total_beds numeric check (total_beds is null or total_beds >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qa_metric_definitions (
  code text primary key check (code ~ '^[A-Za-z][A-Za-z0-9_]*$'),
  display_name text not null,
  category text not null check (category in ('Young People', 'Staff', 'Maintenance', 'Compliance', 'Safety', 'Operations', 'Risk', 'Finance')),
  source_scope text not null,
  description text not null default '',
  value_kind public.qa_metric_value_kind not null,
  requires_expected boolean not null default false,
  active_for_house boolean not null default false,
  display_order integer not null check (display_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (value_kind = 'derived' and requires_expected))
);

create table public.qa_metric_aliases (
  id uuid primary key default gen_random_uuid(),
  source_code text not null unique,
  metric_code text not null references public.qa_metric_definitions(code) on update cascade,
  normalization_note text not null,
  created_at timestamptz not null default now()
);

create table public.qa_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) >= 2),
  active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qa_member_homes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.qa_members(id) on delete cascade,
  home_id uuid not null references public.qa_homes(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (member_id, home_id)
);

create table public.qa_periods (
  id uuid primary key default gen_random_uuid(),
  month_start date not null check (month_start = date_trunc('month', month_start)::date),
  data_class public.qa_data_class not null,
  opens_at timestamptz not null default now(),
  due_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (month_start, data_class),
  check (due_at > opens_at),
  check (closed_at is null or closed_at >= opens_at)
);

create table public.qa_submissions (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.qa_homes(id),
  period_id uuid not null references public.qa_periods(id),
  status public.qa_submission_status not null default 'draft',
  audit_date date,
  version bigint not null default 1 check (version > 0),
  is_late boolean not null default false,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references auth.users(id) on delete set null,
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (home_id, period_id),
  check (status <> 'submitted' or submitted_at is not null),
  check (status <> 'approved' or (approved_at is not null and approved_by is not null)),
  check (status <> 'reopened' or (reopened_at is not null and char_length(trim(reopen_reason)) >= 5))
);

create table public.qa_metric_values (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.qa_submissions(id) on delete cascade,
  metric_code text not null references public.qa_metric_definitions(code) on update cascade,
  expected numeric,
  actual numeric,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, metric_code),
  check (expected is null or expected >= 0),
  check (actual is null or actual >= 0)
);

create table public.qa_imports (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_hash text not null unique,
  data_class public.qa_data_class not null default 'demo',
  status text not null check (status in ('dry_run', 'committed', 'failed')),
  source_rows integer not null check (source_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  reconciliation jsonb not null default '{}'::jsonb,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now()
);

create table public.qa_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.qa_imports(id) on delete cascade,
  source_record_id text not null,
  source_file text not null,
  source_home_code text not null,
  source_metric_code text not null,
  normalized_metric_code text not null references public.qa_metric_definitions(code),
  source_month integer not null check (source_month between 1 and 12),
  source_year integer not null check (source_year between 2000 and 2200),
  expected numeric,
  actual numeric,
  imported_at timestamptz not null default now(),
  unique (import_id, source_record_id),
  check (expected is null or expected >= 0),
  check (actual is null or actual >= 0)
);

create table public.qa_period_runs (
  id uuid primary key default gen_random_uuid(),
  period_month date not null,
  source text not null check (source in ('cron', 'director', 'migration')),
  result text not null check (result in ('created', 'repaired', 'already_exists', 'failed')),
  period_id uuid references public.qa_periods(id) on delete set null,
  drafts_created integer not null default 0 check (drafts_created >= 0),
  details text,
  created_at timestamptz not null default now()
);

create index qa_homes_active_idx on public.qa_homes(active) where active;
create index qa_members_user_active_idx on public.qa_members(user_id, active);
create index qa_member_homes_home_idx on public.qa_member_homes(home_id, member_id);
create index qa_periods_class_month_idx on public.qa_periods(data_class, month_start desc);
create index qa_submissions_period_status_idx on public.qa_submissions(period_id, status);
create index qa_submissions_home_period_idx on public.qa_submissions(home_id, period_id);
create index qa_metric_values_submission_idx on public.qa_metric_values(submission_id);
create index qa_metric_values_code_idx on public.qa_metric_values(metric_code);
create index qa_import_rows_import_idx on public.qa_import_rows(import_id);
create index qa_import_rows_home_metric_idx on public.qa_import_rows(source_home_code, normalized_metric_code);
create index qa_period_runs_month_idx on public.qa_period_runs(period_month, created_at desc);

create trigger qa_homes_updated_at before update on public.qa_homes
for each row execute function private.set_updated_at();
create trigger qa_metric_definitions_updated_at before update on public.qa_metric_definitions
for each row execute function private.set_updated_at();
create trigger qa_members_updated_at before update on public.qa_members
for each row execute function private.set_updated_at();
create trigger qa_submissions_updated_at before update on public.qa_submissions
for each row execute function private.set_updated_at();
create trigger qa_metric_values_updated_at before update on public.qa_metric_values
for each row execute function private.set_updated_at();

create or replace function private.is_active_qa_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.qa_members m
    where m.user_id = (select auth.uid()) and m.active
  );
$$;

create or replace function private.has_qa_home_access(target_home_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.qa_members m
    join public.qa_member_homes mh on mh.member_id = m.id
    where m.user_id = (select auth.uid())
      and m.active
      and mh.home_id = target_home_id
  );
$$;

revoke execute on function private.is_active_qa_member() from public, anon, service_role;
revoke execute on function private.has_qa_home_access(uuid) from public, anon, service_role;
grant execute on function private.is_active_qa_member() to authenticated;
grant execute on function private.has_qa_home_access(uuid) to authenticated;

create or replace function private.qa_save_draft_impl(
  target_submission_id uuid,
  expected_version bigint,
  target_audit_date date,
  entries jsonb
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  target_submission public.qa_submissions%rowtype;
  next_version bigint;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select s.* into target_submission
  from public.qa_submissions s
  join public.qa_periods p on p.id = s.period_id and p.data_class = 'live'
  where s.id = target_submission_id for update;
  if not found or not (select private.has_qa_home_access(target_submission.home_id)) then
    raise exception 'Submission not available' using errcode = '42501';
  end if;
  if target_submission.status not in ('draft', 'reopened') then
    raise exception 'Submitted forms are locked';
  end if;
  if target_submission.version <> expected_version then
    raise exception 'This form changed in another session. Refresh before saving.' using errcode = '40001';
  end if;
  if jsonb_typeof(entries) <> 'array' then raise exception 'Entries must be an array'; end if;
  if exists (
    select 1 from (
      select e.metric_code, count(*) from jsonb_to_recordset(entries) as e(metric_code text, expected numeric, actual numeric)
      group by e.metric_code having count(*) > 1
    ) duplicates
  ) then raise exception 'Duplicate metric code'; end if;
  if exists (
    select 1 from jsonb_to_recordset(entries) as e(metric_code text, expected numeric, actual numeric)
    left join public.qa_metric_definitions d on d.code = e.metric_code
    where d.code is null or not d.active_for_house or d.value_kind = 'derived'
      or e.expected < 0 or e.actual < 0
  ) then raise exception 'Invalid metric entry'; end if;

  insert into public.qa_metric_values(submission_id, metric_code, expected, actual, updated_by)
  select target_submission_id, e.metric_code, e.expected, e.actual, (select auth.uid())
  from jsonb_to_recordset(entries) as e(metric_code text, expected numeric, actual numeric)
  on conflict (submission_id, metric_code) do update
    set expected = excluded.expected, actual = excluded.actual, updated_by = excluded.updated_by, updated_at = now();

  insert into public.qa_metric_values(submission_id, metric_code, expected, actual, updated_by)
  select target_submission_id, 'Tasks_Pct', 1,
    case when sum(v.expected) filter (where d.value_kind = 'ratio' and d.code <> 'Occupancy_Rates') > 0
      then sum(v.actual) filter (where d.value_kind = 'ratio' and d.code <> 'Occupancy_Rates')
         / sum(v.expected) filter (where d.value_kind = 'ratio' and d.code <> 'Occupancy_Rates')
      else null end,
    (select auth.uid())
  from public.qa_metric_values v
  join public.qa_metric_definitions d on d.code = v.metric_code
  where v.submission_id = target_submission_id
  on conflict (submission_id, metric_code) do update
    set expected = excluded.expected, actual = excluded.actual, updated_by = excluded.updated_by, updated_at = now();

  insert into public.qa_metric_values(submission_id, metric_code, expected, actual, updated_by)
  select target_submission_id, 'Occupancy_Rates', 1,
    case when beds.actual > 0 then occupied.actual / beds.actual else null end,
    (select auth.uid())
  from public.qa_metric_values beds
  left join public.qa_metric_values occupied
    on occupied.submission_id = beds.submission_id and occupied.metric_code = 'Beds_Occ'
  where beds.submission_id = target_submission_id and beds.metric_code = 'Total_Beds'
  on conflict (submission_id, metric_code) do update
    set expected = excluded.expected, actual = excluded.actual, updated_by = excluded.updated_by, updated_at = now();

  update public.qa_submissions
  set audit_date = target_audit_date, version = version + 1
  where id = target_submission_id
  returning version into next_version;
  return next_version;
end;
$$;

create or replace function private.qa_submit_submission_impl(
  target_submission_id uuid,
  expected_version bigint
) returns void
language plpgsql security definer set search_path = '' as $$
declare target_submission public.qa_submissions%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select s.* into target_submission
  from public.qa_submissions s
  join public.qa_periods p on p.id = s.period_id and p.data_class = 'live'
  where s.id = target_submission_id for update;
  if not found or not (select private.has_qa_home_access(target_submission.home_id)) then
    raise exception 'Submission not available' using errcode = '42501';
  end if;
  if target_submission.status not in ('draft', 'reopened') then raise exception 'Submission is already locked'; end if;
  if target_submission.version <> expected_version then
    raise exception 'This form changed in another session. Refresh before submitting.' using errcode = '40001';
  end if;
  if target_submission.audit_date is null then raise exception 'Audit date is required'; end if;
  if exists (
    select 1 from public.qa_metric_definitions d
    left join public.qa_metric_values v
      on v.metric_code = d.code and v.submission_id = target_submission_id
    where d.active_for_house and d.value_kind <> 'derived'
      and ((d.requires_expected and (v.expected is null or v.actual is null))
        or (not d.requires_expected and v.actual is null))
  ) then raise exception 'Complete every required metric before submitting'; end if;
  update public.qa_submissions s
  set status = 'submitted',
      submitted_at = now(),
      submitted_by = (select auth.uid()),
      is_late = now() > (select p.due_at from public.qa_periods p where p.id = s.period_id),
      approved_at = null,
      approved_by = null,
      version = version + 1
  where s.id = target_submission_id;
end;
$$;

create or replace function private.qa_approve_submission_impl(target_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_director()) then raise exception 'Director access required' using errcode = '42501'; end if;
  update public.qa_submissions
  set status = 'approved', approved_at = now(), approved_by = (select auth.uid()), version = version + 1
  where id = target_submission_id and status = 'submitted';
  if not found then raise exception 'Only submitted forms can be approved'; end if;
end;
$$;

create or replace function private.qa_reopen_submission_impl(target_submission_id uuid, reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_director()) then raise exception 'Director access required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(reason, ''))) < 5 then raise exception 'A reopening reason is required'; end if;
  update public.qa_submissions
  set status = 'reopened', reopened_at = now(), reopened_by = (select auth.uid()),
      reopen_reason = trim(reason), approved_at = null, approved_by = null, version = version + 1
  where id = target_submission_id and status in ('submitted', 'approved');
  if not found then raise exception 'Only submitted or approved forms can be reopened'; end if;
end;
$$;

create or replace function private.qa_open_period_impl(target_month date, run_source text default 'cron')
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_period_id uuid; before_count integer; after_count integer; existed boolean;
begin
  if target_month <> date_trunc('month', target_month)::date then raise exception 'Period must start on the first day'; end if;
  if run_source not in ('cron', 'director', 'migration') then raise exception 'Invalid run source'; end if;
  select exists(select 1 from public.qa_periods where month_start = target_month and data_class = 'live') into existed;
  insert into public.qa_periods(month_start, data_class, opens_at, due_at)
  values (
    target_month,
    'live',
    (((target_month + interval '1 month')::date + time '02:05') at time zone 'Europe/London'),
    ((target_month + interval '1 month' + interval '9 days')::date + time '23:59') at time zone 'Europe/London'
  )
  on conflict (month_start, data_class) do nothing;
  select id into target_period_id from public.qa_periods where month_start = target_month and data_class = 'live';
  select count(*) into before_count from public.qa_submissions where period_id = target_period_id;
  insert into public.qa_submissions(home_id, period_id)
  select h.id, target_period_id from public.qa_homes h where h.active
  on conflict (home_id, period_id) do nothing;
  select count(*) into after_count from public.qa_submissions where period_id = target_period_id;
  insert into public.qa_period_runs(period_month, source, result, period_id, drafts_created, details)
  values (
    target_month,
    run_source,
    case when not existed then 'created' when after_count > before_count then 'repaired' else 'already_exists' end,
    target_period_id,
    after_count - before_count,
    'Idempotent period creation using Europe/London deadline'
  );
  return target_period_id;
end;
$$;

create or replace function private.qa_open_previous_period()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.qa_open_period_impl((date_trunc('month', now() at time zone 'Europe/London') - interval '1 month')::date, 'cron');
end;
$$;

create or replace function public.qa_save_draft(
  target_submission_id uuid, expected_version bigint, target_audit_date date, entries jsonb
) returns bigint language sql security invoker set search_path = '' as $$
  select private.qa_save_draft_impl(target_submission_id, expected_version, target_audit_date, entries);
$$;

create or replace function public.qa_submit_submission(target_submission_id uuid, expected_version bigint)
returns void language sql security invoker set search_path = '' as $$
  select private.qa_submit_submission_impl(target_submission_id, expected_version);
$$;

create or replace function public.qa_approve_submission(target_submission_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.qa_approve_submission_impl(target_submission_id);
$$;

create or replace function public.qa_reopen_submission(target_submission_id uuid, reason text)
returns void language sql security invoker set search_path = '' as $$
  select private.qa_reopen_submission_impl(target_submission_id, reason);
$$;

create or replace function public.qa_repair_period(target_month date)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if not (select private.is_director()) then raise exception 'Director access required' using errcode = '42501'; end if;
  return private.qa_open_period_impl(target_month, 'director');
end;
$$;

revoke execute on function private.qa_save_draft_impl(uuid, bigint, date, jsonb) from public, anon, service_role;
revoke execute on function private.qa_submit_submission_impl(uuid, bigint) from public, anon, service_role;
revoke execute on function private.qa_approve_submission_impl(uuid) from public, anon, service_role;
revoke execute on function private.qa_reopen_submission_impl(uuid, text) from public, anon, service_role;
revoke execute on function private.qa_open_period_impl(date, text) from public, anon, authenticated, service_role;
revoke execute on function private.qa_open_previous_period() from public, anon, authenticated, service_role;
grant execute on function private.qa_save_draft_impl(uuid, bigint, date, jsonb) to authenticated;
grant execute on function private.qa_submit_submission_impl(uuid, bigint) to authenticated;
grant execute on function private.qa_approve_submission_impl(uuid) to authenticated;
grant execute on function private.qa_reopen_submission_impl(uuid, text) to authenticated;

revoke execute on function public.qa_save_draft(uuid, bigint, date, jsonb) from public, anon;
revoke execute on function public.qa_submit_submission(uuid, bigint) from public, anon;
revoke execute on function public.qa_approve_submission(uuid) from public, anon;
revoke execute on function public.qa_reopen_submission(uuid, text) from public, anon;
revoke execute on function public.qa_repair_period(date) from public, anon;
grant execute on function public.qa_save_draft(uuid, bigint, date, jsonb) to authenticated;
grant execute on function public.qa_submit_submission(uuid, bigint) to authenticated;
grant execute on function public.qa_approve_submission(uuid) to authenticated;
grant execute on function public.qa_reopen_submission(uuid, text) to authenticated;
grant execute on function public.qa_repair_period(date) to authenticated;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'qa-open-previous-month') then
    perform cron.schedule('qa-open-previous-month', '5 2 1 * *', 'select private.qa_open_previous_period();');
  end if;
end $$;

insert into public.qa_homes(code, name, provision)
values
  ('CH1', 'Brambles Acre', 'Children''s Home'),
  ('CH2', 'Coulsdon', 'Supported Living'),
  ('CH3', 'Heathfields', 'Supported Living'),
  ('CH4', 'Crimsworth', 'Supported Living'),
  ('CH5', 'Friday Rd', 'Supported Living'),
  ('CH6', 'Victoria Rd', 'Supported Accommodation'),
  ('CH7', 'Milne Park', 'Supported Accommodation')
on conflict (code) do update set name = excluded.name, provision = excluded.provision;

insert into public.qa_metric_definitions
  (code, display_name, category, source_scope, description, value_kind, requires_expected, active_for_house, display_order)
values
  ('Staff_Shadowing','Staff Shadowing','Staff','House Template','Shadowing sessions completed for new staff','ratio',true,true,1),
  ('PCCS_Meetings','PCCS Meetings','Compliance','House Template','PCCS meetings completed','ratio',true,true,2),
  ('LA_Meetings','LA Meetings','Compliance','House Template','Local authority meetings completed','ratio',true,true,3),
  ('Daily_Log','Daily Logs','Operations','House Template','Daily logs completed by staff','ratio',true,true,4),
  ('Weekly_Reports','Weekly Reports','Compliance','House Template','Weekly reports completed','ratio',true,true,5),
  ('Behaviour_Log','Behaviour Logs','Young People','House Template','Behaviour-related incidents recorded','ratio',true,true,6),
  ('Incident_Report','Incident Reports Submitted','Safety','House Template','Incident reports submitted in the month','ratio',true,true,7),
  ('Incident_Tracker','Incident Tracker Updated','Safety','House Template','Incident tracker matching compliance','ratio',true,true,8),
  ('Restraints','Restraints Logged','Safety','House Template','Physical intervention or restraint logs','ratio',true,true,9),
  ('Health_And_Safety_Check','H&S Inspections','Safety','House Template','Regular health and safety checks','ratio',true,true,10),
  ('Maintenance_Check','Maintenance Audit Check','Maintenance','House Template','Regular visual property check by House Lead','ratio',true,true,11),
  ('Fire_Logs','Fire Logs','Safety','House Template','Fire safety logs and weekly testing','ratio',true,true,12),
  ('First_Aid_Log','First Aid Log','Safety','House Template','First aid box inspections and logs','ratio',true,true,13),
  ('Mar_Chart','MAR Charts','Compliance','House Template','Medication administration records checked','ratio',true,true,14),
  ('Signs_Of_Safety','Signs of Safety','Compliance','House Template','Signs of Safety framework applied','ratio',true,true,15),
  ('Reflective_Space','Reflective Space','Compliance','House Template','Reflective practice sessions with young people','ratio',true,true,16),
  ('Go_Bag','Go Bag Checks','Safety','House Template','Young person Go Bag status and check completed','ratio',true,true,17),
  ('Staff_Complaints','Staff Complaints','Staff','House Template','Formal complaints raised by staff','ratio',true,true,18),
  ('YP_Complaints','Young People Complaints','Young People','House Template','Formal complaints raised by young people','ratio',true,true,19),
  ('Working_Plan_Update','Working Plan Update','Compliance','House Template','Monthly review and update of placement plan','ratio',true,true,20),
  ('Counselling','Counselling Sessions','Young People','House Template','Young people therapeutic sessions attended','ratio',true,true,21),
  ('YP_Activities','Young People Activities','Young People','House Template','Young person activity and engagement log','ratio',true,true,22),
  ('Education_Attendance','Education Attendance','Young People','House Template','School or college attendance rate','ratio',true,true,23),
  ('Key_Work_Sessions','Key Work Sessions','Young People','House Template','SMART target review sessions','ratio',true,true,24),
  ('YP_Bedroom_Checks','Bedroom Checks','Young People','House Template','Bedroom safety and respect checks','ratio',true,true,25),
  ('Fire_Drill','Monthly Fire Drill','Safety','House Template','Evacuation drills conducted and logged','ratio',true,true,26),
  ('Inc_Total','Total Incidents','Safety','House Template','Aggregate incident count','count',false,true,27),
  ('Inc_Assault','Physical Assaults','Safety','House Template','Aggregate physical assault count','count',false,true,28),
  ('Inc_Absconding','Absconding Episodes','Safety','House Template','Aggregate absconding count','count',false,true,29),
  ('Inc_Missing','Missing Person Episodes','Safety','House Template','Aggregate missing person count','count',false,true,30),
  ('Inc_SelfHarm','Self Harm Incidents','Safety','House Template','Aggregate self harm count','count',false,true,31),
  ('Inc_Damage','Property Damage','Safety','House Template','Aggregate property damage count','count',false,true,32),
  ('Inc_Overdose','Overdose Incidents','Safety','House Template','Aggregate overdose count','count',false,true,33),
  ('Inc_Verbal','Verbal Abuse Incidents','Safety','House Template','Aggregate verbal abuse count','count',false,true,34),
  ('Inc_PI_Involved','Physical Interventions','Safety','House Template','Aggregate incidents involving physical intervention','count',false,true,35),
  ('Inc_Reported_24h','Reported Within 24 Hours','Safety','House Template','Aggregate incidents reported within 24 hours','count',false,true,36),
  ('Maint_Total','Total Maintenance Requests','Maintenance','Maintenance Master','Total repair jobs reported','count',false,false,37),
  ('Maintenance_Done','Maintenance Jobs Completed','Maintenance','Maintenance Master','Repair jobs completed','count',false,false,38),
  ('Maint_Pending','Outstanding Repair Jobs','Maintenance','Maintenance Master','Repairs active or pending','count',false,false,39),
  ('Staff_Total','Total Registered Staff','Staff','HR Master','Total registered staff','count',false,false,40),
  ('Staff_Active','Active Staff','Staff','HR Master','Total active employees','count',false,false,41),
  ('Staff_Suspended','Suspended Staff','Staff','HR Master','Staff currently suspended','count',false,false,42),
  ('Staff_Sick','Staff on Sickness Leave','Staff','HR Master','Staff absent due to sickness','count',false,false,43),
  ('DBS_Expired','Expired DBS','Staff','HR Master','Active staff with expired DBS checks','count',false,false,44),
  ('FirstAid_Expired','Expired First Aid Training','Staff','HR Master','Expired First Aid certifications','count',false,false,45),
  ('Safeguarding_Expired','Expired Safeguarding Training','Staff','HR Master','Expired Safeguarding certifications','count',false,false,46),
  ('ManHandling_Expired','Expired Manual Handling','Staff','HR Master','Expired Manual Handling certifications','count',false,false,47),
  ('Induction_Incomplete','Incomplete Inductions','Staff','HR Master','Incomplete staff inductions','count',false,false,48),
  ('YP_Weekly_Total','Weekly Allowance Total','Young People','Finance Master','Weekly allowance paid to young people','decimal',false,false,49),
  ('YP_Hair_Total','Hair Allowance Total','Young People','Finance Master','Hair care allowance paid','decimal',false,false,50),
  ('YP_Clothing_Total','Clothing Allowance Total','Young People','Finance Master','Clothing allowance paid','decimal',false,false,51),
  ('YP_PettyCash_Total','Petty Cash Expenses','Young People','Finance Master','Petty cash expenses','decimal',false,false,52),
  ('YP_Grand_Total','Total Finance Allowance','Young People','Finance Master','Total finance allowances','decimal',false,false,53),
  ('Occupancy_Rates','Monthly Occupancy Rate','Operations','House Template','Occupied beds divided by total beds','derived',false,true,54),
  ('Total_Beds','Property Total Beds','Operations','House Template','Total beds available','count',false,true,55),
  ('Beds_Occ','Average Occupied Beds','Operations','House Template','Average occupied beds','decimal',false,true,56),
  ('Risk_Actions_Pending','Risk Mitigation Pending','Risk','House Template','Risk mitigation plans pending','count',false,true,57),
  ('Risk_Actions_Overdue','Risk Mitigations Overdue','Risk','House Template','Risk mitigation plans past target date','count',false,true,58),
  ('Staff_Feedback','Staff Feedback','Staff','House Template','Staff feedback surveys completed','ratio',true,true,59),
  ('YP_Feedback','Young People Feedback','Young People','House Template','Young people feedback surveys completed','ratio',true,true,60),
  ('Risk_Total_Assessments','Total Risk Assessments','Risk','Dashboard v3','Aggregate risk assessments','count',false,true,61),
  ('Risk_Low','Low Risk','Risk','Dashboard v3','Aggregate low severity risks','count',false,true,62),
  ('Risk_Moderate','Moderate Risk','Risk','Dashboard v3','Aggregate moderate severity risks','count',false,true,63),
  ('Risk_High','High Risk','Risk','Dashboard v3','Aggregate high severity risks','count',false,true,64),
  ('Risk_Extremely_High','Extremely High Risk','Risk','Dashboard v3','Aggregate extremely high severity risks','count',false,true,65),
  ('Tasks_Pct','Task Completion','Compliance','Dashboard v3','Derived weighted completion percentage','derived',false,true,66),
  ('Supervision_Compliance','Supervision Compliance','Staff','Deferred','Definition retained for future collection','ratio',true,false,67)
on conflict (code) do update set
  display_name = excluded.display_name,
  category = excluded.category,
  source_scope = excluded.source_scope,
  description = excluded.description,
  value_kind = excluded.value_kind,
  requires_expected = excluded.requires_expected,
  active_for_house = excluded.active_for_house,
  display_order = excluded.display_order;

insert into public.qa_metric_aliases(source_code, metric_code, normalization_note)
values
  ('Relective_Space', 'Reflective_Space', 'Corrected source spelling'),
  ('PI_Involved', 'Inc_PI_Involved', 'Mapped workbook shorthand to canonical incident code'),
  ('Reported_24h', 'Inc_Reported_24h', 'Mapped workbook shorthand to canonical incident code')
on conflict (source_code) do update set metric_code = excluded.metric_code, normalization_note = excluded.normalization_note;

alter table public.qa_homes enable row level security;
alter table public.qa_metric_definitions enable row level security;
alter table public.qa_metric_aliases enable row level security;
alter table public.qa_members enable row level security;
alter table public.qa_member_homes enable row level security;
alter table public.qa_periods enable row level security;
alter table public.qa_submissions enable row level security;
alter table public.qa_metric_values enable row level security;
alter table public.qa_imports enable row level security;
alter table public.qa_import_rows enable row level security;
alter table public.qa_period_runs enable row level security;

revoke all on public.qa_homes, public.qa_metric_definitions, public.qa_metric_aliases,
  public.qa_members, public.qa_member_homes, public.qa_periods, public.qa_submissions,
  public.qa_metric_values, public.qa_imports, public.qa_import_rows, public.qa_period_runs
from anon, authenticated;
grant select, insert, update, delete on public.qa_homes, public.qa_metric_definitions, public.qa_metric_aliases,
  public.qa_members, public.qa_member_homes, public.qa_periods, public.qa_submissions,
  public.qa_metric_values, public.qa_imports, public.qa_import_rows, public.qa_period_runs
to authenticated;
grant all on public.qa_homes, public.qa_metric_definitions, public.qa_metric_aliases,
  public.qa_members, public.qa_member_homes, public.qa_periods, public.qa_submissions,
  public.qa_metric_values, public.qa_imports, public.qa_import_rows, public.qa_period_runs
to service_role;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'qa_homes','qa_metric_definitions','qa_metric_aliases','qa_members','qa_member_homes',
    'qa_periods','qa_submissions','qa_metric_values','qa_imports','qa_import_rows','qa_period_runs'
  ] loop
    execute format('create policy "QA director select" on public.%I for select to authenticated using ((select private.is_director()))', table_name);
    execute format('create policy "QA director insert" on public.%I for insert to authenticated with check ((select private.is_director()))', table_name);
    execute format('create policy "QA director update" on public.%I for update to authenticated using ((select private.is_director())) with check ((select private.is_director()))', table_name);
    execute format('create policy "QA director delete" on public.%I for delete to authenticated using ((select private.is_director()))', table_name);
  end loop;
end $$;

create policy "QA members read own membership" on public.qa_members
for select to authenticated using (user_id = (select auth.uid()) and active);

create policy "QA members read own home assignments" on public.qa_member_homes
for select to authenticated using (
  exists (select 1 from public.qa_members m where m.id = member_id and m.user_id = (select auth.uid()) and m.active)
);

create policy "QA members read assigned homes" on public.qa_homes
for select to authenticated using ((select private.has_qa_home_access(id)));

create policy "QA members read active metric catalogue" on public.qa_metric_definitions
for select to authenticated using ((select private.is_active_qa_member()) and active_for_house);

create policy "QA members read live periods" on public.qa_periods
for select to authenticated using ((select private.is_active_qa_member()) and data_class = 'live');

create policy "QA members read assigned live submissions" on public.qa_submissions
for select to authenticated using (
  (select private.has_qa_home_access(home_id))
  and exists (select 1 from public.qa_periods p where p.id = period_id and p.data_class = 'live')
);

create policy "QA members read assigned live metric values" on public.qa_metric_values
for select to authenticated using (
  exists (
    select 1 from public.qa_submissions s
    join public.qa_periods p on p.id = s.period_id and p.data_class = 'live'
    where s.id = submission_id and (select private.has_qa_home_access(s.home_id))
  )
);

create trigger audit_qa_homes after insert or update or delete on public.qa_homes
for each row execute function private.log_activity();
create trigger audit_qa_members after insert or update or delete on public.qa_members
for each row execute function private.log_activity();
create trigger audit_qa_member_homes after insert or update or delete on public.qa_member_homes
for each row execute function private.log_activity();
create trigger audit_qa_periods after insert or update or delete on public.qa_periods
for each row execute function private.log_activity();
create trigger audit_qa_submissions after insert or update or delete on public.qa_submissions
for each row execute function private.log_activity();
create trigger audit_qa_metric_values after insert or update or delete on public.qa_metric_values
for each row execute function private.log_activity();

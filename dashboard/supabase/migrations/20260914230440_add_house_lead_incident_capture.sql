alter table public.qa_incident_details
  add column physical_intervention boolean not null default false,
  alter column occurred_at drop not null,
  alter column incident_type drop not null,
  alter column severity drop not null,
  alter column summary drop not null,
  alter column details drop not null,
  alter column action_taken drop not null,
  alter column status drop not null;

alter table public.qa_incident_details
  drop constraint qa_incident_details_incident_type_check,
  drop constraint qa_incident_details_severity_check,
  drop constraint qa_incident_details_summary_check,
  drop constraint qa_incident_details_details_check,
  drop constraint qa_incident_details_action_taken_check,
  drop constraint qa_incident_details_follow_up_notes_check,
  drop constraint qa_incident_details_status_check;

alter table public.qa_incident_details
  add constraint qa_incident_details_incident_type_check
    check (incident_type is null or char_length(trim(incident_type)) between 3 and 80),
  add constraint qa_incident_details_severity_check
    check (severity is null or severity in ('low', 'moderate', 'high', 'critical')),
  add constraint qa_incident_details_summary_check
    check (summary is null or char_length(trim(summary)) between 5 and 240),
  add constraint qa_incident_details_details_check
    check (details is null or char_length(trim(details)) between 10 and 2000),
  add constraint qa_incident_details_action_taken_check
    check (action_taken is null or char_length(trim(action_taken)) between 5 and 2000),
  add constraint qa_incident_details_follow_up_notes_check
    check (follow_up_notes is null or char_length(trim(follow_up_notes)) between 5 and 2000),
  add constraint qa_incident_details_status_check
    check (status is null or status in ('closed', 'monitoring', 'follow_up'));

drop function public.qa_save_draft(uuid, bigint, date, jsonb);
drop function private.qa_save_draft_impl(uuid, bigint, date, jsonb);

create function private.qa_save_draft_impl(
  target_submission_id uuid,
  expected_version bigint,
  target_audit_date date,
  entries jsonb,
  incident_entries jsonb
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  target_submission public.qa_submissions%rowtype;
  target_home_code text;
  target_month date;
  next_version bigint;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;

  select s.* into target_submission
  from public.qa_submissions s
  join public.qa_periods p on p.id = s.period_id and p.data_class = 'live'
  where s.id = target_submission_id
  for update of s;

  if not found or not (select private.has_qa_home_access(target_submission.home_id)) then
    raise exception 'Submission not available' using errcode = '42501';
  end if;
  if target_submission.status not in ('draft', 'reopened') then
    raise exception 'Submitted forms are locked';
  end if;
  if target_submission.version <> expected_version then
    raise exception 'This form changed in another session. Refresh before saving.' using errcode = '40001';
  end if;

  select h.code, p.month_start into target_home_code, target_month
  from public.qa_homes h
  join public.qa_periods p on p.id = target_submission.period_id
  where h.id = target_submission.home_id;

  if jsonb_typeof(entries) <> 'array' then raise exception 'Entries must be an array'; end if;
  if jsonb_typeof(incident_entries) <> 'array' then raise exception 'Incident entries must be an array'; end if;

  if exists (
    select 1 from (
      select e.metric_code, count(*)
      from jsonb_to_recordset(entries) as e(metric_code text, expected numeric, actual numeric)
      group by e.metric_code having count(*) > 1
    ) duplicates
  ) then raise exception 'Duplicate metric code'; end if;

  if exists (
    select 1
    from jsonb_to_recordset(entries) as e(metric_code text, expected numeric, actual numeric)
    left join public.qa_metric_definitions d on d.code = e.metric_code
    where d.code is null or not d.active_for_house or d.value_kind = 'derived'
      or e.expected < 0 or e.actual < 0
  ) then raise exception 'Invalid metric entry'; end if;

  if exists (
    select 1 from (
      select e.incident_number, count(*)
      from jsonb_to_recordset(incident_entries) as e(incident_number integer)
      group by e.incident_number having e.incident_number is null or e.incident_number < 1 or count(*) > 1
    ) duplicates
  ) then raise exception 'Invalid or duplicate incident number'; end if;

  insert into public.qa_metric_values(submission_id, metric_code, expected, actual, updated_by)
  select target_submission_id, e.metric_code, e.expected, e.actual, (select auth.uid())
  from jsonb_to_recordset(entries) as e(metric_code text, expected numeric, actual numeric)
  on conflict (submission_id, metric_code) do update
    set expected = excluded.expected,
        actual = excluded.actual,
        updated_by = excluded.updated_by,
        updated_at = now();

  delete from public.qa_incident_details where submission_id = target_submission_id;

  insert into public.qa_incident_details (
    submission_id, incident_number, reference, occurred_at, incident_type, severity,
    summary, details, action_taken, follow_up_notes, physical_intervention,
    reported_within_24h, status
  )
  select
    target_submission_id,
    e.incident_number,
    concat('INC-', to_char(target_month, 'YYYYMM'), '-', target_home_code, '-', lpad(e.incident_number::text, 2, '0')),
    case when e.occurred_local is null then null else e.occurred_local at time zone 'Europe/London' end,
    nullif(trim(e.incident_type), ''),
    nullif(trim(e.severity), ''),
    nullif(trim(e.summary), ''),
    nullif(trim(e.details), ''),
    nullif(trim(e.action_taken), ''),
    nullif(trim(e.follow_up_notes), ''),
    coalesce(e.physical_intervention, false),
    coalesce(e.reported_within_24h, false),
    nullif(trim(e.status), '')
  from jsonb_to_recordset(incident_entries) as e(
    incident_number integer,
    occurred_local timestamp without time zone,
    incident_type text,
    severity text,
    summary text,
    details text,
    action_taken text,
    follow_up_notes text,
    physical_intervention boolean,
    reported_within_24h boolean,
    status text
  );

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
    set expected = excluded.expected,
        actual = excluded.actual,
        updated_by = excluded.updated_by,
        updated_at = now();

  insert into public.qa_metric_values(submission_id, metric_code, expected, actual, updated_by)
  select target_submission_id, 'Occupancy_Rates', 1,
    case when beds.actual > 0 then occupied.actual / beds.actual else null end,
    (select auth.uid())
  from public.qa_metric_values beds
  left join public.qa_metric_values occupied
    on occupied.submission_id = beds.submission_id and occupied.metric_code = 'Beds_Occ'
  where beds.submission_id = target_submission_id and beds.metric_code = 'Total_Beds'
  on conflict (submission_id, metric_code) do update
    set expected = excluded.expected,
        actual = excluded.actual,
        updated_by = excluded.updated_by,
        updated_at = now();

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
declare
  target_submission public.qa_submissions%rowtype;
  incident_total numeric;
  expected_count numeric;
  detail_count numeric;
  loop_metric_code text;
  loop_incident_label text;
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

  select actual into incident_total
  from public.qa_metric_values
  where submission_id = target_submission_id and metric_code = 'Inc_Total';

  select count(*)::numeric into detail_count
  from public.qa_incident_details
  where submission_id = target_submission_id;

  if incident_total <> trunc(incident_total) or incident_total <> detail_count then
    raise exception 'Incident total must match the number of incident records';
  end if;

  if exists (
    select 1
    from public.qa_incident_details d
    where d.submission_id = target_submission_id
      and (
        d.occurred_at is null or d.incident_type is null or d.severity is null
        or d.summary is null or d.details is null or d.action_taken is null
        or d.follow_up_notes is null or d.status is null
      )
  ) then raise exception 'Complete every incident detail before submitting'; end if;

  select actual into expected_count from public.qa_metric_values
  where submission_id = target_submission_id and metric_code = 'Inc_PI_Involved';
  select count(*)::numeric into detail_count from public.qa_incident_details
  where submission_id = target_submission_id and physical_intervention;
  if expected_count <> detail_count then raise exception 'Physical intervention count does not match the incident records'; end if;

  select actual into expected_count from public.qa_metric_values
  where submission_id = target_submission_id and metric_code = 'Inc_Reported_24h';
  select count(*)::numeric into detail_count from public.qa_incident_details
  where submission_id = target_submission_id and reported_within_24h;
  if expected_count <> detail_count then raise exception '24-hour reporting count does not match the incident records'; end if;

  for loop_metric_code, loop_incident_label in
    select mapping.metric_code, mapping.incident_label
    from (values
      ('Inc_Assault', 'Physical assault'),
      ('Inc_Absconding', 'Absconding'),
      ('Inc_Missing', 'Missing person'),
      ('Inc_SelfHarm', 'Self-harm'),
      ('Inc_Damage', 'Property damage'),
      ('Inc_Overdose', 'Overdose'),
      ('Inc_Verbal', 'Verbal abuse')
    ) as mapping(metric_code, incident_label)
  loop
    select actual into expected_count from public.qa_metric_values
    where submission_id = target_submission_id and qa_metric_values.metric_code = loop_metric_code;

    select count(*)::numeric into detail_count from public.qa_incident_details
    where submission_id = target_submission_id and incident_type = loop_incident_label;

    if expected_count <> detail_count then
      raise exception 'Incident type counts do not match the incident records';
    end if;
  end loop;

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

create function public.qa_save_draft(
  target_submission_id uuid,
  expected_version bigint,
  target_audit_date date,
  entries jsonb,
  incident_entries jsonb
) returns bigint language sql security invoker set search_path = '' as $$
  select private.qa_save_draft_impl(
    target_submission_id,
    expected_version,
    target_audit_date,
    entries,
    incident_entries
  );
$$;

revoke execute on function private.qa_save_draft_impl(uuid, bigint, date, jsonb, jsonb) from public, anon, service_role;
grant execute on function private.qa_save_draft_impl(uuid, bigint, date, jsonb, jsonb) to authenticated;

revoke execute on function public.qa_save_draft(uuid, bigint, date, jsonb, jsonb) from public, anon;
grant execute on function public.qa_save_draft(uuid, bigint, date, jsonb, jsonb) to authenticated;

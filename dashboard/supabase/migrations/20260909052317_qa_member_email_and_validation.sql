alter table public.qa_members
add column email text unique check (email is null or email = lower(trim(email)));

create index qa_members_email_idx on public.qa_members(email) where email is not null;

create or replace function private.qa_submit_submission_impl(
  target_submission_id uuid,
  expected_version bigint
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target_submission public.qa_submissions%rowtype;
  incident_total numeric;
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

  select actual into incident_total from public.qa_metric_values
  where submission_id = target_submission_id and metric_code = 'Inc_Total';
  if exists (
    select 1 from public.qa_metric_values
    where submission_id = target_submission_id
      and metric_code in (
        'Inc_Assault','Inc_Absconding','Inc_Missing','Inc_SelfHarm','Inc_Damage',
        'Inc_Overdose','Inc_Verbal','Inc_PI_Involved','Inc_Reported_24h'
      )
      and actual > incident_total
  ) then raise exception 'An incident breakdown cannot exceed total incidents'; end if;

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

revoke execute on function private.qa_submit_submission_impl(uuid, bigint) from public, anon, service_role;
grant execute on function private.qa_submit_submission_impl(uuid, bigint) to authenticated;

begin;

delete from public.qa_incident_details detail
where exists (
  select 1
  from public.qa_submissions submission
  join public.qa_periods period on period.id = submission.period_id
  where submission.id = detail.submission_id
    and period.data_class = 'demo'
    and (period.label = 'September Test' or period.label like 'Trend Test — %')
);

with report_metrics as (
  select
    submission.id as submission_id,
    home.name as home_name,
    home.code as home_code,
    period.month_start,
    (max(value.actual) filter (where value.metric_code = 'Inc_Reported_24h'))::integer as reported_24h,
    (max(value.actual) filter (where value.metric_code = 'Inc_PI_Involved'))::integer as physical_interventions
  from public.qa_submissions submission
  join public.qa_homes home on home.id = submission.home_id
  join public.qa_periods period on period.id = submission.period_id
  join public.qa_metric_values value on value.submission_id = submission.id
  where period.data_class = 'demo'
    and (period.label = 'September Test' or period.label like 'Trend Test — %')
  group by submission.id, home.name, home.code, period.month_start
), subtype_counts as (
  select
    report.submission_id,
    report.home_name,
    report.home_code,
    report.month_start,
    report.reported_24h,
    report.physical_interventions,
    definition.type_order,
    definition.incident_type,
    definition.severity,
    count_value.actual::integer as incident_count
  from report_metrics report
  join public.qa_metric_values count_value on count_value.submission_id = report.submission_id
  join (values
    ('Inc_Assault', 1, 'Physical assault', 'high'),
    ('Inc_Absconding', 2, 'Absconding', 'high'),
    ('Inc_Missing', 3, 'Missing person', 'high'),
    ('Inc_SelfHarm', 4, 'Self-harm', 'critical'),
    ('Inc_Damage', 5, 'Property damage', 'moderate'),
    ('Inc_Overdose', 6, 'Overdose', 'critical'),
    ('Inc_Verbal', 7, 'Verbal abuse', 'low')
  ) as definition(metric_code, type_order, incident_type, severity)
    on definition.metric_code = count_value.metric_code
  where count_value.actual > 0
), expanded as (
  select subtype.*, occurrence.instance_number
  from subtype_counts subtype
  cross join lateral generate_series(1, subtype.incident_count) occurrence(instance_number)
), numbered as (
  select
    expanded.*,
    row_number() over (
      partition by expanded.submission_id
      order by expanded.type_order, expanded.instance_number
    )::integer as incident_number
  from expanded
)
insert into public.qa_incident_details (
  submission_id,
  incident_number,
  reference,
  occurred_at,
  incident_type,
  severity,
  summary,
  details,
  action_taken,
  follow_up_notes,
  physical_intervention,
  reported_within_24h,
  status
)
select
  incident.submission_id,
  incident.incident_number,
  concat('INC-', to_char(incident.month_start, 'YYYYMM'), '-', incident.home_code, '-', lpad(incident.incident_number::text, 2, '0')),
  (incident.month_start + ((incident.incident_number * 3 + incident.type_order) % 21) * interval '1 day' + (8 + incident.incident_number % 10) * interval '1 hour') at time zone 'Europe/London',
  incident.incident_type,
  incident.severity,
  case incident.incident_type
    when 'Physical assault' then 'Conflict between young people required staff intervention'
    when 'Absconding' then 'Young person left the home without an agreed plan'
    when 'Missing person' then 'Young person was temporarily reported missing'
    when 'Self-harm' then 'Self-harm concern identified and safeguarding response activated'
    when 'Property damage' then 'Damage occurred during an episode of heightened distress'
    when 'Overdose' then 'Suspected overdose prompted an emergency health response'
    else 'Verbal escalation was de-escalated by the care team'
  end,
  case incident.incident_type
    when 'Physical assault' then concat('A disagreement in a communal area at ', incident.home_name, ' escalated into brief physical contact. Staff separated those involved immediately and completed welfare checks. No serious injury was identified.')
    when 'Absconding' then concat('A young person left ', incident.home_name, ' without following the agreed community-access plan. Staff followed the missing-from-care protocol and maintained contact until a safe return.')
    when 'Missing person' then concat('The young person did not return to ', incident.home_name, ' at the agreed time. The on-call manager and relevant agencies were informed, and the young person returned safely.')
    when 'Self-harm' then concat('Staff at ', incident.home_name, ' identified an immediate self-harm concern. The environment was made safe, first aid and emotional support were provided, and the safeguarding plan was reviewed.')
    when 'Property damage' then concat('During a period of heightened distress at ', incident.home_name, ', furniture in a shared area was damaged. The area was secured and no injuries were reported.')
    when 'Overdose' then concat('Staff at ', incident.home_name, ' responded to a suspected overdose. Emergency services were contacted and the young person received an immediate medical assessment.')
    else concat('A young person at ', incident.home_name, ' became verbally escalated following a boundary-setting conversation. Staff used de-escalation techniques and the situation settled without physical intervention.')
  end,
  case incident.incident_type
    when 'Physical assault' then 'Immediate separation, welfare checks and restorative conversations were completed. Risk assessments were updated.'
    when 'Absconding' then 'Missing-from-care procedures were followed and a return-home conversation was completed.'
    when 'Missing person' then 'Police and the on-call manager were updated. A safe-and-well check and return interview were arranged.'
    when 'Self-harm' then 'First aid, safeguarding notifications and an urgent care-plan review were completed.'
    when 'Property damage' then 'The area was made safe, maintenance was notified and a key-work session was arranged.'
    when 'Overdose' then 'Emergency medical support was obtained and safeguarding and medication protocols were reviewed.'
    else 'Staff used calm communication, offered space and completed a reflective key-work conversation.'
  end,
  case
    when incident.incident_number > incident.reported_24h then 'Management notification remains overdue and requires Director follow-up.'
    when incident.severity in ('high', 'critical') then 'Manager review completed; the updated risk plan will be monitored at the next team meeting.'
    else 'No further immediate action is required. Continue monitoring through routine key work.'
  end,
  incident.incident_number <= incident.physical_interventions,
  incident.incident_number <= incident.reported_24h,
  case
    when incident.incident_number > incident.reported_24h then 'follow_up'
    when incident.severity in ('high', 'critical') then 'monitoring'
    else 'closed'
  end
from numbered incident;

do $verify_incident_seed$
begin
  if exists (
    select 1
    from public.qa_submissions submission
    join public.qa_periods period on period.id = submission.period_id
    join public.qa_metric_values total on total.submission_id = submission.id and total.metric_code = 'Inc_Total'
    left join lateral (
      select count(*)::numeric as detail_count
      from public.qa_incident_details detail
      where detail.submission_id = submission.id
    ) details on true
    where period.data_class = 'demo'
      and (period.label = 'September Test' or period.label like 'Trend Test — %')
      and total.actual <> details.detail_count
  ) then
    raise exception 'Incident detail count does not match Inc_Total';
  end if;
end;
$verify_incident_seed$;

commit;

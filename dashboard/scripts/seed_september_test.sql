begin;

create temporary table september_test_periods (
  month_start date primary key,
  label text not null,
  sequence_number integer not null
) on commit drop;

insert into september_test_periods (month_start, label, sequence_number)
values
  (date '2025-08-01', 'Trend Test — August 2025', 1),
  (date '2025-09-01', 'Trend Test — September 2025', 2),
  (date '2025-10-01', 'Trend Test — October 2025', 3),
  (date '2025-11-01', 'Trend Test — November 2025', 4),
  (date '2025-12-01', 'Trend Test — December 2025', 5),
  (date '2026-01-01', 'Trend Test — January 2026', 6),
  (date '2026-02-01', 'Trend Test — February 2026', 7),
  (date '2026-03-01', 'Trend Test — March 2026', 8),
  (date '2026-04-01', 'Trend Test — April 2026', 9),
  (date '2026-05-01', 'Trend Test — May 2026', 10),
  (date '2026-07-01', 'Trend Test — July 2026', 11),
  (date '2026-09-01', 'September Test', 12);

do $seed_guard$
begin
  if not exists (select 1 from public.profiles where role = 'director') then
    raise exception 'September Test requires an existing Director profile';
  end if;
end;
$seed_guard$;

delete from public.qa_period_runs
where period_month = date '2026-08-01'
   or period_id in (
     select id from public.qa_periods
     where month_start = date '2026-08-01' and data_class = 'live'
   );

delete from public.qa_submissions
where period_id in (
  select id from public.qa_periods
  where month_start = date '2026-08-01' and data_class = 'live'
);

delete from public.qa_periods
where month_start = date '2026-08-01' and data_class = 'live';

do $rename_june$
begin
  if exists (
    select 1 from public.qa_periods
    where month_start = date '2026-06-01' and data_class = 'demo'
  ) and not exists (
    select 1 from public.qa_periods
    where month_start = date '2026-09-01' and data_class = 'demo'
  ) then
    update public.qa_periods
    set month_start = date '2026-09-01', label = 'September Test'
    where month_start = date '2026-06-01' and data_class = 'demo';
  elsif exists (
    select 1 from public.qa_periods
    where month_start = date '2026-06-01' and data_class = 'demo'
  ) then
    delete from public.qa_submissions
    where period_id in (
      select id from public.qa_periods
      where month_start = date '2026-06-01' and data_class = 'demo'
    );
    delete from public.qa_periods
    where month_start = date '2026-06-01' and data_class = 'demo';
  end if;
end;
$rename_june$;

insert into public.qa_periods (month_start, data_class, label, opens_at, due_at, closed_at)
select
  test.month_start,
  'demo'::public.qa_data_class,
  test.label,
  (test.month_start + time '00:00') at time zone 'Europe/London',
  (((test.month_start + interval '1 month')::date - 1) + time '23:59') at time zone 'Europe/London',
  case
    when test.month_start < date '2026-09-01'
      then ((test.month_start + interval '1 month')::date + time '00:01') at time zone 'Europe/London'
    else null
  end
from september_test_periods test
on conflict (month_start, data_class) do update
set label = excluded.label,
    opens_at = excluded.opens_at,
    due_at = excluded.due_at,
    closed_at = excluded.closed_at;

delete from public.qa_submissions
where period_id in (
  select period.id
  from public.qa_periods period
  join september_test_periods test on test.month_start = period.month_start
  where period.data_class = 'demo'
);

insert into public.qa_submissions (
  home_id,
  period_id,
  status,
  audit_date,
  version,
  is_late,
  submitted_at,
  submitted_by,
  approved_at,
  approved_by
)
select
  home.id,
  period.id,
  'approved'::public.qa_submission_status,
  test.month_start + 14,
  1,
  false,
  ((test.month_start + 15) + time '10:00') at time zone 'Europe/London',
  director.id,
  ((test.month_start + 15) + time '10:15') at time zone 'Europe/London',
  director.id
from public.qa_homes home
cross join september_test_periods test
join public.qa_periods period
  on period.month_start = test.month_start and period.data_class = 'demo'
cross join lateral (
  select id from public.profiles where role = 'director' order by created_at limit 1
) director
where home.active;

with metric_context as (
  select
    submission.id as submission_id,
    definition.code,
    definition.value_kind,
    definition.requires_expected,
    definition.display_order,
    substring(home.code from 3)::integer as home_number,
    test.sequence_number,
    (array[0.94, 0.86, 0.91, 0.78, 0.69, 0.96, 0.82]::numeric[])[substring(home.code from 3)::integer] as home_score
  from public.qa_submissions submission
  join public.qa_homes home on home.id = submission.home_id
  join public.qa_periods period on period.id = submission.period_id and period.data_class = 'demo'
  join september_test_periods test on test.month_start = period.month_start
  cross join public.qa_metric_definitions definition
  where definition.active_for_house and definition.value_kind <> 'derived'
), calculated as (
  select
    context.*,
    greatest(
      0.55,
      least(0.99, context.home_score + (context.sequence_number - 6) * 0.008 + ((context.display_order % 5) - 2) * 0.012)
    ) as score,
    ((context.home_number * 2 + context.sequence_number) % 6) + 1 as incident_total,
    8 + (context.home_number % 4) as risk_total,
    (array[6, 8, 10, 7, 9, 11, 8]::numeric[])[context.home_number] as total_beds,
    (array[0.92, 0.83, 0.88, 0.71, 0.67, 0.95, 0.79]::numeric[])[context.home_number]
      + ((context.sequence_number % 4) - 2) * 0.01 as occupancy_score
  from metric_context context
), with_expected as (
  select
    calculated.*,
    case
      when calculated.value_kind <> 'ratio' then null
      when calculated.code = 'Daily_Log' then 30
      when calculated.code = 'Education_Attendance' then 20
      when calculated.code = 'YP_Activities' then 12
      when calculated.code = 'Key_Work_Sessions' then 8
      when calculated.code in ('Weekly_Reports', 'Health_And_Safety_Check', 'Fire_Logs', 'Counselling', 'YP_Bedroom_Checks') then 4
      when calculated.code = 'Fire_Drill' then 1
      else 4
    end::numeric as expected_value
  from calculated
)
insert into public.qa_metric_values (submission_id, metric_code, expected, actual, updated_by)
select
  item.submission_id,
  item.code,
  item.expected_value,
  case
    when item.value_kind = 'ratio' and item.code = 'Fire_Drill'
      and item.sequence_number = 12 and item.home_number in (4, 5) then 0
    when item.value_kind = 'ratio' and item.code = 'YP_Bedroom_Checks'
      and item.sequence_number = 12
      then (array[4, 3, 4, 2, 2, 4, 3]::numeric[])[item.home_number]
    when item.value_kind = 'ratio' then round(item.expected_value * item.score)
    when item.code = 'Inc_Total' then item.incident_total
    when item.code = 'Inc_Assault' then case when item.incident_total >= 5 then 1 else 0 end
    when item.code = 'Inc_Absconding' then case when item.incident_total >= 4 then 1 else 0 end
    when item.code = 'Inc_Missing' then case when item.incident_total >= 3 then 1 else 0 end
    when item.code = 'Inc_SelfHarm' then case when item.incident_total >= 6 then 1 else 0 end
    when item.code = 'Inc_Damage' then case when item.incident_total >= 2 then 1 else 0 end
    when item.code = 'Inc_Overdose' then 0
    when item.code = 'Inc_Verbal' then item.incident_total
      - case when item.incident_total >= 5 then 1 else 0 end
      - case when item.incident_total >= 4 then 1 else 0 end
      - case when item.incident_total >= 3 then 1 else 0 end
      - case when item.incident_total >= 6 then 1 else 0 end
      - case when item.incident_total >= 2 then 1 else 0 end
    when item.code = 'Inc_PI_Involved' then case when item.incident_total >= 4 then 1 else 0 end
    when item.code = 'Inc_Reported_24h' then greatest(
      0,
      item.incident_total - case when (item.home_number + item.sequence_number) % 3 = 0 then 1 else 0 end
    )
    when item.code = 'Total_Beds' then item.total_beds
    when item.code = 'Beds_Occ' then round(item.total_beds * item.occupancy_score, 1)
    when item.code = 'Risk_Total_Assessments' then item.risk_total
    when item.code = 'Risk_Low' then item.risk_total
      - 2
      - case when item.home_score < 0.80 then 2 else 1 end
      - case when item.home_score < 0.72 then 1 else 0 end
    when item.code = 'Risk_Moderate' then 2
    when item.code = 'Risk_High' then case when item.home_score < 0.80 then 2 else 1 end
    when item.code = 'Risk_Extremely_High' then case when item.home_score < 0.72 then 1 else 0 end
    when item.code = 'Risk_Actions_Pending' then case when item.home_score < 0.80 then 3 else 1 end
    when item.code = 'Risk_Actions_Overdue' then case when item.home_score < 0.75 then 1 else 0 end
    when item.value_kind = 'decimal' then round(item.score * 10, 1)
    else ((item.home_number + item.sequence_number + item.display_order) % 5)::numeric
  end,
  (select id from public.profiles where role = 'director' order by created_at limit 1)
from with_expected item;

insert into public.qa_metric_values (submission_id, metric_code, expected, actual, updated_by)
select
  submission.id,
  'Tasks_Pct',
  1,
  sum(value.actual) / nullif(sum(value.expected), 0),
  (select id from public.profiles where role = 'director' order by created_at limit 1)
from public.qa_submissions submission
join public.qa_periods period on period.id = submission.period_id and period.data_class = 'demo'
join september_test_periods test on test.month_start = period.month_start
join public.qa_metric_values value on value.submission_id = submission.id
join public.qa_metric_definitions definition on definition.code = value.metric_code
where definition.value_kind = 'ratio' and definition.code <> 'Occupancy_Rates'
group by submission.id;

insert into public.qa_metric_values (submission_id, metric_code, expected, actual, updated_by)
select
  submission.id,
  'Occupancy_Rates',
  1,
  occupied.actual / nullif(beds.actual, 0),
  (select id from public.profiles where role = 'director' order by created_at limit 1)
from public.qa_submissions submission
join public.qa_periods period on period.id = submission.period_id and period.data_class = 'demo'
join september_test_periods test on test.month_start = period.month_start
join public.qa_metric_values beds
  on beds.submission_id = submission.id and beds.metric_code = 'Total_Beds'
join public.qa_metric_values occupied
  on occupied.submission_id = submission.id and occupied.metric_code = 'Beds_Occ';

insert into public.qa_imports (
  source_name,
  source_hash,
  data_class,
  status,
  source_rows,
  imported_rows,
  reconciliation,
  imported_by
)
values (
  'September Test synthetic dataset',
  'september-test-2026-v1',
  'demo',
  'committed',
  0,
  0,
  jsonb_build_object('kind', 'synthetic', 'periods', 12, 'homes', 7),
  (select id from public.profiles where role = 'director' order by created_at limit 1)
)
on conflict (source_hash) do update
set source_name = excluded.source_name,
    status = excluded.status,
    reconciliation = excluded.reconciliation,
    imported_by = excluded.imported_by,
    imported_at = now();

delete from public.qa_import_rows
where import_id = (
  select id from public.qa_imports where source_hash = 'september-test-2026-v1'
);

insert into public.qa_import_rows (
  import_id,
  source_record_id,
  source_file,
  source_home_code,
  source_metric_code,
  normalized_metric_code,
  source_month,
  source_year,
  expected,
  actual
)
select
  import_record.id,
  concat('SEPTTEST-', to_char(period.month_start, 'YYYYMM'), '-', home.code, '-', value.metric_code),
  'September Test synthetic dataset',
  home.code,
  value.metric_code,
  value.metric_code,
  extract(month from period.month_start)::integer,
  extract(year from period.month_start)::integer,
  value.expected,
  value.actual
from public.qa_imports import_record
join public.qa_submissions submission on true
join public.qa_homes home on home.id = submission.home_id
join public.qa_periods period on period.id = submission.period_id and period.data_class = 'demo'
join september_test_periods test on test.month_start = period.month_start
join public.qa_metric_values value on value.submission_id = submission.id
join public.qa_metric_definitions definition
  on definition.code = value.metric_code and definition.value_kind <> 'derived'
where import_record.source_hash = 'september-test-2026-v1';

update public.qa_imports import_record
set source_rows = counts.row_count,
    imported_rows = counts.row_count,
    reconciliation = import_record.reconciliation || jsonb_build_object(
      'rows', counts.row_count,
      'metrics_per_report', 47,
      'generated_at', now()
    )
from (
  select count(*)::integer as row_count
  from public.qa_import_rows import_row
  join public.qa_imports source on source.id = import_row.import_id
  where source.source_hash = 'september-test-2026-v1'
) counts
where import_record.source_hash = 'september-test-2026-v1';

do $verify_seed$
declare
  target_period_count integer;
  target_submission_count integer;
  target_metric_count integer;
begin
  if exists (
    select 1 from public.qa_periods
    where month_start in (date '2026-06-01', date '2026-08-01')
  ) then
    raise exception 'June or August 2026 still exists';
  end if;

  select count(*) into target_period_count
  from public.qa_periods period
  join september_test_periods test on test.month_start = period.month_start
  where period.data_class = 'demo';
  if target_period_count <> 12 then
    raise exception 'Expected 12 test periods, found %', target_period_count;
  end if;

  select count(*) into target_submission_count
  from public.qa_submissions submission
  join public.qa_periods period on period.id = submission.period_id
  join september_test_periods test on test.month_start = period.month_start
  where period.data_class = 'demo' and submission.status = 'approved';
  if target_submission_count <> 84 then
    raise exception 'Expected 84 approved submissions, found %', target_submission_count;
  end if;

  select count(*) into target_metric_count
  from public.qa_metric_values value
  join public.qa_submissions submission on submission.id = value.submission_id
  join public.qa_periods period on period.id = submission.period_id
  join september_test_periods test on test.month_start = period.month_start
  where period.data_class = 'demo';
  if target_metric_count <> 4116 then
    raise exception 'Expected 4116 metric values, found %', target_metric_count;
  end if;

  if exists (
    select 1
    from public.qa_metric_values value
    join public.qa_submissions submission on submission.id = value.submission_id
    join public.qa_periods period on period.id = submission.period_id
    join september_test_periods test on test.month_start = period.month_start
    where period.data_class = 'demo' and value.actual is null
  ) then
    raise exception 'Synthetic metric values must not be null';
  end if;

  if exists (
    select 1
    from public.qa_metric_values value
    join public.qa_metric_definitions definition on definition.code = value.metric_code
    join public.qa_submissions submission on submission.id = value.submission_id
    join public.qa_periods period on period.id = submission.period_id
    join september_test_periods test on test.month_start = period.month_start
    where definition.value_kind = 'ratio'
      and value.metric_code not in ('Tasks_Pct', 'Occupancy_Rates')
      and value.actual > value.expected
  ) then
    raise exception 'A ratio metric exceeds its expected value';
  end if;
end;
$verify_seed$;

commit;

-- One editable starter person and case of each kind per active home.
-- Run once through an authenticated director context; IDs make retries safe.
-- For the varied maintenance examples, run seed_maintenance_variety.sql after this file.
do $seed$
declare
  actor uuid;
  home record;
  person_id uuid;
  risk_id uuid;
  incident_id uuid;
  maintenance_id uuid;
  today_london date := (now() at time zone 'Europe/London')::date;
  when_london text;
  notified_london text;
  base jsonb;
begin
  select p.id into actor from public.profiles p join auth.users u on u.id=p.id where p.role='director' order by p.id limit 1;
  if actor is null then raise exception 'A director account is required'; end if;
  perform set_config('request.jwt.claim.sub', actor::text, true);
  when_london := to_char(today_london, 'YYYY-MM-DD') || 'T10:00';
  notified_london := to_char(today_london, 'YYYY-MM-DD') || 'T10:15';
  for home in select id from public.qa_homes where active order by name loop
    person_id := md5(home.id::text || ':person-1')::uuid;
    risk_id := md5(home.id::text || ':individual-risk-1')::uuid;
    incident_id := md5(home.id::text || ':incident-1')::uuid;
    maintenance_id := md5(home.id::text || ':repair-1')::uuid;
    insert into public.qa_people(id, home_id, code, alias)
      values(person_id, home.id, 'P-001', 'Resident A') on conflict(id) do nothing;
    base := jsonb_build_object(
      'person_ids', jsonb_build_array(person_id), 'linked_risk_ids', '[]'::jsonb,
      'external_notifications', '[]'::jsonb, 'involvement', 'identified',
      'safeguarding', 'no', 'notification', 'pending', 'physical_intervention', false);
    if not exists(select 1 from public.qa_records where id=risk_id) then
      perform public.qa_save_case(jsonb_build_object(
        'id', risk_id, 'version', 0, 'schema_version', 2, 'is_draft', false,
        'kind', 'risks', 'home_id', home.id, 'occurred_on', today_london,
        'title', 'Individual absence risk', 'status', 'Open',
        'data', base || jsonb_build_object(
          'description', 'May leave the home without the agreed plan and be difficult to contact.',
          'category', 'Missing / absence', 'priority', 'Moderate', 'initial_level', 'High',
          'evaluator', 'Home manager', 'owner', 'Home manager',
          'controls', 'Agreed check-ins and individual support plan.',
          'triggers', 'Unexpected changes to the daily routine.',
          'warning_signs', 'Missed check-in or change in usual contact pattern.',
          'preventive_measures', 'Confirm the plan and contact details at each review.',
          'response_plan', 'Follow the individual response plan and escalate if contact is lost.',
          'due_on', today_london + 7),
        'actions', jsonb_build_array(jsonb_build_object(
          'id', md5(home.id::text || ':risk-action-1')::uuid,
          'description', 'Review check-in plan with the person', 'owner', 'Home manager',
          'due_on', today_london + 7, 'status', 'Pending', 'completed_on', '', 'resolution', '')),
        'reviews', '[]'::jsonb));
    end if;
    if not exists(select 1 from public.qa_records where id=incident_id) then
      perform public.qa_save_case(jsonb_build_object(
        'id', incident_id, 'version', 0, 'schema_version', 2, 'is_draft', false,
        'kind', 'incidents', 'home_id', home.id, 'occurred_on', today_london,
        'title', 'Late return to the home', 'status', 'Monitoring',
        'data', base || jsonb_build_object(
          'description', 'The person returned later than the agreed time.',
          'category', 'Missing / absence', 'priority', 'Moderate',
          'occurred_local', when_london, 'occurred_offset', '',
          'reporter', 'Staff member', 'action_taken', 'Staff contacted the person and informed the manager.',
          'notification', 'done', 'notified_local', notified_london,
          'notified_to', 'Home manager', 'owner', 'Home manager',
          'due_on', today_london + 3, 'linked_risk_ids', jsonb_build_array(risk_id)),
        'actions', '[]'::jsonb, 'reviews', '[]'::jsonb));
    end if;
    if not exists(select 1 from public.qa_records where id=maintenance_id) then
      perform public.qa_save_case(jsonb_build_object(
        'id', maintenance_id, 'version', 0, 'schema_version', 2, 'is_draft', false,
        'kind', 'maintenance', 'home_id', home.id, 'occurred_on', today_london,
        'title', 'Lounge window repair', 'status', 'In progress',
        'data', (base - 'person_ids') || jsonb_build_object(
          'person_ids', '[]'::jsonb, 'description', 'Lounge window handle needs repair.',
          'category', 'Doors / windows', 'priority', 'Moderate',
          'location', 'Shared lounge', 'owner', 'Maintenance lead',
          'provider', 'Contractor', 'started_on', today_london,
          'due_on', today_london + 7),
        'actions', '[]'::jsonb, 'reviews', '[]'::jsonb));
    end if;
  end loop;
end
$seed$;

-- Idempotent incident examples for the existing P-001 people.
do $seed$
declare
  actor uuid;
  example record;
  original record;
  incident_id uuid;
  event_date date;
  next_data jsonb;
begin
  select p.id into actor from public.profiles p where p.role = 'director' order by p.id limit 1;
  if actor is null then raise exception 'A director account is required'; end if;
  perform set_config('request.jwt.claim.sub', actor::text, true);

  update public.qa_people p
    set alias = case h.name
      when 'Coulsdon' then 'Resident B'
      when 'Heathfields' then 'Resident C'
      when 'Milne Park' then 'Resident D'
    end,
    version = p.version + 1
    from public.qa_homes h
    where p.home_id = h.id and p.id = md5(h.id::text || ':person-1')::uuid
      and h.name in ('Coulsdon', 'Heathfields', 'Milne Park')
      and p.alias = 'Resident A';

  for example in
    select * from (values
      ('Brambles Acre', 1, 'Fall in the hallway', 'Fall / injury', 'Low', '2026-10-14', 'Monitoring', 'The person tripped in the hallway. Staff checked for injury and cleared the route.'),
      ('Brambles Acre', 2, 'Missed agreed check-in', 'Missing / absence', 'Moderate', '2026-10-27', 'Follow up', 'The person missed an agreed check-in. Staff made contact and reviewed the check-in plan.'),
      ('Coulsdon', 1, 'Medication record query', 'Medication', 'Moderate', '2026-10-11', 'Closed', 'A medication entry needed clarification. The manager checked the record with staff.'),
      ('Coulsdon', 2, 'Verbal disagreement', 'Verbal abuse', 'Low', '2026-10-25', 'Monitoring', 'A verbal disagreement was reported. Staff de-escalated and checked on those involved.'),
      ('Heathfields', 1, 'Trip in communal area', 'Fall / injury', 'Low', '2026-10-19', 'Closed', 'The person tripped in the communal area. Staff checked for injury and removed an obstruction.'),
      ('Heathfields', 2, 'Medication support concern', 'Medication', 'High', '2026-10-29', 'Follow up', 'Staff identified a concern during medication support and informed the manager.'),
      ('Milne Park', 1, 'Damage during disagreement', 'Property damage', 'Moderate', '2026-10-23', 'Monitoring', 'A disagreement led to minor property damage. Staff made the area safe and informed the manager.')
    ) as examples(home_name, seed_no, title, category, priority, occurred_on, status, description)
  loop
    select r.* into original
      from public.qa_records r join public.qa_homes h on h.id = r.home_id
      where h.name = example.home_name and r.kind = 'incidents'
        and r.title = 'Late return to the home' and not r.is_draft
      order by r.created_at limit 1;
    if original.id is null then raise exception 'Starter incident missing for %', example.home_name; end if;
    incident_id := md5(original.home_id::text || ':recurrence-example:' || example.seed_no::text)::uuid;
    if exists(select 1 from public.qa_records where id = incident_id) then continue; end if;
    event_date := example.occurred_on::date;
    next_data := original.data || jsonb_build_object(
      'description', example.description,
      'category', example.category,
      'priority', example.priority,
      'occurred_local', example.occurred_on || 'T10:00',
      'notified_local', example.occurred_on || 'T10:15',
      'action_taken', 'Staff responded immediately and informed the manager.',
      'linked_risk_ids', '[]'::jsonb,
      'due_on', (event_date + 7)::text,
      'closed_on', case when example.status = 'Closed' then (event_date + 1)::text else '' end,
      'resolution', case when example.status = 'Closed' then 'Manager reviewed the incident and confirmed the follow-up was complete.' else '' end
    );
    perform public.qa_save_case(jsonb_build_object(
      'id', incident_id, 'version', 0, 'schema_version', 2, 'is_draft', false,
      'kind', 'incidents', 'home_id', original.home_id, 'occurred_on', event_date,
      'title', example.title, 'status', example.status,
      'data', next_data, 'actions', '[]'::jsonb, 'reviews', '[]'::jsonb
    ));
  end loop;
end
$seed$;

-- One-time refresh of the seven deterministic maintenance starter issues.
-- Only records that still have the original title, category and description are touched.
do $refresh$
declare
  actor uuid;
  original public.qa_records%rowtype;
  sample record;
  content jsonb;
  today_london date := (now() at time zone 'Europe/London')::date;
begin
  select p.id into actor from public.profiles p where p.role = 'director' order by p.id limit 1;
  if actor is null then raise exception 'A director account is required'; end if;
  perform set_config('request.jwt.claim.sub', actor::text, true);

  for sample in
    select * from (values
      ('Coulsdon',      'Lounge window repair',       'Doors / windows',       'Moderate', 'Shared lounge',       'Lounge window handle needs repair.',                      'In progress',      5, 4, 4, null::integer, '',                                      'In-house maintenance'),
      ('Heathfields',   'Boiler pressure check',       'Heating / plumbing',    'High',     'Boiler / plant room', 'Boiler pressure drops below the normal operating range.',  'Awaiting external', 8, 6, 2, null::integer, '',                                      'External contractor'),
      ('Victoria Rd',   'Kitchen extractor fan fault','Electrical',           'Moderate', 'Kitchen',             'Extractor fan stops during use and needs inspection.',      'In progress',      1, 1, 5, null::integer, '',                                      'In-house maintenance'),
      ('Milne Park',    'Loose wardrobe hinge',       'Furniture',            'Low',      'Bedroom',             'Bedroom wardrobe door has a loose hinge.',                 'Awaiting external', 6, 5, 1, null::integer, '',                                      'External contractor'),
      ('Friday Rd',     'Garden gate latch repair',   'Garden',               'Moderate', 'Garden',              'Garden gate latch does not close reliably.',               'Completed',        7, 6, 1, 1,             'Latch replaced and gate checked.',             'In-house maintenance'),
      ('Brambles Acre', 'Bathroom tap leak',          'Heating / plumbing',    'High',     'Bathroom',            'Bathroom tap is leaking and needs repair.',                'In progress',      2, 1, 3, null::integer, '',                                      'In-house maintenance'),
      ('Crimsworth',    'Hallway fire door closer',   'Building / decoration','High',     'Hallway',             'Fire door closer needs adjustment to shut fully.',         'In progress',      3, 2, 6, null::integer, '',                                      'External contractor')
    ) as v(home_name, title, category, priority, location, description, status, reported_ago, started_ago, due_in, completed_ago, resolution, provider)
  loop
    select q.* into original
    from public.qa_records q join public.qa_homes h on h.id = q.home_id
    where q.kind = 'maintenance' and h.name = sample.home_name
      and q.id = md5(h.id::text || ':repair-1')::uuid
      and q.title = 'Lounge window repair'
      and q.data->>'category' = 'Doors / windows'
      and q.data->>'description' = 'Lounge window handle needs repair.';
    if original.id is null then raise exception 'Starter issue for % has changed; no sample records were updated', sample.home_name; end if;

    content := jsonb_build_object(
      'id', original.id, 'version', original.version, 'schema_version', 2,
      'is_draft', false, 'kind', 'maintenance', 'home_id', original.home_id,
      'occurred_on', today_london - sample.reported_ago, 'title', sample.title,
      'status', sample.status,
      'data', original.data || jsonb_build_object(
        'category', sample.category, 'priority', sample.priority,
        'location', sample.location, 'description', sample.description,
        'provider', sample.provider,
        'started_on', (today_london - sample.started_ago)::text,
        'due_on', (today_london + sample.due_in)::text,
        'closed_on', case when sample.completed_ago is null then '' else (today_london - sample.completed_ago)::text end,
        'resolution', sample.resolution),
      'actions', '[]'::jsonb, 'reviews', '[]'::jsonb);
    perform public.qa_save_case(content);
  end loop;
end
$refresh$;

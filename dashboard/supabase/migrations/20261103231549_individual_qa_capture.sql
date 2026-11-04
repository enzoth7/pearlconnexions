-- Individual QA capture. This migration is prepared locally; do not run against a hosted project without approval.
create table public.qa_people (
 id uuid primary key default gen_random_uuid(), home_id uuid not null references public.qa_homes(id),
 code text not null check(length(trim(code)) between 1 and 40), alias text not null check(length(trim(alias)) between 1 and 120),
 active boolean not null default true, version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(home_id,code)
);
alter table public.qa_people enable row level security;
revoke all on public.qa_people from public,anon,authenticated;
grant select,insert,update on public.qa_people to authenticated;
grant all on public.qa_people to service_role;
create function private.qa_people_access(target uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and (private.has_workspace_section('qa.risks') or private.has_workspace_section('qa.incidents'))
 and (private.is_director() or private.has_assigned_home(target));
$$;
revoke all on function private.qa_people_access(uuid) from public,anon;
grant execute on function private.qa_people_access(uuid) to authenticated;
create policy "People read" on public.qa_people for select to authenticated using(private.qa_people_access(home_id));
create policy "People insert" on public.qa_people for insert to authenticated with check(private.qa_people_access(home_id));
create policy "People update" on public.qa_people for update to authenticated using(private.qa_people_access(home_id)) with check(private.qa_people_access(home_id));
create function private.guard_qa_person() returns trigger language plpgsql set search_path='' as $$ begin
 if tg_op='INSERT' then new.version=1; new.created_at=now();
 else
  if (new.id,new.home_id,new.created_at) is distinct from (old.id,old.home_id,old.created_at) then raise exception 'Person identity and home cannot be changed'; end if;
  if new.version<>old.version+1 then raise exception 'This person changed. Reload before saving.' using errcode='40001'; end if;
 end if;
 new.code=trim(new.code);new.alias=trim(new.alias);new.updated_at=now();return new;
end $$;
create trigger guard_qa_person before insert or update on public.qa_people for each row execute function private.guard_qa_person();
create trigger audit_qa_people after insert or update on public.qa_people for each row execute function private.log_activity();

alter table public.qa_records add column schema_version smallint not null default 1 check(schema_version in (1,2)),
 add column is_draft boolean not null default false, add column reference text unique;
alter table public.qa_records alter column occurred_on drop not null;
alter table public.qa_records drop constraint qa_records_title_check, drop constraint record_description_required, drop constraint risk_owner_review_required;
alter table public.qa_records add constraint case_title check(length(title)<=240 and (is_draft or length(trim(title))>=1)),
 add constraint case_date check(is_draft or occurred_on is not null),
 add constraint case_description check(length(coalesce(data->>'description',''))<=4000 and (is_draft or length(trim(coalesce(data->>'description','')))>=1));
-- Audits keep their existing writer; cases can only be changed atomically with their related data.
create policy "Case atomic insert" on public.qa_records as restrictive for insert to authenticated with check(kind='audits');
create policy "Case atomic update" on public.qa_records as restrictive for update to authenticated using(kind='audits') with check(kind='audits');

create table public.qa_record_people(record_id uuid not null references public.qa_records(id),person_id uuid not null references public.qa_people(id),primary key(record_id,person_id));
create index qa_record_people_person_idx on public.qa_record_people(person_id);
create table public.qa_record_actions(id uuid primary key,record_id uuid not null references public.qa_records(id),data jsonb not null,updated_at timestamptz not null default now());
create index qa_record_actions_record_idx on public.qa_record_actions(record_id);
create table public.qa_risk_reviews(id uuid primary key,record_id uuid not null references public.qa_records(id),data jsonb not null,is_draft boolean not null default false,recorded_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create index qa_risk_reviews_record_idx on public.qa_risk_reviews(record_id);
create index qa_risk_reviews_actor_idx on public.qa_risk_reviews(recorded_by);
create table public.qa_record_history(id uuid primary key default gen_random_uuid(),record_id uuid not null references public.qa_records(id),version integer not null,
 from_status text,to_status text not null,changed_at timestamptz not null default now(),changed_by uuid references auth.users(id),snapshot jsonb not null,unique(record_id,version));
create index qa_record_history_actor_idx on public.qa_record_history(changed_by);
do $$ declare tab text;begin
 foreach tab in array array['qa_record_people','qa_record_actions','qa_risk_reviews','qa_record_history'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('grant all on public.%I to service_role',tab);
  execute format('create policy "Read through parent" on public.%I for select to authenticated using(exists(select 1 from public.qa_records r where r.id=record_id))',tab);
 end loop;
end $$;

create function private.qa_required(d jsonb,k text) returns void language plpgsql set search_path='' as $$begin
 if jsonb_typeof(d->k) is distinct from 'string' or length(trim(coalesce(d->>k,'')))=0 then raise exception 'Complete field: %',k;end if;
end $$;
create function private.qa_date(v text) returns date language plpgsql immutable set search_path='' as $$begin
 if coalesce(v,'')='' then return null;end if;
 if v!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date';end if;
 return v::date;
end $$;
create function private.qa_london_instant(v text,clock_offset text) returns timestamptz language plpgsql stable set search_path='' as $$
declare local_time timestamp; candidate timestamptz; result timestamptz; n integer=0; minutes integer;
begin
 if coalesce(v,'')='' then return null;end if;
 if v!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$' then return null;end if;
 local_time=v::timestamp;
 foreach minutes in array array[0,60] loop
  if coalesce(clock_offset,'')<>'' and clock_offset<>minutes::text then continue;end if;
  candidate=(local_time-make_interval(mins=>minutes)) at time zone 'UTC';
  if candidate at time zone 'Europe/London'=local_time then result=candidate;n=n+1;end if;
 end loop;
 if n=1 then return result;end if;return null;
exception when datetime_field_overflow or invalid_datetime_format then return null;
end $$;

-- Retain legacy protections while the v2 validator owns the new input contract.
do $$ declare d text;begin
 d=pg_get_functiondef('private.guard_qa_record()'::regprocedure);
 d=replace(d,'if new.kind=''risks'' and','if new.schema_version=1 and new.kind=''risks'' and');execute d;
 d=pg_get_functiondef('private.validate_register_fields()'::regprocedure);
 d=regexp_replace(d,'\mbegin\M','begin if new.schema_version=2 then return new; end if;','i');execute d;
end $$;

create function private.validate_qa_case() returns trigger language plpgsql set search_path='' as $$
declare d jsonb=new.data; k text; item jsonb; person uuid; incident_time timestamptz; notified_time timestamptz; allowed text[];
begin
 if new.schema_version<>2 then return new;end if;
 if new.kind not in ('risks','incidents','maintenance') then raise exception 'Invalid case type';end if;
 if tg_op='UPDATE' then
  if new.schema_version<>old.schema_version or new.reference is distinct from old.reference then raise exception 'Case identity cannot change';end if;
  if not old.is_draft and new.is_draft then raise exception 'Registered cases cannot return to draft';end if;
 else new.reference=case new.kind when 'incidents' then 'INC-' when 'risks' then 'RISK-' else 'MAINT-' end || upper(new.id::text);end if;
 if octet_length(d::text)>150000 then raise exception 'Case is too large';end if;
 if jsonb_typeof(d->'person_ids') is distinct from 'array' or jsonb_array_length(d->'person_ids')>50 then raise exception 'Invalid people selection';end if;
 for item in select value from jsonb_each(d) where key not in ('person_ids','linked_risk_ids','external_notifications','physical_intervention') loop
  if jsonb_typeof(item)<>'string' or length(item#>>'{}')>4000 then raise exception 'Invalid case field';end if;
 end loop;
 foreach k in array array['due_on','started_on','closed_on'] loop perform private.qa_date(d->>k);end loop;
 for person in select value::uuid from jsonb_array_elements_text(d->'person_ids') loop
  if not exists(select 1 from public.qa_people p where p.id=person and p.home_id=new.home_id and (p.active or (tg_op='UPDATE' and old.data->'person_ids' ? person::text))) then raise exception 'Select an active person assigned to this home';end if;
 end loop;
 if jsonb_typeof(d->'linked_risk_ids') is distinct from 'array' or jsonb_array_length(d->'linked_risk_ids')>50 then raise exception 'Invalid linked risks';end if;
 for person in select value::uuid from jsonb_array_elements_text(d->'linked_risk_ids') loop
  if new.kind<>'incidents' or not private.has_workspace_section('qa.risks') or not exists(select 1 from public.qa_records r where r.id=person and r.home_id=new.home_id and r.kind='risks' and not r.is_draft and exists(select 1 from jsonb_array_elements_text(r.data->'person_ids') p where d->'person_ids' ? p.value)) then raise exception 'Linked risk must be accessible and involve a selected person';end if;
 end loop;
 if coalesce(d->>'safeguarding','') not in ('yes','no','pending') or coalesce(d->>'notification','') not in ('pending','done','na') or coalesce(d->>'involvement','') not in ('identified','none','unknown') or jsonb_typeof(d->'physical_intervention') is distinct from 'boolean' then raise exception 'Invalid incident choices';end if;
 if new.kind='incidents' then
  incident_time=private.qa_london_instant(d->>'occurred_local',d->>'occurred_offset');
  notified_time=case when d->>'notification'='done' then private.qa_london_instant(d->>'notified_local',d->>'notified_offset') end;
  new.data=jsonb_set(jsonb_set(new.data,'{occurred_at}',coalesce(to_jsonb(incident_time),'""'::jsonb)),'{notified_at}',coalesce(to_jsonb(notified_time),'""'::jsonb));
  if incident_time is not null then new.occurred_on=(incident_time at time zone 'Europe/London')::date;end if;
 end if;
 if new.is_draft then return new;end if;
 foreach k in array array['description','category','priority'] loop perform private.qa_required(d,k);end loop;
 allowed=case new.kind when 'risks' then array['Self-harm','Missing / absence','Violence','Exploitation / abuse','Medication','Health / wellbeing','Independence / self-care','Other'] when 'incidents' then array['Missing / absence','Assault','Property damage','Self-harm','Overdose','Verbal abuse','Medication','Fall / injury','Other'] else array['Doors / windows','Electrical','Heating / plumbing','Furniture','Building / decoration','Garden','Pest control','Other'] end;
 if not(d->>'category'=any(allowed)) then raise exception 'Choose a category';end if;
 if d->>'category'='Other' then perform private.qa_required(d,'category_other');end if;
 allowed=case new.kind when 'risks' then array['Low','Moderate','High','Extremely high'] when 'incidents' then array['Low','Moderate','High','Critical'] else array['Low','Moderate','High','Urgent'] end;
 if not(d->>'priority'=any(allowed)) then raise exception 'Choose a level';end if;
 if new.kind='risks' then
  if jsonb_array_length(d->'person_ids')<>1 then raise exception 'Choose one person';end if;
  foreach k in array array['evaluator','controls','owner','due_on','initial_level'] loop perform private.qa_required(d,k);end loop;
  if d->>'initial_level' not in ('Low','Moderate','High','Extremely high') then raise exception 'Choose an initial risk level';end if;
  if private.qa_date(d->>'due_on')<new.occurred_on then raise exception 'Review cannot precede assessment';end if;
 elsif new.kind='incidents' then
  foreach k in array array['reporter','action_taken'] loop perform private.qa_required(d,k);end loop;
  if incident_time is null then raise exception 'Enter a valid London incident time; clarify GMT/BST if needed';end if;
  if d->>'involvement'='identified' then
   if jsonb_array_length(d->'person_ids')=0 then raise exception 'Select people involved';end if;
  else perform private.qa_required(d,'involvement_note');if jsonb_array_length(d->'person_ids')<>0 then raise exception 'Clear people or select identified involvement';end if;end if;
  if (d->>'physical_intervention')::boolean then perform private.qa_required(d,'intervention_note');end if;
  if d->>'notification'='done' then
   perform private.qa_required(d,'notified_to');
   if notified_time is null or notified_time<incident_time then raise exception 'Enter a valid notification time after the incident';end if;
  elsif d->>'notification'='na' then perform private.qa_required(d,'notification_reason');end if;
  if jsonb_typeof(d->'external_notifications') is distinct from 'array' or jsonb_array_length(d->'external_notifications')>30 then raise exception 'Invalid external notifications';end if;
  for item in select value from jsonb_array_elements(d->'external_notifications') loop
   perform private.qa_required(item,'recipient');perform private.qa_required(item,'notified_on');perform private.qa_date(item->>'notified_on');
  end loop;
  if new.status<>'Closed' then perform private.qa_required(d,'owner');perform private.qa_required(d,'due_on');end if;
 else
  perform private.qa_required(d,'location');
  if new.status in ('In progress','Awaiting external') then foreach k in array array['owner','started_on','due_on'] loop perform private.qa_required(d,k);end loop;end if;
  if private.qa_date(d->>'started_on')<new.occurred_on then raise exception 'Start cannot precede report';end if;
 end if;
 if new.status in ('Closed','Completed') then
  perform private.qa_required(d,'closed_on');perform private.qa_required(d,'resolution');
  if private.qa_date(d->>'closed_on')<greatest(new.occurred_on,private.qa_date(d->>'started_on')) then raise exception 'Closure cannot precede the record or start';end if;
 end if;
 return new;
end $$;
create trigger validate_qa_case before insert or update on public.qa_records for each row execute function private.validate_qa_case();

create function private.qa_save_case(content jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid=(content->>'id')::uuid; prior public.qa_records; saved public.qa_records; h uuid=(content->>'home_id')::uuid; kind text=content->>'kind';
 section text; entry jsonb; previous jsonb; k text; target_id uuid; expected integer=(content->>'version')::integer; draft boolean=(content->>'is_draft')::boolean;
begin
 section=case when kind='maintenance' then 'maintenance.issues' else 'qa.'||kind end;
 if auth.uid() is null or kind not in ('risks','incidents','maintenance') or not private.has_workspace_section(section)
  or not (private.is_director() or (kind='maintenance' and private.manages_maintenance()) or private.has_assigned_home(h)) then raise exception 'Case access denied' using errcode='42501';end if;
 if content->>'schema_version'<>'2' or expected is null or draft is null then raise exception 'Invalid case version';end if;
 if not exists(select 1 from public.qa_homes where id=h and active) then raise exception 'Home is inactive';end if;
 if jsonb_typeof(content->'actions') is distinct from 'array' or jsonb_typeof(content->'reviews') is distinct from 'array' or jsonb_array_length(content->'actions')>100 or jsonb_array_length(content->'reviews')>100 then raise exception 'Invalid actions or reviews';end if;
 select * into prior from public.qa_records where id=target for update;
 if found then
  if prior.home_id<>h or prior.kind<>kind or prior.schema_version<>2 then raise exception 'Case identity cannot change';end if;
  if prior.version<>expected then raise exception 'This record changed. Reload before saving.' using errcode='40001';end if;
  if kind='maintenance' and not private.manages_maintenance() then raise exception 'Use add follow-up; only the maintenance lead manages issues';end if;
 else
  if expected<>0 then raise exception 'Record is unavailable';end if;
  if kind='maintenance' and not private.manages_maintenance() and content->>'status'<>'Reported' then raise exception 'New issues must be reported first';end if;
 end if;
 -- A review is an immutable event. New reviews also update the current risk and next due date.
 if kind<>'risks' and jsonb_array_length(content->'reviews')>0 then raise exception 'Only risks have reviews';end if;
 for entry in select value from jsonb_array_elements(content->'reviews') loop
  target_id=(entry->>'id')::uuid;
  select data into previous from public.qa_risk_reviews where id=target_id and not is_draft;
  if found then
   if not exists(select 1 from public.qa_risk_reviews where id=target_id and record_id=target) or previous<>entry-'id' then raise exception 'Saved reviews cannot be changed';end if;
  elsif not draft then
   foreach k in array array['reviewed_on','author','outcome','residual_level','next_review_on'] loop perform private.qa_required(entry,k);end loop;
   if entry->>'residual_level' not in ('Low','Moderate','High','Extremely high') then raise exception 'Invalid review risk level';end if;
   if private.qa_date(entry->>'reviewed_on')<private.qa_date(content->>'occurred_on') or private.qa_date(entry->>'next_review_on')<private.qa_date(entry->>'reviewed_on') then raise exception 'Invalid review dates';end if;
   content=jsonb_set(jsonb_set(content,'{data,priority}',entry->'residual_level'),'{data,due_on}',entry->'next_review_on');
  end if;
 end loop;
 if exists(select 1 from public.qa_risk_reviews r where r.record_id=target and not exists(select 1 from jsonb_array_elements(content->'reviews') e where e->>'id'=r.id::text)) then raise exception 'Saved reviews must be retained';end if;
 if exists(select 1 from public.qa_record_actions a where a.record_id=target and not exists(select 1 from jsonb_array_elements(content->'actions') e where e->>'id'=a.id::text)) then raise exception 'Saved actions must be retained';end if;
 if (select count(*)<>count(distinct e->>'id') from jsonb_array_elements(content->'actions') e) or (select count(*)<>count(distinct e->>'id') from jsonb_array_elements(content->'reviews') e) then raise exception 'Duplicate action or review';end if;
 if prior.id is null then
  insert into public.qa_records(id,kind,home_id,occurred_on,title,status,data,schema_version,is_draft,created_by)
  values(target,kind,h,private.qa_date(content->>'occurred_on'),coalesce(content->>'title',''),content->>'status',content->'data',2,draft,auth.uid()) returning * into saved;
 else
  update public.qa_records set occurred_on=private.qa_date(content->>'occurred_on'),title=content->>'title',status=content->>'status',data=content->'data',is_draft=draft,version=version+1 where id=target returning * into saved;
 end if;
 delete from public.qa_record_people where record_id=target;
 insert into public.qa_record_people(record_id,person_id) select target,value::uuid from jsonb_array_elements_text(saved.data->'person_ids');
 for entry in select value from jsonb_array_elements(content->'actions') loop
  target_id=(entry->>'id')::uuid;
  if exists(select 1 from public.qa_record_actions where id=target_id and record_id<>target) then raise exception 'Action belongs to another record';end if;
  if coalesce(entry->>'status','') not in ('Pending','Completed') then raise exception 'Invalid action status';end if;
  if not draft then
   foreach k in array array['description','owner','due_on'] loop perform private.qa_required(entry,k);end loop;
   perform private.qa_date(entry->>'due_on');
   if entry->>'status'='Completed' then
    perform private.qa_required(entry,'completed_on');perform private.qa_required(entry,'resolution');
    if private.qa_date(entry->>'completed_on')<saved.occurred_on then raise exception 'Action completion precedes record';end if;
   elsif saved.status in ('Closed','Completed') then raise exception 'Complete outstanding actions before closing';end if;
  end if;
  insert into public.qa_record_actions(id,record_id,data) values(target_id,target,entry-'id') on conflict(id) do update set data=excluded.data,updated_at=now();
 end loop;
 for entry in select value from jsonb_array_elements(content->'reviews') loop
  if exists(select 1 from public.qa_risk_reviews where id=(entry->>'id')::uuid and record_id<>target) then raise exception 'Review belongs to another record';end if;
  insert into public.qa_risk_reviews(id,record_id,data,is_draft,recorded_by) values((entry->>'id')::uuid,target,entry-'id',draft,auth.uid()) on conflict(id) do update set data=excluded.data,is_draft=excluded.is_draft where qa_risk_reviews.is_draft;
 end loop;
 insert into public.qa_record_history(record_id,version,from_status,to_status,changed_by,snapshot)
 values(target,saved.version,case when prior.id is null then null when prior.is_draft then 'Draft' else prior.status end,case when saved.is_draft then 'Draft' else saved.status end,auth.uid(),to_jsonb(saved)||jsonb_build_object('actions',content->'actions','reviews',content->'reviews'));
 return target;
end $$;
revoke all on function private.qa_save_case(jsonb) from public,anon;
grant execute on function private.qa_save_case(jsonb) to authenticated;
create function public.qa_save_case(content jsonb) returns uuid language sql security invoker set search_path='' as $$select private.qa_save_case(content);$$;
revoke all on function public.qa_save_case(jsonb) from public,anon;
grant execute on function public.qa_save_case(jsonb) to authenticated;

create function private.qa_append_case_note(target uuid,expected_version integer,note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.qa_records;begin
 select * into r from public.qa_records where id=target for update;
 if auth.uid() is null or r.id is null or r.kind<>'maintenance' or not private.has_workspace_section('maintenance.issues') or not private.has_maintenance_home(r.home_id) then raise exception 'Maintenance access denied' using errcode='42501';end if;
 if r.version<>expected_version then raise exception 'This record changed. Reload before saving.' using errcode='40001';end if;
 if length(trim(note)) not between 1 and 3000 then raise exception 'Enter a follow-up note';end if;
 update public.qa_records set data=jsonb_set(data,'{follow_up}',to_jsonb(concat_ws(E'\n',nullif(data->>'follow_up',''),to_char(now() at time zone 'Europe/London','YYYY-MM-DD HH24:MI')||' · '||trim(note)))),version=version+1 where id=target returning * into r;
 insert into public.qa_record_history(record_id,version,from_status,to_status,changed_by,snapshot) values(target,r.version,case when r.is_draft then 'Draft' else r.status end,case when r.is_draft then 'Draft' else r.status end,auth.uid(),to_jsonb(r));
end $$;
revoke all on function private.qa_append_case_note(uuid,integer,text) from public,anon;
grant execute on function private.qa_append_case_note(uuid,integer,text) to authenticated;
create function public.qa_append_case_note(target uuid,expected_version integer,note text) returns void language sql security invoker set search_path='' as $$select private.qa_append_case_note(target,expected_version,note);$$;
revoke all on function public.qa_append_case_note(uuid,integer,text) from public,anon;
grant execute on function public.qa_append_case_note(uuid,integer,text) to authenticated;

-- Quantitative reports are a new version. Upgrade only truly empty live drafts.
insert into public.qa_questionnaires(version,questions) select 3,questions from public.qa_questionnaires where version=2;
alter table public.qa_submissions alter column form_version set default 3;
update public.qa_submissions s set form_version=3 where s.form_version=2 and s.status='draft'
 and exists(select 1 from public.qa_periods p where p.id=s.period_id and p.data_class='live')
 and not exists(select 1 from public.qa_report_forms f where f.submission_id=s.id)
 and not exists(select 1 from public.qa_metric_values v where v.submission_id=s.id);
create function private.qa_validate_measurements(content jsonb) returns void language plpgsql set search_path='' as $$
declare code text; item jsonb;begin
 if jsonb_typeof(content->'measurements') is distinct from 'object' then raise exception 'Complete monthly measurements';end if;
 foreach code in array array['daily_records','weekly_reports','medication_checks','supervisions','activities','key_work','health_safety','fire_logs','fire_drills','first_aid'] loop
  item=content->'measurements'->code;
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'na') is distinct from 'boolean' then raise exception 'Complete measurement: %',code;end if;
  if (item->>'na')::boolean then perform private.qa_required(item,'note');
  else
   if coalesce(item->>'expected','')!~'^\d{1,9}$' or coalesce(item->>'completed','')!~'^\d{1,9}$' then raise exception 'Enter whole quantities: %',code;end if;
   if (item->>'completed')::numeric>(item->>'expected')::numeric then raise exception 'Completed exceeds expected: %',code;end if;
   if (item->>'expected')::numeric=0 then perform private.qa_required(item,'note');end if;
  end if;
 end loop;
end $$;
create function private.qa_case_snapshot(r public.qa_records) returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(r)||jsonb_build_object('actions',coalesce((select jsonb_agg(a.data||jsonb_build_object('id',a.id)) from public.qa_record_actions a where a.record_id=r.id),'[]'::jsonb),
 'reviews',coalesce((select jsonb_agg(v.data||jsonb_build_object('id',v.id)) from public.qa_risk_reviews v where v.record_id=r.id),'[]'::jsonb));
$$;
do $$ declare d text; f record;begin
 d=pg_get_functiondef('public.qa_save_report(uuid,integer,text,jsonb,text)'::regprocedure);
 d=replace(d,'s.form_version<>2','s.form_version not in (2,3)');
 d=replace(d,'where version=2','where version=s.form_version');
 d=replace(d,'values(target,2,content,snap)','values(target,s.form_version,content,snap)');
 d=replace(d,'beds=nullif(content','if s.form_version=3 then perform private.qa_validate_measurements(content);end if;'||E'\n  beds=nullif(content');
 d=replace(d,'jsonb_agg(to_jsonb(r))','jsonb_agg(private.qa_case_snapshot(r))');
 d=replace(d,'where r.home_id=s.home_id and','where not r.is_draft and r.home_id=s.home_id and');
 execute d;
 d=pg_get_functiondef('public.qa_visible_report(uuid)'::regprocedure);
 d=replace(d,'jsonb_agg(to_jsonb(r))','jsonb_agg(private.qa_case_snapshot(r))');
 d=replace(d,'where r.home_id=s.home_id and','where not r.is_draft and r.home_id=s.home_id and');execute d;
 for f in select oid from pg_proc where pronamespace in ('public'::regnamespace,'private'::regnamespace) and proname in ('qa_save_draft','qa_submit_submission','qa_approve_submission','qa_reopen_submission','qa_save_draft_impl','qa_submit_submission_impl','qa_approve_submission_impl','qa_reopen_submission_impl') loop
  d=pg_get_functiondef(f.oid);d=replace(d,'form_version=2','form_version in (2,3)');execute d;
 end loop;
end $$;
-- Restrict helper execution (trigger functions themselves are not API endpoints).
revoke all on function private.qa_required(jsonb,text),private.qa_date(text),private.qa_london_instant(text,text),private.qa_validate_measurements(jsonb),private.qa_case_snapshot(public.qa_records) from public,anon;
grant execute on function private.qa_required(jsonb,text),private.qa_date(text),private.qa_london_instant(text,text),private.qa_case_snapshot(public.qa_records) to authenticated;

create function public.qa_overview_cases(month_start date) returns table(id uuid,kind text,home_id uuid,occurred_on date,title text,status text,created_at timestamptz) language sql stable security invoker set search_path='' as $$
 select r.id,r.kind,r.home_id,r.occurred_on,r.title,r.status,r.created_at from public.qa_records r
 where private.has_workspace_section('qa.overview') and not r.is_draft
 and ((r.kind='incidents' and r.occurred_on>=month_start and r.occurred_on<(month_start+interval '1 month')::date)
 or (r.kind in ('risks','maintenance') and r.status not in ('Closed','Completed'))) order by r.created_at desc;
$$;
revoke all on function public.qa_overview_cases(date) from public,anon;
grant execute on function public.qa_overview_cases(date) to authenticated;

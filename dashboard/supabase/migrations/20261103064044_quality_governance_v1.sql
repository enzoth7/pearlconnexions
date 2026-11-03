-- Local-first Quality & Governance. Historical metric reports retain form version 1.
alter table public.workspace_access add column maintenance boolean not null default false,
  add column can_manage_maintenance boolean not null default false;
alter table public.managers add column include_in_org_chart boolean not null default true;
update public.managers set include_in_org_chart = false where lower(trim(name)) in ('test', 'test user') or lower(email) = 'test@mail.com';
alter table public.qa_submissions add column form_version smallint not null default 1;
update public.qa_submissions s set form_version = 2 where s.status = 'draft'
  and not exists(select 1 from public.qa_metric_values v where v.submission_id = s.id)
  and not exists(select 1 from public.qa_incident_details i where i.submission_id = s.id);
alter table public.qa_submissions alter column form_version set default 2;

create function private.has_assigned_home(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.qa_members m join public.qa_member_homes a on a.member_id=m.id
    join public.qa_homes h on h.id=a.home_id where m.user_id=auth.uid() and m.active and h.active and h.id=target);
$$;
create function private.manages_maintenance() returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_director() or exists(select 1 from public.workspace_access where user_id=auth.uid() and maintenance and can_manage_maintenance);
$$;
create function private.has_maintenance_home(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.manages_maintenance() or (private.has_assigned_home(target) and exists(select 1 from public.workspace_access where user_id=auth.uid() and maintenance));
$$;
revoke all on function private.has_assigned_home(uuid), private.manages_maintenance(), private.has_maintenance_home(uuid) from public, anon;
grant execute on function private.has_assigned_home(uuid), private.manages_maintenance(), private.has_maintenance_home(uuid) to authenticated;
create policy "Maintenance assigned homes" on public.qa_homes for select to authenticated using(private.has_maintenance_home(id));

create table public.qa_questionnaires(version integer primary key, questions jsonb not null check(jsonb_typeof(questions)='array'));
insert into public.qa_questionnaires values(2, '[
 {"code":"staff_support","section":1,"label":"Have staff received the induction, supervision and support needed this month?","provisions":[]},
 {"code":"staff_feedback","section":1,"label":"Has staff feedback been reviewed and followed up?","provisions":[]},
 {"code":"daily_records","section":1,"label":"Are daily records and required weekly reports complete and up to date?","provisions":[]},
 {"code":"meetings","section":1,"label":"Have required professional and local authority meetings been attended and recorded?","provisions":[]},
 {"code":"complaints","section":1,"label":"Have complaints been recorded, reviewed and followed up?","provisions":[]},
 {"code":"support_plans","section":2,"label":"Have individual support plans and agreed goals been reviewed?","provisions":[]},
 {"code":"activities","section":2,"label":"Has each person received support with their agreed activities and daily living goals?","provisions":[]},
 {"code":"resident_feedback","section":2,"label":"Have people been offered opportunities to give feedback and influence their support?","provisions":[]},
 {"code":"education","section":2,"label":"Has education attendance and required educational support been reviewed?","provisions":["Children’s Home","Children''s Home","Supported Accommodation"]},
 {"code":"key_work","section":2,"label":"Have agreed key work sessions and young people’s plan reviews taken place?","provisions":["Children''s Home","Supported Accommodation"]},
 {"code":"safeguarding","section":3,"label":"Have safeguarding concerns and incident follow-up been reviewed and recorded?","provisions":[]},
 {"code":"property_checks","section":3,"label":"Have required property, health and safety checks been completed?","provisions":[]},
 {"code":"fire_safety","section":3,"label":"Are required fire checks, logs and drills complete?","provisions":[]},
 {"code":"first_aid","section":3,"label":"Have first aid supplies and required checks been reviewed?","provisions":[]},
 {"code":"medication","section":3,"label":"Are medication records and checks complete where medication support is provided?","provisions":[]},
 {"code":"risk_reviews","section":3,"label":"Have risk assessments due for review been updated?","provisions":[]}
]');
alter table public.qa_questionnaires enable row level security;
grant select on public.qa_questionnaires to authenticated;
create policy "Questionnaire read" on public.qa_questionnaires for select to authenticated using(true);

create table public.qa_records (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('audits','incidents','risks','maintenance')),
 home_id uuid not null references public.qa_homes(id), occurred_on date not null, title text not null check(length(trim(title)) between 5 and 240),
 status text not null, data jsonb not null check(jsonb_typeof(data)='object'), version integer not null default 1,
 legacy_incident_id uuid unique references public.qa_incident_details(id),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((kind='audits' and status in ('Draft','Open','Closed')) or (kind='incidents' and status in ('Follow up','Monitoring','Closed')) or
 (kind='risks' and status in ('Open','Closed')) or (kind='maintenance' and status in ('Reported','In progress','Awaiting external','Completed')))
);
create index qa_records_home_kind_date on public.qa_records(home_id,kind,occurred_on);
insert into public.qa_records(kind,home_id,occurred_on,title,status,data,legacy_incident_id)
select 'incidents',s.home_id,coalesce(i.occurred_at::date,p.month_start),coalesce(nullif(i.summary,''),'Historical incident'),
 case i.status when 'closed' then 'Closed' when 'monitoring' then 'Monitoring' else 'Follow up' end,
 jsonb_build_object('description',coalesce(i.details,''),'category',coalesce(i.incident_type,''),'priority',coalesce(i.severity,''),
 'action_taken',coalesce(i.action_taken,''),'follow_up',coalesce(i.follow_up_notes,''),'physical_intervention',i.physical_intervention,
 'reported_within_24h',i.reported_within_24h,'source_submission_id',i.submission_id,'reference',i.reference),i.id
from public.qa_incident_details i join public.qa_submissions s on s.id=i.submission_id join public.qa_periods p on p.id=s.period_id where p.data_class='live';
alter table public.qa_records enable row level security;
revoke all on public.qa_records from anon, authenticated;
grant select,insert,update on public.qa_records to authenticated;
grant all on public.qa_records to service_role;
create policy "Register read" on public.qa_records for select to authenticated using (
 case when kind='maintenance' then private.has_maintenance_home(home_id) else private.is_director() or private.has_qa_home_access(home_id) end);
create policy "Register insert" on public.qa_records for insert to authenticated with check(created_by=auth.uid() and
 case when kind='maintenance' then private.has_maintenance_home(home_id) else private.is_director() or private.has_qa_home_access(home_id) end);
create policy "Register update" on public.qa_records for update to authenticated using(
 case when kind='maintenance' then private.has_maintenance_home(home_id) else private.is_director() or private.has_qa_home_access(home_id) end)
 with check(case when kind='maintenance' then private.has_maintenance_home(home_id) else private.is_director() or private.has_qa_home_access(home_id) end);
create function private.guard_qa_record() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if (new.id,new.home_id,new.kind,new.created_by,new.created_at,new.legacy_incident_id) is distinct from (old.id,old.home_id,old.kind,old.created_by,old.created_at,old.legacy_incident_id) then raise exception 'Record ownership cannot be changed'; end if;
  if new.version<>old.version+1 then raise exception 'This record changed. Reload before saving.' using errcode='40001'; end if;
  if old.kind='maintenance' and not private.manages_maintenance() and
    (new.title,new.occurred_on,new.status,new.data-'follow_up') is distinct from (old.title,old.occurred_on,old.status,old.data-'follow_up') then
    raise exception 'Only the maintenance lead or a director can manage this issue' using errcode='42501'; end if;
 elsif new.kind='maintenance' and not private.manages_maintenance() and new.status<>'Reported' then raise exception 'New issues must be reported first';
 end if;
 if new.kind='risks' and coalesce(new.data->>'priority','') not in ('Low','Moderate','High','Extremely high') then raise exception 'Choose a risk level'; end if;
 new.updated_at=now(); return new;
end $$;
create trigger guard_qa_record before insert or update on public.qa_records for each row execute function private.guard_qa_record();
create trigger audit_qa_records after insert or update on public.qa_records for each row execute function private.log_activity();

create table public.qa_report_forms (
 submission_id uuid primary key references public.qa_submissions(id), questionnaire_version integer not null references public.qa_questionnaires(version),
 body jsonb not null default '{}', snapshot jsonb, updated_at timestamptz not null default now()
);
alter table public.qa_report_forms enable row level security;
revoke all on public.qa_report_forms from anon,authenticated;
grant select on public.qa_report_forms to authenticated;
create policy "Report form read" on public.qa_report_forms for select to authenticated using(exists(select 1 from public.qa_submissions s where s.id=submission_id));

create function public.qa_save_report(target uuid, expected_version integer, operation text, content jsonb default '{}', reason text default '')
returns integer language plpgsql security definer set search_path='' as $$
declare s public.qa_submissions; h public.qa_homes; p public.qa_periods; q jsonb; a jsonb; snap jsonb; beds numeric;
begin
 if auth.uid() is null then raise exception 'Sign in again' using errcode='42501'; end if;
 select * into s from public.qa_submissions where id=target for update;
 if not found or not (private.is_director() or private.has_qa_home_access(s.home_id)) then raise exception 'No access to this report' using errcode='42501'; end if;
 if s.form_version<>2 then raise exception 'Use the historical report editor'; end if;
 if s.version<>expected_version then raise exception 'This report changed. Reload before saving.' using errcode='40001'; end if;
 select * into h from public.qa_homes where id=s.home_id;
 select * into p from public.qa_periods where id=s.period_id;
 if p.data_class<>'live' then raise exception 'Historical demonstration reports cannot be changed'; end if;
 if operation in ('approve','reopen') then
  if not private.is_director() then raise exception 'Only directors review reports' using errcode='42501'; end if;
  if operation='approve' then
   if s.status<>'submitted' then raise exception 'Only submitted reports can be approved'; end if;
   update public.qa_submissions set status='approved',approved_at=now(),approved_by=auth.uid(),version=version+1 where id=target;
  else
   if s.status not in ('submitted','approved') or length(trim(reason))<5 then raise exception 'Provide a reason to return this report'; end if;
   update public.qa_submissions set status='reopened',reopened_at=now(),reopened_by=auth.uid(),reopen_reason=reason,version=version+1 where id=target;
  end if;
  return s.version+1;
 end if;
 if operation not in ('draft','submit') or s.status not in ('draft','reopened') then raise exception 'This report is locked'; end if;
 if not h.active or p.closed_at is not null then raise exception 'This home or reporting period is closed'; end if;
 if jsonb_typeof(content->'answers') is distinct from 'object' then raise exception 'Invalid answers'; end if;
 for q in select value from jsonb_array_elements((select questions from public.qa_questionnaires where version=2)) loop
  if jsonb_array_length(q->'provisions')>0 and not (q->'provisions' ? h.provision) then continue; end if;
  a=content->'answers'->(q->>'code');
  if operation='submit' and (coalesce(a->>'answer','') not in ('yes','no','na') or (a->>'answer'<>'yes' and length(trim(coalesce(a->>'note','')))=0)) then
   raise exception 'Complete and explain: %',q->>'label'; end if;
 end loop;
 if operation='submit' then
  beds=nullif(content->>'occupied_beds','')::numeric;
  if beds is null or beds<0 or beds>h.total_beds or coalesce((content->>'records_confirmed')::boolean,false)=false then raise exception 'Check occupancy and confirm the registers'; end if;
  select jsonb_build_object('captured_at',now(),'home',to_jsonb(h),'month_start',p.month_start,'questions',questions,
    'records',coalesce((select jsonb_agg(to_jsonb(r)) from public.qa_records r where r.home_id=s.home_id and
      ((r.occurred_on>=p.month_start and r.occurred_on<(p.month_start+interval '1 month')::date) or
       (r.kind in ('risks','maintenance') and r.occurred_on<(p.month_start+interval '1 month')::date and r.status not in ('Closed','Completed')))), '[]'::jsonb))
    into snap from public.qa_questionnaires where version=2;
 end if;
 insert into public.qa_report_forms(submission_id,questionnaire_version,body,snapshot) values(target,2,content,snap)
 on conflict(submission_id) do update set body=excluded.body,snapshot=coalesce(excluded.snapshot,qa_report_forms.snapshot),updated_at=now();
 if operation='submit' then
  update public.qa_submissions set status='submitted',submitted_at=now(),submitted_by=auth.uid(),is_late=now()>p.due_at,version=version+1 where id=target;
 else update public.qa_submissions set version=version+1 where id=target; end if;
 return s.version+1;
end $$;
revoke all on function public.qa_save_report(uuid,integer,text,jsonb,text) from public,anon;
grant execute on function public.qa_save_report(uuid,integer,text,jsonb,text) to authenticated;

create function public.qa_assign_homes(target_user uuid, enabled boolean, homes uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare member uuid;
begin
 if not private.is_director() or not exists(select 1 from public.workspace_access where user_id=auth.uid() and is_admin) then raise exception 'Administrator required' using errcode='42501'; end if;
 if exists(select 1 from unnest(homes) x where not exists(select 1 from public.qa_homes h where h.id=x)) then raise exception 'Unknown home'; end if;
 insert into public.qa_members(user_id,display_name,active,invited_by) select id,display_name,enabled,auth.uid() from public.profiles where id=target_user
 on conflict(user_id) do update set active=excluded.active returning id into member;
 if member is null then raise exception 'A login account is required'; end if;
 delete from public.qa_member_homes where member_id=member;
 insert into public.qa_member_homes(member_id,home_id,assigned_by) select member,x,auth.uid() from (select distinct unnest(homes) x) t;
 insert into public.workspace_access(user_id,qa) values(target_user,enabled) on conflict(user_id) do update set qa=excluded.qa;
end $$;
revoke all on function public.qa_assign_homes(uuid,boolean,uuid[]) from public,anon;
grant execute on function public.qa_assign_homes(uuid,boolean,uuid[]) to authenticated;

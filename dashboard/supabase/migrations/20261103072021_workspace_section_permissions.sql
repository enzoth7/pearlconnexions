create table public.workspace_section_catalog (
 id text primary key, area text not null, director_only boolean not null default false
);
insert into public.workspace_section_catalog(id,area,director_only) values
 ('qa.overview','qa',false),('qa.monthly_reports','qa',false),('qa.audits','qa',false),('qa.incidents','qa',false),
 ('qa.risks','qa',false),('qa.reviews','qa',true),('qa.homes','qa',false),('finance.overview','finance',false),
 ('hr.overview','hr',false),('maintenance.issues','maintenance',false),('team.organisation_chart','team',true),('links.quick_links','links',false);
alter table public.workspace_section_catalog enable row level security;
grant select on public.workspace_section_catalog to authenticated;
create policy "Section catalogue read" on public.workspace_section_catalog for select to authenticated using(true);
alter table public.workspace_access add column visible_sections text[] not null default '{}';
insert into public.workspace_access(user_id,qa,workbook)
 select p.id,exists(select 1 from public.qa_members m where m.user_id=p.id and m.active),p.role in ('director','manager')
 from public.profiles p where not exists(select 1 from public.workspace_access a where a.user_id=p.id);
update public.workspace_access a set visible_sections=array(
 select c.id from public.workspace_section_catalog c where not c.director_only and
 case c.area when 'qa' then a.qa when 'finance' then a.finance when 'hr' then a.hr when 'maintenance' then a.maintenance
 when 'links' then a.qa or a.workbook or a.finance or a.hr or a.maintenance or a.is_admin else false end order by c.id
);

create function private.has_workspace_section(section_key text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (private.is_director() or exists(
 select 1 from public.workspace_access a join public.workspace_section_catalog c on c.id=section_key
 where a.user_id=auth.uid() and not c.director_only and section_key=any(a.visible_sections) and
 case c.area when 'qa' then a.qa when 'finance' then a.finance when 'hr' then a.hr when 'maintenance' then a.maintenance when 'links' then true else false end));
$$;
revoke all on function private.has_workspace_section(text) from public,anon;
grant execute on function private.has_workspace_section(text) to authenticated;

create function public.save_workspace_sections(target_user uuid, sections text[], workbook_enabled boolean, maintenance_lead boolean) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if not private.is_director() or not exists(select 1 from public.workspace_access where user_id=auth.uid() and is_admin) then raise exception 'Administrator required' using errcode='42501'; end if;
 perform 1 from public.profiles where id=target_user for update;
 if not found then raise exception 'User unavailable'; end if;
 if exists(select 1 from public.profiles where id=target_user and role='director') then raise exception 'Director access stays enabled'; end if;
 if sections is null or exists(select 1 from unnest(sections) key where not exists(select 1 from public.workspace_section_catalog c where c.id=key and not c.director_only)) then raise exception 'Unknown or restricted section'; end if;
 insert into public.workspace_access(user_id,qa,workbook,finance,hr,maintenance,can_manage_maintenance,visible_sections)
 values(target_user,exists(select 1 from unnest(sections) key where key like 'qa.%'),
 workbook_enabled and exists(select 1 from public.profiles where id=target_user and role='manager'),
 'finance.overview'=any(sections),'hr.overview'=any(sections),'maintenance.issues'=any(sections),
 maintenance_lead and 'maintenance.issues'=any(sections),array(select distinct unnest(sections)))
 on conflict(user_id) do update set qa=excluded.qa,workbook=excluded.workbook,finance=excluded.finance,hr=excluded.hr,
 maintenance=excluded.maintenance,can_manage_maintenance=excluded.can_manage_maintenance,visible_sections=excluded.visible_sections,updated_at=now();
end $$;
revoke all on function public.save_workspace_sections(uuid,text[],boolean,boolean) from public,anon;
grant execute on function public.save_workspace_sections(uuid,text[],boolean,boolean) to authenticated;

create policy "Register section read" on public.qa_records as restrictive for select to authenticated using(
 private.has_workspace_section(case kind when 'maintenance' then 'maintenance.issues' else 'qa.'||kind end));
create policy "Register section insert" on public.qa_records as restrictive for insert to authenticated with check(
 private.has_workspace_section(case kind when 'maintenance' then 'maintenance.issues' else 'qa.'||kind end));
create policy "Register section update" on public.qa_records as restrictive for update to authenticated using(
 private.has_workspace_section(case kind when 'maintenance' then 'maintenance.issues' else 'qa.'||kind end)) with check(
 private.has_workspace_section(case kind when 'maintenance' then 'maintenance.issues' else 'qa.'||kind end));
create policy "Report section read" on public.qa_submissions as restrictive for select to authenticated using(
 private.has_workspace_section('qa.overview') or private.has_workspace_section('qa.monthly_reports') or private.has_workspace_section('qa.reviews'));
create policy "Report answers section read" on public.qa_report_forms as restrictive for select to authenticated using(
 private.has_workspace_section('qa.monthly_reports') or private.has_workspace_section('qa.reviews'));
create policy "Report revision section read" on public.qa_report_revisions as restrictive for select to authenticated using(
 private.has_workspace_section('qa.monthly_reports') or private.has_workspace_section('qa.reviews'));
create policy "Metric section read" on public.qa_metric_values as restrictive for select to authenticated using(
 private.has_workspace_section('qa.monthly_reports') or private.has_workspace_section('qa.reviews'));
create policy "Historical incident section read" on public.qa_incident_details as restrictive for select to authenticated using(
 private.has_workspace_section('qa.incidents') or private.has_workspace_section('qa.monthly_reports') or private.has_workspace_section('qa.reviews'));
create policy "Quick links section read" on public.workspace_links as restrictive for select to authenticated using(private.has_workspace_section('links.quick_links'));

-- Only the permission-aware report reader exposes snapshots. Raw register details cannot leak through JSON.
revoke select on public.qa_report_forms from authenticated;
grant select(submission_id,questionnaire_version,body,updated_at) on public.qa_report_forms to authenticated;
revoke select on public.qa_report_revisions from authenticated;
grant select(id,submission_id,body,captured_at) on public.qa_report_revisions to authenticated;

create function private.visible_report_records(items jsonb) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(case when private.has_workspace_section(case item->>'kind' when 'maintenance' then 'maintenance.issues' else 'qa.'||(item->>'kind') end)
 then item else jsonb_build_object('id',item->'id','kind',item->'kind','occurred_on',item->'occurred_on','status',item->'status',
 'title',initcap(item->>'kind')||' record','data','{}'::jsonb) end),'[]'::jsonb) from jsonb_array_elements(coalesce(items,'[]'::jsonb)) item;
$$;
revoke all on function private.visible_report_records(jsonb) from public,anon;
grant execute on function private.visible_report_records(jsonb) to authenticated;

create function public.qa_visible_report(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.qa_submissions; p public.qa_periods; f public.qa_report_forms; records jsonb; snapshot jsonb;
begin
 select * into s from public.qa_submissions where id=target;
 if not found or not (private.has_workspace_section('qa.monthly_reports') or private.has_workspace_section('qa.reviews')) or
 not (private.is_director() or private.has_qa_home_access(s.home_id)) then raise exception 'Report access denied' using errcode='42501'; end if;
 select * into p from public.qa_periods where id=s.period_id;
 if p.data_class<>'live' then raise exception 'Report access denied' using errcode='42501'; end if;
 select * into f from public.qa_report_forms where submission_id=target;
 snapshot=f.snapshot;
 if snapshot is not null and s.status in ('submitted','approved') then records=snapshot->'records';
 else select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into records from public.qa_records r where r.home_id=s.home_id and r.occurred_on<(p.month_start+interval '1 month')::date and
 (r.occurred_on>=p.month_start or (r.kind in ('risks','maintenance') and r.status not in ('Closed','Completed'))); snapshot=null; end if;
 records=private.visible_report_records(records);
 if snapshot is not null then snapshot=jsonb_set(snapshot,'{records}',records); end if;
 return jsonb_build_object('body',f.body,'snapshot',snapshot,'records',records);
end $$;
revoke all on function public.qa_visible_report(uuid) from public,anon;
grant execute on function public.qa_visible_report(uuid) to authenticated;

create function public.qa_checklist_scores() returns table(submission_id uuid,score numeric) language sql stable security definer set search_path='' as $$
 select f.submission_id,(select count(*) filter(where value->>'answer'='yes')::numeric/nullif(count(*) filter(where value->>'answer' in ('yes','no')),0) from jsonb_each(f.body->'answers'))
 from public.qa_report_forms f join public.qa_submissions s on s.id=f.submission_id join public.qa_periods p on p.id=s.period_id
 where p.data_class='live' and (private.has_workspace_section('qa.overview') or private.has_workspace_section('qa.monthly_reports') or private.has_workspace_section('qa.reviews'))
 and (private.is_director() or private.has_qa_home_access(s.home_id));
$$;
revoke all on function public.qa_checklist_scores() from public,anon;
grant execute on function public.qa_checklist_scores() to authenticated;
create function public.qa_visible_record_counts() returns table(kind text,status text,total bigint) language sql stable security definer set search_path='' as $$
 select r.kind,r.status,count(*) from public.qa_records r where private.has_workspace_section('qa.overview') and
 (private.is_director() or private.has_qa_home_access(r.home_id)) group by r.kind,r.status;
$$;
revoke all on function public.qa_visible_record_counts() from public,anon;
grant execute on function public.qa_visible_record_counts() to authenticated;

-- Preserve the existing version/locking checks and home boundaries in privileged save functions.
do $$ declare f record; definition text; guard text; begin
 for f in select oid,proname from pg_proc where
 (pronamespace='public'::regnamespace and proname='qa_save_report') or
 (pronamespace='private'::regnamespace and proname in ('qa_save_draft_impl','qa_submit_submission_impl','qa_approve_submission_impl','qa_reopen_submission_impl')) loop
  definition=pg_get_functiondef(f.oid);
  if f.proname='qa_save_report' then guard='if not private.has_workspace_section(case when operation in (''approve'',''reopen'') then ''qa.reviews'' else ''qa.monthly_reports'' end) then raise exception ''This section is not enabled for your account'' using errcode=''42501''; end if;';
  else guard=format('if not private.has_workspace_section(%L) then raise exception ''This section is not enabled for your account'' using errcode=''42501''; end if;',case when f.proname in ('qa_approve_submission_impl','qa_reopen_submission_impl') then 'qa.reviews' else 'qa.monthly_reports' end); end if;
  execute regexp_replace(definition,'\mbegin\M','begin '||guard,'i');
 end loop;
 -- Assignments control home scope, while section permissions independently control visibility.
 definition=pg_get_functiondef('public.qa_assign_homes(uuid,boolean,uuid[])'::regprocedure);
 definition=replace(definition,'insert into public.workspace_access(user_id,qa) values(target_user,enabled) on conflict(user_id) do update set qa=excluded.qa;','');
 execute definition;
end $$;

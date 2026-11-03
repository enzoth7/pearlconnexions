-- Run through MCP or a database test connection. Every fixture and permission change is rolled back.
begin;
do $$
declare staff uuid; director uuid; own_home uuid; other_home uuid; report uuid; incident uuid; other_incident uuid;
 failed boolean; v integer; preview jsonb; changed integer;
begin
 select m.user_id,a.home_id into staff,own_home from public.qa_members m join public.qa_member_homes a on a.member_id=m.id where m.active limit 1;
 select id into director from public.profiles where role='director' limit 1;
 select id into other_home from public.qa_homes where id<>own_home and active limit 1;
 select id,version into report,v from public.qa_submissions where home_id=own_home and status='draft' and form_version=2 order by created_at desc limit 1;
 if report is null or staff is null or director is null then raise exception 'Assigned staff and a draft report are required';end if;
 update public.workspace_access set qa=true,maintenance=false,visible_sections=array['qa.monthly_reports'] where user_id=staff;
 insert into public.qa_records(kind,home_id,occurred_on,title,status,data,created_by)
 select 'incidents',own_home,p.month_start,'Sensitive case title','Follow up','{"description":"Sensitive description","category":"Other","action_taken":"Sensitive follow-up"}',staff
 from public.qa_submissions s join public.qa_periods p on p.id=s.period_id where s.id=report returning id into incident;
 insert into public.qa_records(kind,home_id,occurred_on,title,status,data,created_by)
 values('incidents',other_home,current_date,'Other home case','Follow up','{"description":"Another description","category":"Other","action_taken":"Follow-up recorded"}',staff) returning id into other_incident;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.qa_records where id=incident) then raise exception 'Hidden incident register exposed a case';end if;
 failed=false;begin insert into public.qa_records(kind,home_id,occurred_on,title,status,data) values('incidents',own_home,current_date,'Blocked write','Follow up','{"description":"Blocked write description","category":"Other","action_taken":"Follow-up recorded"}');exception when insufficient_privilege then failed=true;end;
 if not failed then raise exception 'Hidden incident register accepted a write';end if;
 preview=public.qa_visible_report(report);
 if preview::text like '%Sensitive%' then raise exception 'Hidden register details leaked through the monthly summary';end if;
 if not exists(select 1 from jsonb_array_elements(preview->'records') item where item->>'id'=incident::text) then raise exception 'Monthly summary omitted its aggregate record';end if;
 failed=false;begin perform snapshot from public.qa_report_forms where submission_id=report;exception when insufficient_privilege then failed=true;end;
 if not failed then raise exception 'Raw snapshots remain directly readable';end if;
 v=public.qa_save_report(report,v,'draft','{"answers":{},"occupied_beds":"0","records_confirmed":false}');
 failed=false;begin perform public.save_workspace_sections(staff,array['qa.incidents'],true,false);exception when insufficient_privilege then failed=true;end;
 if not failed then raise exception 'Staff granted their own sections';end if;
 update public.workspace_access set visible_sections=array['qa.incidents'] where user_id=staff;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Staff changed their own permission row';end if;
 execute 'reset role';
 update public.workspace_access set visible_sections=array['qa.incidents'] where user_id=staff;
 execute 'set local role authenticated';
 if not exists(select 1 from public.qa_records where id=incident) then raise exception 'Enabled incident register was inaccessible';end if;
 if exists(select 1 from public.qa_records where id=other_incident) then raise exception 'Section access expanded home scope';end if;
 if exists(select 1 from public.qa_submissions where id=report) then raise exception 'Hidden report section still exposes reports';end if;
 failed=false;begin perform public.qa_save_report(report,v,'draft','{"answers":{}}');exception when insufficient_privilege then failed=true;end;
 if not failed then raise exception 'Disabled Monthly reports accepted an RPC write';end if;
 failed=false;begin perform public.qa_visible_report(report);exception when insufficient_privilege then failed=true;end;
 if not failed then raise exception 'Disabled Monthly reports exposed a snapshot';end if;
 failed=false;begin perform public.qa_save_draft(report,v,null,'[]','[]');exception when insufficient_privilege then failed=true;end;
 if not failed then raise exception 'Historical RPC bypassed section permission';end if;
 execute 'reset role';
 update public.workspace_access set visible_sections='{}' where user_id=staff;
 execute 'set local role authenticated';
 if exists(select 1 from public.qa_records where id=incident) then raise exception 'Empty permissions retained register access';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',director::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',director,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 perform public.save_workspace_sections(staff,array['qa.monthly_reports'],true,true);
 if not exists(select 1 from public.workspace_access where user_id=staff and visible_sections=array['qa.monthly_reports'] and workbook and not maintenance and not can_manage_maintenance) then raise exception 'Permission save did not keep Workbook independent or clear invalid maintenance management';end if;
 failed=false;begin perform public.save_workspace_sections(staff,array['qa.reviews'],true,false);exception when others then failed=true;end;
 if not failed then raise exception 'Director-only section assigned to staff';end if;
 if not exists(select 1 from public.qa_records where id=other_incident) then raise exception 'Director lost full access';end if;
 execute 'reset role';
end $$;
rollback;
select 'section, home scope, snapshot privacy and permission-save assertions passed; fixtures rolled back' as result;

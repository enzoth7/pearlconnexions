-- Disposable local fixture only. Executed by scripts/test-qa-capture.mjs.
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000001','director@example.invalid');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000002','manager@example.invalid'),('00000000-0000-4000-8000-000000000003','outsider@example.invalid');
update public.profiles set role='manager' where id in ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003');
insert into public.qa_homes(id,code,name,provision,total_beds) values
 ('00000000-0000-4000-8000-000000000101','CH901','QA Test Home','Supported Living',4),
 ('00000000-0000-4000-8000-000000000102','CH902','QA Other Home','Supported Living',4);
insert into public.qa_members(id,user_id,display_name,email) values('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','QA manager','manager@example.invalid');
insert into public.qa_member_homes(member_id,home_id) values('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000101');
insert into public.workspace_access(user_id,qa,maintenance,visible_sections) values
 ('00000000-0000-4000-8000-000000000002',true,true,array['qa.overview','qa.risks','qa.incidents','qa.monthly_reports','maintenance.issues']),
 ('00000000-0000-4000-8000-000000000003',true,true,array['qa.overview','qa.risks','qa.incidents','qa.monthly_reports','maintenance.issues']);
insert into public.qa_people(id,home_id,code,alias) values('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000102','OTHER','Example other person');
create function pg_temp.assert_that(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'Assertion failed: %',label;end if;end $$;
create function pg_temp.must_fail(command text,pattern text) returns void language plpgsql as $$declare rejected boolean=false;begin
 begin execute command;exception when others then
  if position(lower(pattern) in lower(sqlerrm))=0 then raise exception 'Unexpected failure: %; expected %',sqlerrm,pattern;end if;rejected=true;
 end;
 if not rejected then raise exception 'Statement unexpectedly succeeded: %',command;end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
insert into public.qa_people(id,home_id,code,alias) values('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','PERSON-A','Example person A');
select pg_temp.assert_that((select count(*)=1 from public.qa_people),'person scope');
select pg_temp.must_fail($q$insert into public.qa_people(home_id,code,alias) values('00000000-0000-4000-8000-000000000102','BAD','No access')$q$,'row-level security');
select public.qa_save_case(body) from public.qa_test_payload where name='risk';
select pg_temp.assert_that((select count(*)=1 from public.qa_record_people),'person relation saved');
select pg_temp.must_fail($q$select public.qa_save_case(body) from public.qa_test_payload where name='risk'$q$,'changed');
select pg_temp.must_fail($q$select public.qa_save_case(jsonb_set(jsonb_set(body,'{id}','"00000000-0000-4000-8000-000000000311"'),'{data,person_ids}','["00000000-0000-4000-8000-000000000202"]')) from public.qa_test_payload where name='risk'$q$,'assigned to this home');
select pg_temp.must_fail($q$update public.qa_records set title='Bypass attempt',version=version+1 where kind='risks' returning id$q$,'__unused__') where false;
do $$declare n integer;begin update public.qa_records set title='Bypass attempt',version=version+1 where kind='risks';get diagnostics n=row_count;perform pg_temp.assert_that(n=0,'direct writes blocked');end $$;

-- Incomplete draft saves and reloads without entering counts.
select public.qa_save_case(jsonb_set(jsonb_set(jsonb_set(body,'{id}','"00000000-0000-4000-8000-000000000310"'),'{is_draft}','true'),'{data,controls}','""')) from public.qa_test_payload where name='risk';
select pg_temp.assert_that((select count(*)=1 from public.qa_overview_cases('2026-11-01')),'draft excluded from overview');
select pg_temp.must_fail($q$select public.qa_save_case(jsonb_set(jsonb_set(jsonb_set(body,'{id}','"00000000-0000-4000-8000-000000000310"'),'{version}','1'),'{data,controls}','""')) from public.qa_test_payload where name='risk'$q$,'controls');

-- Action and review are saved atomically with the parent, and retained.
select public.qa_save_case(jsonb_set(jsonb_set(jsonb_set(body,'{version}','1'),'{actions}','[{"id":"00000000-0000-4000-8000-000000000401","description":"Review support","owner":"Manager A","due_on":"2026-11-05","status":"Pending","completed_on":"","resolution":""}]'),'{reviews}','[{"id":"00000000-0000-4000-8000-000000000501","reviewed_on":"2026-11-03","author":"Manager A","outcome":"Support reviewed","residual_level":"Low","next_review_on":"2026-11-20"}]')) from public.qa_test_payload where name='risk';
select pg_temp.assert_that((select data->>'due_on'='2026-11-20' and data->>'priority'='Low' from public.qa_records where id='00000000-0000-4000-8000-000000000301'),'review updates current risk');
select pg_temp.assert_that((select count(*)=2 from public.qa_record_history where record_id='00000000-0000-4000-8000-000000000301'),'history recorded');
select pg_temp.must_fail($q$select public.qa_save_case(jsonb_set(body,'{version}','2')) from public.qa_test_payload where name='risk'$q$,'reviews must be retained');
select public.qa_save_case(body) from public.qa_test_payload where name='incident';
select pg_temp.assert_that((select (data->>'notified_at')::timestamptz-(data->>'occurred_at')::timestamptz=interval '24 hours' from public.qa_records where kind='incidents'),'notification timestamps persisted');
select pg_temp.must_fail($q$select public.qa_save_case(jsonb_set(jsonb_set(jsonb_set(body,'{id}','"00000000-0000-4000-8000-000000000312"'),'{data,occurred_local}','"2026-03-29T01:30"'),'{data,occurred_at}','"2026-03-29T01:30:00Z"')) from public.qa_test_payload where name='incident'$q$,'valid London incident time');

select public.qa_save_case(body) from public.qa_test_payload where name='maintenance';
select pg_temp.must_fail($q$select public.qa_save_case(jsonb_set(body,'{version}','1')) from public.qa_test_payload where name='maintenance'$q$,'maintenance lead');
select public.qa_append_case_note('00000000-0000-4000-8000-000000000303',1,'Contractor contacted');
select pg_temp.assert_that((select data->>'follow_up' like '%Contractor contacted' from public.qa_records where kind='maintenance'),'limited follow-up saved');

-- Archived people retain their established associations; cannot be assigned to a new record.
update public.qa_people set active=false,version=version+1 where id='00000000-0000-4000-8000-000000000201';
select pg_temp.assert_that((select count(*)=2 from public.qa_record_people where person_id='00000000-0000-4000-8000-000000000201' and record_id<>'00000000-0000-4000-8000-000000000310'),'archived history retained');
select pg_temp.must_fail($q$select public.qa_save_case(jsonb_set(body,'{id}','"00000000-0000-4000-8000-000000000313"')) from public.qa_test_payload where name='risk'$q$,'active person');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select pg_temp.assert_that((select count(*)=0 from public.qa_people),'outsider sees no people');
select pg_temp.assert_that((select count(*)=0 from public.qa_record_actions),'outsider sees no actions');
select pg_temp.assert_that((select count(*)=0 from public.qa_risk_reviews),'outsider sees no reviews');
select pg_temp.must_fail($q$select public.qa_save_case(body) from public.qa_test_payload where name='risk'$q$,'access denied');

-- Director completes the repair and reviews a v3 monthly report.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select pg_temp.must_fail($q$select public.qa_save_case(jsonb_set(jsonb_set(body,'{version}','2'),'{status}','"Completed"')) from public.qa_test_payload where name='maintenance'$q$,'closed_on');
select public.qa_save_case(jsonb_set(jsonb_set(jsonb_set(jsonb_set(body,'{version}','2'),'{status}','"Completed"'),'{data,closed_on}','"2026-11-04"'),'{data,resolution}','"Window repaired and checked"')) from public.qa_test_payload where name='maintenance';
reset role;
insert into public.qa_periods(id,month_start,data_class,opens_at,due_at) values('00000000-0000-4000-8000-000000000601','2026-11-01','live','2026-11-01','2026-12-10');
insert into public.qa_submissions(id,home_id,period_id) values('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000601') on conflict(home_id,period_id) do update set id=excluded.id;
update public.qa_test_payload set body=jsonb_set(body,'{answers}',(select jsonb_object_agg(q->>'code',jsonb_build_object('answer','yes','note','')) from public.qa_questionnaires, jsonb_array_elements(questions) q where version=3 and jsonb_array_length(q->'provisions')=0)) where name='report';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.qa_save_report('00000000-0000-4000-8000-000000000701',1,'draft',body) from public.qa_test_payload where name='report';
select pg_temp.must_fail($q$select public.qa_save_report('00000000-0000-4000-8000-000000000701',2,'submit',body-'measurements') from public.qa_test_payload where name='report'$q$,'measurements');
select public.qa_save_report('00000000-0000-4000-8000-000000000701',2,'submit',body) from public.qa_test_payload where name='report';
select pg_temp.assert_that((public.qa_visible_report('00000000-0000-4000-8000-000000000701')->'body'->'measurements'->'daily_records'->>'completed'='4'),'monthly quantities survive save/reload');
select pg_temp.assert_that((jsonb_array_length(public.qa_visible_report('00000000-0000-4000-8000-000000000701')->'snapshot'->'records')=3),'snapshot excludes draft');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.qa_save_report('00000000-0000-4000-8000-000000000701',3,'approve');
update public.qa_homes set total_beds=5 where id='00000000-0000-4000-8000-000000000101';
select pg_temp.assert_that((public.qa_visible_report('00000000-0000-4000-8000-000000000701')->'snapshot'->'home'->>'total_beds'='4'),'approved capacity snapshot stays stable');
select public.qa_save_report('00000000-0000-4000-8000-000000000701',4,'reopen','{}','Please review quantities');
reset role;
select pg_temp.assert_that((select count(*)=1 from public.qa_report_revisions where submission_id='00000000-0000-4000-8000-000000000701'),'immutable submission retained');
select 'End-to-end capture, scope, concurrency, drafts, timestamps, history, quantities and snapshots verified' as result;

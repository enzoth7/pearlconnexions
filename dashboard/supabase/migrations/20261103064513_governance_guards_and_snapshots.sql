-- Reports expose maintenance summaries for their own home even if that module is disabled.
drop policy "Register read" on public.qa_records;
create policy "Register read" on public.qa_records for select to authenticated using(
 private.is_director() or private.has_qa_home_access(home_id) or (kind='maintenance' and private.has_maintenance_home(home_id)));

-- Immutable submission revisions survive a return/resubmission cycle.
create table public.qa_report_revisions(
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.qa_submissions(id),
 body jsonb not null, snapshot jsonb not null, captured_at timestamptz not null default now()
);
alter table public.qa_report_revisions enable row level security;
revoke all on public.qa_report_revisions from anon,authenticated;
grant select on public.qa_report_revisions to authenticated;
create policy "Revision read" on public.qa_report_revisions for select to authenticated using(exists(select 1 from public.qa_submissions s where s.id=submission_id));
create function private.capture_report_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.snapshot is not null and (tg_op='INSERT' or new.snapshot is distinct from old.snapshot) then
  insert into public.qa_report_revisions(submission_id,body,snapshot) values(new.submission_id,new.body,new.snapshot);
 end if;
 return new;
end $$;
create trigger capture_report_revision after insert or update on public.qa_report_forms for each row execute function private.capture_report_revision();

-- The historical RPCs cannot submit or edit the new checklist format.
do $$ declare f record; definition text; begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in ('qa_save_draft','qa_submit_submission','qa_approve_submission','qa_reopen_submission') loop
  definition=pg_get_functiondef(f.oid);
  definition=regexp_replace(definition,'\mbegin\M','begin
    if exists(select 1 from public.qa_submissions where id=target_submission_id and form_version=2) then
      raise exception ''Use the checklist report workflow'';
    end if;', 'i');
  execute definition;
 end loop;
end $$;

create function private.validate_report_content() returns trigger language plpgsql set search_path='' as $$
declare q jsonb; pair record; catalog jsonb;
begin
 select questions into catalog from public.qa_questionnaires where version=new.questionnaire_version;
 for pair in select * from jsonb_each(new.body->'answers') loop
  if not exists(select 1 from jsonb_array_elements(catalog) item where item->>'code'=pair.key) then raise exception 'Unknown checklist question'; end if;
  if jsonb_typeof(pair.value) is distinct from 'object' or coalesce(pair.value->>'answer','') not in ('','yes','no','na') or jsonb_typeof(pair.value->'note') is distinct from 'string' or length(pair.value->>'note')>4000 then raise exception 'Invalid checklist response'; end if;
 end loop;
 return new;
end $$;
create trigger validate_report_content before insert or update on public.qa_report_forms for each row execute function private.validate_report_content();

create function private.guard_org_visibility() returns trigger language plpgsql set search_path='' as $$
begin
 if new.include_in_org_chart is distinct from old.include_in_org_chart and not private.is_director() then raise exception 'Only directors manage the organisation chart' using errcode='42501'; end if;
 return new;
end $$;
create trigger guard_org_visibility before update of include_in_org_chart on public.managers for each row execute function private.guard_org_visibility();

-- Initialise access for existing assigned QA managers; other users remain opt-in in Settings.
update public.workspace_access a set maintenance=true where exists(select 1 from public.qa_members m join public.qa_member_homes h on h.member_id=m.id where m.user_id=a.user_id and m.active);
create index qa_records_created_by_idx on public.qa_records(created_by);
create index qa_records_legacy_incident_idx on public.qa_records(legacy_incident_id) where legacy_incident_id is not null;
create index qa_report_revisions_submission_idx on public.qa_report_revisions(submission_id);

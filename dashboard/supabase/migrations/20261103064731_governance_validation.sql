drop index if exists public.qa_records_legacy_incident_idx; -- already covered by its unique constraint
alter table public.qa_records add constraint record_description_required check(length(trim(coalesce(data->>'description',''))) between 5 and 4000);
create function private.validate_register_fields() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then new.version=1;new.created_at=now();end if;
 if new.kind='audits' and coalesce(new.data->>'category','') not in ('Coordinator','Operations','Other') then raise exception 'Choose an audit type';end if;
 if new.kind='incidents' and (length(trim(coalesce(new.data->>'category','')))<1 or length(trim(coalesce(new.data->>'action_taken','')))<1) then raise exception 'Provide the incident type and action taken';end if;
 if new.kind in ('risks','maintenance') and length(trim(coalesce(new.data->>'location','')))=0 then raise exception 'Provide an area or location';end if;
 if new.kind='risks' and length(trim(coalesce(new.data->>'controls','')))=0 then raise exception 'Describe the existing controls';end if;
 if coalesce(new.data->>'workbook_action_id','')<>'' and not exists(select 1 from public.actions where id=(new.data->>'workbook_action_id')::uuid) then raise exception 'Workbook action is unavailable';end if;
 return new;
end $$;
create trigger validate_register_fields before insert or update on public.qa_records for each row execute function private.validate_register_fields();
create or replace function private.validate_report_content() returns trigger language plpgsql set search_path='' as $$
declare pair record; catalog jsonb; provision text;
begin
 select questions into catalog from public.qa_questionnaires where version=new.questionnaire_version;
 select h.provision into provision from public.qa_submissions s join public.qa_homes h on h.id=s.home_id where s.id=new.submission_id;
 for pair in select * from jsonb_each(new.body->'answers') loop
  if not exists(select 1 from jsonb_array_elements(catalog) item where item->>'code'=pair.key and
    (jsonb_array_length(item->'provisions')=0 or item->'provisions' ? provision)) then raise exception 'Unknown or inapplicable checklist question'; end if;
  if jsonb_typeof(pair.value) is distinct from 'object' or coalesce(pair.value->>'answer','') not in ('','yes','no','na') or jsonb_typeof(pair.value->'note') is distinct from 'string' or length(pair.value->>'note')>4000 then raise exception 'Invalid checklist response'; end if;
 end loop;
 if new.body->>'occupied_beds' in ('NaN','Infinity','-Infinity') then raise exception 'Invalid occupancy';end if;
 return new;
end $$;
-- Serialise assignment changes on the account before replacing the list.
do $$ declare definition text;begin
 definition=pg_get_functiondef('public.qa_assign_homes(uuid,boolean,uuid[])'::regprocedure);
 definition=replace(definition,'insert into public.qa_members(user_id','perform 1 from public.profiles where id=target_user for update;
 insert into public.qa_members(user_id');execute definition;
end $$;

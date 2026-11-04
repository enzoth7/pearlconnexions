-- Keep the record UUIDs and links unchanged while making QA references readable.
create sequence private.qa_incident_ref_seq;
create sequence private.qa_risk_ref_seq;

-- The existing trigger makes references immutable. Suspend that trigger only
-- while replacing the displayed references on existing records.
alter table public.qa_records disable trigger validate_qa_case;
with numbered as (
  select id, row_number() over (order by created_at, id) as number
  from public.qa_records
  where kind = 'incidents'
)
update public.qa_records as incident
set reference = 'INC-' || lpad(numbered.number::text, greatest(4, length(numbered.number::text)), '0'),
    version = incident.version + 1
from numbered
where incident.id = numbered.id;

with numbered as (
  select id, row_number() over (order by created_at, id) as number
  from public.qa_records
  where kind = 'risks'
)
update public.qa_records as risk
set reference = 'RISK-' || lpad(numbered.number::text, greatest(4, length(numbered.number::text)), '0'),
    version = risk.version + 1
from numbered
where risk.id = numbered.id;
alter table public.qa_records enable trigger validate_qa_case;

select setval('private.qa_incident_ref_seq'::regclass,
  greatest(1, (select count(*) from public.qa_records where kind = 'incidents')),
  exists(select 1 from public.qa_records where kind = 'incidents'));
select setval('private.qa_risk_ref_seq'::regclass,
  greatest(1, (select count(*) from public.qa_records where kind = 'risks')),
  exists(select 1 from public.qa_records where kind = 'risks'));

do $$
declare definition text; old_expression text; new_expression text;
begin
  definition = pg_get_functiondef('private.validate_qa_case()'::regprocedure);
  old_expression = 'when new.kind=''incidents'' then ''INC-'' || upper(new.id::text) else ''RISK-'' || upper(new.id::text)';
  new_expression = 'when new.kind=''incidents'' then ''INC-'' || lpad(nextval(''private.qa_incident_ref_seq''::regclass)::text, greatest(4, length(currval(''private.qa_incident_ref_seq''::regclass)::text)), ''0'') else ''RISK-'' || lpad(nextval(''private.qa_risk_ref_seq''::regclass)::text, greatest(4, length(currval(''private.qa_risk_ref_seq''::regclass)::text)), ''0'')';
  if position(old_expression in definition) = 0 then
    raise exception 'QA reference generation has changed; review this migration';
  end if;
  execute replace(definition, old_expression, new_expression);
end $$;

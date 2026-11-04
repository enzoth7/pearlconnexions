-- Use stable, readable maintenance references for both existing and new issues.
create sequence private.qa_maintenance_ref_seq;

-- The old validation protects immutable references. Temporarily suspend only that
-- trigger while assigning the new references, preserving all other checks.
alter table public.qa_records disable trigger validate_qa_case;
with numbered as (
  select id, row_number() over (order by created_at, id) as number
  from public.qa_records
  where kind = 'maintenance'
)
update public.qa_records as issue
set reference = 'MAINT-' || lpad(numbered.number::text, 4, '0'),
    version = issue.version + 1
from numbered
where issue.id = numbered.id;
alter table public.qa_records enable trigger validate_qa_case;

select setval(
  'private.qa_maintenance_ref_seq'::regclass,
  greatest(1, (select count(*) from public.qa_records where kind = 'maintenance')),
  exists(select 1 from public.qa_records where kind = 'maintenance')
);

do $$
declare definition text; old_expression text; new_expression text;
begin
  definition = pg_get_functiondef('private.validate_qa_case()'::regprocedure);
  old_expression = 'else new.reference=case new.kind when ''incidents'' then ''INC-'' when ''risks'' then ''RISK-'' else ''MAINT-'' end || upper(new.id::text);end if;';
  new_expression = 'else new.reference=case when new.kind=''maintenance'' then ''MAINT-'' || lpad(nextval(''private.qa_maintenance_ref_seq''::regclass)::text, greatest(4, length(currval(''private.qa_maintenance_ref_seq''::regclass)::text)), ''0'') when new.kind=''incidents'' then ''INC-'' || upper(new.id::text) else ''RISK-'' || upper(new.id::text) end;end if;';
  if position(old_expression in definition) = 0 then
    raise exception 'Maintenance reference generation has changed; review this migration';
  end if;
  execute replace(definition, old_expression, new_expression);
end $$;

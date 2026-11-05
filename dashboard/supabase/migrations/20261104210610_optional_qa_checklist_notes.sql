-- Checklist choices are complete without free-text notes. Quantitative N/A and
-- zero-expected explanations remain mandatory in qa_validate_measurements.
do $$
declare
  definition text;
  previous_check text := 'if operation=''submit'' and (coalesce(a->>''answer'','''') not in (''yes'',''no'',''na'') or (a->>''answer''<>''yes'' and length(trim(coalesce(a->>''note'','''')))=0)) then';
begin
  definition := pg_get_functiondef('public.qa_save_report(uuid,integer,text,jsonb,text)'::regprocedure);
  if position(previous_check in definition) = 0 then
    raise exception 'QA checklist validation changed; review this migration before applying';
  end if;
  definition := replace(definition, previous_check,
    'if operation=''submit'' and coalesce(a->>''answer'','''') not in (''yes'',''no'',''na'') then');
  definition := replace(definition, 'Complete and explain: %', 'Complete: %');
  execute definition;
end $$;

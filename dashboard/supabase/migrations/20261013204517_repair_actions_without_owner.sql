-- Legacy imports can contain actions whose participants are all marked as
-- Support. Promote the earliest imported participant so every populated
-- action has one genuine lead owner instead of relying on a UI fallback.
with ranked_support as (
  select
    participant.id,
    row_number() over (
      partition by participant.action_id
      order by participant.source_row, participant.created_at, participant.id
    ) as owner_rank
  from public.action_participants participant
  where participant.responsibility_type = 'Support'
    and not exists (
      select 1
      from public.action_participants existing_owner
      where existing_owner.action_id = participant.action_id
        and existing_owner.responsibility_type <> 'Support'
    )
)
update public.action_participants participant
set
  responsibility_type = 'Owner',
  responsibility_text = 'Lead delivery'
from ranked_support candidate
where participant.id = candidate.id
  and candidate.owner_rank = 1;

do $$
begin
  if exists (
    select 1
    from public.actions action
    where exists (
      select 1
      from public.action_participants participant
      where participant.action_id = action.id
    )
      and not exists (
        select 1
        from public.action_participants owner
        where owner.action_id = action.id
          and owner.responsibility_type <> 'Support'
      )
  ) then
    raise exception 'Owner repair failed: populated actions without an owner remain';
  end if;
end;
$$;

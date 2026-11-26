-- House each team member manages, so the organisation chart can place house
-- managers under their service (Supported Living, Supported Accommodation, Children's Home).
create or replace function public.team_chart_homes()
returns table(manager_id uuid, home_name text, provision text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.manager_id, h.name, h.provision
  from public.qa_member_homes mh
  join public.qa_members qm on qm.id = mh.member_id
  join public.profiles p on p.id = qm.user_id
  join public.qa_homes h on h.id = mh.home_id
  where private.has_workspace_section('team.organisation_chart')
    and p.manager_id is not null
    and h.active
  order by h.name;
$$;

revoke all on function public.team_chart_homes() from public, anon;
grant execute on function public.team_chart_homes() to authenticated;

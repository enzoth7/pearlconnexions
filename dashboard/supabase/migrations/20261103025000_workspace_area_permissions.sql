create table public.workspace_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  qa boolean not null default false,
  workbook boolean not null default false,
  finance boolean not null default false,
  hr boolean not null default false,
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.workspace_access (user_id, qa, workbook, finance, hr, is_admin)
select p.id, p.role = 'director', p.role in ('director', 'manager'),
       p.role = 'director', p.role = 'director', p.role = 'director'
from public.profiles p;

insert into public.workspace_access (user_id, qa)
select m.user_id, true from public.qa_members m
where m.user_id is not null and m.active
on conflict (user_id) do update set qa = true;

alter table public.workspace_access enable row level security;
grant select, insert, update on public.workspace_access to authenticated;
grant all on public.workspace_access to service_role;

create policy "Workspace access self or director read" on public.workspace_access
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_director()));

create policy "Director creates workspace access" on public.workspace_access
for insert to authenticated with check ((select private.is_director()));

create policy "Director updates workspace access" on public.workspace_access
for update to authenticated
using ((select private.is_director()))
with check ((select private.is_director()));

create or replace function private.is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles p
    left join public.workspace_access a on a.user_id = p.id
    where p.id = (select auth.uid()) and p.role = 'manager'
      and coalesce(a.workbook, true)
  );
$$;

create or replace function private.is_active_qa_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.qa_members m
    left join public.workspace_access a on a.user_id = m.user_id
    where m.user_id = (select auth.uid()) and m.active and coalesce(a.qa, true)
  );
$$;

create or replace function private.has_qa_home_access(target_home_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.qa_members m
    join public.qa_member_homes mh on mh.member_id = m.id
    left join public.workspace_access a on a.user_id = m.user_id
    where m.user_id = (select auth.uid()) and m.active
      and mh.home_id = target_home_id and coalesce(a.qa, true)
  );
$$;

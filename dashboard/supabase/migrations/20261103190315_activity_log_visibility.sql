-- Activity log is a separate Settings tab. Joel gets it initially; managers can
-- receive it later through the existing section permissions editor.
insert into public.workspace_section_catalog (id, area, director_only)
values ('settings.activity_log', 'settings', false);

update public.workspace_access access
set visible_sections = array_append(access.visible_sections, 'settings.activity_log'),
    updated_at = now()
from public.profiles profile
join auth.users account on account.id = profile.id
where access.user_id = profile.id and profile.role = 'director' and access.is_admin
  and lower(profile.display_name) = 'joel samuel'
  and lower(account.email) = 'admin@pearlconnexions.com'
  and not 'settings.activity_log' = any(access.visible_sections);

create function private.can_view_activity_log()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.workspace_access access
      where access.user_id = auth.uid()
        and 'settings.activity_log' = any(access.visible_sections)
    )
    and private.has_workspace_section('settings.activity_log');
$$;
revoke all on function private.can_view_activity_log() from public, anon;
grant execute on function private.can_view_activity_log() to authenticated;

-- The old director-wide table policy must also respect this explicit tab grant.
create policy "Activity log tab required" on public.activity_log as restrictive
for select to authenticated using (private.can_view_activity_log());

-- A session is created for each successful sign-in, including password and
-- link-based authentication. Keep a compact, durable record of those events.
create table public.sign_in_events (
  session_id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  signed_in_at timestamptz not null
);
create index sign_in_events_user_time_idx on public.sign_in_events(user_id, signed_in_at desc);
create index sign_in_events_time_idx on public.sign_in_events(signed_in_at desc);
alter table public.sign_in_events enable row level security;
revoke all on public.sign_in_events from public, anon, authenticated;

create function private.log_sign_in()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.sign_in_events(session_id, user_id, signed_in_at)
  values (new.id, new.user_id, coalesce(new.created_at, now()))
  on conflict (session_id) do nothing;
  return new;
end;
$$;
revoke all on function private.log_sign_in() from public, anon, authenticated, service_role;
create trigger log_successful_sign_in after insert on auth.sessions
for each row execute function private.log_sign_in();

create index activity_log_recent_actor_idx on public.activity_log(occurred_at desc)
where actor_id is not null;

-- Return only the fields needed by the page, never the raw before/after JSON.
create function public.get_activity_log()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_view_activity_log() then
    raise exception 'Activity log access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'as_of', now(),
    'events', (
      select coalesce(jsonb_agg(to_jsonb(event) order by event.occurred_at desc, event.event_id desc), '[]'::jsonb)
      from (
        select 'change:' || activity.id::text as event_id,
          activity.occurred_at,
          coalesce(profile.display_name, account.email, 'Former user') as user_name,
          activity.table_name,
          activity.operation,
          left(coalesce(
            activity.new_data->>'reference', activity.old_data->>'reference',
            activity.new_data->>'name', activity.old_data->>'name',
            activity.new_data->'data'->>'title', activity.old_data->'data'->>'title',
            ''), 100) as record_label
        from public.activity_log activity
        left join public.profiles profile on profile.id = activity.actor_id
        left join auth.users account on account.id = activity.actor_id
        where activity.actor_id is not null
          and activity.table_name in (
            'actions', 'action_participants', 'action_updates', 'action_signoffs',
            'managers', 'qa_homes', 'qa_members', 'qa_member_homes',
            'qa_periods', 'qa_submissions', 'qa_records'
          )
        union all
        select 'login:' || login.session_id::text,
          login.signed_in_at,
          coalesce(profile.display_name, account.email, 'Former user'),
          'sign_in', 'LOGIN', ''
        from public.sign_in_events login
        left join public.profiles profile on profile.id = login.user_id
        left join auth.users account on account.id = login.user_id
      ) event
      order by event.occurred_at desc, event.event_id desc
      limit 200
    ),
    'users', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'manager_id', manager.id,
        'user_id', account.id,
        'name', manager.name,
        'email', coalesce(account.email, manager.email),
        'last_sign_in_at', account.last_sign_in_at,
        'sign_in_count', coalesce(counts.sign_in_count, 0)
      ) order by manager.name), '[]'::jsonb)
      from public.managers manager
      left join public.profiles profile on profile.manager_id = manager.id
      left join auth.users account on account.id = profile.id
      left join (
        select user_id, count(*) as sign_in_count
        from public.sign_in_events group by user_id
      ) counts on counts.user_id = account.id
    )
  );
end;
$$;
revoke all on function public.get_activity_log() from public, anon;
grant execute on function public.get_activity_log() to authenticated;

-- Include team and permission changes in the same audit trail as Workbook and QA.
create or replace function private.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare payload_old jsonb; payload_new jsonb; target_id uuid;
begin
  payload_old := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  payload_new := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  if tg_table_name = 'workspace_access' then
    target_id := (coalesce(payload_new, payload_old)->>'user_id')::uuid;
  else
    target_id := case when tg_op = 'DELETE' then old.id else new.id end;
  end if;
  insert into public.activity_log(actor_id, table_name, record_id, operation, old_data, new_data)
  values (auth.uid(), tg_table_name, target_id, tg_op, payload_old, payload_new);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger audit_profiles after insert or update or delete on public.profiles
for each row execute function private.log_activity();
create trigger audit_managers after insert or update or delete on public.managers
for each row execute function private.log_activity();
create trigger audit_workstreams after insert or update or delete on public.workstreams
for each row execute function private.log_activity();
create trigger audit_workspace_access after insert or update or delete on public.workspace_access
for each row execute function private.log_activity();
create or replace function public.get_activity_log()
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
        select * from (
        select 'change:' || activity.id::text as event_id,
          activity.occurred_at,
          coalesce(profile.display_name, account.email, 'Former user') as user_name,
          activity.table_name,
          activity.operation,
          left(coalesce(
            activity.new_data->>'reference', activity.old_data->>'reference',
            activity.new_data->>'name', activity.old_data->>'name',
            activity.new_data->>'display_name', activity.old_data->>'display_name',
            target_profile.display_name,
            activity.new_data->'data'->>'title', activity.old_data->'data'->>'title',
            ''), 100) as record_label
        from public.activity_log activity
        left join public.profiles profile on profile.id = activity.actor_id
        left join auth.users account on account.id = activity.actor_id
        left join public.profiles target_profile on target_profile.id = activity.record_id
        where activity.actor_id is not null
          and activity.table_name in (
            'actions', 'action_participants', 'action_updates', 'action_signoffs',
            'managers', 'qa_homes', 'qa_members', 'qa_member_homes',
            'qa_periods', 'qa_submissions', 'qa_records',
            'profiles', 'workspace_access', 'workstreams'
          )
        union all
        select 'login:' || login.session_id::text,
          login.signed_in_at,
          coalesce(profile.display_name, account.email, 'Former user'),
          'sign_in', 'LOGIN', ''
        from public.sign_in_events login
        left join public.profiles profile on profile.id = login.user_id
        left join auth.users account on account.id = login.user_id
        ) combined
        order by combined.occurred_at desc, combined.event_id desc
        limit 200
      ) event
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

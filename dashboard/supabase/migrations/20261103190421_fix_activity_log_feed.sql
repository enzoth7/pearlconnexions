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

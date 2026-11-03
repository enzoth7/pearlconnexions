create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'pending' check (role in ('director', 'manager', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.managers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role_title text,
  source_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workstreams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_hash text not null unique,
  imported_at timestamptz not null default now(),
  workbook_rows integer not null check (workbook_rows >= 0),
  notes text
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^[A-Z]{2}[0-9]{2}$'),
  workstream_id uuid not null references public.workstreams(id),
  title text not null check (char_length(title) >= 5),
  priority text check (priority in ('High', 'Medium', 'Low')),
  base_status text not null default 'Not Started' check (base_status in ('Not Started', 'In Progress', 'At Risk')),
  date_added date,
  deadline date,
  extended_deadline date,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actions_extension_after_deadline check (extended_deadline is null or deadline is null or extended_deadline >= deadline)
);

create table public.action_participants (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  manager_id uuid not null references public.managers(id),
  responsibility_type text not null check (responsibility_type in ('Owner', 'Joint owner', 'Collective SMT owner', 'Support')),
  responsibility_text text not null,
  source_workbook text not null,
  source_row integer not null check (source_row > 0),
  created_at timestamptz not null default now(),
  unique(action_id, manager_id)
);

create table public.action_updates (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  review_date date not null,
  comments text,
  barriers text,
  next_review_at date,
  outcome text,
  evidence text,
  lessons_learned text,
  follow_up text,
  directors_comments text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.action_signoffs (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.actions(id) on delete cascade,
  signed_off_by uuid references auth.users(id) on delete set null default auth.uid(),
  signed_off_by_name text not null,
  signed_off_at timestamptz not null default now()
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id uuid not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now()
);

create index actions_workstream_id_idx on public.actions(workstream_id);
create index actions_status_deadline_idx on public.actions(base_status, deadline);
create index action_participants_action_id_idx on public.action_participants(action_id);
create index action_participants_manager_id_idx on public.action_participants(manager_id);
create index action_updates_action_review_idx on public.action_updates(action_id, review_date desc);
create index action_updates_created_by_idx on public.action_updates(created_by);
create index action_signoffs_signed_off_by_idx on public.action_signoffs(signed_off_by);
create index activity_log_actor_id_idx on public.activity_log(actor_id);
create index activity_log_record_idx on public.activity_log(table_name, record_id, occurred_at desc);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger managers_updated_at before update on public.managers for each row execute function private.set_updated_at();
create trigger actions_updated_at before update on public.actions for each row execute function private.set_updated_at();
create trigger action_updates_updated_at before update on public.action_updates for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assigned_role text;
begin
  lock table public.profiles in exclusive mode;
  assigned_role := case when not exists (select 1 from public.profiles where role = 'director') then 'director' else 'pending' end;
  insert into public.profiles(id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), assigned_role);
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated, service_role;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.is_director()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'director'
  );
$$;
revoke execute on function private.is_director() from public, anon, service_role;
grant usage on schema private to authenticated;
grant execute on function private.is_director() to authenticated;

create or replace function private.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare payload_old jsonb; payload_new jsonb; target_id uuid;
begin
  payload_old := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  payload_new := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  target_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.activity_log(actor_id, table_name, record_id, operation, old_data, new_data)
  values ((select auth.uid()), tg_table_name, target_id, tg_op, payload_old, payload_new);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke execute on function private.log_activity() from public, anon, authenticated, service_role;

create trigger audit_actions after insert or update or delete on public.actions for each row execute function private.log_activity();
create trigger audit_participants after insert or update or delete on public.action_participants for each row execute function private.log_activity();
create trigger audit_updates after insert or update or delete on public.action_updates for each row execute function private.log_activity();
create trigger audit_signoffs after insert or update or delete on public.action_signoffs for each row execute function private.log_activity();

alter table public.profiles enable row level security;
alter table public.managers enable row level security;
alter table public.workstreams enable row level security;
alter table public.imports enable row level security;
alter table public.actions enable row level security;
alter table public.action_participants enable row level security;
alter table public.action_updates enable row level security;
alter table public.action_signoffs enable row level security;
alter table public.activity_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select, insert, update on public.profiles, public.managers, public.workstreams, public.imports, public.actions, public.action_participants, public.action_updates to authenticated;
grant select, insert on public.action_signoffs to authenticated;
grant select on public.activity_log to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','managers','workstreams','imports','actions','action_participants','action_updates','action_signoffs','activity_log']
  loop
    execute format('create policy "Director select" on public.%I for select to authenticated using ((select private.is_director()))', table_name);
  end loop;
  foreach table_name in array array['profiles','managers','workstreams','imports','actions','action_participants','action_updates','action_signoffs']
  loop
    execute format('create policy "Director insert" on public.%I for insert to authenticated with check ((select private.is_director()))', table_name);
  end loop;
  foreach table_name in array array['profiles','managers','workstreams','imports','actions','action_participants','action_updates']
  loop
    execute format('create policy "Director update" on public.%I for update to authenticated using ((select private.is_director())) with check ((select private.is_director()))', table_name);
  end loop;
end $$;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

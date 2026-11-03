create table public.qa_incident_details (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.qa_submissions(id) on delete cascade,
  incident_number integer not null check (incident_number > 0),
  reference text not null check (char_length(trim(reference)) between 6 and 80),
  occurred_at timestamptz not null,
  incident_type text not null check (char_length(trim(incident_type)) between 3 and 80),
  severity text not null check (severity in ('low', 'moderate', 'high', 'critical')),
  summary text not null check (char_length(trim(summary)) between 5 and 240),
  details text not null check (char_length(trim(details)) between 10 and 2000),
  action_taken text not null check (char_length(trim(action_taken)) between 5 and 2000),
  follow_up_notes text check (follow_up_notes is null or char_length(trim(follow_up_notes)) between 5 and 2000),
  reported_within_24h boolean not null default false,
  status text not null check (status in ('closed', 'monitoring', 'follow_up')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, incident_number),
  unique (submission_id, reference)
);

create index qa_incident_details_submission_occurred_idx
  on public.qa_incident_details(submission_id, occurred_at desc);

create trigger qa_incident_details_updated_at before update on public.qa_incident_details
for each row execute function private.set_updated_at();

alter table public.qa_incident_details enable row level security;

revoke all on public.qa_incident_details from anon, authenticated;
grant select, insert, update, delete on public.qa_incident_details to authenticated;
grant all on public.qa_incident_details to service_role;

create policy "QA authorised read" on public.qa_incident_details
for select to authenticated using (
  (select private.is_director())
  or exists (
    select 1
    from public.qa_submissions submission
    join public.qa_periods period on period.id = submission.period_id and period.data_class = 'live'
    where submission.id = submission_id
      and (select private.has_qa_home_access(submission.home_id))
  )
);

create policy "QA authorised insert" on public.qa_incident_details
for insert to authenticated with check (
  (select private.is_director())
  or exists (
    select 1
    from public.qa_submissions submission
    join public.qa_periods period on period.id = submission.period_id and period.data_class = 'live'
    where submission.id = submission_id
      and submission.status in ('draft', 'reopened')
      and (select private.has_qa_home_access(submission.home_id))
  )
);

create policy "QA authorised update" on public.qa_incident_details
for update to authenticated
using (
  (select private.is_director())
  or exists (
    select 1
    from public.qa_submissions submission
    join public.qa_periods period on period.id = submission.period_id and period.data_class = 'live'
    where submission.id = submission_id
      and submission.status in ('draft', 'reopened')
      and (select private.has_qa_home_access(submission.home_id))
  )
)
with check (
  (select private.is_director())
  or exists (
    select 1
    from public.qa_submissions submission
    join public.qa_periods period on period.id = submission.period_id and period.data_class = 'live'
    where submission.id = submission_id
      and submission.status in ('draft', 'reopened')
      and (select private.has_qa_home_access(submission.home_id))
  )
);

create policy "QA authorised delete" on public.qa_incident_details
for delete to authenticated using (
  (select private.is_director())
  or exists (
    select 1
    from public.qa_submissions submission
    join public.qa_periods period on period.id = submission.period_id and period.data_class = 'live'
    where submission.id = submission_id
      and submission.status in ('draft', 'reopened')
      and (select private.has_qa_home_access(submission.home_id))
  )
);

create trigger audit_qa_incident_details after insert or update or delete on public.qa_incident_details
for each row execute function private.log_activity();

create index qa_import_rows_metric_idx on public.qa_import_rows(normalized_metric_code);
create index qa_imports_imported_by_idx on public.qa_imports(imported_by);
create index qa_member_homes_assigned_by_idx on public.qa_member_homes(assigned_by);
create index qa_members_invited_by_idx on public.qa_members(invited_by);
create index qa_metric_aliases_metric_idx on public.qa_metric_aliases(metric_code);
create index qa_metric_values_updated_by_idx on public.qa_metric_values(updated_by);
create index qa_period_runs_period_idx on public.qa_period_runs(period_id);
create index qa_submissions_approved_by_idx on public.qa_submissions(approved_by);
create index qa_submissions_reopened_by_idx on public.qa_submissions(reopened_by);
create index qa_submissions_submitted_by_idx on public.qa_submissions(submitted_by);

drop policy "QA director select" on public.qa_homes;
drop policy "QA members read assigned homes" on public.qa_homes;
create policy "QA authorised read" on public.qa_homes for select to authenticated
using ((select private.is_director()) or (select private.has_qa_home_access(id)));

drop policy "QA director select" on public.qa_members;
drop policy "QA members read own membership" on public.qa_members;
create policy "QA authorised read" on public.qa_members for select to authenticated
using ((select private.is_director()) or (user_id = (select auth.uid()) and active));

drop policy "QA director select" on public.qa_member_homes;
drop policy "QA members read own home assignments" on public.qa_member_homes;
create policy "QA authorised read" on public.qa_member_homes for select to authenticated
using (
  (select private.is_director())
  or exists (
    select 1 from public.qa_members m
    where m.id = member_id and m.user_id = (select auth.uid()) and m.active
  )
);

drop policy "QA director select" on public.qa_metric_definitions;
drop policy "QA members read active metric catalogue" on public.qa_metric_definitions;
create policy "QA authorised read" on public.qa_metric_definitions for select to authenticated
using ((select private.is_director()) or ((select private.is_active_qa_member()) and active_for_house));

drop policy "QA director select" on public.qa_periods;
drop policy "QA members read live periods" on public.qa_periods;
create policy "QA authorised read" on public.qa_periods for select to authenticated
using ((select private.is_director()) or ((select private.is_active_qa_member()) and data_class = 'live'));

drop policy "QA director select" on public.qa_submissions;
drop policy "QA members read assigned live submissions" on public.qa_submissions;
create policy "QA authorised read" on public.qa_submissions for select to authenticated
using (
  (select private.is_director())
  or (
    (select private.has_qa_home_access(home_id))
    and exists (select 1 from public.qa_periods p where p.id = period_id and p.data_class = 'live')
  )
);

drop policy "QA director select" on public.qa_metric_values;
drop policy "QA members read assigned live metric values" on public.qa_metric_values;
create policy "QA authorised read" on public.qa_metric_values for select to authenticated
using (
  (select private.is_director())
  or exists (
    select 1 from public.qa_submissions s
    join public.qa_periods p on p.id = s.period_id and p.data_class = 'live'
    where s.id = submission_id and (select private.has_qa_home_access(s.home_id))
  )
);

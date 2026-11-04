-- Optional HR examples for visual review. IDs are stable so this file can be rerun safely.
begin;

with examples (example_id, home_name, shift_on, shift_type, required_staff, planned_staff, present_staff, agency_staff, overtime_hours, commissioned_support_hours, delivered_support_hours, notes) as (
  values
    ('01', 'Brambles Acre', date '2026-10-29', 'Day', 4, 4, 4, 0, 0.00, 18.00, 18.00, 'All planned cover attended.'),
    ('02', 'Coulsdon', date '2026-10-30', 'Evening', 3, 3, 2, 1, 2.00, 12.00, 10.00, 'Short cover recorded for the evening shift.'),
    ('03', 'Crimsworth', date '2026-10-31', 'Day', 4, 4, 4, 1, 1.00, 20.00, 20.00, 'Agency colleague included in the attended total.'),
    ('04', 'Friday Rd', date '2026-11-01', 'Waking night', 2, 2, 2, 0, 0.00, 8.00, 8.00, 'Night cover completed.'),
    ('05', 'Heathfields', date '2026-11-02', 'Day', 5, 4, 3, 1, 4.00, 22.00, 16.00, 'Additional cover was needed.'),
    ('06', 'Milne Park', date '2026-11-03', 'Evening', 3, 3, 3, 0, 0.00, 12.00, 12.00, 'Planned cover attended.'),
    ('07', 'Victoria Rd', date '2026-11-04', 'Day', 4, 4, null, null, null, 16.00, null, 'Attendance and delivered hours have not been confirmed.'),
    ('08', 'Brambles Acre', date '2026-11-04', 'Evening', 3, 2, null, null, null, 12.00, null, 'Final staffing numbers are pending.'),
    ('09', 'Coulsdon', date '2026-11-05', 'Day', 4, 4, null, null, null, 18.00, null, 'Shift scheduled.'),
    ('10', 'Crimsworth', date '2026-11-06', 'Sleep-in', 2, 2, null, null, null, 8.00, null, 'Shift scheduled.')
)
insert into public.hr_coverage_shifts
  (id, home_id, shift_on, shift_type, required_staff, planned_staff, present_staff, agency_staff, overtime_hours, commissioned_support_hours, delivered_support_hours, notes)
select md5('pearlconnexions:hr:coverage:' || example_id)::uuid, home.id, shift_on, shift_type,
  required_staff, planned_staff, present_staff, agency_staff, overtime_hours,
  commissioned_support_hours, delivered_support_hours, notes
from examples join public.qa_homes home on home.name = examples.home_name
on conflict (id) do nothing;

with examples (example_id, candidate_name, role_title, home_name, stage, applied_on, interview_on, references_status, dbs_status, notes) as (
  values
    ('01', 'Example Candidate 1', 'Support Worker', 'Brambles Acre', 'Applied', date '2026-11-03', null::date, 'Pending', 'Pending', 'Application received.'),
    ('02', 'Example Candidate 2', 'Senior Support Worker', 'Coulsdon', 'Shortlisted', date '2026-10-29', null::date, 'Pending', 'Pending', 'Shortlisted for an initial conversation.'),
    ('03', 'Example Candidate 3', 'Key Worker', 'Crimsworth', 'Interview', date '2026-10-25', date '2026-11-05', 'Pending', 'In progress', 'Interview booked.'),
    ('04', 'Example Candidate 4', 'Deputy Manager', 'Friday Rd', 'References', date '2026-10-19', date '2026-10-27', 'In progress', 'In progress', 'References requested.'),
    ('05', 'Example Candidate 5', 'Support Worker', 'Heathfields', 'Offer', date '2026-10-15', date '2026-10-22', 'Verified', 'Cleared', 'Offer awaiting response.'),
    ('06', 'Example Candidate 6', 'Registered Manager', 'Milne Park', 'Hired', date '2026-10-02', date '2026-10-10', 'Verified', 'Cleared', 'Recruitment completed.'),
    ('07', 'Example Candidate 7', 'Support Worker', 'Victoria Rd', 'Withdrawn', date '2026-10-20', null::date, 'Pending', 'Pending', 'Application withdrawn.')
)
insert into public.hr_recruitment_candidates
  (id, candidate_name, role_title, home_id, stage, applied_on, interview_on, references_status, dbs_status, notes)
select md5('pearlconnexions:hr:recruitment:' || example_id)::uuid, candidate_name, role_title,
  home.id, stage, applied_on, interview_on, references_status, dbs_status, notes
from examples join public.qa_homes home on home.name = examples.home_name
on conflict (id) do nothing;

commit;

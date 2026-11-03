# Quality & Governance V1

The `20261103` governance and section-permission migrations were applied to the Pearl Connexions Supabase project through MCP with explicit authorisation. Application deployment is managed separately from these database changes.

## Use

- `/qa`: overview; `/qa/monthly-reports`: monthly checklist reports.
- `/qa/audits`, `/qa/incidents`, `/qa/risks`: independent home registers.
- `/qa/reviews`: director review queue; `/qa/homes`: searchable home table.
- `/maintenance`: issues and follow-up; `/team`: director-only organisation chart.
- Existing `/director`, `/portal`, report detail and review URLs remain supported.

Directors can open `/qa?view=demo` to inspect three illustrative October 2026 reports and sample incident/risk scenarios. They are stored in the `demo` reporting period and its report snapshots, separate from live submissions and the live incident/risk registers. The preview names real team roles for layout review, but no manager submitted these reports and no real incident or risk is implied. The normal `/qa` view remains live-only.

In Settings, open a person's permissions, select the visible areas and individual subsections, then save their explicit home assignments separately. The parent checkbox selects all eligible subsections and shows a partial state when only some are enabled. Workbook action permissions appear beneath Workbook; employee-management and login permissions appear beneath Settings. Reviews and Team can be assigned individually. A reporting line does not grant access to a subordinate's homes. Maintenance management grants access to all maintenance issues, not to all QA reports. Maintenance reporters can add follow-up but cannot change issue status or remove previous notes.

Only directors approve or return a report. Returning requires a reason. The checklist uses Yes, No and Not applicable; No and Not applicable require explanations. Applicable checks form the denominator, and an entirely inapplicable checklist has no percentage. Incident, risk and maintenance registers are confirmed separately rather than treating an empty register as a declaration of no cases.

Submitted reports retain their body and a snapshot of questions, home details and relevant registers. Each resubmission produces a separate immutable revision. Register summaries include records dated within the report month and earlier risk/maintenance items still open at preparation time; they do not claim to reconstruct a historical month-end status. Historical expected/completed reports retain their original data and editor.

The organisation chart uses actual `Reports to` relationships. Unassigned relationships remain separate. The chart is read-only and is maintained manually for now; Settings no longer exposes an inclusion control. Existing test accounts remain excluded without deleting their logins.

## Implementation and validation

`/api/governance` returns JSON for records, reports, home edits and chart visibility changes. Requests require the same origin and an authenticated session. Report and register writes check versions to reject stale edits. Database policies and RPC checks enforce both section access and home access independently of the UI. Monthly report summaries redact details of registers the user cannot open, and raw snapshot columns are not directly readable through the Data API. `supabase/tests/workspace_sections.sql` verifies these boundaries and permission saves inside a rolled-back transaction.

`supabase/tests/governance_v1.sql` exercises permission denial, maintenance reporter/lead permissions, report save/submit/approve/return, frozen snapshots, stale writes, assignment removal, multiple homes and atomic assignment failure. Its fixtures and permission changes run inside a transaction that is rolled back, including activity log changes. The script requires existing assigned-manager and director accounts and two homes; it does not create public demo accounts.

The public report/assignment/section-save RPCs intentionally perform privileged atomic writes after explicit identity and role/home checks. The report reader, checklist-score reader and record-count reader also check the selected section and home scope before returning data or aggregates. Supabase's [executable SECURITY DEFINER advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) flags these entrypoints; they deny anonymous callers and the tested unauthorised authenticated requests. The pre-existing password-protection setting was not changed.

Validation: application/component/API tests, lint, TypeScript, isolated Next.js production build, and transaction-rolled-back database assertions. No Chrome session was used. Production application routes require separate verification after deployment.

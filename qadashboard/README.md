# Pearl Connexions QA Portal

Private monthly quality-assurance portal for Pearl Connexions. It is an independent Next.js application and shares the existing Supabase project with the Leadership Dashboard while keeping all QA data in isolated `qa_*` tables.

## Access model

- Directors can see the organisation-wide dashboard, reviews, homes, users, metric catalogue, imports and period automation.
- Active House Leads can only see live submissions for homes assigned to them.
- Pending, unassigned and inactive users are sent to the access-pending page.
- Demo imports are visible only to Directors.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set the public Supabase URL and publishable key.
3. Add `SUPABASE_SECRET_KEY` only on the server if Director invitations are required.
4. Install and start the application:

```bash
pnpm install
pnpm dev
```

## Database and workbook import

Supabase migrations are in `supabase/migrations`. Apply them in timestamp order to project `nnmvjbyskpcolcsydiai`.

The source workbook remains outside this repository. The importer reads it without modifying it, validates the expected totals, and emits a transactional SQL payload under the ignored `tmp/` directory.

```bash
pnpm test:import
python scripts/import_v3.py --source "C:\\path\\to\\CareHomes_Dashboard_v3.xlsm" --dry-run
python scripts/import_v3.py --source "C:\\path\\to\\CareHomes_Dashboard_v3.xlsm" --output tmp/qa_demo_import.sql
```

Expected reconciliation: 7 homes, 60 catalogue definitions, 210 rows, 30 rows per home, and 7 import-log events for June 2026.

## Verification

```bash
pnpm test
pnpm test:import
pnpm typecheck
pnpm lint
pnpm build
```

Database access tests are in `supabase/tests/qa_rls.sql`. They cover anonymous, Director, assigned employee, other-home, pending and inactive access.

## Production

Deploy this directory as its own Vercel project. Configure the three public variables from `.env.example`, plus the server-only Supabase secret for invitations. Add the production origin and `/auth/confirm` callback to the Supabase Auth redirect allow-list and keep public signup disabled.

The period opener is scheduled in Supabase Cron for 02:05 UTC on the first day of every month. It idempotently creates the previous London month and its home drafts, due on the 10th at 23:59 Europe/London.

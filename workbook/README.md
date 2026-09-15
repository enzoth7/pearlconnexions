# Pearl Connexions Leadership

Private leadership action management built with Next.js and Supabase.

## Local development

1. Copy `.env.example` to `.env.local` and provide the project publishable key.
2. Run `pnpm install`.
3. Run `pnpm dev` and open `http://localhost:3000`.

The first Supabase Auth user created after the schema migration becomes the Director. Later users remain pending until a Director role is explicitly assigned. Public signup should remain disabled in Supabase Auth settings.

## Data

The initial migration imported five leadership workbooks into five managers, 32 unique actions and 48 participant responsibilities. Raw workbook files are excluded from version control and Supabase is authoritative after import.

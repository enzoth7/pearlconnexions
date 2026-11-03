# Pearl dashboard (React/Vite)

Client-side dashboard. Its page and component source is in `legacy/src`; Vite uses it through aliases. Privileged account operations run through the same protected handler locally and on Vercel.

## Run locally

From this directory:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

The Vite dashboard runs at `http://localhost:3000`; its protected account service listens only on `127.0.0.1:3003`. The account service reads the ignored `.env.server.local` on the server. The browser build reads only the public Supabase URL and publishable key from the ignored `.env.local`.

To run Vite on port 3002 instead, set `PEARL_DASHBOARD_PORT=3002` before `pnpm dev`.

## Checks

```powershell
pnpm test
pnpm lint
pnpm build
```

These checks do not change production or apply database migrations. On Vercel, `/api/private` runs as a server function with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and server-only `SUPABASE_SECRET_KEY` configured in the project environment. Its browser caller sends the signed-in user's access token; the function checks the user and their permissions before using the secret key.

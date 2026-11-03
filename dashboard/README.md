# Pearl dashboard (React/Vite)

Local client-side dashboard. Its page and component source is in `legacy/src`; Vite uses it through aliases while the local account service handles privileged operations.

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

No production application or database migrations are changed by these commands. The local service must be running for account creation, invitations, login edits and other privileged operations.

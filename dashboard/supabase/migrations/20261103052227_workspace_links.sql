create table public.workspace_links (
  id boolean primary key default true check (id),
  dashboard_url text not null check (length(dashboard_url) <= 2048 and dashboard_url ~ '^https?://[^[:space:]]+$'),
  website_url text not null check (length(website_url) <= 2048 and website_url ~ '^https?://[^[:space:]]+$'),
  updated_at timestamptz not null default now()
);

insert into public.workspace_links (dashboard_url, website_url)
values ('https://workbook-pc.vercel.app/', 'https://www.pearlconnexions.com/');

alter table public.workspace_links enable row level security;
revoke all on public.workspace_links from anon, authenticated;
grant select on public.workspace_links to authenticated;
grant update (dashboard_url, website_url) on public.workspace_links to authenticated;
grant all on public.workspace_links to service_role;

-- Shared destinations are visible to signed-in users; editing is admin-only.
create policy "Signed-in users read workspace links" on public.workspace_links
for select to authenticated using ((select auth.uid()) is not null);

create policy "Workspace admins update links" on public.workspace_links
for update to authenticated
using (
  (select private.is_director()) and exists (
    select 1 from public.workspace_access a
    where a.user_id = (select auth.uid()) and a.is_admin
  )
)
with check (
  (select private.is_director()) and exists (
    select 1 from public.workspace_access a
    where a.user_id = (select auth.uid()) and a.is_admin
  )
);

create trigger workspace_links_updated_at before update on public.workspace_links
for each row execute function private.set_updated_at();

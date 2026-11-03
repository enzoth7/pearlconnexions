import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app-shell";
import { WorkspaceLinksForm } from "@/components/workspace-links-form";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceLinks } from "@/lib/workspace-links";

export default async function LinksPage() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (context.role === "pending" && !context.workbookRole && !context.finance && !context.hr && !context.isAdmin) redirect("/access-pending");
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspace_links").select("dashboard_url,website_url").eq("id", true).single();
  if (error) throw new Error(error.message);
  return <AppShell context={context}>
    <PageHeader title="Links" />
    <WorkspaceLinksForm links={data as WorkspaceLinks} canEdit={context.isAdmin && context.role === "director"} />
  </AppShell>;
}

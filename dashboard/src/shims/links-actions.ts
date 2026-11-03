"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { workspaceLinksSchema, type WorkspaceLinksState } from "@/lib/workspace-links";

export async function saveWorkspaceLinks(_: WorkspaceLinksState, formData: FormData): Promise<WorkspaceLinksState> {
  const { supabase } = await requireWorkspaceAdmin();
  const parsed = workspaceLinksSchema.safeParse({
    dashboard_url: formData.get("dashboard_url"),
    website_url: formData.get("website_url"),
  });
  if (!parsed.success) {
    return { message: "Check the web addresses.", errors: parsed.error.flatten().fieldErrors };
  }
  const { data, error } = await supabase.from("workspace_links")
    .update(parsed.data).eq("id", true).select("dashboard_url,website_url").single();
  if (error || !data) return { message: "Could not save the links. Please try again." };
  revalidatePath("/links");
  return { ok: true, message: "Links saved.", links: data as WorkspaceLinksState["links"] };
}

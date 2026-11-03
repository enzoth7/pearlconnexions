import { supabase } from "./supabase";
import { getAccessContext } from "./auth";
import { workspaceSectionIds } from "@/lib/workspace-sections";
import { setManagerPermission } from "./workbook-actions";
import type { ActionState } from "./app-actions";
import { privateCall } from "./private-call";

export async function saveSettingsForm(endpoint: "/api/settings/permissions" | "/api/settings/accounts", data: FormData, unconfirmedMessage: string): Promise<ActionState> {
  try {
    const actor = await getAccessContext();
    if (!actor || (actor.role !== "director" && !actor.canManageEmployees)) return { ok: false, message: "You cannot change employee permissions." };
    if (endpoint === "/api/settings/accounts") return await privateCall(data.get("kind") === "manager" ? "update-manager" : "save-qa-account", data);
    const kind = String(data.get("kind"));
    if (kind === "workbook") return await setManagerPermission(data);
    if (kind === "qa") {
      let userId = String(data.get("user_id") || "");
      if (!userId && data.get("member_id")) {
        const member = await supabase.from("qa_members").select("user_id").eq("id", String(data.get("member_id"))).maybeSingle();
        if (member.error) return { ok: false, message: member.error.message };
        userId = member.data?.user_id || "";
      }
      if (!userId) return { ok: false, message: "A login account is required." };
      const homes = [...new Set(data.getAll("home_ids").map(String))];
      const result = await supabase.rpc("qa_assign_homes", { target_user: userId, enabled: homes.length > 0, homes });
      if (result.error) return { ok: false, message: result.error.message };
      window.dispatchEvent(new Event("pearl:refresh"));
      return { ok: true, message: "Home assignments saved." };
    }
    if (kind === "panels") {
      const sections = [...new Set(data.getAll("sections").map(String))];
      if (sections.some(section => !workspaceSectionIds.includes(section as typeof workspaceSectionIds[number]))) return { ok: false, message: "Choose valid sections." };
      const target = String(data.get("user_id") || "");
      const result = await supabase.rpc("save_workspace_sections", { target_user: target, sections, workbook_enabled: data.has("workbook"), maintenance_lead: data.has("can_manage_maintenance") });
      if (result.error) return { ok: false, message: result.error.message };
      window.dispatchEvent(new Event("pearl:refresh"));
      return { ok: true, message: "Section access saved." };
    }
    return { ok: false, message: "Invalid permission selection." };
  } catch { return { ok: false, message: unconfirmedMessage }; }
}

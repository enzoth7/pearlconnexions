import { redirect } from "next/navigation";
import { requireSettingsAccess } from "@/lib/auth";
import { canOpenSection } from "@/lib/workspace-sections";

export default async function ConfigPage() {
  const { context } = await requireSettingsAccess();
  redirect(canOpenSection(context, "settings.users_permissions") ? "/config/users"
    : canOpenSection(context, "settings.houses") ? "/config/houses" : "/config/activity-log");
}

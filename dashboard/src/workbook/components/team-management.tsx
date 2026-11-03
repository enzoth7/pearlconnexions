import { SettingsTable } from "@/workbook/components/settings-table";
import { getManagersWithProfiles, requireTeamAdmin } from "@/workbook/lib/data";

export async function TeamManagement({ view = "users" }: { view?: "users" | "permissions" }) {
  const [auth, directory] = await Promise.all([
    requireTeamAdmin(),
    getManagersWithProfiles(),
  ]);

  return <SettingsTable
    managers={directory.managers}
    currentProfileId={auth.profile.id}
    currentManagerId={auth.profile.manager_id}
    isDirector={auth.isDirector}
    canManageEmployees={auth.canManageEmployees}
    canManageLogins={auth.canManageLogins}
    teamHierarchyReady={directory.teamHierarchyReady}
    permissionsReady={directory.permissionsReady}
    view={view}
  />;
}

import { PageHeader } from "@/components/app-shell";
import { SettingsTable } from "@/components/settings-table";
import { getManagersWithProfiles, requireTeamAdmin } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [auth, directory] = await Promise.all([
    requireTeamAdmin(),
    getManagersWithProfiles(),
  ]);

  const { profile, isDirector, canManageEmployees } = auth;
  const { managers, teamHierarchyReady } = directory;

  return (
    <>
      <PageHeader
        title={isDirector ? "Settings & Team Access" : "My Team"}
        description={
          isDirector
            ? "Manage reporting lines, login access and which managers can build their own teams."
            : "Manage your own login and the actions, progress and access of employees in your reporting line."
        }
      />
      <SettingsTable
        managers={managers}
        currentProfileId={profile.id}
        currentManagerId={profile.manager_id}
        isDirector={isDirector}
        canManageEmployees={canManageEmployees}
        teamHierarchyReady={teamHierarchyReady}
      />
    </>
  );
}

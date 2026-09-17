import { PageHeader } from "@/components/app-shell";
import { SettingsTable } from "@/components/settings-table";
import { getManagersWithProfiles, requireDirector } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [{ profile }, managers] = await Promise.all([
    requireDirector(),
    getManagersWithProfiles(),
  ]);

  return (
    <>
      <PageHeader
        title="Settings & Team Access"
        description="Manage leadership managers, email credentials, and login permissions. Managers only see actions assigned to them."
      />
      <SettingsTable
        managers={managers}
        currentProfileId={profile.id}
        currentManagerId={profile.manager_id}
      />
    </>
  );
}

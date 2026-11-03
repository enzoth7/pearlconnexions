import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { TeamManagement } from "@/workbook/components/team-management";
import { requireTeamAdmin } from "@/workbook/lib/data";

export default async function TeamPage() {
  const auth = await requireTeamAdmin();
  if (auth.isDirector) redirect("/config/users");

  return <>
    <PageHeader title="My team" description="Manage your login and the employees who report to you." />
    <TeamManagement view="users" />
  </>;
}

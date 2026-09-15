import { PageHeader } from "@/components/app-shell";
import { ActionsTable } from "@/components/actions-table";
import { getActions, getManagers, getWorkstreams, requireAuth } from "@/lib/data";

type ActionsPageProps = {
  searchParams: Promise<{ manager?: string | string[] }>;
};

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const { isDirector, isManager, managerId: authManagerId } = await requireAuth();
  const [actions, managers, workstreams] = await Promise.all([
    getActions(),
    getManagers(),
    getWorkstreams(),
  ]);
  const { manager: requestedManagerId } = await searchParams;
  const managerId = isManager
    ? authManagerId || ""
    : typeof requestedManagerId === "string" && managers.some((manager) => manager.id === requestedManagerId)
    ? requestedManagerId
    : "";

  return (
    <>
      <PageHeader
        title={isManager ? "My assigned actions" : "All leadership actions"}
        description={
          isManager
            ? "Your assigned leadership actions, deadlines and delivery progress."
            : "Search, filter and open any action to review its ownership and progress."
        }
      />
      <ActionsTable
        actions={actions}
        managers={managers}
        workstreams={workstreams}
        initialManagerId={managerId}
        isDirector={isDirector}
      />
    </>
  );
}

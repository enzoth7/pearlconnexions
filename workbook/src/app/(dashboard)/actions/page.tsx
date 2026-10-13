import { Suspense } from "react";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/app-shell";
import { ActionsTable } from "@/components/actions-table";
import { getActions, getManagers, getWorkstreams, requireAuth } from "@/lib/data";
import { getManagerColor, getManagerWorkbookTitle } from "@/lib/manager-colors";
import { DEADLINE_WINDOW_LABELS, type DeadlineWindow } from "@/lib/utils";

type ActionsPageProps = {
  searchParams: Promise<{
    manager?: string | string[];
    status?: string | string[];
    priority?: string | string[];
    responsibility?: string | string[];
    q?: string | string[];
    deadline?: string | string[];
  }>;
};

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const { isDirector, isManager, profile } = await requireAuth();
  const [actions, managers, workstreams] = await Promise.all([
    getActions(),
    getManagers(),
    getWorkstreams(),
  ]);
  const rawParams = await searchParams;
  const {
    manager: requestedManagerId,
    status: requestedStatus,
    priority: requestedPriority,
    responsibility: requestedResponsibility,
    q: requestedQuery,
    deadline: requestedDeadlineWindow,
  } = rawParams;

  const canFilterManagers = isDirector || isManager;
  const managerId = typeof requestedManagerId === "string" && managers.some((manager) => manager.id === requestedManagerId)
    ? requestedManagerId
    : "";

  const initialStatus = typeof requestedStatus === "string" ? requestedStatus : "";
  const initialPriority = typeof requestedPriority === "string" ? requestedPriority : "";
  const initialResponsibility = typeof requestedResponsibility === "string" ? requestedResponsibility : "";
  const initialQuery = typeof requestedQuery === "string" ? requestedQuery : "";
  const initialDeadlineWindow =
    typeof requestedDeadlineWindow === "string" && Object.hasOwn(DEADLINE_WINDOW_LABELS, requestedDeadlineWindow)
      ? (requestedDeadlineWindow as DeadlineWindow)
      : "";

  const selectedManager = managerId ? managers.find((m) => m.id === managerId) : null;
  const cookieStore = await cookies();
  const rawColors = cookieStore.get("pc_manager_colors")?.value;
  let customColors: Record<string, string> = {};
  if (rawColors) {
    try {
      customColors = JSON.parse(decodeURIComponent(rawColors));
    } catch {
      // ignore
    }
  }

  const managerColor = selectedManager
    ? getManagerColor(selectedManager.id, selectedManager.source_code, customColors)
    : null;
  const editableManagerIds = new Set(managers.map((manager) => manager.id));
  const editableActionIds = isDirector
    ? actions.map((action) => action.id)
    : actions
        .filter(
          (action) =>
            action.created_by === profile.id ||
            action.participants.some(
              (participant) =>
                participant.responsibility_type !== "Support" &&
                editableManagerIds.has(participant.manager.id)
            )
        )
        .map((action) => action.id);

  const title = selectedManager
    ? getManagerWorkbookTitle(selectedManager)
    : isManager
    ? "My team actions"
    : "All leadership actions";

  return (
    <>
      <PageHeader
        title={title}
        titleClassName={managerColor ? managerColor.titleClass : undefined}
        titleStyle={managerColor ? { color: managerColor.hex } : undefined}
        description={
          selectedManager
            ? `Assigned leadership actions and deadlines for ${selectedManager.name}.`
            : isManager
            ? "Actions, deadlines and delivery progress across your reporting line."
            : "Search, filter and open any action to review its ownership and progress."
        }
      />
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading register...</div>}>
        <ActionsTable
          key={`${managerId}-${initialStatus}-${initialPriority}-${initialResponsibility}-${initialQuery}-${initialDeadlineWindow}`}
          actions={actions}
          managers={managers}
          workstreams={workstreams}
          initialManagerId={managerId}
          initialStatus={initialStatus}
          initialPriority={initialPriority}
          initialResponsibility={initialResponsibility}
          initialQuery={initialQuery}
          initialDeadlineWindow={initialDeadlineWindow}
          canEditActions={isDirector || isManager}
          editableActionIds={editableActionIds}
          canFilterManagers={canFilterManagers}
        />
      </Suspense>
    </>
  );
}

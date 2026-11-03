import Link from "next/link";
import { cookies } from "next/headers";
import { AlertCircle, AlertTriangle, ArrowDownCircle, CircleSlash2, ListChecks } from "lucide-react";
import { DashboardCharts } from "@/workbook/components/dashboard-charts";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/app-shell";
import { ManagerOverviewFilter } from "@/workbook/components/manager-overview-filter";
import { StatusBadge } from "@/workbook/components/status-badge";
import { getActions, getManagers, requireAuth } from "@/workbook/lib/data";
import { effectiveStatus, formatDate } from "@/workbook/lib/utils";
import { getManagerColor, getManagerWorkbookTitle } from "@/workbook/lib/manager-colors";

type DashboardPageProps = {
  searchParams: Promise<{ manager?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { isDirector, isManager } = await requireAuth();
  const [actions, managers] = await Promise.all([getActions(), getManagers()]);
  const { manager: requestedManagerId } = await searchParams;
  const requestedVisibleManagerId =
    typeof requestedManagerId === "string" && managers.some((manager) => manager.id === requestedManagerId)
      ? requestedManagerId
      : undefined;
  const managerId = requestedVisibleManagerId;
  const selectedManager = managers.find((manager) => manager.id === managerId);
  const filteredActions = selectedManager
    ? actions.filter((action) => action.participants.some((participant) => participant.manager.id === selectedManager.id))
    : actions;
  const status = filteredActions.map(effectiveStatus);
  const highPriority = filteredActions.filter((a) => a.priority?.trim().toLowerCase() === "high").length;
  const mediumPriority = filteredActions.filter((a) => a.priority?.trim().toLowerCase() === "medium").length;
  const lowPriority = filteredActions.filter((a) => a.priority?.trim().toLowerCase() === "low").length;
  const notAssignedPriority = filteredActions.filter(
    (a) => !a.priority || ["not assigned", "unassigned", ""].includes(a.priority.trim().toLowerCase())
  ).length;
  const visibleManagers = selectedManager ? [selectedManager] : managers;
  const managerData = visibleManagers.map((m) => ({
    id: m.id,
    name: m.name,
    actions: filteredActions.filter(
      (a) => a.participants.some((p) => p.manager.id === m.id) && !a.signoffs?.length
    ).length,
  }));
  const statusSummary = ["Not Started", "In Progress", "At Risk", "Extended", "Completed", "Overdue"].map((label) => ({
    label,
    count: status.filter((value) => value === label).length,
  }));
  const activeParticipations = filteredActions
    .filter((action) => !action.signoffs?.length)
    .flatMap((action) => action.participants.filter((participant) => !selectedManager || participant.manager.id === selectedManager.id));
  const owned = activeParticipations.filter((participant) => participant.responsibility_type !== "Support").length;
  const supported = activeParticipations.filter((participant) => participant.responsibility_type === "Support").length;
  const workload = activeParticipations.length;
  const priorityActions = filteredActions.filter(a => ["Overdue", "At Risk"].includes(effectiveStatus(a))).slice(0,6);
  const cards = [
    ["Total actions", filteredActions.length, ListChecks, "blue", "/workbook/actions?status=All"],
    ["High priority", highPriority, AlertTriangle, "red", "/workbook/actions?priority=High"],
    ["Medium priority", mediumPriority, AlertCircle, "amber", "/workbook/actions?priority=Medium"],
    ["Low priority", lowPriority, ArrowDownCircle, "green", "/workbook/actions?priority=Low"],
    ["Unassigned priority", notAssignedPriority, CircleSlash2, "slate", "/workbook/actions?priority=Unassigned"],
  ] as const;
  const registerHref = selectedManager ? `/workbook/actions?manager=${selectedManager.id}` : "/workbook/actions";
  const scopeDescription = selectedManager
    ? `Workload, deadlines and delivery status for ${selectedManager.name}.`
    : isManager
    ? "Workload, deadlines and delivery status across your reporting line."
    : "Organisation-wide workload, deadlines and delivery status.";

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

  const title = selectedManager
    ? getManagerWorkbookTitle(selectedManager)
    : isManager
    ? "My team overview"
    : getManagerWorkbookTitle(selectedManager);
  const managerColor = selectedManager
    ? getManagerColor(selectedManager.id, selectedManager.source_code, customColors)
    : null;

  return (
    <>
      <PageHeader
        title={title}
        titleClassName={managerColor ? managerColor.titleClass : undefined}
        titleStyle={managerColor ? { color: managerColor.hex } : undefined}
        description={scopeDescription}
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            {(isDirector || isManager) && (
              <ManagerOverviewFilter managers={managers} selectedManagerId={selectedManager?.id} />
            )}
            <Link href={registerHref} className="btn btn-primary whitespace-nowrap">
              Open register
            </Link>
          </div>
        }
      />
      <section aria-label="Key metrics" className="workspace-kpis">
        {cards.map(([label, value, Icon, tone, path]) => {
          const href = selectedManager ? `${path}&manager=${selectedManager.id}` : path;
          const share = filteredActions.length ? value / filteredActions.length * 100 : null;
          return <KpiCard key={label} label={label} icon={Icon} tone={tone} value={value} href={href}
            linkLabel={label + " in the action register"}
            progress={label === "Total actions" ? null : share}
            note={label === "Total actions" ? "Open action register" : share === null ? "No actions in this view" : Math.round(share) + "% of actions"} />;
        })}
      </section>
      <div className="my-5">
        <DashboardCharts
          managers={managerData}
          statuses={statusSummary}
          workload={{ workload, owned, supported }}
          selectedManagerName={selectedManager?.name}
          selectedManagerId={selectedManager?.id}
        />
      </div>
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Needs attention</h2>
            <p className="mt-1 text-sm text-slate-500">
              Overdue and at-risk actions{selectedManager ? ` for ${selectedManager.name}` : ""}
            </p>
          </div>
          <Link
            href={registerHref}
            className="text-sm font-bold text-[#007A91] hover:text-[#0097B2] hover:underline"
          >
            View all
          </Link>
        </div>
        {priorityActions.length ? (
          <div className="mt-4 divide-y divide-slate-100">
            {priorityActions.map((a) => (
              <Link
                href={`/workbook/actions/${a.id}`}
                key={a.id}
                className="grid gap-2 py-4 hover:bg-slate-50 sm:grid-cols-[80px_1fr_130px_110px] sm:items-center"
              >
                <span className="font-mono text-sm font-bold text-[#007A91]">{a.reference}</span>
                <span className="text-sm font-semibold">{a.title}</span>
                <StatusBadge action={a} />
                <span className="text-sm text-slate-500">
                  {formatDate(a.extended_deadline || a.deadline)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            No overdue or at-risk actions.
          </p>
        )}
      </section>
    </>
  );
}

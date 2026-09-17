import Link from "next/link";
import { cookies } from "next/headers";
import { AlertCircle, AlertTriangle, ArrowDownCircle, CircleSlash2, ListChecks } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { PageHeader } from "@/components/app-shell";
import { ManagerOverviewFilter } from "@/components/manager-overview-filter";
import { StatusBadge } from "@/components/status-badge";
import { getActions, getManagers, requireAuth } from "@/lib/data";
import { effectiveStatus, formatDate } from "@/lib/utils";
import { getManagerColor, getManagerWorkbookTitle } from "@/lib/manager-colors";

type DashboardPageProps = {
  searchParams: Promise<{ manager?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { isManager, managerId: authManagerId } = await requireAuth();
  const [actions, managers] = await Promise.all([getActions(), getManagers()]);
  const { manager: requestedManagerId } = await searchParams;
  const managerId = isManager
    ? authManagerId || undefined
    : typeof requestedManagerId === "string"
    ? requestedManagerId
    : undefined;
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
    ["Total actions", filteredActions.length, ListChecks, "text-[#007A91] bg-[#E0F7FA]", "/actions?status=All"],
    ["High", highPriority, AlertTriangle, "text-red-800 bg-red-50", "/actions?priority=High"],
    ["Medium", mediumPriority, AlertCircle, "text-amber-800 bg-amber-50", "/actions?priority=Medium"],
    ["Low", lowPriority, ArrowDownCircle, "text-emerald-800 bg-emerald-50", "/actions?priority=Low"],
    ["Not Assigned", notAssignedPriority, CircleSlash2, "text-slate-700 bg-slate-100", "/actions?priority=Unassigned"],
  ] as const;
  const registerHref = selectedManager ? `/actions?manager=${selectedManager.id}` : "/actions";
  const scopeDescription = selectedManager
    ? `Workload, deadlines and delivery status for ${selectedManager.name}.`
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

  const title = getManagerWorkbookTitle(selectedManager);
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
            {!isManager && (
              <ManagerOverviewFilter managers={managers} selectedManagerId={selectedManager?.id} />
            )}
            <Link href={registerHref} className="btn btn-primary whitespace-nowrap">
              Open register
            </Link>
          </div>
        }
      />
      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, Icon, tone, path]) => {
          const href = selectedManager ? `${path}&manager=${selectedManager.id}` : path;
          return (
            <Link
              href={href}
              key={label}
              className="card group cursor-pointer p-4 transition hover:border-[#0097B2]/50 hover:shadow-md"
              title={`View ${label} in Action Register`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-400 opacity-0 transition group-hover:opacity-100 group-hover:text-[#007A91]">
                  Filter →
                </span>
              </div>
              <p className="text-3xl font-bold tabular-nums text-slate-900">{value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
            </Link>
          );
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
                href={`/actions/${a.id}`}
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

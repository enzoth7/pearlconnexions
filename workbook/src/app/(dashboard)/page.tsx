import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowDownCircle, CircleSlash2, ListChecks } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { PageHeader } from "@/components/app-shell";
import { ManagerOverviewFilter } from "@/components/manager-overview-filter";
import { StatusBadge } from "@/components/status-badge";
import { getActions, getManagers, requireAuth } from "@/lib/data";
import { effectiveStatus, formatDate } from "@/lib/utils";

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
  const managerData = visibleManagers.map(m => ({ name: m.name, actions: filteredActions.filter(a => a.participants.some(p => p.manager.id === m.id) && !a.signoffs?.length).length }));
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
    ["Total actions", filteredActions.length, ListChecks, "text-blue-800 bg-blue-50"],
    ["High", highPriority, AlertTriangle, "text-red-800 bg-red-50"],
    ["Medium", mediumPriority, AlertCircle, "text-amber-800 bg-amber-50"],
    ["Low", lowPriority, ArrowDownCircle, "text-emerald-800 bg-emerald-50"],
    ["Not Assigned", notAssignedPriority, CircleSlash2, "text-slate-700 bg-slate-100"],
  ] as const;
  const registerHref = selectedManager ? `/actions?manager=${selectedManager.id}` : "/actions";
  const scopeDescription = selectedManager
    ? `Workload, deadlines and delivery status for ${selectedManager.name}.`
    : "Organisation-wide workload, deadlines and delivery status.";
  return <><PageHeader title="Leadership actions" description={scopeDescription} action={<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">{!isManager && <ManagerOverviewFilter managers={managers} selectedManagerId={selectedManager?.id}/>}<Link href={registerHref} className="btn btn-primary whitespace-nowrap">Open register</Link></div>}/>
    <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label,value,Icon,tone]) => <article className="card p-4" key={label}><div className={`mb-4 grid h-9 w-9 place-items-center rounded-lg ${tone}`}><Icon size={18}/></div><p className="text-3xl font-bold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-sm font-semibold text-slate-600">{label}</p></article>)}</section>
    <div className="my-5"><DashboardCharts managers={managerData} statuses={statusSummary} workload={{ workload, owned, supported }} selectedManagerName={selectedManager?.name}/></div>
    <section className="card p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Needs attention</h2><p className="mt-1 text-sm text-slate-500">Overdue and at-risk actions{selectedManager ? ` for ${selectedManager.name}` : ""}</p></div><Link href={registerHref} className="text-sm font-bold text-blue-800 hover:underline">View all</Link></div>
      {priorityActions.length ? <div className="mt-4 divide-y divide-slate-100">{priorityActions.map(a => <Link href={`/actions/${a.id}`} key={a.id} className="grid gap-2 py-4 hover:bg-slate-50 sm:grid-cols-[80px_1fr_130px_110px] sm:items-center"><span className="font-mono text-sm font-bold text-blue-800">{a.reference}</span><span className="text-sm font-semibold">{a.title}</span><StatusBadge action={a}/><span className="text-sm text-slate-500">{formatDate(a.extended_deadline || a.deadline)}</span></Link>)}</div> : <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">No overdue or at-risk actions.</p>}
    </section></>;
}

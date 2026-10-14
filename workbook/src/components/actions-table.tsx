"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Plus, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { QuickEditDrawer } from "@/components/quick-edit-drawer";
import { NewActionDialog } from "@/components/new-action-dialog";
import {
  DEADLINE_WINDOW_LABELS,
  effectiveStatus,
  formatDate,
  matchesDeadlineWindow,
  type ActionRecord,
  type DeadlineWindow,
  type Manager,
  type Workstream,
} from "@/lib/utils";

export function ActionsTable({
  actions,
  managers,
  workstreams,
  initialManagerId = "",
  initialStatus = "",
  initialPriority = "",
  initialResponsibility = "",
  initialQuery = "",
  initialDeadlineWindow = "",
  canAddActions = true,
  canEditActions = true,
  canDeleteActions = true,
  canReassignActions = true,
  canSignOffActions = true,
  editableActionIds,
  canFilterManagers = canEditActions,
}: {
  actions: ActionRecord[];
  managers: Manager[];
  workstreams: Workstream[];
  initialManagerId?: string;
  initialStatus?: string;
  initialPriority?: string;
  initialResponsibility?: string;
  initialQuery?: string;
  initialDeadlineWindow?: DeadlineWindow;
  canAddActions?: boolean;
  canEditActions?: boolean;
  canDeleteActions?: boolean;
  canReassignActions?: boolean;
  canSignOffActions?: boolean;
  editableActionIds?: string[];
  canFilterManagers?: boolean;
}) {
  const searchParams = useSearchParams();
  const urlStatus = searchParams?.get("status") ?? initialStatus ?? "";
  const urlManager = searchParams?.get("manager") ?? initialManagerId ?? "";
  const urlPriority = searchParams?.get("priority") ?? initialPriority ?? "";
  const urlResponsibility = searchParams?.get("responsibility") ?? initialResponsibility ?? "";
  const urlQuery = searchParams?.get("q") ?? initialQuery ?? "";
  const urlDeadlineWindow = searchParams?.get("deadline") ?? initialDeadlineWindow ?? "";

  const cleanStatus = decodeURIComponent(urlStatus).replace(/\+/g, " ").trim();
  const cleanManager = urlManager.trim();
  const cleanPriority = decodeURIComponent(urlPriority).replace(/\+/g, " ").trim();
  const cleanResponsibility = decodeURIComponent(urlResponsibility).replace(/\+/g, " ").trim();
  const cleanQuery = decodeURIComponent(urlQuery).replace(/\+/g, " ").trim();
  const cleanDeadlineWindow = Object.hasOwn(DEADLINE_WINDOW_LABELS, urlDeadlineWindow)
    ? (urlDeadlineWindow as DeadlineWindow)
    : "";

  const [query, setQuery] = useState(cleanQuery);
  const [manager, setManager] = useState(cleanManager);
  const [priority, setPriority] = useState(cleanPriority);
  const [status, setStatus] = useState(cleanStatus);
  const [responsibility, setResponsibility] = useState(cleanResponsibility);
  const [deadlineWindow, setDeadlineWindow] = useState<DeadlineWindow>(cleanDeadlineWindow);
  const [selectedAction, setSelectedAction] = useState<ActionRecord | null>(null);
  const [isNewActionOpen, setIsNewActionOpen] = useState(false);
  const editableActionIdSet = useMemo(
    () => new Set(editableActionIds ?? actions.map((action) => action.id)),
    [actions, editableActionIds]
  );
  const todayInLondon = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

  useEffect(() => {
    setStatus(cleanStatus);
    setManager(cleanManager);
    setPriority(cleanPriority);
    setResponsibility(cleanResponsibility);
    setQuery(cleanQuery);
    setDeadlineWindow(cleanDeadlineWindow);
  }, [cleanStatus, cleanManager, cleanPriority, cleanResponsibility, cleanQuery, cleanDeadlineWindow]);

  const filtered = useMemo(
    () =>
      actions.filter(
        (a) =>
          (!query ||
            `${a.reference} ${a.title} ${a.workstream?.name} ${a.participants.map((p) => p.manager.name).join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!manager || a.participants.some((p) => p.manager.id === manager)) &&
          (!priority ||
            (priority.toLowerCase() === "unassigned"
              ? !a.priority || ["unassigned", "not assigned", ""].includes(a.priority.trim().toLowerCase())
              : (a.priority || "").trim().toLowerCase() === priority.toLowerCase())) &&
          (!responsibility ||
            (responsibility.toLowerCase() === "support"
              ? a.participants.some((p) => (!manager || p.manager.id === manager) && p.responsibility_type === "Support")
              : a.participants.some((p) => (!manager || p.manager.id === manager) && p.responsibility_type !== "Support"))) &&
          matchesDeadlineWindow(a, deadlineWindow, todayInLondon) &&
          (status.toLowerCase() === "all"
            ? true
            : status
            ? effectiveStatus(a).trim().toLowerCase() === status.trim().toLowerCase()
            : effectiveStatus(a) !== "Completed")
      ),
    [actions, query, manager, priority, status, responsibility, deadlineWindow, todayInLondon]
  );

  const columns = useMemo<ColumnDef<ActionRecord>[]>(
    () => [
      {
        accessorKey: "reference",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Ref <ArrowUpDown size={13} />
          </button>
        ),
        cell: ({ row }) => (
          <Link
            className="font-mono font-bold text-[#007A91] hover:text-[#0097B2] hover:underline"
            href={`/actions/${row.original.id}`}
          >
            {row.original.reference}
          </Link>
        ),
      },
      {
        accessorKey: "title",
        header: "Action",
        cell: ({ row }) => (
          <div className="min-w-64">
            <Link
              className="font-semibold hover:text-[#007A91]"
              href={`/actions/${row.original.id}`}
            >
              {row.original.title}
            </Link>
            <p className="mt-1 text-xs text-slate-500">{row.original.workstream?.name}</p>
          </div>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        cell: ({ row }) => {
          const owners = row.original.participants
            .filter((p) => p.responsibility_type !== "Support")
            .map((p) => p.manager.name);
          return (
            <span className="text-sm font-semibold text-slate-800">
              {owners.length ? owners.join(", ") : "Unassigned"}
            </span>
          );
        },
      },
      {
        id: "support",
        header: "Support",
        cell: ({ row }) => {
          const support = row.original.participants
            .filter((p) => p.responsibility_type === "Support")
            .map((p) => p.manager.name);
          return support.length ? (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {support.join(", ")}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => {
          const priority = row.original.priority;
          if (!priority || priority === "Unassigned" || priority === "Not Assigned") {
            return (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Unassigned
              </span>
            );
          }
          const tone =
            priority === "High"
              ? "bg-red-50 text-red-800 border border-red-200"
              : priority === "Medium"
              ? "bg-amber-50 text-amber-900 border border-amber-200"
              : priority === "Low"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-slate-100 text-slate-700";
          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>
              {priority}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge action={row.original} />,
      },
      {
        id: "deadline",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Deadline <ArrowUpDown size={13} />
          </button>
        ),
        accessorFn: (r) => r.extended_deadline || r.deadline || "",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatDate(row.original.extended_deadline || row.original.deadline)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {canEditActions && editableActionIdSet.has(row.original.id) && (
              <button
                type="button"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-[#0097B2]/40 hover:bg-[#E0F7FA]/60 hover:text-[#007A91]"
                title="Quick edit"
                aria-label={`Quick edit ${row.original.reference}`}
                onClick={() => setSelectedAction(row.original)}
              >
                <Pencil size={14} />
              </button>
            )}
            <Link
              className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-semibold text-slate-600 transition hover:bg-[#E0F7FA]/60 hover:text-[#007A91]"
              href={`/actions/${row.original.id}`}
              title="View full action details"
            >
              Details
            </Link>
          </div>
        ),
      },
    ],
    [canEditActions, editableActionIdSet]
  );

  // TanStack Table intentionally returns non-memoizable functions; React Compiler skips this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(200px,1.2fr)_repeat(4,minmax(140px,1fr))_auto]">
        <label className="relative flex items-center">
          <span className="sr-only">Search actions</span>
          <input
            className="field pr-10 pl-3.5"
            placeholder="Search actions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="pointer-events-none absolute right-3 text-slate-400" size={17} />
        </label>
        {canFilterManagers && (
          <select
            className="field"
            aria-label="Filter by manager"
            value={manager}
            onChange={(e) => setManager(e.target.value)}
          >
            <option value="">All managers</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="field"
          aria-label="Filter by priority"
          value={
            ["High", "Medium", "Low", "Unassigned"].find(
              (x) => x.toLowerCase() === priority.toLowerCase()
            ) || ""
          }
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {["High", "Medium", "Low", "Unassigned"].map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
        <select
          className="field"
          aria-label="Filter by status"
          value={
            ["Not Started", "In Progress", "At Risk", "Overdue", "Extended", "Completed"].find(
              (x) => x.toLowerCase() === status.toLowerCase()
            ) || (status.toLowerCase() === "all" ? "All" : "")
          }
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Active actions</option>
          <option value="All">All statuses (including completed)</option>
          {["Not Started", "In Progress", "At Risk", "Overdue", "Extended", "Completed"].map(
            (x) => (
              <option key={x} value={x}>{x}</option>
            )
          )}
        </select>
        <select
          className="field"
          aria-label="Filter by deadline period"
          value={deadlineWindow}
          onChange={(e) => setDeadlineWindow(e.target.value as DeadlineWindow)}
        >
          {(Object.entries(DEADLINE_WINDOW_LABELS) as [DeadlineWindow, string][]).map(([value, label]) => (
            <option key={value || "all"} value={value}>{label}</option>
          ))}
        </select>
        {canAddActions && (
          <button
            type="button"
            className="btn btn-primary whitespace-nowrap"
            onClick={() => setIsNewActionOpen(true)}
          >
            <Plus size={16} /> New action
          </button>
        )}
      </div>

      {(status || priority || manager || query || responsibility || deadlineWindow) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-2.5 text-xs">
          <span className="font-bold text-slate-600">Active filters:</span>
          {status && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F7FA] px-2.5 py-0.5 font-bold text-[#007A91] border border-[#0097B2]/30">
              Status: {status}
              <button
                type="button"
                onClick={() => setStatus("")}
                className="hover:text-red-600 font-bold ml-0.5"
                title="Remove status filter"
              >
                ×
              </button>
            </span>
          )}
          {priority && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 font-bold text-amber-900 border border-amber-200">
              Priority: {priority}
              <button
                type="button"
                onClick={() => setPriority("")}
                className="hover:text-red-600 font-bold ml-0.5"
                title="Remove priority filter"
              >
                ×
              </button>
            </span>
          )}
          {manager && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-2.5 py-0.5 font-bold text-slate-800 border border-slate-300">
              Manager: {managers.find((m) => m.id === manager)?.name || manager}
              <button
                type="button"
                onClick={() => setManager("")}
                className="hover:text-red-600 font-bold ml-0.5"
                title="Remove manager filter"
              >
                ×
              </button>
            </span>
          )}
          {responsibility && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 font-bold text-violet-800 border border-violet-200">
              Role: {responsibility === "Lead" ? "Lead (Owned)" : "Support"}
              <button
                type="button"
                onClick={() => setResponsibility("")}
                className="hover:text-red-600 font-bold ml-0.5"
                title="Remove role filter"
              >
                ×
              </button>
            </span>
          )}
          {deadlineWindow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-bold text-blue-800">
              Deadline: {DEADLINE_WINDOW_LABELS[deadlineWindow]}
              <button
                type="button"
                onClick={() => setDeadlineWindow("")}
                className="ml-0.5 font-bold hover:text-red-600"
                title="Remove deadline filter"
              >
                ×
              </button>
            </span>
          )}
          {query && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-2.5 py-0.5 font-bold text-slate-800 border border-slate-300">
              Search: &ldquo;{query}&rdquo;
              <button
                type="button"
                onClick={() => setQuery("")}
                className="hover:text-red-600 font-bold ml-0.5"
                title="Remove search query"
              >
                ×
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setStatus("");
              setPriority("");
              setManager("");
              setResponsibility("");
              setQuery("");
              setDeadlineWindow("");
            }}
            className="ml-auto font-bold text-[#007A91] hover:text-[#0097B2] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="table-shell">
        <table>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="p-10 text-center text-slate-500">
            <p className="font-semibold">No actions match these filters.</p>
            <p className="mt-1 text-sm">Clear a filter or try another search.</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-500">
        Showing {filtered.length} of {actions.length} actions
      </p>

      {(canEditActions || canAddActions) && (
        <>
          {canEditActions && (
            <QuickEditDrawer
              action={selectedAction}
              workstreams={workstreams}
              managers={managers}
              isOpen={Boolean(selectedAction)}
              canDeleteAction={canDeleteActions}
              canReassignAction={canReassignActions}
              canSignOffAction={canSignOffActions}
              onClose={() => setSelectedAction(null)}
            />
          )}

          {canAddActions && (
            <NewActionDialog
              workstreams={workstreams}
              managers={managers}
              canReassignAction={canReassignActions}
              isOpen={isNewActionOpen}
              onClose={() => setIsNewActionOpen(false)}
            />
          )}
        </>
      )}
    </>
  );
}

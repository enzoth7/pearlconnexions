"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  effectiveStatus,
  formatDate,
  type ActionRecord,
  type Manager,
  type Workstream,
} from "@/lib/utils";

export function ActionsTable({
  actions,
  managers,
  workstreams,
  initialManagerId = "",
  isDirector = true,
}: {
  actions: ActionRecord[];
  managers: Manager[];
  workstreams: Workstream[];
  initialManagerId?: string;
  isDirector?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [manager, setManager] = useState(initialManagerId);
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [selectedAction, setSelectedAction] = useState<ActionRecord | null>(null);
  const [isNewActionOpen, setIsNewActionOpen] = useState(false);

  const filtered = useMemo(
    () =>
      actions.filter(
        (a) =>
          (!query ||
            `${a.reference} ${a.title} ${a.workstream?.name} ${a.participants.map((p) => p.manager.name).join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!manager || a.participants.some((p) => p.manager.id === manager)) &&
          (!priority || (a.priority || "Unassigned") === priority) &&
          (status === "All"
            ? true
            : status
            ? effectiveStatus(a) === status
            : effectiveStatus(a) !== "Completed")
      ),
    [actions, query, manager, priority, status]
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
            className="font-mono font-bold text-blue-800 hover:underline"
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
              className="font-semibold hover:text-blue-800"
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
              {owners.length ? owners.join(", ") : (row.original.participants[0]?.manager.name || "—")}
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
            {isDirector && (
              <button
                type="button"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                title="Quick edit"
                aria-label={`Quick edit ${row.original.reference}`}
                onClick={() => setSelectedAction(row.original)}
              >
                <Pencil size={14} />
              </button>
            )}
            <Link
              className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-800"
              href={`/actions/${row.original.id}`}
              title="View full action details"
            >
              Details
            </Link>
          </div>
        ),
      },
    ],
    [isDirector]
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
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-[minmax(200px,1fr)_repeat(3,minmax(140px,1fr))_auto]">
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
        {isDirector && (
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
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {["High", "Medium", "Low", "Unassigned"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          className="field"
          aria-label="Filter by status"
          value={status}
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
        {isDirector && (
          <button
            type="button"
            className="btn btn-primary whitespace-nowrap"
            onClick={() => setIsNewActionOpen(true)}
          >
            <Plus size={16} /> New action
          </button>
        )}
      </div>

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

      {isDirector && (
        <>
          <QuickEditDrawer
            action={selectedAction}
            workstreams={workstreams}
            managers={managers}
            isOpen={Boolean(selectedAction)}
            onClose={() => setSelectedAction(null)}
          />

          <NewActionDialog
            workstreams={workstreams}
            managers={managers}
            isOpen={isNewActionOpen}
            onClose={() => setIsNewActionOpen(false)}
          />
        </>
      )}
    </>
  );
}

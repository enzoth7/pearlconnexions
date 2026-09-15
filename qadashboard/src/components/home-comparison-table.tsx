"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { formatNumber, formatPercent } from "@/lib/calculations";
import type { SubmissionStatus } from "@/lib/types";

export type HomeComparison = {
  submissionId: string;
  home: string;
  provision: string;
  status: SubmissionStatus;
  completion: number | null;
  occupancy: number | null;
  occupiedBeds: number | null;
  incidents: number | null;
  missingMetrics: number;
};

const helper = createColumnHelper<HomeComparison>();
const columns = [
  helper.accessor("home", { header: "Home", cell: (info) => <Button asChild variant="link" className="h-auto p-0 font-bold"><Link href={`/director/reviews/${info.row.original.submissionId}`}>{info.getValue()}</Link></Button> }),
  helper.accessor("provision", { header: "Provision" }),
  helper.accessor("status", { header: "Status", cell: (info) => <StatusBadge status={info.getValue()} /> }),
  helper.accessor("completion", { header: "Task completion", cell: (info) => formatPercent(info.getValue()) }),
  helper.accessor("occupancy", { header: "Occupancy", cell: (info) => formatPercent(info.getValue()) }),
  helper.accessor("occupiedBeds", { header: "Occupied beds", cell: (info) => formatNumber(info.getValue()) }),
  helper.accessor("incidents", { header: "Incidents", cell: (info) => formatNumber(info.getValue()) }),
  helper.accessor("missingMetrics", { header: "Missing", cell: (info) => info.getValue() }),
];

export function HomeComparisonTable({ data }: { data: HomeComparison[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  // TanStack Table intentionally exposes stateful function values; React Compiler skips this component safely.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  return <div className="space-y-3">
    <div className="relative max-w-sm"><Search className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground" /><Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search homes…" className="h-11 ps-9" aria-label="Search homes" /></div>
    <div className="data-table-wrap">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-[#eef4fb] text-start text-xs uppercase tracking-wide text-[#31537e]">
          {table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => {
            const sorted = header.column.getIsSorted();
            return <th key={header.id} className="px-4 py-3 text-start font-bold" aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}>
              <Button type="button" variant="ghost" className="h-11 cursor-pointer px-2 text-xs font-bold uppercase tracking-wide" onClick={header.column.getToggleSortingHandler()}>
                {flexRender(header.column.columnDef.header, header.getContext())}<ArrowUpDown className="size-3" aria-hidden="true" />
              </Button>
            </th>;
          })}</tr>)}
        </thead>
        <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className="border-t transition-colors duration-200 hover:bg-blue-50">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3 align-top">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </div>;
}

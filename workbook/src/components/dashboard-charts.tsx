"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SummaryRow = { label: string; count: number };

const statusTone: Record<string, string> = {
  "Not Started": "bg-slate-50 text-slate-800",
  "In Progress": "bg-[#E0F7FA] text-[#007A91]",
  "At Risk": "bg-amber-50 text-amber-900",
  Extended: "bg-violet-50 text-violet-800",
  Completed: "bg-emerald-50 text-emerald-800",
  Overdue: "bg-red-50 text-red-800",
};

function SummaryTable({
  title,
  description,
  rows,
  colourStatuses = false,
  isWorkload = false,
  selectedManagerId,
}: {
  title: string;
  description: string;
  rows: SummaryRow[];
  colourStatuses?: boolean;
  isWorkload?: boolean;
  selectedManagerId?: string;
}) {
  const getHref = (label: string) => {
    const params: string[] = [];
    if (selectedManagerId) {
      params.push(`manager=${encodeURIComponent(selectedManagerId)}`);
    }
    if (colourStatuses) {
      params.push(`status=${encodeURIComponent(label)}`);
      return `/actions?${params.join("&")}`;
    }
    if (isWorkload) {
      if (label === "Owned") {
        params.push("responsibility=Lead");
      } else if (label === "Supported") {
        params.push("responsibility=Support");
      }
      return `/actions${params.length ? `?${params.join("&")}` : ""}`;
    }
    return "/actions";
  };

  return (
    <section className="card flex h-full flex-col overflow-hidden bg-white">
      <div className="border-b border-slate-200 bg-white px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Click to view & filter in register</p>
        </div>
      </div>
      <div className="flex-1 bg-white">
        <table className="h-full w-full table-fixed bg-white">
          <caption className="sr-only">{description}</caption>
          <colgroup>
            <col className="w-[72%]" />
            <col className="w-[28%]" />
          </colgroup>
          <tbody>
            {rows.map((row, index) => {
              const border =
                index < rows.length - 1
                  ? colourStatuses
                    ? "border-b border-slate-200/60"
                    : "border-b border-slate-200"
                  : "border-b-0";
              const href = getHref(row.label);

              if (colourStatuses) {
                const tone = statusTone[row.label] ?? "bg-slate-50 text-slate-800";
                return (
                  <tr
                    key={row.label}
                    className={`${tone} ${border} group cursor-pointer transition hover:brightness-95`}
                  >
                    <th
                      scope="row"
                      className={`${tone} ${border} p-0 text-left text-sm font-semibold normal-case tracking-normal align-middle`}
                    >
                      <Link
                        href={href}
                        className="flex items-center justify-between px-5 py-3 text-inherit"
                        title={`Filter by ${row.label} in Action Register`}
                      >
                        <span>{row.label}</span>
                        <ChevronRight
                          size={15}
                          className="opacity-0 transition group-hover:opacity-70 group-hover:translate-x-0.5"
                        />
                      </Link>
                    </th>
                    <td
                      className={`${tone} ${border} p-0 text-center text-sm sm:text-base font-bold tabular-nums align-middle`}
                    >
                      <Link
                        href={href}
                        className="block px-5 py-3 text-inherit"
                        title={`Filter by ${row.label} in Action Register`}
                      >
                        {row.count}
                      </Link>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={row.label}
                  className={`bg-white ${border} group cursor-pointer transition hover:bg-slate-50`}
                >
                  <th
                    scope="row"
                    className={`bg-white ${border} p-0 text-left text-base sm:text-lg font-semibold normal-case tracking-normal text-slate-800 align-middle`}
                  >
                    <Link
                      href={href}
                      className="flex items-center justify-between px-5 py-4 sm:py-5 text-inherit"
                      title={`Filter by ${row.label} in Action Register`}
                    >
                      <span>{row.label}</span>
                      <ChevronRight
                        size={16}
                        className="opacity-0 text-slate-400 transition group-hover:opacity-70 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </th>
                  <td
                    className={`bg-white ${border} p-0 text-center text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 align-middle`}
                  >
                    <Link
                      href={href}
                      className="block px-5 py-4 sm:py-5 text-inherit"
                      title={`Filter by ${row.label} in Action Register`}
                    >
                      {row.count}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DashboardCharts({
  managers,
  statuses,
  workload,
  selectedManagerName,
  selectedManagerId,
}: {
  managers: { id?: string; name: string; actions: number }[];
  statuses: SummaryRow[];
  workload: { workload: number; owned: number; supported: number };
  selectedManagerName?: string;
  selectedManagerId?: string;
}) {
  const router = useRouter();
  const workloadRows = [
    { label: "Workload", count: workload.workload },
    { label: "Owned", count: workload.owned },
    { label: "Supported", count: workload.supported },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card p-5">
        <h2 className="font-bold">{selectedManagerName ? `Workload for ${selectedManagerName}` : "Workload by manager"}</h2>
        <p className="mt-1 text-sm text-slate-500">Participation across active actions{selectedManagerName ? " in this view" : ""}</p>
        <div className="mt-5 h-64" role="img" aria-label={managers.map((manager) => `${manager.name}: ${manager.actions} actions`).join(", ")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={managers}
              layout="vertical"
              margin={{ left: 12, right: 18 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar
                dataKey="actions"
                name="Actions"
                fill="#0097B2"
                radius={[0, 5, 5, 0]}
                className="cursor-pointer"
                onClick={(entry: any) => {
                  if (entry?.id) {
                    router.push(`/actions?manager=${entry.id}`);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="grid h-full gap-5 sm:grid-cols-2">
        <SummaryTable
          title="Effective status"
          description={`Effective status summary${selectedManagerName ? ` for ${selectedManagerName}` : ""}`}
          rows={statuses}
          colourStatuses
          selectedManagerId={selectedManagerId}
        />
        <SummaryTable
          title="Workload"
          description={`Active workload summary${selectedManagerName ? ` for ${selectedManagerName}` : ""}`}
          rows={workloadRows}
          isWorkload
          selectedManagerId={selectedManagerId}
        />
      </div>
    </div>
  );
}

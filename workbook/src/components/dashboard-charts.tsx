"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SummaryRow = { label: string; count: number };

const statusTone: Record<string, string> = {
  "Not Started": "bg-blue-50 text-blue-900",
  "In Progress": "bg-amber-50 text-amber-900",
  "At Risk": "bg-red-50 text-red-800",
  Extended: "bg-violet-50 text-violet-800",
  Completed: "bg-emerald-50 text-emerald-800",
  Overdue: "bg-orange-50 text-orange-800",
};

function SummaryTable({
  title,
  description,
  rows,
  colourStatuses = false,
  isWorkload = false,
}: {
  title: string;
  description: string;
  rows: SummaryRow[];
  colourStatuses?: boolean;
  isWorkload?: boolean;
}) {
  return (
    <section className="card flex h-full flex-col overflow-hidden bg-white">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <h2 className="font-bold text-slate-900">{title}</h2>
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

              if (colourStatuses) {
                const tone = statusTone[row.label] ?? "bg-slate-50 text-slate-800";
                return (
                  <tr key={row.label} className={`${tone} ${border}`}>
                    <th
                      scope="row"
                      className={`${tone} ${border} px-5 py-3 text-left text-sm font-semibold normal-case tracking-normal align-middle`}
                    >
                      {row.label}
                    </th>
                    <td
                      className={`${tone} ${border} px-5 py-3 text-center text-sm sm:text-base font-bold tabular-nums align-middle`}
                    >
                      {row.count}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={row.label} className={`bg-white ${border}`}>
                  <th
                    scope="row"
                    className={`bg-white ${border} px-5 py-4 sm:py-5 text-left text-base sm:text-lg font-semibold normal-case tracking-normal text-slate-800 align-middle`}
                  >
                    {row.label}
                  </th>
                  <td
                    className={`bg-white ${border} px-5 py-4 sm:py-5 text-center text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 align-middle`}
                  >
                    {row.count}
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
}: {
  managers: { name: string; actions: number }[];
  statuses: SummaryRow[];
  workload: { workload: number; owned: number; supported: number };
  selectedManagerName?: string;
}) {
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
            <BarChart data={managers} layout="vertical" margin={{ left: 12, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="actions" name="Actions" fill="#1e40af" radius={[0, 5, 5, 0]} />
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
        />
        <SummaryTable
          title="Workload"
          description={`Active workload summary${selectedManagerName ? ` for ${selectedManagerName}` : ""}`}
          rows={workloadRows}
          isWorkload
        />
      </div>
    </div>
  );
}

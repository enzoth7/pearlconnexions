"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CaseRecord } from "@/lib/qa-capture";

export function openedByMonth(records: CaseRecord[], today: string) {
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1));
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      month: new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date),
      opened: records.filter(row => !row.is_draft && row.occurred_on?.startsWith(key)).length,
    };
  });
}

export function MaintenanceTimeline({ records, today }: { records: CaseRecord[]; today: string }) {
  const data = openedByMonth(records, today);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-semibold text-[#102c39]">Issues opened by month</h2>
    <div className="mt-1 text-sm text-slate-600">Reported maintenance issues · last 12 months</div>
    <div className="mt-5 h-72 w-full" role="img" aria-label={`Issues opened by month: ${data.map(item => `${item.month} ${item.opened}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 18, bottom: 8, left: -20 }}>
          <CartesianGrid vertical={false} stroke="#dce7e8" strokeDasharray="3 5" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#526978", fontSize: 11 }} tickMargin={12} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} domain={[0, "dataMax + 1"]} axisLine={false} tickLine={false} tick={{ fill: "#526978", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "white", border: "1px solid #dce7e8", borderRadius: 12 }} formatter={value => [value, "Opened"]} />
          <Line type="monotone" dataKey="opened" stroke="#008c83" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>;
}

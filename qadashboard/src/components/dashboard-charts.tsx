"use client";

import { BriefcaseBusiness, HeartHandshake, Settings2, ShieldCheck, UsersRound, Wrench } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type TrendPoint = { month: string; completion: number | null; occupancy: number | null; incidents: number | null };
export type CategoryPoint = { category: string; score: number | null };

export function TrendChart({ trends }: { trends: TrendPoint[] }) {
  return <Card className="h-full">
      <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-sm uppercase tracking-[0.06em]">Performance trend — last 12 months</CardTitle><CardDescription>Task completion and occupancy use percentages; incidents use the right axis.</CardDescription></CardHeader>
      <CardContent>
        {trends.length ? <div className="h-80" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ left: 4, right: 8, top: 16, bottom: 4 }}>
              <CartesianGrid stroke="#dbe4ef" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} tickMargin={10} />
              <YAxis yAxisId="pct" axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={11} width={40} />
              <YAxis yAxisId="count" axisLine={false} tickLine={false} orientation="right" allowDecimals={false} fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#d5e0ec", boxShadow: "0 8px 24px rgba(15,42,78,.12)" }} formatter={(value, name) => name === "Incidents" ? [value, name] : [`${value}%`, name]} />
              <Legend iconType="line" wrapperStyle={{ paddingTop: 12 }} />
              <Line yAxisId="pct" type="monotone" dataKey="completion" name="Task completion" stroke="#16a061" strokeWidth={2.5} dot={{ r: 3, fill: "#16a061" }} activeDot={{ r: 5 }} connectNulls={false} />
              <Line yAxisId="pct" type="monotone" dataKey="occupancy" name="Occupancy" stroke="#2c83d6" strokeWidth={2.5} dot={{ r: 3, fill: "#2c83d6" }} activeDot={{ r: 5 }} connectNulls={false} />
              <Line yAxisId="count" type="monotone" dataKey="incidents" name="Incidents" stroke="#ea7a12" strokeWidth={2.5} dot={{ r: 3, fill: "#ea7a12" }} activeDot={{ r: 5 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div> : <div className="grid h-80 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">No trend data is available for this selection.</div>}
        <AccessibleTrendTable trends={trends} />
      </CardContent>
    </Card>;
}

const categoryStyles = [
  { icon: ShieldCheck, color: "text-emerald-600", iconBg: "bg-emerald-50", bar: "bg-emerald-500" },
  { icon: UsersRound, color: "text-blue-600", iconBg: "bg-blue-50", bar: "bg-blue-500" },
  { icon: BriefcaseBusiness, color: "text-violet-600", iconBg: "bg-violet-50", bar: "bg-violet-500" },
  { icon: HeartHandshake, color: "text-fuchsia-600", iconBg: "bg-fuchsia-50", bar: "bg-fuchsia-500" },
  { icon: Wrench, color: "text-red-600", iconBg: "bg-red-50", bar: "bg-red-500" },
  { icon: Settings2, color: "text-cyan-600", iconBg: "bg-cyan-50", bar: "bg-cyan-500" },
];

export function CategoryCompletion({ categories }: { categories: CategoryPoint[] }) {
  return <Card>
    <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-sm uppercase tracking-[0.06em]">Task completion by category — this month</CardTitle><CardDescription>Weighted actual divided by expected. Unreported values remain clearly marked.</CardDescription></CardHeader>
    <CardContent>
      {categories.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {categories.map((item, index) => {
          const style = categoryStyles[index % categoryStyles.length];
          const Icon = style.icon;
          const score = item.score === null ? 0 : Math.min(100, Math.max(0, item.score));
          return <div key={item.category} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
            <p className="min-h-9 text-xs font-bold text-[#17345f]">{item.category}</p>
            <span className={`mx-auto mt-2 grid size-10 place-items-center rounded-xl ${style.iconBg}`}><Icon className={`size-5 ${style.color}`} aria-hidden="true" /></span>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-[#102a52]">{item.score === null ? "—" : `${item.score}%`}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><span className={`block h-full rounded-full ${style.bar}`} style={{ width: `${score}%` }} /></div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">{item.score === null ? "Not collected" : "Weighted completion"}</p>
          </div>;
        })}
      </div> : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">No category data is available for this selection.</div>}
      <table className="sr-only"><caption>Category completion data</caption><thead><tr><th>Category</th><th>Score</th></tr></thead><tbody>{categories.map((item) => <tr key={item.category}><td>{item.category}</td><td>{item.score === null ? "Not collected" : `${item.score}%`}</td></tr>)}</tbody></table>
    </CardContent>
  </Card>;
}

function AccessibleTrendTable({ trends }: { trends: TrendPoint[] }) {
  return <table className="sr-only"><caption>Twelve-month trend data</caption><thead><tr><th>Month</th><th>Completion</th><th>Occupancy</th><th>Incidents</th></tr></thead><tbody>{trends.map((point) => <tr key={point.month}><td>{point.month}</td><td>{point.completion ?? "Not collected"}</td><td>{point.occupancy ?? "Not collected"}</td><td>{point.incidents ?? "Not collected"}</td></tr>)}</tbody></table>;
}

"use client";

import { useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";
import { ReviewMetricsTable, type ReviewMetricRow } from "@/components/review-metrics-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/calculations";
import type { IncidentDetail } from "@/lib/types";

type ReportView = "overview" | "incidents" | "compliance" | "operations" | "risks" | "all";

const viewNames: ReportView[] = ["overview", "incidents", "compliance", "operations", "risks", "all"];
const severityStyles = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  moderate: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-200",
};

function asReportView(value: string): ReportView {
  return viewNames.includes(value as ReportView) ? value as ReportView : "overview";
}

function StatTile({ label, value, note, tone = "blue" }: { label: string; value: string; note?: string; tone?: "blue" | "green" | "red" | "amber" | "violet" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };
  return <div className={`rounded-xl p-4 ring-1 ${tones[tone]}`}><p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p><p className="mt-1 text-3xl font-black tracking-tight">{value}</p>{note ? <p className="mt-1 text-xs font-medium opacity-75">{note}</p> : null}</div>;
}

function MetricProgress({ metric }: { metric: ReviewMetricRow }) {
  const percent = metric.score === null ? null : Math.max(0, Math.min(100, metric.score * 100));
  const tone = percent === null ? "bg-slate-300" : percent >= 90 ? "bg-emerald-500" : percent >= 80 ? "bg-amber-500" : "bg-red-500";
  return <div id={`metric-${metric.code}`} className="scroll-mt-6 rounded-lg border border-slate-200 bg-white p-3 transition-colors target:bg-amber-100">
    <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#17345f]">{metric.name}</p><p className="text-xs text-slate-500">{formatNumber(metric.actual)} of {formatNumber(metric.expected)}</p></div><span className="text-lg font-black text-[#17345f]">{percent === null ? "—" : `${Math.round(percent)}%`}</span></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{ width: `${percent ?? 0}%` }} /></div>
  </div>;
}

export function ReportDetailView({ metrics, incidents, initialView }: { metrics: ReviewMetricRow[]; incidents: IncidentDetail[]; initialView: string }) {
  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: "center" }));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const metricMap = new Map(metrics.map((metric) => [metric.code, metric]));
  const actual = (code: string) => metricMap.get(code)?.actual ?? null;
  const completion = actual("Tasks_Pct");
  const occupancy = actual("Occupancy_Rates");
  const totalIncidents = actual("Inc_Total");
  const reportedWithin24h = actual("Inc_Reported_24h");
  const totalBeds = actual("Total_Beds");
  const occupiedBeds = actual("Beds_Occ");
  const riskTotal = actual("Risk_Total_Assessments");
  const overdueActions = actual("Risk_Actions_Overdue");
  const complianceMetrics = metrics.filter((metric) => metric.expectedApplicable && !metric.code.startsWith("Inc_") && !metric.code.startsWith("Risk_") && !["Total_Beds", "Beds_Occ", "Occupancy_Rates", "Tasks_Pct"].includes(metric.code));
  const complianceGroups = Array.from(new Set(complianceMetrics.map((metric) => metric.category)));
  const attention = complianceMetrics.filter((metric) => metric.score !== null && metric.score < 1).toSorted((a, b) => (a.score ?? 1) - (b.score ?? 1));
  const physicalInterventions = actual("Inc_PI_Involved");
  const pendingReports = totalIncidents !== null && reportedWithin24h !== null ? Math.max(0, totalIncidents - reportedWithin24h) : null;

  return <Tabs defaultValue={asReportView(initialView)} className="gap-0">
    <div className="overflow-x-auto pb-1"><TabsList className="min-w-max justify-start bg-[#e9f0f8] p-1.5">
      <TabsTrigger value="overview"><Activity />Overview</TabsTrigger>
      <TabsTrigger value="incidents"><AlertTriangle />Incidents <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{formatNumber(totalIncidents)}</span></TabsTrigger>
      <TabsTrigger value="compliance"><ClipboardCheck />Compliance</TabsTrigger>
      <TabsTrigger value="operations"><BedDouble />Operations</TabsTrigger>
      <TabsTrigger value="risks"><ShieldAlert />Risks</TabsTrigger>
      <TabsTrigger value="all"><FileText />All metrics</TabsTrigger>
    </TabsList></div>

    <TabsContent value="overview" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Task completion" value={completion === null ? "—" : new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(completion)} tone="violet" />
        <StatTile label="Occupancy" value={occupancy === null ? "—" : new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(occupancy)} note={`${formatNumber(occupiedBeds)} of ${formatNumber(totalBeds)} beds`} tone="green" />
        <StatTile label="Incidents" value={formatNumber(totalIncidents)} note={pendingReports ? `${pendingReports} reporting follow-up` : "Reporting up to date"} tone="red" />
        <StatTile label="Risk assessments" value={formatNumber(riskTotal)} note={`${formatNumber(overdueActions)} overdue actions`} tone="amber" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card><CardHeader><CardTitle>Areas requiring attention</CardTitle><CardDescription>The largest gaps between completed and expected activity.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{attention.length ? attention.slice(0, 6).map((metric) => <MetricProgress key={metric.code} metric={metric} />) : <div className="rounded-lg bg-emerald-50 p-6 text-center font-semibold text-emerald-700 md:col-span-2"><CheckCircle2 className="mx-auto mb-2" />All expected activity is complete.</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Latest incidents</CardTitle><CardDescription>Recent events and current follow-up status.</CardDescription></CardHeader><CardContent className="space-y-3">{incidents.slice(0, 3).map((incident) => <div key={incident.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><p className="font-bold text-[#17345f]">{incident.incident_type ?? "Type not set"}</p><span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${severityStyles[incident.severity ?? "moderate"]}`}>{incident.severity ?? "Not set"}</span></div><p className="mt-1 text-sm leading-5 text-slate-600">{incident.summary ?? "Incident details incomplete"}</p></div>)}</CardContent></Card>
      </div>
    </TabsContent>

    <TabsContent value="incidents" className="space-y-5">
      <div id="metric-Inc_Total" className="grid scroll-mt-6 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total incidents" value={formatNumber(totalIncidents)} tone="red" />
        <div id="metric-Inc_Reported_24h" className="scroll-mt-6"><StatTile label="Reported within 24h" value={formatNumber(reportedWithin24h)} note={totalIncidents ? `${Math.round(((reportedWithin24h ?? 0) / totalIncidents) * 100)}% of incidents` : undefined} tone="green" /></div>
        <StatTile label="Physical interventions" value={formatNumber(physicalInterventions)} tone="amber" />
        <StatTile label="Need follow-up" value={formatNumber(pendingReports)} tone={pendingReports ? "red" : "green"} />
      </div>
      <Card><CardHeader><CardTitle>What happened</CardTitle><CardDescription>Open an incident to read the narrative, immediate action and management comments.</CardDescription></CardHeader><CardContent className="space-y-3">{incidents.length ? incidents.map((incident) => <details key={incident.id} className="group rounded-xl border border-slate-200 bg-white open:border-blue-300 open:shadow-sm"><summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[#17345f]">{incident.summary ?? "Incident details incomplete"}</p><span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${severityStyles[incident.severity ?? "moderate"]}`}>{incident.severity ?? "Not set"}</span></div><p className="mt-1 text-xs text-slate-500">{incident.reference}{incident.occurred_at ? ` · ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(incident.occurred_at))}` : " · Date not set"}</p></div><span className="text-sm font-semibold text-blue-700 group-open:hidden">View details</span><span className="hidden text-sm font-semibold text-blue-700 group-open:inline">Close</span></summary><div className="grid gap-4 border-t border-slate-200 bg-slate-50/60 px-5 py-5 lg:grid-cols-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Incident account</p><p className="mt-2 text-sm leading-6 text-slate-700">{incident.details ?? "Not recorded."}</p></div><div><p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Immediate action</p><p className="mt-2 text-sm leading-6 text-slate-700">{incident.action_taken ?? "Not recorded."}</p></div><div><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500"><MessageSquareText className="size-4" />Follow-up comments</p><p className="mt-2 text-sm leading-6 text-slate-700">{incident.follow_up_notes ?? "Not recorded."}</p><p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${incident.reported_within_24h ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{incident.reported_within_24h ? "Reported within 24 hours" : "Reporting overdue"}</p></div></div></details>) : <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No incident narratives are recorded for this report.</p>}</CardContent></Card>
    </TabsContent>

    <TabsContent value="compliance" className="space-y-4">
      {complianceGroups.map((category) => {
        const items = complianceMetrics.filter((metric) => metric.category === category);
        const expected = items.reduce((sum, metric) => sum + (metric.expected ?? 0), 0);
        const completed = items.reduce((sum, metric) => sum + (metric.actual ?? 0), 0);
        const score = expected > 0 ? completed / expected : null;
        return <Card key={category}><CardHeader className="border-b border-slate-100"><div className="flex items-end justify-between gap-4"><div><CardTitle>{category}</CardTitle><CardDescription>{items.length} tracked activities</CardDescription></div><p className="text-2xl font-black text-[#17345f]">{score === null ? "—" : new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(score)}</p></div></CardHeader><CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-3">{items.map((metric) => <MetricProgress key={metric.code} metric={metric} />)}</CardContent></Card>;
      })}
    </TabsContent>

    <TabsContent value="operations" className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3"><StatTile label="Total beds" value={formatNumber(totalBeds)} tone="blue" /><StatTile label="Average occupied" value={formatNumber(occupiedBeds)} tone="green" /><StatTile label="Occupancy rate" value={occupancy === null ? "—" : new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(occupancy)} tone="violet" /></div>
      <Card><CardHeader><CardTitle>Capacity at a glance</CardTitle><CardDescription>Average occupied beds compared with registered capacity.</CardDescription></CardHeader><CardContent><div className="h-5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, (occupancy ?? 0) * 100))}%` }} /></div><div className="mt-3 flex justify-between text-sm font-medium text-slate-600"><span>{formatNumber(occupiedBeds)} occupied</span><span>{totalBeds !== null && occupiedBeds !== null ? formatNumber(Math.max(0, totalBeds - occupiedBeds)) : "—"} available</span></div></CardContent></Card>
    </TabsContent>

    <TabsContent value="risks" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatTile label="Low" value={formatNumber(actual("Risk_Low"))} tone="green" /><StatTile label="Moderate" value={formatNumber(actual("Risk_Moderate"))} tone="amber" /><StatTile label="High" value={formatNumber(actual("Risk_High"))} tone="red" /><StatTile label="Extremely high" value={formatNumber(actual("Risk_Extremely_High"))} tone="red" /></div>
      <Card><CardHeader><CardTitle>Mitigation actions</CardTitle><CardDescription>Outstanding actions linked to current risk assessments.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><StatTile label="Assessments" value={formatNumber(riskTotal)} tone="blue" /><StatTile label="Pending actions" value={formatNumber(actual("Risk_Actions_Pending"))} tone="amber" /><StatTile label="Overdue actions" value={formatNumber(overdueActions)} tone={overdueActions ? "red" : "green"} /></CardContent></Card>
    </TabsContent>

    <TabsContent value="all"><ReviewMetricsTable rows={metrics} /></TabsContent>
  </Tabs>;
}

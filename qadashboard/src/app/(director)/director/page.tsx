import Link from "next/link";
import { AlertCircle, ArrowRight, BedDouble, Gauge, TriangleAlert, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { CategoryCompletion, TrendChart, type CategoryPoint, type TrendPoint } from "@/components/dashboard-charts";
import { DashboardFilters } from "@/components/dashboard-filters";
import { HomeComparisonTable, type HomeComparison } from "@/components/home-comparison-table";
import { KpiCard } from "@/components/kpi-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateKpis, difference, formatAlertGap, formatNumber, formatPercent, isOverdue, weightedCompletion } from "@/lib/calculations";
import { requireDirector } from "@/lib/auth";
import { formatPeriodLabel } from "@/lib/periods";
import type { DataClass, Home, MetricDefinition, MetricValue, Period, SubmissionStatus } from "@/lib/types";

type SubmissionRow = {
  id: string;
  status: SubmissionStatus;
  is_late: boolean;
  home_id: string;
  period_id: string;
  qa_homes: Home | Home[];
  qa_periods?: Period | Period[];
  qa_metric_values: MetricValue[];
};

function one<T>(value: T | T[]) {
  return Array.isArray(value) ? value[0] : value;
}

function monthLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
}

export default async function DirectorDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { supabase } = await requireDirector();
  const [periodResult, homeResult, definitionResult] = await Promise.all([
    supabase.from("qa_periods").select("*").order("month_start", { ascending: false }),
    supabase.from("qa_homes").select("*").eq("active", true).order("name"),
    supabase.from("qa_metric_definitions").select("*").eq("active_for_house", true).order("display_order"),
  ]);
  if (periodResult.error || homeResult.error || definitionResult.error) {
    throw new Error(periodResult.error?.message || homeResult.error?.message || definitionResult.error?.message);
  }
  const periods = periodResult.data as Period[];
  const homes = homeResult.data as Home[];
  const liveDefault = periods.find((period) => period.data_class === "live") ?? periods[0];
  const selected = periods.find((period) => period.id === params.period) ?? liveDefault;
  if (!selected) {
    return <><PageHeader eyebrow="Director console" title="Quality overview" description="No reporting periods are available yet." /><Alert><AlertTitle>No periods</AlertTitle><AlertDescription>Open a reporting period from Settings.</AlertDescription></Alert></>;
  }

  const dataClass = selected.data_class as DataClass;
  const [selectedResult, trendResult] = await Promise.all([
    supabase.from("qa_submissions").select("id,status,is_late,home_id,period_id,qa_homes!inner(*),qa_metric_values(*)").eq("period_id", selected.id),
    supabase.from("qa_submissions").select("id,status,is_late,home_id,period_id,qa_homes!inner(*),qa_periods!inner(*),qa_metric_values(*)").eq("qa_periods.data_class", dataClass).order("month_start", { referencedTable: "qa_periods", ascending: true }),
  ]);
  if (selectedResult.error || trendResult.error) throw new Error(selectedResult.error?.message || trendResult.error?.message);

  const requestedHome = typeof params.home === "string" ? params.home : "";
  const requestedProvision = typeof params.provision === "string" ? params.provision : "";
  const matches = (submission: SubmissionRow) => {
    const home = one(submission.qa_homes);
    return (!requestedHome || home.id === requestedHome) && (!requestedProvision || home.provision === requestedProvision);
  };
  const submissions = (selectedResult.data as unknown as SubmissionRow[]).filter(matches);
  const definitions = definitionResult.data as MetricDefinition[];
  const ratioCodes = new Set(definitions.filter((definition) => definition.value_kind === "ratio").map((definition) => definition.code));
  const allValues = submissions.flatMap((submission) => submission.qa_metric_values);
  const totalBeds = allValues.filter((value) => value.metric_code === "Total_Beds").reduce((sum, value) => sum + (value.actual ?? 0), 0);
  const occupiedBeds = allValues.filter((value) => value.metric_code === "Beds_Occ").reduce((sum, value) => sum + (value.actual ?? 0), 0);
  const incidentValues = allValues.filter((value) => value.metric_code === "Inc_Total" && value.actual !== null);
  const globalCompletion = weightedCompletion(allValues, ratioCodes);
  const globalOccupancy = totalBeds > 0 ? occupiedBeds / totalBeds : null;
  const globalIncidents = incidentValues.length ? incidentValues.reduce((sum, value) => sum + (value.actual ?? 0), 0) : null;

  const comparisons: HomeComparison[] = submissions.map((submission) => {
    const home = one(submission.qa_homes);
    const kpis = calculateKpis(submission.qa_metric_values);
    const provided = new Set(submission.qa_metric_values.filter((value) => value.actual !== null).map((value) => value.metric_code));
    return {
      submissionId: submission.id,
      home: home.name,
      provision: home.provision,
      status: submission.status,
      completion: kpis.completion,
      occupancy: kpis.occupancy,
      occupiedBeds: kpis.occupiedBeds,
      incidents: kpis.incidents,
      missingMetrics: definitions.filter((definition) => definition.value_kind !== "derived" && !provided.has(definition.code)).length,
    };
  });

  const categoryMap = new Map<string, { expected: number; actual: number; hasData: boolean }>();
  for (const definition of definitions.filter((item) => item.value_kind === "ratio")) {
    const bucket = categoryMap.get(definition.category) ?? { expected: 0, actual: 0, hasData: false };
    for (const value of allValues.filter((item) => item.metric_code === definition.code)) {
      if (value.expected !== null && value.actual !== null && value.expected > 0) {
        bucket.expected += value.expected;
        bucket.actual += value.actual;
        bucket.hasData = true;
      }
    }
    categoryMap.set(definition.category, bucket);
  }
  const categories: CategoryPoint[] = Array.from(categoryMap, ([category, value]) => ({
    category,
    score: value.hasData && value.expected > 0 ? Math.round((value.actual / value.expected) * 1000) / 10 : null,
  }));

  const trendGroups = new Map<string, SubmissionRow[]>();
  for (const submission of (trendResult.data as unknown as SubmissionRow[]).filter(matches)) {
    const period = submission.qa_periods ? one(submission.qa_periods) : null;
    if (!period) continue;
    const current = trendGroups.get(period.month_start) ?? [];
    current.push(submission);
    trendGroups.set(period.month_start, current);
  }
  const trends: TrendPoint[] = Array.from(trendGroups.entries()).slice(-12).map(([month, rows]) => {
    const values = rows.flatMap((row) => row.qa_metric_values);
    const beds = values.filter((value) => value.metric_code === "Total_Beds").reduce((sum, value) => sum + (value.actual ?? 0), 0);
    const occupied = values.filter((value) => value.metric_code === "Beds_Occ").reduce((sum, value) => sum + (value.actual ?? 0), 0);
    const incidents = values.filter((value) => value.metric_code === "Inc_Total" && value.actual !== null);
    const completion = weightedCompletion(values, ratioCodes);
    return {
      month: monthLabel(month),
      completion: completion === null ? null : Math.round(completion * 1000) / 10,
      occupancy: beds > 0 ? Math.round((occupied / beds) * 1000) / 10 : null,
      incidents: incidents.length ? incidents.reduce((sum, value) => sum + (value.actual ?? 0), 0) : null,
    };
  });

  const alerts = submissions.flatMap((submission) => {
    const home = one(submission.qa_homes);
    const values = submission.qa_metric_values;
    const items: { message: string; metricCode: string }[] = [];
    const notReported = difference(values.find((v) => v.metric_code === "Inc_Total")?.actual ?? null, values.find((v) => v.metric_code === "Inc_Reported_24h")?.actual ?? null);
    const fireGap = difference(values.find((v) => v.metric_code === "Fire_Drill")?.expected ?? null, values.find((v) => v.metric_code === "Fire_Drill")?.actual ?? null);
    const bedroomGap = difference(values.find((v) => v.metric_code === "YP_Bedroom_Checks")?.expected ?? null, values.find((v) => v.metric_code === "YP_Bedroom_Checks")?.actual ?? null);
    if (notReported && notReported > 0) {
      const count = Math.round(notReported);
      items.push({ message: `${count} incident${count === 1 ? "" : "s"} not reported within 24 hours`, metricCode: "Inc_Reported_24h" });
    }
    const fireAlert = formatAlertGap(fireGap, "fire drill task", "fire drill tasks");
    if (fireAlert) items.push({ message: fireAlert, metricCode: "Fire_Drill" });
    const bedroomAlert = formatAlertGap(bedroomGap, "bedroom check", "bedroom checks");
    if (bedroomAlert) items.push({ message: bedroomAlert, metricCode: "YP_Bedroom_Checks" });
    if (isOverdue(submission.status, selected.due_at)) items.push({ message: "Submission overdue", metricCode: "Tasks_Pct" });
    return items.map((item) => ({
      home: home.name,
      ...item,
      view: item.metricCode.startsWith("Inc_") ? "incidents" : item.metricCode.startsWith("Risk_") ? "risks" : "compliance",
      submissionId: submission.id,
    }));
  });

  const hasOccupiedBeds = allValues.some((value) => value.metric_code === "Beds_Occ" && value.actual !== null);
  const hasTotalBeds = allValues.some((value) => value.metric_code === "Total_Beds" && value.actual !== null);
  const occupancyPercent = globalOccupancy === null ? null : globalOccupancy * 100;
  const completionPercent = globalCompletion === null ? null : globalCompletion * 100;

  return <div className="space-y-5">
    <DashboardFilters periods={periods} homes={homes} current={{ period: selected.id, home: requestedHome, provision: requestedProvision }} />
    {dataClass === "demo" ? <Alert className="border-amber-200 bg-amber-50/80"><AlertCircle className="text-amber-700" /><AlertTitle>Demo data</AlertTitle><AlertDescription>Imported workbook values are visible only to the Director.</AlertDescription></Alert> : null}

    <section aria-labelledby="kpi-title">
      <h2 id="kpi-title" className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#17345f]">Key operational indicators</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Occupancy rate" value={formatPercent(globalOccupancy)} note={totalBeds > 0 ? `${formatNumber(occupiedBeds)} of ${formatNumber(totalBeds)} beds occupied` : "Bed totals not collected"} icon={UsersRound} tone="green" progress={occupancyPercent} />
        <KpiCard label="Total beds" value={formatNumber(hasTotalBeds ? totalBeds : null)} note={hasOccupiedBeds ? `${formatNumber(occupiedBeds)} currently occupied` : "Occupancy not collected"} icon={BedDouble} tone="blue" progress={occupancyPercent} />
        <KpiCard label="Incidents this month" value={formatNumber(globalIncidents)} note={globalIncidents === null ? "Not collected" : "Open incident reports"} icon={TriangleAlert} tone="red" href={`/director/reviews?period=${selected.id}&focus=incidents`} linkLabel="View incident reports for the selected period" />
        <KpiCard label="Task completion" value={formatPercent(globalCompletion)} note="Weighted across reported tasks" icon={Gauge} tone="violet" progress={completionPercent} />
      </div>
    </section>

    <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
      <TrendChart trends={trends} />
      <Card className="h-full">
        <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-sm uppercase tracking-[0.06em]">Top safety &amp; compliance alerts</CardTitle><CardDescription>Select an alert to open its source report.</CardDescription></CardHeader>
        <CardContent>{alerts.length ? <ul className="divide-y divide-slate-200">{alerts.slice(0, 8).map((alert, index) => <li key={`${alert.submissionId}-${index}`}><Link href={`/director/reviews/${alert.submissionId}?view=${alert.view}#metric-${alert.metricCode}`} className="group flex cursor-pointer gap-3 rounded-md py-3 text-sm transition-colors hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-orange-100"><TriangleAlert className="size-4 text-orange-700" /></span><div className="min-w-0"><span className="font-bold text-[#17345f]">{alert.home}</span><span className="block leading-5 text-slate-600">{alert.message}</span></div><ArrowRight className="ms-auto mt-2 size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" aria-hidden="true" /></Link></li>)}</ul> : <p className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-6 text-center text-sm font-medium text-emerald-800">No priority alerts for this selection.</p>}</CardContent>
      </Card>
    </div>

    <CategoryCompletion categories={categories} />

    <Card>
      <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-sm uppercase tracking-[0.06em]">Home performance snapshot — {formatPeriodLabel(selected)}</CardTitle><CardDescription>Search, sort and open a home report. Missing inputs are shown separately from zero.</CardDescription></CardHeader>
      <CardContent><HomeComparisonTable data={comparisons} /></CardContent>
    </Card>
  </div>;
}

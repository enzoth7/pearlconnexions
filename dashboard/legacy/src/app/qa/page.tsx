import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, ClipboardCheck, ClipboardList, HeartHandshake, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import { requireGovernance } from "@/lib/auth";
import { londonToday, qaRating } from "@/lib/qa-capture";
import { averageOccupiedBeds, measureTotals, overdueDate, overviewAreas, reportedOccupiedBeds, totalsForCodes, type MeasureTotal, type OverviewReportBody } from "@/lib/qa-overview-metrics";
import { loadReportRows } from "@/lib/qa-report-rows";
import { canOpenSection } from "@/lib/workspace-sections";
import { QaRating } from "@/components/qa-rating";
import { QaOverviewFilters } from "@/components/qa-overview-filters";
import type { Home } from "@/lib/types";

type OverviewCase = { id: string; kind: string; home_id: string; title: string; occurred_on: string; status: string; created_at: string };
type CaseDetail = { id: string; kind: string; data: { due_on?: string } | null };
type CaseAction = { data: { due_on?: string; status?: string } | null };
type IncidentSafeguarding = { id: string; data: { safeguarding?: string } | null };
type ReportRow = { id: string; homeId: string; home: string; status: string; formVersion: number; checklist: number | null };

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(16,43,55,0.035)] ${className}`}>
    <div className="bg-[#102c39] px-5 py-4 text-white"><h2 className="text-lg font-semibold text-white">{title}</h2>{subtitle && <div className="mt-1 text-sm text-slate-200">{subtitle}</div>}</div>
    {children}
  </section>;
}

function percentage(ratio: number | null) {
  const value = qaRating(ratio).value;
  return value === null ? "—" : `${value.toFixed(2)}%`;
}

export default async function Page({ searchParams = Promise.resolve({}) }: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  const [{ rows, context }, { supabase }] = await Promise.all([loadReportRows("qa.overview"), requireGovernance("qa", "qa.overview")]);
  const params = await searchParams;
  const homesResult = context.role === "director"
    ? await supabase.from("qa_homes").select("id,name,provision").eq("active", true).order("name")
    : { data: context.homes, error: null };
  if (homesResult.error) throw new Error(homesResult.error.message);
  const homes = (homesResult.data ?? []) as Pick<Home, "id" | "name" | "provision">[];
  const months = [...new Set(rows.map(row => row.month))].sort().reverse();
  if (!months.length) months.push(londonToday().slice(0, 7));
  const requestedMonth = typeof params.month === "string" ? params.month : "";
  const month = months.includes(requestedMonth) ? requestedMonth : months[0];
  const requestedProvision = typeof params.provision === "string" ? params.provision : "";
  const provision = homes.some(home => home.provision === requestedProvision) ? requestedProvision : "";
  const availableHomes = homes.filter(home => !provision || home.provision === provision);
  const requestedHome = typeof params.home === "string" ? params.home : "";
  const homeId = availableHomes.some(home => home.id === requestedHome) ? requestedHome : "";
  const scopedHomes = availableHomes.filter(home => !homeId || home.id === homeId);
  const scopedHomeIds = new Set(scopedHomes.map(home => home.id));
  const current = rows.filter(row => row.month === month && scopedHomeIds.has(row.homeId));
  const scored = current.filter(row => ["submitted", "approved"].includes(row.status) && row.formVersion >= 2 && row.checklist !== null);
  const average = scored.length ? scored.reduce((sum, row) => sum + row.checklist!, 0) / scored.length : null;
  const access = {
    reports: canOpenSection(context, "qa.monthly_reports"),
    reviews: canOpenSection(context, "qa.reviews"),
    incidents: canOpenSection(context, "qa.incidents"),
    risks: canOpenSection(context, "qa.risks"),
    maintenance: canOpenSection(context, "maintenance.issues"),
  };

  let result = await supabase.rpc("qa_overview_cases", { month_start: `${month}-01` });
  if (result.error?.code === "PGRST202") {
    const next = new Date(`${month}-01T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const records: OverviewCase[] = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await supabase.from("qa_records").select("id,kind,home_id,title,occurred_on,status,created_at,is_draft")
        .or(`and(kind.eq.incidents,occurred_on.gte.${month}-01,occurred_on.lt.${next.toISOString().slice(0, 10)}),and(kind.in.(risks,maintenance),status.not.in.(Closed,Completed))`)
        .order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
      if (page.error) throw new Error(page.error.message);
      records.push(...(page.data ?? []).filter(record => !record.is_draft));
      if ((page.data?.length ?? 0) < 1000) break;
    }
    result = { ...result, data: records, error: null, success: true, status: 200, statusText: "OK" };
  }
  if (result.error) throw new Error(result.error.message);
  const cases = (result.data as OverviewCase[]).filter(record => scopedHomeIds.has(record.home_id) &&
    (record.kind === "incidents" ? access.incidents : record.kind === "risks" ? access.risks : access.maintenance));
  const incidentIds = cases.filter(record => record.kind === "incidents").map(record => record.id);
  const safeguardingResult = incidentIds.length
    ? await supabase.from("qa_records").select("id,data").in("id", incidentIds)
    : { data: [], error: null };
  if (safeguardingResult.error) throw new Error(safeguardingResult.error.message);
  const safeguarding = (safeguardingResult.data ?? []) as IncidentSafeguarding[];

  const formIds = scored.filter(row => row.formVersion >= 3).map(row => row.id);
  const formsResult = formIds.length
    ? await supabase.from("qa_report_forms").select("submission_id,body").in("submission_id", formIds)
    : { data: [], error: null };
  if (formsResult.error) throw new Error(formsResult.error.message);
  const bodies = new Map<string, OverviewReportBody>((formsResult.data ?? []).map(form => [form.submission_id, form.body as OverviewReportBody]));
  const totals = measureTotals([...bodies.values()]);

  const openIds = cases.filter(record => record.kind !== "incidents").map(record => record.id);
  const detailResult = openIds.length
    ? await supabase.from("qa_records").select("id,kind,data").in("id", openIds)
    : { data: [], error: null };
  if (detailResult.error) throw new Error(detailResult.error.message);
  const details = (detailResult.data ?? []) as CaseDetail[];
  const riskIds = details.filter(record => record.kind === "risks").map(record => record.id);
  const actionsResult = riskIds.length
    ? await supabase.from("qa_record_actions").select("data").in("record_id", riskIds)
    : { data: [], error: null };
  if (actionsResult.error) throw new Error(actionsResult.error.message);
  const actions = (actionsResult.data ?? []) as CaseAction[];
  const today = londonToday();
  const attention = [
    { label: "Safeguarding concerns", count: safeguarding.filter(item => item.data?.safeguarding === "yes").length, href: "/qa/incidents?safeguarding=yes", visible: access.incidents, color: "bg-red-100 text-red-900" },
    { label: "Safeguarding awaiting assessment", count: safeguarding.filter(item => item.data?.safeguarding === "pending").length, href: "/qa/incidents?safeguarding=pending", visible: access.incidents, color: "bg-amber-100 text-amber-900" },
    { label: "Risk actions overdue", count: actions.filter(item => item.data?.status !== "Completed" && overdueDate(item.data?.due_on, today)).length, href: "/qa/risks", visible: access.risks, color: "bg-rose-100 text-rose-900" },
    { label: "Risk reviews overdue", count: details.filter(item => item.kind === "risks" && overdueDate(item.data?.due_on, today)).length, href: "/qa/risks", visible: access.risks, color: "bg-rose-100 text-rose-900" },
    { label: "Maintenance targets overdue", count: details.filter(item => item.kind === "maintenance" && overdueDate(item.data?.due_on, today)).length, href: "/maintenance/issues", visible: access.maintenance, color: "bg-orange-100 text-orange-900" },
    { label: "Incidents marked for follow-up", count: cases.filter(item => item.kind === "incidents" && item.status === "Follow up").length, href: "/qa/incidents", visible: access.incidents, color: "bg-amber-100 text-amber-900" },
    { label: "Reports awaiting review", count: current.filter(row => row.status === "submitted").length, href: "/qa/reviews", visible: access.reviews, color: "bg-sky-100 text-sky-900" },
  ].filter(item => item.visible && item.count > 0);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight text-[#102c39]">Quality overview</h1>
      <div className="mt-2 text-slate-600">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))}</div></div>
      <QaOverviewFilters homes={homes} months={months} current={{ home: homeId, month, provision }} />
    </header>
    <Kpis submitted={current.filter(row => ["submitted", "approved"].includes(row.status)).length} total={scopedHomes.length} average={average}
      incidents={cases.filter(item => item.kind === "incidents").length} risks={cases.filter(item => item.kind === "risks").length} access={access} />
    <AreaCompletion totals={totals} canOpenReports={access.reports} />
    <HouseSnapshot rows={current} bodies={bodies} cases={cases} access={access} />
    <QuickStats totals={totals} canOpenReports={access.reports} />
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Attention items={attention} gaps={totals.filter(item => item.expected > item.completed)} showReports={access.reports} />
      <RecentCases cases={cases.slice(0, 5)} homes={homes} />
    </div>
  </div>;
}

function Kpis({ submitted, total, average, incidents, risks, access }: {
  submitted: number; total: number; average: number | null; incidents: number; risks: number;
  access: { reports: boolean; incidents: boolean; risks: boolean };
}) {
  const rating = qaRating(average);
  const items = [
    { label: "Reports submitted", value: `${submitted} / ${total}`, detail: `${total - submitted} to complete`, icon: ClipboardCheck, color: "text-teal-700", href: access.reports ? "/qa/monthly-reports" : null, visible: true },
    { label: "Checklist result", value: percentage(average), detail: rating.label, icon: ShieldCheck, color: "text-emerald-700", href: access.reports ? "/qa/monthly-reports" : null, visible: true },
    { label: "Recorded incidents", value: String(incidents), detail: "In the reporting month", icon: Activity, color: "text-orange-700", href: access.incidents ? "/qa/incidents" : null, visible: access.incidents },
    { label: "Open individual risks", value: String(risks), detail: "Current open assessments", icon: ShieldAlert, color: "text-rose-700", href: access.risks ? "/qa/risks" : null, visible: access.risks },
  ];
  return <section aria-label="Key indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.filter(item => item.visible).map(item => {
    const Icon = item.icon;
    const contents = <div className="flex min-h-48 flex-col items-center justify-center px-5 py-6 text-center">
      <Icon aria-hidden className={item.color} size={27} strokeWidth={1.8} />
      <div className="mt-3 text-base font-medium text-[#102c39]">{item.label}</div>
      <strong className={`mt-3 text-5xl font-semibold tracking-tight tabular-nums ${item.color}`}>{item.value}</strong>
      <div className={item.label === "Checklist result" ? `mt-3 rounded-full px-3 py-1 text-xs font-semibold ${rating.className}` : "mt-3 text-sm text-slate-600"}>{item.detail}</div>
    </div>;
    const className = "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(16,43,55,0.035)]";
    return item.href ? <Link key={item.label} href={item.href} className={`${className} workspace-kpi-link hover:border-teal-300`}>{contents}</Link> : <div key={item.label} className={className}>{contents}</div>;
  })}</section>;
}

function AreaCompletion({ totals, canOpenReports }: { totals: MeasureTotal[]; canOpenReports: boolean }) {
  const icons = [ClipboardList, UsersRound, HeartHandshake, ShieldCheck];
  return <Panel title="Monthly obligations by area" subtitle="Completed against expected quantities in submitted reports">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4">{overviewAreas.map((area, index) => {
      const value = totalsForCodes(totals, area.codes);
      const Icon = icons[index];
      const contents = <>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#102c39]"><Icon aria-hidden size={19} style={{ color: area.color }} />{area.label}</div>
        <strong className="mt-3 block text-3xl font-semibold tabular-nums text-[#102c39]">{percentage(value.ratio)}</strong>
        <div className="mt-1 text-xs text-slate-600">{value.expected ? `${value.completed} of ${value.expected} completed` : "No applicable quantities"}</div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${area.label}: ${value.completed} of ${value.expected} completed`}><div className="workspace-measure-fill h-full rounded-full" style={{ backgroundColor: area.color, width: `${(value.ratio ?? 0) * 100}%` }} /></div>
        {value.ratio !== null && <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${qaRating(value.ratio).className}`}>{qaRating(value.ratio).label}</div>}
      </>;
      const className = "block border-b border-slate-200 p-5 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0";
      return canOpenReports ? <Link key={area.label} href="/qa/monthly-reports" className={`${className} workspace-kpi-link workspace-kpi-inline`}>{contents}</Link> : <div key={area.label} className={className}>{contents}</div>;
    })}</div>
  </Panel>;
}

function Attention({ items, gaps, showReports }: { items: { label: string; count: number; href: string; color: string }[]; gaps: MeasureTotal[]; showReports: boolean }) {
  return <Panel title="What needs attention" subtitle="Open follow-up and obligations below expected">
    <div className="grid sm:grid-cols-2">
      {items.map(item => <Link key={item.label} href={item.href} className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-sm hover:text-teal-800 sm:odd:border-r">
        <div>{item.label}</div><strong className={`min-w-9 rounded-full px-3 py-1 text-center tabular-nums ${item.color}`}>{item.count}</strong>
      </Link>)}
      {showReports && gaps.map(item => <Link key={item.code} href="/qa/monthly-reports" className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-sm hover:text-teal-800 sm:odd:border-r">
        <div>{item.label}</div><strong className="whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold tabular-nums text-amber-900">{item.expected - item.completed} {item.expected - item.completed === 1 ? item.unit.replace(/s$/, "") : item.unit} short</strong>
      </Link>)}
      {!items.length && (!showReports || !gaps.length) && <div className="px-5 py-6 text-sm text-slate-600">No open items from the available registers and reports.</div>}
    </div>
  </Panel>;
}

function HouseSnapshot({ rows, bodies, cases, access }: {
  rows: ReportRow[]; bodies: Map<string, OverviewReportBody>; cases: OverviewCase[];
  access: { reports: boolean; incidents: boolean; risks: boolean };
}) {
  const beds = reportedOccupiedBeds([...bodies.values()]);
  return <Panel title="House performance" subtitle={beds.homes ? `${beds.total.toLocaleString("en-GB", { maximumFractionDigits: 1 })} average occupied beds reported across ${beds.homes} ${beds.homes === 1 ? "home" : "homes"}` : "Current reporting month · one row per home"}>
    <table className="w-full table-fixed text-sm"><thead><tr>
      <th className="w-[18%] px-4 py-3 text-left font-semibold">Home</th>
      <th className="w-[19%] px-3 py-3 text-center font-semibold">Checklist</th>
      <th className="w-[20%] px-3 py-3 text-center font-semibold">Obligations</th>
      <th className="w-[12%] px-3 py-3 text-center font-semibold">Avg occupied beds</th>
      {access.incidents && <th className="px-3 py-3 text-center font-semibold">Incidents</th>}
      {access.risks && <th className="px-3 py-3 text-center font-semibold">Open risks</th>}
      <th className="w-[13%] px-3 py-3 text-center font-semibold">Report</th>
    </tr></thead><tbody className="divide-y divide-slate-200">{rows.map(row => {
      const measures = measureTotals(bodies.get(row.id) ? [bodies.get(row.id)!] : []);
      const obligations = totalsForCodes(measures, measures.map(item => item.code));
      const submitted = ["submitted", "approved"].includes(row.status);
      const status = row.status === "approved" ? "Approved" : row.status === "submitted" ? "Awaiting review" : row.status === "reopened" ? "Reopened" : "Draft";
      const statusColor = row.status === "approved" ? "bg-emerald-100 text-emerald-900" : row.status === "submitted" ? "bg-sky-100 text-sky-900" : "bg-amber-100 text-amber-900";
      return <tr key={row.id}>
        <th scope="row" className="px-4 py-3 text-left font-semibold text-[#102c39]">{access.reports ? <Link href={`/qa/monthly-reports/${row.id}`} className="hover:underline">{row.home}</Link> : row.home}</th>
        <td className="px-3 py-3 text-center">{submitted && row.checklist !== null ? <QaRating ratio={row.checklist} /> : <div className="text-slate-500">—</div>}</td>
        <td className="px-3 py-3 text-center"><strong className="tabular-nums text-[#102c39]">{percentage(obligations.ratio)}</strong><small className="mt-0.5 block text-xs text-slate-600">{obligations.expected ? `${obligations.completed}/${obligations.expected}` : "No quantities"}</small></td>
        <td className="px-3 py-3 text-center tabular-nums">{averageOccupiedBeds(bodies.get(row.id)) ?? "—"}</td>
        {access.incidents && <td className="px-3 py-3 text-center tabular-nums">{cases.filter(item => item.kind === "incidents" && item.home_id === row.homeId).length}</td>}
        {access.risks && <td className="px-3 py-3 text-center tabular-nums">{cases.filter(item => item.kind === "risks" && item.home_id === row.homeId).length}</td>}
        <td className="px-3 py-3 text-center"><div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor}`}>{status}</div></td>
      </tr>;
    })}{!rows.length && <tr><td colSpan={5 + Number(access.incidents) + Number(access.risks)} className="px-4 py-6 text-center text-slate-600">No reports for this selection.</td></tr>}</tbody></table>
  </Panel>;
}

function QuickStats({ totals, canOpenReports }: { totals: MeasureTotal[]; canOpenReports: boolean }) {
  return <Panel title="Monthly checks" subtitle="Completed and expected counts from the reports">
    <div className="grid sm:grid-cols-2 lg:grid-cols-5">{totals.map(item => {
      const ratio = item.expected > 0 ? item.completed / item.expected : null;
      const contents = <>
        <div className="flex items-center justify-between gap-3"><div className="text-sm font-medium text-[#102c39]">{item.label}</div><strong className="text-sm tabular-nums text-[#102c39]">{percentage(ratio)}</strong></div>
        <div className="mt-1 text-xs text-slate-600">{item.expected ? `${item.completed} of ${item.expected} ${item.unit}` : "No applicable quantities"}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${item.label}: ${item.completed} of ${item.expected} ${item.unit}`}><div className="workspace-measure-fill h-full rounded-full bg-teal-600" style={{ width: `${(ratio ?? 0) * 100}%` }} /></div>
      </>;
      const className = "block border-b border-slate-200 px-5 py-3";
      return canOpenReports ? <Link key={item.code} href="/qa/monthly-reports" className={`${className} workspace-kpi-link workspace-kpi-inline`}>{contents}</Link> : <div key={item.code} className={className}>{contents}</div>;
    })}</div>
  </Panel>;
}

function RecentCases({ cases, homes }: { cases: OverviewCase[]; homes: { id: string; name: string }[] }) {
  return <Panel title="Recent cases" subtitle="Latest recorded incidents and open assessments">
    {cases.length ? <div className="divide-y divide-slate-200 px-5 py-2">{cases.map(item => <div key={item.id} className="py-3">
      <div className="text-sm font-semibold text-[#102c39]">{item.title}</div>
      <div className="mt-1 text-xs text-slate-600">{homes.find(home => home.id === item.home_id)?.name ?? "Home"} · {item.occurred_on} · {item.status}</div>
    </div>)}</div> : <div className="px-5 py-6 text-sm text-slate-600">No cases in the available registers.</div>}
  </Panel>;
}

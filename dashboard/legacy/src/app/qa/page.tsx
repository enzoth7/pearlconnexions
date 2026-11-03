import Link from "next/link";
import { Activity, ClipboardCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { loadReportRows } from "@/lib/qa-report-rows";
import { canOpenSection } from "@/lib/workspace-sections";
import { requireGovernance } from "@/lib/auth";
import { localRecords } from "@/lib/qa-local-fixtures";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(16,43,55,0.035)]";
export default async function Page() {
  const [{ rows, context }, { supabase }] = await Promise.all([
    loadReportRows("qa.overview"), requireGovernance("qa", "qa.overview"),
  ]);
  const result = await supabase.rpc("qa_visible_record_counts");
  if (result.error) throw new Error(result.error.message);
  const open = result.data.filter((record: { status: string }) => !["Closed", "Completed"].includes(record.status));
  const month = [...new Set(rows.map(row => row.month))].sort().at(-1);
  const current = rows.filter(row => row.month === month);
  const homes = current.map(row => ({ id: row.homeId, name: row.home }));
  const canSeeIncidents = canOpenSection(context, "qa.incidents");
  const canSeeRisks = canOpenSection(context, "qa.risks");
  const canSeeMaintenance = canOpenSection(context, "maintenance.issues");
  const recentIssues = (["risks", "incidents", "maintenance"] as const).filter(kind =>
    kind === "risks" ? canSeeRisks : kind === "incidents" ? canSeeIncidents : canSeeMaintenance)
    .flatMap(kind => localRecords(kind, homes))
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    .slice(0, 4);
  const scores = current.filter(row => ["submitted", "approved"].includes(row.status) && row.formVersion === 2 && row.checklist !== null);
  const pending = current.filter(row => ["draft", "reopened"].includes(row.status)).length;
  const review = current.filter(row => row.status === "submitted").length;
  const approved = current.filter(row => row.status === "approved").length;
  const incidentCount = canSeeIncidents ? localRecords("incidents", homes).length + result.data.filter((record: { kind: string }) => record.kind === "incidents").reduce((sum: number, record: { total: number }) => sum + Number(record.total), 0) : 0;
  const riskCount = canSeeRisks ? localRecords("risks", homes).filter(record => record.status !== "Closed").length + open.filter((record: { kind: string }) => record.kind === "risks").reduce((sum: number, record: { total: number }) => sum + Number(record.total), 0) : 0;
  const average = scores.length ? Math.round(scores.reduce((sum, row) => sum + row.checklist!, 0) / scores.length * 100) : null;

  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight">Quality overview</h1>{month && <p className="mt-2 text-slate-600">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))}</p>}</div>
    </header>
    <Kpis submitted={review + approved} total={current.length} average={average} incidents={incidentCount} risks={riskCount}
      access={{ reports: canOpenSection(context, "qa.monthly_reports"), incidents: canSeeIncidents, risks: canSeeRisks }} />
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <ReportProgress total={current.length} pending={pending} review={review} approved={approved} />
      <ChecklistBars rows={scores.map(row => ({ id: row.id, home: row.home, score: row.checklist! }))} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {(canSeeIncidents || canSeeRisks || canSeeMaintenance) &&
      <section className={cardClass}><h2 className="text-lg font-semibold">Safety & follow-up</h2><p className="mt-1 text-sm text-slate-600">Items recorded in the visible registers</p>
        <div className="mt-5 divide-y divide-slate-100">
          {canSeeIncidents && <Signal label="Recorded incidents" count={incidentCount} href="/qa/incidents" />}
          {canSeeRisks && <Signal label="Open risk assessments" count={riskCount} href="/qa/risks" />}
        </div>
        {!!recentIssues.length && <div className="mt-4 divide-y divide-slate-100 border-t border-slate-200">{recentIssues.map(issue => <div key={issue.id} className="py-3"><p className="text-sm font-medium">{issue.title}</p><p className="mt-1 text-xs text-slate-600">{homes.find(home => home.id === issue.home_id)?.name} · {issue.occurred_on} · {issue.status}</p></div>)}</div>}
      </section>}
      <Attention pending={pending} review={review} risks={riskCount} showRisks={canSeeRisks} />
    </div>
  </div>;
}

function Kpis({ submitted, total, average, incidents, risks, access }: {
  submitted: number; total: number; average: number | null; incidents: number; risks: number;
  access: { reports: boolean; incidents: boolean; risks: boolean };
}) {
  const items = [
    { label: "Reports submitted", value: `${submitted} / ${total}`, detail: `${total - submitted} still to complete`, icon: ClipboardCheck, tint: "bg-teal-50 text-teal-700", bar: "bg-teal-600", progress: total ? submitted / total : null, href: access.reports ? "/qa/monthly-reports" : null, visible: true },
    { label: "Checklist result", value: average === null ? "—" : `${average}%`, detail: average === null ? "Awaiting submitted reports" : "Average of submitted checklists", icon: ShieldCheck, tint: "bg-sky-50 text-sky-700", bar: "bg-sky-600", progress: average === null ? null : average / 100, href: null, visible: true },
    { label: "Recorded incidents", value: incidents, detail: "In the visible register", icon: Activity, tint: "bg-orange-50 text-orange-700", bar: "", progress: null, href: access.incidents ? "/qa/incidents" : null, visible: access.incidents },
    { label: "Open risks", value: risks, detail: "In the visible register", icon: ShieldAlert, tint: "bg-rose-50 text-rose-700", bar: "", progress: null, href: access.risks ? "/qa/risks" : null, visible: access.risks },
  ];
  return <section aria-label="Key indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.filter(item => item.visible).map(item => {
    const Icon = item.icon;
    const contents = <><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{item.label}</p><span className={`rounded-xl p-2.5 ${item.tint}`}><Icon aria-hidden size={20} /></span></div>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-[#102f3a]">{item.value}</p><p className="mt-2 text-sm text-slate-600">{item.detail}</p>
      {item.progress !== null && <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.bar}`} style={{ width: `${item.progress * 100}%` }} /></div>}</>;
    return item.href ? <Link key={item.label} href={item.href} className={`${cardClass} transition-colors hover:border-teal-300`}>{contents}</Link> : <div key={item.label} className={cardClass}>{contents}</div>;
  })}</section>;
}

function ReportProgress({ total, pending, review, approved }: { total: number; pending: number; review: number; approved: number }) {
  const segments = [
    { label: "To complete", count: pending, color: "bg-amber-400" },
    { label: "Awaiting review", count: review, color: "bg-sky-500" },
    { label: "Approved", count: approved, color: "bg-teal-600" },
  ];
  return <section className={cardClass}><h2 className="text-lg font-semibold">Monthly report progress</h2><p className="mt-1 text-sm text-slate-600">{total} {total === 1 ? "home" : "homes"} in this reporting period</p>
    {total ? <><div role="img" aria-label={segments.map(item => `${item.label}: ${item.count}`).join(", ")} className="mt-8 flex h-4 overflow-hidden rounded-full bg-slate-100">{segments.filter(item => item.count).map(item => <div key={item.label} className={item.color} style={{ width: `${item.count / total * 100}%` }} />)}</div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{segments.map(item => <div key={item.label} className="border-l-2 border-slate-200 pl-3"><p className="text-sm text-slate-600">{item.label}</p><p className="mt-1 text-2xl font-semibold">{item.count}</p></div>)}</div></>
      : <p className="mt-8 text-sm text-slate-600">No monthly reports are available for this period.</p>}</section>;
}

function ChecklistBars({ rows }: { rows: { id: string; home: string; score: number }[] }) {
  return <section className={cardClass}><h2 className="text-lg font-semibold">Checklist by home</h2><p className="mt-1 text-sm text-slate-600">Submitted reports with applicable checks</p>
    {rows.length ? <div className="mt-6 space-y-5">{rows.map(row => <div key={row.id}><div className="flex justify-between gap-4 text-sm"><span className="font-medium">{row.home}</span><span className="font-semibold text-teal-800">{Math.round(row.score * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${row.score * 100}%` }} /></div></div>)}</div>
      : <p className="mt-8 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Results will appear when a monthly report is submitted. Drafts do not count as completed checks.</p>}</section>;
}

function Signal({ label, count, href }: { label: string; count: number; href?: string }) {
  return <div className="flex items-center justify-between gap-4 py-3 text-sm"><span>{label}</span>{href ? <Link href={href} className="font-semibold text-teal-800 underline">{count}</Link> : <strong>{count}</strong>}</div>;
}

function Attention({ pending, review, risks, showRisks }: { pending: number; review: number; risks: number; showRisks: boolean }) {
  const items = [{ label: "Monthly reports to complete", count: pending }, { label: "Reports awaiting review", count: review }, ...(showRisks ? [{ label: "Open risk assessments", count: risks }] : [])];
  return <section className={cardClass}><h2 className="text-lg font-semibold">What needs attention</h2><p className="mt-1 text-sm text-slate-600">Current reporting period</p>
    <div className="mt-5 divide-y divide-slate-100">{items.map(item => <div key={item.label} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{item.label}</span><span className={`rounded-full px-3 py-1 font-semibold ${item.count ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-600"}`}>{item.count}</span></div>)}</div></section>;
}

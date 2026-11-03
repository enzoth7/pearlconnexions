import Link from "next/link";
import { Activity, ClipboardCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { loadReportRows } from "@/lib/qa-report-rows";
import { canOpenSection } from "@/lib/workspace-sections";
import { requireGovernance } from "@/lib/auth";
import { checklistScore, type Question, type ReportBody } from "@/lib/governance";

type PreviewRecord = {
  kind: "incidents" | "risks";
  title: string;
  status: string;
  occurred_on: string;
  data?: { description?: string; priority?: string; controls?: string };
};
type PreviewReport = {
  id: string;
  home: string;
  provision: string;
  manager: string;
  status: string;
  body: ReportBody;
  questions: Question[];
  records: PreviewRecord[];
  score: number | null;
};

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(16,43,55,0.035)]";
const one = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [{ rows, context }, { supabase }, params] = await Promise.all([
    loadReportRows("qa.overview"), requireGovernance("qa", "qa.overview"), searchParams,
  ]);

  if (params.view === "demo" && context.role === "director") {
    const result = await supabase.from("qa_submissions")
      .select("id,status,qa_homes!inner(name,provision),qa_periods!inner(month_start,data_class),qa_report_forms(body,snapshot)")
      .eq("qa_periods.data_class", "demo")
      .eq("qa_periods.month_start", "2026-10-01")
      .order("created_at", { ascending: true });
    if (result.error) throw new Error(result.error.message);
    const reports: PreviewReport[] = (result.data ?? []).flatMap(row => {
      const home = one(row.qa_homes) as { name: string; provision: string } | null;
      const form = one(row.qa_report_forms) as { body: ReportBody; snapshot: { preview_manager?: string; questions?: Question[]; records?: PreviewRecord[] } | null } | null;
      if (!home || !form?.snapshot?.preview_manager) return [];
      return [{ id: row.id, home: home.name, provision: home.provision, manager: form.snapshot.preview_manager,
        status: row.status, body: form.body, questions: form.snapshot.questions ?? [], records: form.snapshot.records ?? [],
        score: checklistScore(form.body.answers) }];
    });
    return <PreviewOverview reports={reports} />;
  }

  const result = await supabase.rpc("qa_visible_record_counts");
  if (result.error) throw new Error(result.error.message);
  const open = result.data.filter((record: { status: string }) => !["Closed", "Completed"].includes(record.status));
  const month = [...new Set(rows.map(row => row.month))].sort().at(-1);
  const current = rows.filter(row => row.month === month);
  const scores = current.filter(row => ["submitted", "approved"].includes(row.status) && row.formVersion === 2 && row.checklist !== null);
  const pending = current.filter(row => ["draft", "reopened"].includes(row.status)).length;
  const review = current.filter(row => row.status === "submitted").length;
  const approved = current.filter(row => row.status === "approved").length;
  const incidentCount = result.data.filter((record: { kind: string }) => record.kind === "incidents").reduce((sum: number, record: { total: number }) => sum + Number(record.total), 0);
  const riskCount = open.filter((record: { kind: string }) => record.kind === "risks").reduce((sum: number, record: { total: number }) => sum + Number(record.total), 0);
  const average = scores.length ? Math.round(scores.reduce((sum, row) => sum + row.checklist!, 0) / scores.length * 100) : null;

  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight">Quality overview</h1>{month && <p className="mt-2 text-slate-600">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))} · Live data</p>}</div>
      {context.role === "director" && <Link href="/qa?view=demo" className="inline-flex min-h-11 items-center rounded-xl border border-teal-800 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50">Preview with example data</Link>}
    </header>
    <Kpis submitted={review + approved} total={current.length} average={average} incidents={incidentCount} risks={riskCount}
      example={false} access={{ reports: canOpenSection(context, "qa.monthly_reports"), incidents: canOpenSection(context, "qa.incidents"), risks: canOpenSection(context, "qa.risks") }} />
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <ReportProgress total={current.length} pending={pending} review={review} approved={approved} />
      <ChecklistBars rows={scores.map(row => ({ id: row.id, home: row.home, score: row.checklist! }))} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={cardClass}><h2 className="text-lg font-semibold">Safety & follow-up</h2><p className="mt-1 text-sm text-slate-600">Items recorded in the visible registers</p>
        <div className="mt-5 divide-y divide-slate-100">
          <Signal label="Recorded incidents" count={incidentCount} href={canOpenSection(context, "qa.incidents") ? "/qa/incidents" : undefined} />
          <Signal label="Open risk assessments" count={riskCount} href={canOpenSection(context, "qa.risks") ? "/qa/risks" : undefined} />
        </div><p className="mt-5 text-xs text-slate-500">No recorded item does not confirm that no incident or risk occurred.</p>
      </section>
      <Attention pending={pending} review={review} risks={riskCount} />
    </div>
  </div>;
}

function PreviewOverview({ reports }: { reports: PreviewReport[] }) {
  const records = reports.flatMap(report => report.records.map(record => ({ ...record, home: report.home })));
  const incidents = records.filter(record => record.kind === "incidents");
  const risks = records.filter(record => record.kind === "risks");
  const scores = reports.map(report => report.score).filter((score): score is number => score !== null);
  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Example data · October 2026</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Quality overview</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Illustrative reports for three homes. No manager submitted these reports; these are not real incidents, risks or compliance results.</p></div>
      <Link href="/qa" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">Return to live data</Link>
    </header>
    <Kpis submitted={reports.length} total={reports.length} average={scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 100) : null}
      incidents={incidents.length} risks={risks.filter(record => record.status === "Open").length} example access={{ reports: true, incidents: true, risks: true }} />
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <ReportProgress total={reports.length} pending={0} review={reports.length} approved={0} />
      <ChecklistBars rows={reports.filter(report => report.score !== null).map(report => ({ id: report.id, home: report.home, score: report.score! }))} />
    </div>
    <p className="text-sm text-slate-600">Bed capacities are not set in the live homes, so an occupancy rate cannot be calculated reliably.</p>
    <Attention pending={0} review={reports.length} risks={risks.filter(record => record.status === "Open").length} example />
    {!!reports.length && <section><h2 className="mb-4 text-xl font-semibold">Report details</h2><div className="divide-y divide-slate-200 border-y border-slate-200">{reports.map(report => <details key={report.id} className="group py-4"><summary className="cursor-pointer font-semibold text-teal-900">{report.home} · {report.manager} <span className="ml-2 text-sm font-normal text-slate-600">View checklist</span></summary><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{report.questions.filter(question => !question.provisions.length || question.provisions.includes(report.provision as Question["provisions"][number])).map(question => <div key={question.code}><dt className="font-medium">{question.label}</dt><dd className="mt-1 text-slate-600">{report.body.answers[question.code]?.answer === "na" ? "Not applicable" : report.body.answers[question.code]?.answer === "yes" ? "Yes" : "No"}{report.body.answers[question.code]?.note && ` · ${report.body.answers[question.code].note}`}</dd></div>)}</dl></details>)}</div></section>}
    <div className="grid gap-8 lg:grid-cols-2">{[
      { title: "Sample incidents", items: incidents }, { title: "Sample risk assessments", items: risks },
    ].map(group => <section key={group.title}><h2 className="mb-3 text-xl font-semibold">{group.title}</h2><div className="divide-y divide-slate-200 border-y border-slate-200">{group.items.map((record, index) => <div key={`${record.home}-${record.title}-${index}`} className="py-4"><p className="font-semibold">{record.title}</p><p className="mt-1 text-sm text-slate-600">{record.home} · {record.occurred_on} · {record.status}{record.data?.priority && ` · ${record.data.priority}`}</p>{record.data?.description && <p className="mt-2 text-sm">{record.data.description}</p>}</div>)}{!group.items.length && <p className="py-4 text-sm text-slate-600">No examples in this group.</p>}</div></section>)}</div>
  </div>;
}

function Kpis({ submitted, total, average, incidents, risks, example, access }: {
  submitted: number; total: number; average: number | null; incidents: number; risks: number; example: boolean;
  access: { reports: boolean; incidents: boolean; risks: boolean };
}) {
  const items = [
    { label: "Reports submitted", value: `${submitted} / ${total}`, detail: example ? "Illustrative reports" : `${total - submitted} still to complete`, icon: ClipboardCheck, tint: "bg-teal-50 text-teal-700", bar: "bg-teal-600", progress: total ? submitted / total : null, href: access.reports && !example ? "/qa/monthly-reports" : null },
    { label: "Checklist result", value: average === null ? "—" : `${average}%`, detail: average === null ? "Awaiting submitted reports" : "Average of submitted checklists", icon: ShieldCheck, tint: "bg-sky-50 text-sky-700", bar: "bg-sky-600", progress: average === null ? null : average / 100, href: null },
    { label: "Recorded incidents", value: incidents, detail: example ? "Illustrative incidents" : "In the visible register", icon: Activity, tint: "bg-orange-50 text-orange-700", bar: "", progress: null, href: access.incidents && !example ? "/qa/incidents" : null },
    { label: "Open risks", value: risks, detail: example ? "Illustrative assessments" : "In the visible register", icon: ShieldAlert, tint: "bg-rose-50 text-rose-700", bar: "", progress: null, href: access.risks && !example ? "/qa/risks" : null },
  ];
  return <section aria-label="Key indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(item => {
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

function Attention({ pending, review, risks, example = false }: { pending: number; review: number; risks: number; example?: boolean }) {
  const items = [{ label: "Monthly reports to complete", count: pending }, { label: "Reports awaiting review", count: review }, { label: "Open risk assessments", count: risks }];
  return <section className={cardClass}><h2 className="text-lg font-semibold">What needs attention</h2><p className="mt-1 text-sm text-slate-600">{example ? "Illustrative reporting period" : "Current reporting period"}</p>
    <div className="mt-5 divide-y divide-slate-100">{items.map(item => <div key={item.label} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{item.label}</span><span className={`rounded-full px-3 py-1 font-semibold ${item.count ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-600"}`}>{item.count}</span></div>)}</div></section>;
}

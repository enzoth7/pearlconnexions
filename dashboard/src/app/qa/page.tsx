import Link from "next/link";
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

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5";
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
  const cards = [
    { label: "Reports to complete", value: current.filter(row => ["draft", "reopened"].includes(row.status)).length, href: "/qa/monthly-reports", section: "qa.monthly_reports" },
    { label: "Awaiting director review", value: current.filter(row => row.status === "submitted").length, href: "/qa/reviews", section: "qa.reviews" },
    { label: "Open incidents", value: open.filter((record: { kind: string }) => record.kind === "incidents").reduce((sum: number, record: { total: number }) => sum + Number(record.total), 0), href: "/qa/incidents", section: "qa.incidents" },
    { label: "Open risks", value: open.filter((record: { kind: string }) => record.kind === "risks").reduce((sum: number, record: { total: number }) => sum + Number(record.total), 0), href: "/qa/risks", section: "qa.risks" },
  ] as const;

  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight">Quality overview</h1>{month && <p className="mt-2 text-slate-600">{month} · Live data</p>}</div>
      {context.role === "director" && <Link href="/qa?view=demo" className="inline-flex min-h-11 items-center rounded-xl border border-teal-800 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50">Preview with example data</Link>}
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => {
      const content = <><p className="text-sm text-slate-600">{card.label}</p><p className="mt-4 text-4xl font-semibold">{card.value}</p></>;
      return canOpenSection(context, card.section)
        ? <Link key={card.label} href={card.href} className={cardClass}>{content}</Link>
        : <div key={card.label} className={cardClass}>{content}</div>;
    })}</div>
    <section className={cardClass}>
      <h2 className="text-xl font-semibold">Submitted checklist results</h2>
      <p className="mt-3 text-3xl font-semibold">{scores.length ? `${Math.round(scores.reduce((sum, row) => sum + row.checklist!, 0) / scores.length * 100)}%` : "No applicable results yet"}</p>
      <p className="mt-3 text-sm text-slate-600">Average across submitted and approved reports for {month ?? "the selected month"}. Historical expected/completed percentages remain separate.</p>
    </section>
    {!!current.length && <section>
      <h2 className="mb-4 text-xl font-semibold">Reports by home</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Home</th><th className="p-4">Status</th><th className="p-4">Checklist</th><th className="p-4">Report</th></tr></thead>
          <tbody>{current.map(row => <tr key={row.id} className="border-t border-slate-200"><td className="p-4 font-medium">{row.home}</td><td className="p-4 capitalize">{row.status}</td><td className="p-4">{row.checklist === null ? "—" : `${Math.round(row.checklist * 100)}%`}</td><td className="p-4"><Link href={row.formVersion === 2 ? `/qa/monthly-reports/${row.id}` : context.role === "director" ? `/director/reviews/${row.id}` : `/portal/submissions/${row.id}`} className="font-semibold text-teal-800 underline">Open</Link></td></tr>)}</tbody>
        </table>
      </div>
    </section>}
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: "Sample monthly reports", value: reports.length },
      { label: "Checklist result", value: scores.length ? `${Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 100)}%` : "—" },
      { label: "Sample incidents", value: incidents.length },
      { label: "Open sample risks", value: risks.filter(record => record.status === "Open").length },
    ].map(card => <div key={card.label} className={cardClass}><p className="text-sm text-slate-600">{card.label}</p><p className="mt-4 text-4xl font-semibold">{card.value}</p></div>)}</div>
    <section>
      <h2 className="mb-4 text-xl font-semibold">October reports</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Home</th><th className="p-4">Illustrative lead</th><th className="p-4">Service</th><th className="p-4">Checklist</th><th className="p-4">Occupied beds</th></tr></thead><tbody>{reports.map(report => <tr key={report.id} className="border-t border-slate-200"><td className="p-4 font-semibold">{report.home}</td><td className="p-4">{report.manager}</td><td className="p-4">{report.provision}</td><td className="p-4">{report.score === null ? "Not applicable" : `${Math.round(report.score * 100)}%`}</td><td className="p-4">{report.body.occupied_beds}</td></tr>)}</tbody></table>{!reports.length && <p className="p-5 text-sm text-slate-600">No example reports are available yet.</p>}</div>
      <p className="mt-2 text-sm text-slate-600">Bed capacities are not set in the live homes, so an occupancy rate cannot be calculated reliably.</p>
    </section>
    {!!reports.length && <section><h2 className="mb-4 text-xl font-semibold">Report details</h2><div className="divide-y divide-slate-200 border-y border-slate-200">{reports.map(report => <details key={report.id} className="group py-4"><summary className="cursor-pointer font-semibold text-teal-900">{report.home} · {report.manager} <span className="ml-2 text-sm font-normal text-slate-600">View checklist</span></summary><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{report.questions.filter(question => !question.provisions.length || question.provisions.includes(report.provision as Question["provisions"][number])).map(question => <div key={question.code}><dt className="font-medium">{question.label}</dt><dd className="mt-1 text-slate-600">{report.body.answers[question.code]?.answer === "na" ? "Not applicable" : report.body.answers[question.code]?.answer === "yes" ? "Yes" : "No"}{report.body.answers[question.code]?.note && ` · ${report.body.answers[question.code].note}`}</dd></div>)}</dl></details>)}</div></section>}
    <div className="grid gap-8 lg:grid-cols-2">{[
      { title: "Sample incidents", items: incidents }, { title: "Sample risk assessments", items: risks },
    ].map(group => <section key={group.title}><h2 className="mb-3 text-xl font-semibold">{group.title}</h2><div className="divide-y divide-slate-200 border-y border-slate-200">{group.items.map((record, index) => <div key={`${record.home}-${record.title}-${index}`} className="py-4"><p className="font-semibold">{record.title}</p><p className="mt-1 text-sm text-slate-600">{record.home} · {record.occurred_on} · {record.status}{record.data?.priority && ` · ${record.data.priority}`}</p>{record.data?.description && <p className="mt-2 text-sm">{record.data.description}</p>}</div>)}{!group.items.length && <p className="py-4 text-sm text-slate-600">No examples in this group.</p>}</div></section>)}</div>
  </div>;
}

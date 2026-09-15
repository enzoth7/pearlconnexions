import { CalendarClock, Database, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { RepairPeriodForm } from "@/components/repair-period-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth";
import type { MetricDefinition } from "@/lib/types";

type ImportRow = { id: string; source_name: string; source_hash: string; status: string; source_rows: number; imported_rows: number; imported_at: string; reconciliation: { reconciled?: boolean } };

export default async function SettingsPage() {
  const { supabase } = await requireDirector();
  const [metricsResult, importsResult, runsResult] = await Promise.all([
    supabase.from("qa_metric_definitions").select("*").order("display_order"),
    supabase.from("qa_imports").select("*").order("imported_at", { ascending: false }),
    supabase.from("qa_period_runs").select("*").order("created_at", { ascending: false }).limit(10),
  ]);
  if (metricsResult.error || importsResult.error || runsResult.error) throw new Error(metricsResult.error?.message || importsResult.error?.message || runsResult.error?.message);
  const metrics = metricsResult.data as MetricDefinition[];
  const imports = importsResult.data as ImportRow[];
  const previousMonth = new Date();
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
  const defaultMonth = `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  return <div className="space-y-6">
    <PageHeader eyebrow="Director console" title="QA settings" description="Review the fixed metric catalogue, import traceability and automated monthly period creation." />
    <div className="grid gap-4 lg:grid-cols-3">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="size-5 text-blue-800" />Period automation</CardTitle><CardDescription>Runs on day 1 at 02:05 UTC. Deadline: day 10 at 23:59 Europe/London.</CardDescription></CardHeader><CardContent><RepairPeriodForm defaultMonth={defaultMonth} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="size-5 text-blue-800" />Workbook import</CardTitle><CardDescription>Aggregate demo data only.</CardDescription></CardHeader><CardContent>{imports.map((item) => <div key={item.id} className="space-y-2 text-sm"><div className="flex items-center justify-between"><span className="font-semibold">{item.source_name}</span><Badge variant="outline">{item.status}</Badge></div><p>{item.imported_rows} / {item.source_rows} rows</p><p className="break-all font-mono text-xs text-muted-foreground">SHA-256 {item.source_hash}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-blue-800" />Security</CardTitle><CardDescription>Access is enforced in Supabase as well as in the web routes.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><p>Anonymous access: <strong>Denied</strong></p><p>House Lead demo access: <strong>Denied</strong></p><p>Cross-home access: <strong>Denied</strong></p><p>Submitted editing: <strong>Locked</strong></p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Metric catalogue</CardTitle><CardDescription>{metrics.length} definitions. House Lead collection is fixed in v1; deferred sources show “Not collected”.</CardDescription></CardHeader><CardContent><div className="data-table-wrap"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/70 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 text-start">Metric</th><th className="px-4 py-3 text-start">Category</th><th className="px-4 py-3 text-start">Source</th><th className="px-4 py-3 text-start">Kind</th><th className="px-4 py-3 text-start">Collection</th></tr></thead><tbody>{metrics.map((metric) => <tr key={metric.code} className="border-t"><td className="px-4 py-3"><span className="font-semibold">{metric.display_name}</span><span className="block font-mono text-xs text-muted-foreground">{metric.code}</span></td><td className="px-4 py-3">{metric.category}</td><td className="px-4 py-3">{metric.source_scope}</td><td className="px-4 py-3 capitalize">{metric.value_kind}</td><td className="px-4 py-3"><Badge variant="outline" className={metric.active_for_house ? "border-blue-200 bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-700"}>{metric.active_for_house ? "House Lead" : "Not collected"}</Badge></td></tr>)}</tbody></table></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Recent period runs</CardTitle></CardHeader><CardContent>{runsResult.data.length ? <ul className="divide-y text-sm">{runsResult.data.map((run) => <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="font-semibold">{run.period_month} · {run.source}</span><span>{run.result} · {run.drafts_created} drafts created</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No period runs recorded.</p>}</CardContent></Card>
  </div>;
}

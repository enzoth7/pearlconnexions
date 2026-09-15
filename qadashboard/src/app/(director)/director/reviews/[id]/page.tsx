import { notFound } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { approveSubmission, reopenSubmission } from "@/app/actions";
import { PageHeader } from "@/components/app-shell";
import { ReportDetailView } from "@/components/report-detail-view";
import type { ReviewMetricRow } from "@/components/review-metrics-table";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { safeRatio } from "@/lib/calculations";
import { requireDirector } from "@/lib/auth";
import { formatPeriodLabel } from "@/lib/periods";
import type { Home, IncidentDetail, MetricDefinition, MetricValue, Period, Submission } from "@/lib/types";

const one = <T,>(value: T | T[]) => Array.isArray(value) ? value[0] : value;

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const queryParams = await searchParams;
  const initialView = typeof queryParams.view === "string" ? queryParams.view : "overview";
  const { supabase } = await requireDirector();
  const [submissionResult, definitionsResult] = await Promise.all([
    supabase.from("qa_submissions").select("*,qa_homes!inner(*),qa_periods!inner(*),qa_metric_values(*),qa_incident_details(*)").eq("id", id).maybeSingle(),
    supabase.from("qa_metric_definitions").select("*").order("display_order"),
  ]);
  if (submissionResult.error || definitionsResult.error) throw new Error(submissionResult.error?.message || definitionsResult.error?.message);
  if (!submissionResult.data) notFound();
  const row = submissionResult.data as unknown as Submission & { qa_homes: Home | Home[]; qa_periods: Period | Period[]; qa_metric_values: MetricValue[]; qa_incident_details: IncidentDetail[] };
  const home = one(row.qa_homes);
  const period = one(row.qa_periods);
  const definitions = definitionsResult.data as MetricDefinition[];
  const definitionMap = new Map(definitions.map((definition) => [definition.code, definition]));
  const values = row.qa_metric_values.toSorted((a, b) => (definitionMap.get(a.metric_code)?.display_order ?? 999) - (definitionMap.get(b.metric_code)?.display_order ?? 999));
  const metricRows: ReviewMetricRow[] = values.map((value) => {
    const definition = definitionMap.get(value.metric_code);
    return {
      code: value.metric_code,
      name: definition?.display_name ?? value.metric_code,
      category: definition?.category ?? "Uncategorised",
      expected: value.expected,
      actual: value.actual,
      score: safeRatio(value.actual, value.expected),
      expectedApplicable: Boolean(definition?.requires_expected || value.expected !== null),
    };
  });
  const incidents = row.qa_incident_details.toSorted(
    (a, b) => (b.occurred_at ? new Date(b.occurred_at).getTime() : 0) - (a.occurred_at ? new Date(a.occurred_at).getTime() : 0),
  );

  return <div className="space-y-6">
    <PageHeader eyebrow="Review detail" title={home.name} description={`${formatPeriodLabel(period)} · ${period.data_class} data`} action={<StatusBadge status={row.status} />} />
    {row.reopen_reason ? <Alert className="border-amber-300 bg-amber-50"><RotateCcw /><AlertTitle>Reopening reason</AlertTitle><AlertDescription>{row.reopen_reason}</AlertDescription></Alert> : null}
    <ReportDetailView metrics={metricRows} incidents={incidents} initialView={initialView} />
    {row.status === "submitted" || row.status === "approved" ? <div className="grid gap-4 lg:grid-cols-2">
      {row.status === "submitted" ? <Card className="border-emerald-200"><CardHeader><CardTitle>Approve report</CardTitle><CardDescription>Approval records Joel’s account and locks the report.</CardDescription></CardHeader><CardContent><form action={approveSubmission}><input type="hidden" name="submission_id" value={row.id} /><Button type="submit" className="h-11 bg-emerald-700 hover:bg-emerald-800"><CheckCircle2 />Approve report</Button></form></CardContent></Card> : null}
      <Card className="border-amber-200"><CardHeader><CardTitle>Reopen report</CardTitle><CardDescription>The House Lead can edit again and will see your reason.</CardDescription></CardHeader><CardContent><form action={reopenSubmission} className="space-y-3"><input type="hidden" name="submission_id" value={row.id} /><div className="space-y-2"><Label htmlFor="reason">Reason</Label><Textarea id="reason" name="reason" minLength={5} required placeholder="Explain what needs to be corrected." /></div><Button type="submit" variant="outline" className="h-11 border-amber-400"><RotateCcw />Reopen with reason</Button></form></CardContent></Card>
    </div> : null}
  </div>;
}

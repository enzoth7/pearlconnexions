import { PageHeader } from "@/components/app-shell";
import { ReportsTable, type ReportTableRow } from "@/components/reports-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDirector } from "@/lib/auth";
import { formatNumber } from "@/lib/calculations";
import { formatPeriodLabel } from "@/lib/periods";
import type { Home, Period, SubmissionStatus } from "@/lib/types";

type ReviewMetric = { metric_code: string; actual: number | null };
type ReviewRow = {
  id: string;
  status: SubmissionStatus;
  is_late: boolean;
  submitted_at: string | null;
  approved_at: string | null;
  qa_homes: Home | Home[];
  qa_periods: Period | Period[];
  qa_metric_values: ReviewMetric[];
};

const one = <T,>(value: T | T[]) => Array.isArray(value) ? value[0] : value;

function metricActual(row: ReviewRow, code: string) {
  return row.qa_metric_values.find((metric) => metric.metric_code === code)?.actual ?? null;
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const periodId = typeof params.period === "string" ? params.period : "";
  const incidentMode = params.focus === "incidents";
  const { supabase } = await requireDirector();

  let query = supabase
    .from("qa_submissions")
    .select("id,status,is_late,submitted_at,approved_at,qa_homes!inner(*),qa_periods!inner(*),qa_metric_values(metric_code,actual)")
    .in("status", ["submitted", "approved", "reopened"])
    .order("submitted_at", { ascending: false });
  if (periodId) query = query.eq("period_id", periodId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data as unknown as ReviewRow[];
  const periodName = rows[0] ? formatPeriodLabel(one(rows[0].qa_periods)) : "the selected period";
  const incidentTotal = rows.reduce((total, row) => total + (metricActual(row, "Inc_Total") ?? 0), 0);
  const tableRows: ReportTableRow[] = rows.map((row) => {
    const home = one(row.qa_homes);
    const period = one(row.qa_periods);
    return {
      id: row.id,
      home: home.name,
      period: formatPeriodLabel(period),
      dataClass: period.data_class,
      status: row.status,
      submittedAt: row.submitted_at,
      isLate: row.is_late,
      incidents: metricActual(row, "Inc_Total"),
      reportedWithin24h: metricActual(row, "Inc_Reported_24h"),
    };
  });

  return <div className="space-y-6">
    <PageHeader
      eyebrow={incidentMode ? "Operational detail" : "Director console"}
      title={incidentMode ? "Incident reports" : "Review queue"}
      description={incidentMode
        ? `Report-level detail behind the incident KPI for ${periodName}.`
        : "Approve submitted reports or reopen them with a visible reason. Submitted data is never edited silently."}
    />

    <Card>
      <CardHeader>
        <CardTitle>{incidentMode ? "Incidents by home" : "Reports"}</CardTitle>
        <CardDescription>
          {incidentMode
            ? `${formatNumber(incidentTotal)} incidents across ${rows.length} home reports. Open a report to inspect its full breakdown.`
            : `${rows.filter((row) => row.status === "submitted").length} waiting for review`}
        </CardDescription>
      </CardHeader>
      <CardContent><ReportsTable rows={tableRows} incidentMode={incidentMode} /></CardContent>
    </Card>
  </div>;
}

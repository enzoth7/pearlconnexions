import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { MonthlyForm } from "@/components/monthly-form";
import { requireHouseLead } from "@/lib/auth";
import type { Home, IncidentDetail, MetricDefinition, MetricValue, Period, Submission } from "@/lib/types";

const one = <T,>(value: T | T[]) => Array.isArray(value) ? value[0] : value;

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireHouseLead();
  const [submissionResult, definitionsResult] = await Promise.all([
    supabase.from("qa_submissions").select("*,qa_homes!inner(*),qa_periods!inner(*),qa_metric_values(*),qa_incident_details(*)").eq("id", id).maybeSingle(),
    supabase.from("qa_metric_definitions").select("*").eq("active_for_house", true).order("display_order"),
  ]);
  if (submissionResult.error || definitionsResult.error) throw new Error(submissionResult.error?.message || definitionsResult.error?.message);
  if (!submissionResult.data) notFound();
  const row = submissionResult.data as unknown as Submission & {
    qa_homes: Home | Home[];
    qa_periods: Period | Period[];
    qa_metric_values: MetricValue[];
    qa_incident_details: IncidentDetail[];
  };
  return <div>
    <PageHeader eyebrow="Monthly report" title="Quality assurance form" description="Save a draft at any time. Submit only when every required metric is complete; submission locks the report for review." />
    <MonthlyForm
      submission={row}
      home={one(row.qa_homes)}
      period={one(row.qa_periods)}
      definitions={definitionsResult.data as MetricDefinition[]}
      values={row.qa_metric_values}
      incidents={[...row.qa_incident_details].sort((a, b) => a.incident_number - b.incident_number)}
    />
  </div>;
}

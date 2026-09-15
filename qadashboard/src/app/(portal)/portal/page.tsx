import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { isOverdue } from "@/lib/calculations";
import { requireHouseLead } from "@/lib/auth";
import { formatPeriodLabel } from "@/lib/periods";
import type { Home, Period, SubmissionStatus } from "@/lib/types";

type PortalRow = {
  id: string;
  status: SubmissionStatus;
  is_late: boolean;
  qa_homes: Home | Home[];
  qa_periods: Period | Period[];
  qa_metric_values: Array<{ actual: number | null; metric_code: string }>;
};

const one = <T,>(value: T | T[]) => Array.isArray(value) ? value[0] : value;

export default async function PortalPage() {
  const { context, supabase } = await requireHouseLead();
  const { data, error } = await supabase
    .from("qa_submissions")
    .select("id,status,is_late,qa_homes!inner(*),qa_periods!inner(*),qa_metric_values(metric_code,actual)")
    .order("month_start", { referencedTable: "qa_periods", ascending: false });
  if (error) throw new Error(error.message);
  const submissions = data as unknown as PortalRow[];
  return <div className="space-y-6">
    <PageHeader eyebrow="House Lead portal" title={`Welcome, ${context.name}`} description="Complete one monthly quality report for each assigned home. Demo workbook data is never shown here." />
    {submissions.length ? <div className="grid gap-4 lg:grid-cols-2">{submissions.map((submission) => {
      const home = one(submission.qa_homes);
      const period = one(submission.qa_periods);
      const overdue = isOverdue(submission.status, period.due_at);
      const completed = submission.qa_metric_values.filter((value) => value.actual !== null).length;
      return <Card key={submission.id} className={overdue ? "border-amber-300" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3"><div><CardTitle>{home.name}</CardTitle><CardDescription className="mt-1">{formatPeriodLabel(period)}</CardDescription></div><StatusBadge status={submission.status} /></div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4" />Due {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(period.due_at))}</div>
          <div className="flex items-center gap-2 text-muted-foreground">{overdue ? <Clock3 className="size-4 text-amber-700" /> : <CheckCircle2 className="size-4 text-emerald-700" />}{overdue ? "Late submission allowed" : `${completed} values recorded`}</div>
        </CardContent>
        <CardFooter><Button asChild className="h-11 w-full sm:w-auto"><Link href={`/portal/submissions/${submission.id}`}><FileText />{submission.status === "draft" || submission.status === "reopened" ? "Open report" : "View report"}<ArrowRight /></Link></Button></CardFooter>
      </Card>;
    })}</div> : <Card><CardContent className="py-12 text-center"><FileText className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="font-bold">No reports assigned</p><p className="mt-1 text-sm text-muted-foreground">Joel can assign homes and repair a missing period.</p></CardContent></Card>}
  </div>;
}

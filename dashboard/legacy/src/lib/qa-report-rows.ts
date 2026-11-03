import { requireSection } from "@/lib/auth";
import type { QaReportRow } from "@/components/qa-reports-list";
import { withLocalReports } from "@/lib/qa-local-fixtures";
export async function loadReportRows(section: "qa.overview" | "qa.monthly_reports" | "qa.reviews" = "qa.monthly_reports") {
  const { context, supabase } = await requireSection(section);
  const [result,scores] = await Promise.all([
    supabase.from("qa_submissions").select("*,qa_homes!inner(name),qa_periods!inner(month_start,data_class)").eq("qa_periods.data_class", "live").order("created_at", { ascending: false }),
    supabase.rpc("qa_checklist_scores"),
  ]);
  if (result.error || scores.error) throw new Error(result.error?.message || scores.error?.message);
  const checklist = new Map((scores.data as {submission_id:string;score:number|null}[] ?? []).map(item=>[item.submission_id,item.score]));
  const rows: QaReportRow[] = (result.data ?? []).map(row => {
    const home = Array.isArray(row.qa_homes) ? row.qa_homes[0] : row.qa_homes;
    const period = Array.isArray(row.qa_periods) ? row.qa_periods[0] : row.qa_periods;
    return { id: row.id, homeId: row.home_id, home: home.name, month: period.month_start.slice(0, 7), status: row.status, version: row.version, formVersion: row.form_version, checklist: checklist.get(row.id) ?? null };
  });
  return { context, rows: withLocalReports(rows) };
}

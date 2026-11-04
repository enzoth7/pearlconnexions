import { notFound, redirect } from "next/navigation";
import { requireReportAccess } from "@/lib/auth";
import { canOpenSection } from "@/lib/workspace-sections";
import { QaMonthlyReport } from "@/components/qa-monthly-report";
import type { GovernanceRecord, Question, ReportBody } from "@/lib/governance";
import { localRecords, localReportBody, localReportHomeId, showQaFixtures } from "@/lib/qa-local-fixtures";
export default async function Page({ params }: { params: Promise<{id:string}> }) {
  const {id}=await params; const {context,supabase}=await requireReportAccess();
  const localHomeId = showQaFixtures() ? localReportHomeId(id) : null;
  if (localHomeId) {
    const [homeResult, reportResult, catalogResult] = await Promise.all([
      supabase.from("qa_homes").select("*").eq("id", localHomeId).maybeSingle(),
      supabase.from("qa_submissions").select("id,qa_periods!inner(month_start,data_class)").eq("home_id", localHomeId).eq("status", "draft").eq("qa_periods.month_start", "2026-10-01").eq("qa_periods.data_class", "live").maybeSingle(),
      supabase.from("qa_questionnaires").select("questions").eq("version", 2).single(),
    ]);
    if (homeResult.error || reportResult.error || catalogResult.error) throw new Error(homeResult.error?.message || reportResult.error?.message || catalogResult.error?.message);
    if (!homeResult.data || !reportResult.data || !["Brambles Acre", "Coulsdon", "Milne Park"].includes(homeResult.data.name)) notFound();
    const home = homeResult.data;
    const questions = catalogResult.data.questions as Question[];
    const records = (["incidents", "risks", "maintenance"] as const).flatMap(kind => localRecords(kind, [home]));
    return <QaMonthlyReport id={id} initialVersion={1} initialStatus={home.name === "Coulsdon" ? "approved" : "submitted"}
      home={home} month="2026-10" questions={questions} initialBody={localReportBody(questions, home)} records={records}
      director={false} reopenReason={null} snapshotAt="2026-10-31T18:00:00Z"
      accessibleRegisters={(["incidents", "risks", "maintenance"] as const).filter(kind => canOpenSection(context, kind === "maintenance" ? "maintenance.issues" : `qa.${kind}`))} />;
  }
  const result=await supabase.from("qa_submissions").select("*,qa_homes!inner(*),qa_periods!inner(*)").eq("id",id).eq("qa_periods.data_class","live").maybeSingle();
  if(result.error) throw new Error(result.error.message); if(!result.data) notFound();
  const row=result.data; if(![2,3].includes(row.form_version)) redirect(context.role==="director"?`/director/reviews/${id}`:`/portal/submissions/${id}`);
  const one=<T,>(value:T|T[])=>Array.isArray(value)?value[0]:value;
  const home=one(row.qa_homes); const period=one(row.qa_periods);
  const locked=["submitted","approved"].includes(row.status);
  const [catalog,visible]=await Promise.all([supabase.from("qa_questionnaires").select("questions").eq("version",row.form_version).single(),supabase.rpc("qa_visible_report",{target:id})]);
  if(catalog.error || visible.error) throw new Error(catalog.error?.message || visible.error?.message);
  const form=visible.data;
  const snapshot=locked?form?.snapshot:null;
  const records=(snapshot?.records ?? form?.records ?? []) as GovernanceRecord[];
  const accessibleRegisters=(["incidents","risks","maintenance"] as const).filter(kind=>canOpenSection(context,kind==="maintenance"?"maintenance.issues":`qa.${kind}`));
  return <QaMonthlyReport key={`${id}:${row.version}`} id={id} formVersion={row.form_version} initialVersion={row.version} initialStatus={row.status} home={snapshot?.home ?? home} month={period.month_start.slice(0,7)} questions={(snapshot?.questions ?? catalog.data.questions) as Question[]} initialBody={(form?.body ?? {answers:{},occupied_beds:"",records_confirmed:false}) as ReportBody} records={records} director={context.role==="director"} canEditReport={canOpenSection(context,"qa.monthly_reports")} reopenReason={row.reopen_reason} snapshotAt={snapshot?.captured_at ?? null} accessibleRegisters={accessibleRegisters} />;
}

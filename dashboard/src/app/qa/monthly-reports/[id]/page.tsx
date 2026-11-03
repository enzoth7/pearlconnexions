import { notFound, redirect } from "next/navigation";
import { requireReportAccess } from "@/lib/auth";
import { canOpenSection } from "@/lib/workspace-sections";
import { QaMonthlyReport } from "@/components/qa-monthly-report";
import type { GovernanceRecord, Question, ReportBody } from "@/lib/governance";
export default async function Page({ params }: { params: Promise<{id:string}> }) {
  const {id}=await params; const {context,supabase}=await requireReportAccess();
  const result=await supabase.from("qa_submissions").select("*,qa_homes!inner(*),qa_periods!inner(*)").eq("id",id).eq("qa_periods.data_class","live").maybeSingle();
  if(result.error) throw new Error(result.error.message); if(!result.data) notFound();
  const row=result.data; if(row.form_version!==2) redirect(context.role==="director"?`/director/reviews/${id}`:`/portal/submissions/${id}`);
  const one=<T,>(value:T|T[])=>Array.isArray(value)?value[0]:value;
  const home=one(row.qa_homes); const period=one(row.qa_periods);
  const locked=["submitted","approved"].includes(row.status);
  const [catalog,visible]=await Promise.all([supabase.from("qa_questionnaires").select("questions").eq("version",2).single(),supabase.rpc("qa_visible_report",{target:id})]);
  if(catalog.error || visible.error) throw new Error(catalog.error?.message || visible.error?.message);
  const form=visible.data;
  const snapshot=locked?form?.snapshot:null;
  const records=(snapshot?.records ?? form?.records ?? []) as GovernanceRecord[];
  const accessibleRegisters=(["incidents","risks","maintenance"] as const).filter(kind=>canOpenSection(context,kind==="maintenance"?"maintenance.issues":`qa.${kind}`));
  return <QaMonthlyReport key={`${id}:${row.version}`} id={id} initialVersion={row.version} initialStatus={row.status} home={snapshot?.home ?? home} month={period.month_start.slice(0,7)} questions={(snapshot?.questions ?? catalog.data.questions) as Question[]} initialBody={(form?.body ?? {answers:{},occupied_beds:"",records_confirmed:false}) as ReportBody} records={records} director={context.role==="director"} canEditReport={canOpenSection(context,"qa.monthly_reports")} reopenReason={row.reopen_reason} snapshotAt={snapshot?.captured_at ?? null} accessibleRegisters={accessibleRegisters} />;
}

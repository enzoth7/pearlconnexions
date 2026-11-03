import Link from "next/link";
import { loadReportRows } from "@/lib/qa-report-rows";
import { canOpenSection } from "@/lib/workspace-sections";
import { requireGovernance } from "@/lib/auth";
export default async function Page(){
 const [{rows,context},{supabase}]=await Promise.all([loadReportRows("qa.overview"),requireGovernance("qa","qa.overview")]);
 const result=await supabase.rpc("qa_visible_record_counts");if(result.error)throw new Error(result.error.message);
 const open=result.data.filter((r:{status:string})=>!["Closed","Completed"].includes(r.status));
 const sent=rows.filter(r=>["submitted","approved"].includes(r.status));const scores=sent.filter(r=>r.formVersion===2 && r.checklist!==null);
 const cards=[{label:"Reports to complete",value:rows.filter(r=>["draft","reopened"].includes(r.status)).length,href:"/qa/monthly-reports"},{label:"Awaiting director review",value:rows.filter(r=>r.status==="submitted").length,href:"/qa/reviews"},{label:"Open incidents",value:open.filter((r:{kind:string})=>r.kind==="incidents").reduce((sum:number,r:{total:number})=>sum+Number(r.total),0),href:"/qa/incidents"},{label:"Open risks",value:open.filter((r:{kind:string})=>r.kind==="risks").reduce((sum:number,r:{total:number})=>sum+Number(r.total),0),href:"/qa/risks"}];
 return <div className="space-y-8"><h1 className="text-3xl font-semibold tracking-tight">Quality overview</h1><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=>{
  const content=<><p className="text-sm text-slate-600">{card.label}</p><p className="mt-4 text-4xl font-semibold">{card.value}</p></>;
  const allowed=canOpenSection(context,card.href.endsWith("incidents")?"qa.incidents":card.href.endsWith("risks")?"qa.risks":card.href.endsWith("reviews")?"qa.reviews":"qa.monthly_reports");
  return allowed?<Link key={card.label} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-6">{content}</Link>:<div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-6">{content}</div>;
 })}</div><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Submitted checklist results</h2><p className="mt-3 text-3xl font-semibold">{scores.length?`${Math.round(scores.reduce((sum,r)=>sum+r.checklist!,0)/scores.length*100)}%`:"No applicable results yet"}</p><p className="mt-3 text-sm text-slate-600">Average across submitted and approved checklist reports. Historical expected/completed percentages remain separate.</p></section></div>;
}

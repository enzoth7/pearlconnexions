import { QaReportsList } from "@/components/qa-reports-list";
import { loadReportRows } from "@/lib/qa-report-rows";
export default async function Page() { const {context,rows}=await loadReportRows("qa.reviews"); return <QaReportsList rows={rows} director={context.role === "director"} reviews />; }

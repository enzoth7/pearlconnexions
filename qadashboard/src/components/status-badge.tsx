import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import type { SubmissionStatus } from "@/lib/types";

const styles: Record<SubmissionStatus, string> = {
  draft: "border-slate-300 bg-slate-100 text-slate-700",
  submitted: "border-blue-200 bg-blue-50 text-blue-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  reopened: "border-amber-300 bg-amber-50 text-amber-900",
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return <Badge variant="outline" className={cn("capitalize", styles[status])}>{status}</Badge>;
}

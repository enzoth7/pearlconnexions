import { cn, effectiveStatus, type ActionRecord } from "@/lib/utils";

const tones: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-700", "In Progress": "bg-blue-100 text-blue-800",
  "At Risk": "bg-amber-100 text-amber-900", Overdue: "bg-red-100 text-red-800",
  Extended: "bg-violet-100 text-violet-800", Completed: "bg-emerald-100 text-emerald-800",
};
export function StatusBadge({ action }: { action: ActionRecord }) {
  const status = effectiveStatus(action);
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", tones[status])}>{status}</span>;
}

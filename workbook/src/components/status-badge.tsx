import { cn, effectiveStatus, type ActionRecord } from "@/lib/utils";

const tones: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-700 border border-slate-200",
  "In Progress": "bg-[#E0F7FA] text-[#007A91] border border-[#0097B2]/30",
  "At Risk": "bg-amber-100 text-amber-900 border border-amber-200",
  Overdue: "bg-red-100 text-red-800 border border-red-200",
  Extended: "bg-violet-100 text-violet-800 border border-violet-200",
  Completed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
};
export function StatusBadge({ action }: { action: ActionRecord }) {
  const status = effectiveStatus(action);
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", tones[status])}>{status}</span>;
}

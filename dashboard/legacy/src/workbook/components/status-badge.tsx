import { Repeat } from "lucide-react";
import { cn, effectiveStatus, formatPeriodMonth, type ActionRecord } from "@/workbook/lib/utils";

const tones: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-700",
  "In Progress": "bg-[#E0F7FA] text-[#007A91]",
  "At Risk": "bg-amber-100 text-amber-900",
  Overdue: "bg-red-100 text-red-800",
  Extended: "bg-violet-100 text-violet-800",
  "Awaiting sign-off": "bg-sky-100 text-sky-900",
  Completed: "bg-emerald-100 text-emerald-800",
};
export function StatusBadge({ action }: { action: ActionRecord }) {
  const status = effectiveStatus(action);
  return <strong className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", tones[status])}>{status}</strong>;
}

/** Marks a recurring compliance task (and its month) apart from one-off actions. */
export function RecurrenceBadge({ action, showMonth = false }: { action: ActionRecord; showMonth?: boolean }) {
  if (action.recurrence !== "monthly") return null;
  return (
    <small className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800" title={`Repeats monthly, due on day ${action.recurrence_day}`}>
      <Repeat className="size-3" aria-hidden />
      {showMonth && action.period_month ? formatPeriodMonth(action.period_month) : "Monthly"}
    </small>
  );
}

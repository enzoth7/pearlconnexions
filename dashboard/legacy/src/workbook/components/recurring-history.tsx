"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { setRecurrenceActive } from "@/workbook/actions";
import { StatusBadge } from "@/workbook/components/status-badge";
import { effectiveStatus, formatDate, formatPeriodMonth, signedOffLate, type ActionRecord } from "@/workbook/lib/utils";

/** Month-by-month record of a recurring compliance task, with its sign-offs. */
export function RecurringHistory({
  occurrences,
  currentId,
  canEdit,
}: {
  occurrences: ActionRecord[];
  currentId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const root = occurrences.find((item) => !item.series_id) ?? occurrences[0];
  if (!root) return null;
  const active = root.recurrence_active !== false;
  const late = occurrences.filter((item) => effectiveStatus(item) === "Overdue" || signedOffLate(item)).length;

  function toggle() {
    const form = new FormData();
    form.set("series_id", root.id);
    form.set("active", String(!active));
    start(async () => {
      const result = await setRecurrenceActive(form);
      setMessage(result.message ?? "");
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="card p-5" aria-label="Monthly history">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <Repeat size={16} aria-hidden /> Monthly history
          </h2>
          <div className="mt-1 text-sm text-slate-500">
            Due on day {root.recurrence_day} of every month{active ? "" : " (no longer repeating)"}.{" "}
            {late ? `${late} of ${occurrences.length} months were late or are overdue.` : "No late months so far."}
          </div>
        </div>
        {canEdit && (
          <button type="button" className="btn" disabled={pending} onClick={toggle}>
            {pending ? "Saving…" : active ? "Stop repeating" : "Repeat again"}
          </button>
        )}
      </div>
      {message && <div className="mt-3 text-sm text-slate-600" role="status">{message}</div>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4">Month</th>
              <th className="py-2 pr-4">Deadline</th>
              <th className="py-2 pr-4">Completed</th>
              <th className="py-2 pr-4">Signed off</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {occurrences.map((item) => {
              const signoff = item.signoffs?.[0];
              return (
                <tr key={item.id} className={item.id === currentId ? "border-t border-slate-200 bg-slate-50" : "border-t border-slate-200"}>
                  <td className="py-2 pr-4 font-semibold">
                    <Link className="text-[#007A91] hover:underline" href={`/workbook/actions/${item.id}`}>
                      {formatPeriodMonth(item.period_month)}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{formatDate(item.extended_deadline || item.deadline)}</td>
                  <td className="py-2 pr-4">{item.completed_at ? formatDate(item.completed_at) : "Not yet"}</td>
                  <td className="py-2 pr-4">
                    {signoff ? `${signoff.signed_off_by_name}, ${formatDate(signoff.signed_off_at.slice(0, 10))}` : "Not yet"}
                    {signedOffLate(item) && <small className="ml-2 text-xs font-bold text-red-700">Late</small>}
                  </td>
                  <td className="py-2"><StatusBadge action={item} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

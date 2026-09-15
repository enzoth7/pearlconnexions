import Link from "next/link";
import { Calendar, Eye } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getActions, requireAuth } from "@/lib/data";
import { effectiveStatus, formatDate } from "@/lib/utils";

export default async function ReviewsPage() {
  const { isManager } = await requireAuth();
  const allActions = await getActions();
  const activeActions = allActions.filter(
    (a) => !a.completed_at && !a.signoffs?.length && effectiveStatus(a) !== "Completed"
  );
  const updates = activeActions
    .flatMap((a) => (a.updates || []).map((u) => ({ ...u, action: a })))
    .sort((a, b) => b.review_date.localeCompare(a.review_date));

  return (
    <>
      <PageHeader
        title="Monthly review"
        description={
          isManager
            ? "Active comments, barriers and upcoming review dates for your assigned actions."
            : "Active leadership comments, barriers and upcoming review dates across all actions."
        }
      />
      <section className="card p-5">
        {updates.length ? (
          <div className="divide-y divide-slate-100">
            {updates.map((u) => {
              const owners = u.action.participants
                .filter((p) => p.responsibility_type !== "Support")
                .map((p) => p.manager.name);
              const ownerText = owners.length
                ? owners.join(", ")
                : u.action.participants[0]?.manager.name || "Unassigned";

              const priority = u.action.priority || "Unassigned";
              const priorityTone =
                priority === "High"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : priority === "Medium"
                  ? "bg-amber-50 text-amber-900 border border-amber-200"
                  : priority === "Low"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-slate-100 text-slate-600";

              const deadlineText = formatDate(u.action.extended_deadline || u.action.deadline);

              return (
                <article key={u.id} className="py-5 first:pt-1 last:pb-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue-800">
                          {u.action.reference}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          Review date: {formatDate(u.review_date)}
                        </span>
                      </div>
                      <Link
                        className="block text-base font-bold text-slate-900 hover:text-blue-800 hover:underline"
                        href={`/actions/${u.action.id}`}
                      >
                        {u.action.title}
                      </Link>
                      {u.action.workstream?.name && (
                        <p className="text-xs text-slate-500">{u.action.workstream.name}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-900 border border-blue-200">
                        <Calendar size={13} className="text-blue-600" />
                        Next review: {formatDate(u.next_review_at)}
                      </span>
                      <Link
                        href={`/actions/${u.action.id}`}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                      >
                        <Eye size={13} /> View
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Owner:</span>
                      <span className="font-bold text-slate-800">{ownerText}</span>
                    </div>

                    <span className="text-slate-200">|</span>

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Priority:</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${priorityTone}`}>
                        {priority}
                      </span>
                    </div>

                    <span className="text-slate-200">|</span>

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Status:</span>
                      <StatusBadge action={u.action} />
                    </div>

                    <span className="text-slate-200">|</span>

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Deadline:</span>
                      <span className="font-semibold text-slate-800">{deadlineText}</span>
                    </div>
                  </div>

                  {(u.comments || u.barriers || u.follow_up) && (
                    <div className="mt-3.5 rounded-lg bg-slate-50 p-3.5 space-y-2 text-sm border border-slate-100">
                      {u.comments && (
                        <p className="text-slate-700 leading-6">
                          <strong className="text-slate-900 font-semibold">Comments:</strong>{" "}
                          {u.comments}
                        </p>
                      )}
                      {u.barriers && (
                        <p className="text-amber-900 leading-6">
                          <strong className="font-semibold">Barrier:</strong> {u.barriers}
                        </p>
                      )}
                      {u.follow_up && (
                        <p className="text-slate-700 leading-6">
                          <strong className="text-slate-900 font-semibold">Follow up:</strong>{" "}
                          {u.follow_up}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-14 text-center">
            <h2 className="font-bold text-slate-900">No active review entries</h2>
            <p className="mt-2 text-sm text-slate-500">
              Open an active action to record review notes and next dates.
            </p>
            <Link className="btn btn-primary mt-5" href="/actions">
              Open register
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

import Link from "next/link";
import { Calendar, Eye, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { ReviewFilters } from "@/components/review-filters";
import { StatusBadge } from "@/components/status-badge";
import { getActions, requireAuth } from "@/lib/data";
import { effectiveStatus, formatDate } from "@/lib/utils";

type ReviewSearchParams = {
  q?: string | string[];
  manager?: string | string[];
  workstream?: string | string[];
  status?: string | string[];
  priority?: string | string[];
  timing?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<ReviewSearchParams>;
}) {
  const { isManager } = await requireAuth();
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const managerId = firstValue(params.manager);
  const workstreamId = firstValue(params.workstream);
  const status = firstValue(params.status);
  const priorityFilter = firstValue(params.priority);
  const timing = firstValue(params.timing);
  const hasFilters = Boolean(query || managerId || workstreamId || status || priorityFilter || timing);
  const allActions = await getActions();
  const activeActions = allActions.filter(
    (a) => !a.completed_at && !a.signoffs?.length && effectiveStatus(a) !== "Completed"
  );
  const updates = activeActions
    .flatMap((a) => (a.updates || []).map((u) => ({ ...u, action: a })))
    .sort((a, b) => b.review_date.localeCompare(a.review_date));
  const managers = Array.from(
    new Map(
      activeActions.flatMap((action) => action.participants.map((participant) => [participant.manager.id, participant.manager] as const))
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const workstreams = Array.from(
    new Map(
      activeActions
        .filter((action) => action.workstream)
        .map((action) => [action.workstream!.id, action.workstream!] as const)
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const nextWeek = addDays(today, 7);
  const normalizedQuery = query.toLocaleLowerCase();
  const filteredUpdates = updates.filter((update) => {
    const action = update.action;
    const matchesQuery = !normalizedQuery || [
      action.reference,
      action.title,
      action.workstream?.name,
      update.comments,
      update.barriers,
      update.follow_up,
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    const matchesManager = !managerId || action.participants.some((participant) => participant.manager.id === managerId);
    const matchesWorkstream = !workstreamId || action.workstream_id === workstreamId;
    const matchesStatus = !status || effectiveStatus(action) === status;
    const matchesPriority = !priorityFilter || (action.priority || "Unassigned") === priorityFilter;
    const nextReview = update.next_review_at;
    const matchesTiming =
      !timing ||
      (timing === "overdue" && Boolean(nextReview && nextReview < today)) ||
      (timing === "next-7-days" && Boolean(nextReview && nextReview >= today && nextReview <= nextWeek)) ||
      (timing === "scheduled" && Boolean(nextReview)) ||
      (timing === "not-set" && !nextReview);

    return matchesQuery && matchesManager && matchesWorkstream && matchesStatus && matchesPriority && matchesTiming;
  });

  return (
    <>
      <PageHeader
        title="Action review"
        description={
          isManager
            ? "Review comments, barriers and upcoming dates across your reporting line."
            : "Review comments, barriers and upcoming dates across all active actions."
        }
      />
      <ReviewFilters
        key={[query, managerId, workstreamId, status, priorityFilter, timing].join("|")}
        managers={managers}
        workstreams={workstreams}
        values={{ query, managerId, workstreamId, status, priority: priorityFilter, timing }}
        hasFilters={hasFilters}
      />
      <section className="card p-5">
        {filteredUpdates.length ? (
          <div className="divide-y divide-slate-100">
            {filteredUpdates.map((u) => {
              const owners = u.action.participants
                .filter((p) => p.responsibility_type !== "Support")
                .map((p) => p.manager.name);
              const ownerText = owners.length
                ? owners.join(", ")
                : "Unassigned";

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
                <article key={u.id} className="py-2.5 first:pt-0 last:pb-0">
                  <details className="group rounded-xl transition-colors open:bg-slate-50/70">
                    <summary className="flex min-h-24 cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-3 py-4 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                          <span className="shrink-0 font-mono text-sm font-bold text-[#007A91]">
                            {u.action.reference}
                          </span>
                          <h2 className="min-w-0 flex-1 text-base font-bold leading-6 text-slate-900">
                            {u.action.title}
                          </h2>
                        </div>

                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#0097B2]/30 bg-[#E0F7FA] px-2.5 py-1.5 text-xs font-semibold text-[#007A91] sm:hidden">
                          <Calendar aria-hidden="true" className="text-[#0097B2]" size={14} />
                          Next review: {formatDate(u.next_review_at)}
                        </span>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-500">Manager:</span>
                            <span className="font-bold text-slate-800">{ownerText}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-500">Priority:</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${priorityTone}`}>
                              {priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-500">Status:</span>
                            <StatusBadge action={u.action} />
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden items-center gap-1.5 rounded-md border border-[#0097B2]/30 bg-[#E0F7FA] px-2.5 py-1.5 text-xs font-semibold text-[#007A91] sm:inline-flex">
                          <Calendar aria-hidden="true" className="text-[#0097B2]" size={14} />
                          Next review: {formatDate(u.next_review_at)}
                        </span>
                        <span
                          className="flex h-11 w-8 items-center justify-center text-[#007A91] transition-transform group-open:rotate-45"
                          aria-hidden="true"
                        >
                          <Plus size={24} />
                        </span>
                      </div>
                    </summary>

                    <div className="border-t border-slate-200 px-3 py-4">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
                        <span><strong className="text-slate-800">Review date:</strong> {formatDate(u.review_date)}</span>
                        <span><strong className="text-slate-800">Workstream:</strong> {u.action.workstream?.name || "Unassigned"}</span>
                        <span><strong className="text-slate-800">Deadline:</strong> {deadlineText}</span>
                      </div>

                      {(u.comments || u.barriers || u.follow_up) && (
                        <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-white p-3.5 text-sm">
                          {u.comments && (
                            <p className="leading-6 text-slate-700">
                              <strong className="font-semibold text-slate-900">Comments:</strong> {u.comments}
                            </p>
                          )}
                          {u.barriers && (
                            <p className="leading-6 text-amber-900">
                              <strong className="font-semibold">Barrier:</strong> {u.barriers}
                            </p>
                          )}
                          {u.follow_up && (
                            <p className="leading-6 text-slate-700">
                              <strong className="font-semibold text-slate-900">Follow up:</strong> {u.follow_up}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex justify-end">
                        <Link
                          href={`/actions/${u.action.id}`}
                          className="btn btn-secondary text-sm"
                        >
                          <Eye aria-hidden="true" size={16} /> View action
                        </Link>
                      </div>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        ) : hasFilters && updates.length ? (
          <div className="py-14 text-center">
            <h2 className="font-bold text-slate-900">No reviews match these filters</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Try broadening the search or removing one of the selected filters.
            </p>
            <Link className="btn btn-secondary mt-5" href="/reviews">
              <X aria-hidden="true" size={16} /> Clear filters
            </Link>
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

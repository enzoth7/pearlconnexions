import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  ActionForm,
  ParticipantsManager,
  ReviewHistoryList,
  SignOffCard,
  UpdateForm,
} from "@/components/action-forms";
import { PageHeader } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getActionById, getManagers, getWorkstreams, requireAuth } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function ActionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [auth, action, managers, workstreams] = await Promise.all([
    requireAuth(),
    getActionById(id),
    getManagers(),
    getWorkstreams(),
  ]);

  if (!action) notFound();

  const editableManagerIds = new Set(managers.map((manager) => manager.id));
  const isInManagerScope = auth.isManager && (
      action.created_by === auth.profile.id ||
      action.participants.some(
        (participant) =>
          participant.responsibility_type !== "Support" &&
          editableManagerIds.has(participant.manager.id)
      )
    );
  const canEdit = auth.isDirector || (auth.canEditActions && isInManagerScope);
  const canReassign = auth.isDirector || (auth.canReassignActions && isInManagerScope);
  const canSignOff = auth.isDirector || (auth.canSignOffActions && isInManagerScope);
  const readOnly = !canEdit;
  const latestNextReview = action.updates?.find((u) => u.next_review_at)?.next_review_at;

  return (
    <>
      <Link
        href="/actions"
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#007A91] hover:text-[#0097B2] hover:underline"
      >
        <ArrowLeft size={17} /> Back to register
      </Link>

      <PageHeader
        title={action.title}
        description="Review ownership, deadlines and delivery evidence."
        action={<StatusBadge action={action} />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <div className="space-y-5">
          <ActionForm action={action} workstreams={workstreams} managers={managers} readOnly={readOnly} canReassign={canReassign} canSignOff={canSignOff} />
          <UpdateForm actionId={action.id} readOnly={readOnly} />
        </div>

        <aside className="space-y-5">
          <ParticipantsManager action={action} managers={managers} readOnly={!canReassign} />

          <section className="card p-5">
            <h2 className="font-bold text-slate-900">Dates</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Added</dt>
                <dd className="mt-1 font-semibold text-slate-800">{formatDate(action.date_added)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Deadline</dt>
                <dd className="mt-1 font-semibold text-slate-800">{formatDate(action.deadline)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Extended</dt>
                <dd className="mt-1 font-semibold text-slate-800">{formatDate(action.extended_deadline)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Next review</dt>
                <dd className="mt-1 font-semibold text-slate-800">{formatDate(latestNextReview)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Completed</dt>
                <dd className="mt-1 font-semibold text-slate-800">{formatDate(action.completed_at)}</dd>
              </div>
            </dl>
          </section>

          <SignOffCard action={action} readOnly={!canSignOff} />
        </aside>
      </div>

      <ReviewHistoryList action={action} readOnly={readOnly} />
    </>
  );
}

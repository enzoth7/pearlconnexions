"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Plus, Trash2, Edit2, X, CheckCircle2 } from "lucide-react";
import {
  addUpdate,
  deleteReview,
  removeParticipant,
  saveParticipant,
  signOffAction,
  updateAction,
  updateReview,
  type FormState,
} from "@/app/actions";
import {
  formatDate,
  RESPONSIBILITY_TYPES,
  type ActionRecord,
  type Manager,
  type Participant,
  type UpdateRecord,
  type Workstream,
} from "@/lib/utils";

const initial: FormState = {};

function Result({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={`rounded-lg p-3 text-sm font-semibold ${
        state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </p>
  );
}

export function ActionForm({
  action,
  workstreams,
  managers,
  readOnly = false,
}: {
  action: ActionRecord;
  workstreams: Workstream[];
  managers?: Manager[];
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateAction, initial);
  const currentOwner = action.participants.find((p) => p.responsibility_type !== "Support");
  const currentSupport = action.participants.find((p) => p.responsibility_type === "Support");

  if (readOnly) {
    const workstream = workstreams.find((item) => item.id === action.workstream_id)?.name || "—";
    return (
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Action details</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            View only
          </span>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Required outcome</dt>
            <dd className="mt-1 font-semibold leading-6 text-slate-900">{action.title}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Workstream</dt>
            <dd className="mt-1 font-semibold text-slate-800">{workstream}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Priority</dt>
            <dd className="mt-1 font-semibold text-slate-800">{action.priority || "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Base status</dt>
            <dd className="mt-1 font-semibold text-slate-800">{action.base_status}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Lead manager</dt>
            <dd className="mt-1 font-semibold text-slate-800">{currentOwner?.manager.name || "Unassigned"}</dd>
          </div>
          {currentSupport && (
            <div>
              <dt className="text-slate-500">Support manager</dt>
              <dd className="mt-1 font-semibold text-slate-800">{currentSupport.manager.name}</dd>
            </div>
          )}
        </dl>
      </section>
    );
  }

  return (
    <form action={formAction} className="card p-5">
      <input type="hidden" name="id" value={action.id} />
      <h2 className="text-lg font-bold">Action settings</h2>
      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="title">
            Required outcome
          </label>
          <textarea
            className="field min-h-28"
            id="title"
            name="title"
            defaultValue={action.title}
            required
            minLength={5}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="workstream_id">
              Workstream
            </label>
            <select
              className="field"
              id="workstream_id"
              name="workstream_id"
              defaultValue={action.workstream_id}
              required
            >
              {workstreams.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="priority">
              Priority
            </label>
            <select
              className="field"
              id="priority"
              name="priority"
              defaultValue={action.priority || ""}
            >
              <option value="">Unassigned</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          {managers && managers.length > 0 && (
            <>
              <div>
                <label className="label" htmlFor="action-owner">
                  Lead Manager (Owner)
                </label>
                <select
                  className="field"
                  id="action-owner"
                  name="manager_id"
                  defaultValue={currentOwner?.manager.id || ""}
                >
                  <option value="">Unassigned</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="action-support">
                  Support Manager
                </label>
                <select
                  className="field"
                  id="action-support"
                  name="support_manager_id"
                  defaultValue={currentSupport?.manager.id || ""}
                >
                  <option value="">None</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="label" htmlFor="base_status">
              Base status
            </label>
            <select
              className="field"
              id="base_status"
              name="base_status"
              defaultValue={action.base_status}
            >
              <option>Not Started</option>
              <option>In Progress</option>
              <option>At Risk</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="deadline">
              Deadline
            </label>
            <input
              className="field"
              id="deadline"
              type="date"
              name="deadline"
              defaultValue={action.deadline || ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="extended_deadline">
              Extended deadline
            </label>
            <input
              className="field"
              id="extended_deadline"
              type="date"
              name="extended_deadline"
              defaultValue={action.extended_deadline || ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="completed_at">
              Date completed
            </label>
            <input
              className="field"
              id="completed_at"
              type="date"
              name="completed_at"
              defaultValue={action.completed_at || ""}
            />
          </div>
        </div>
        <Result state={state} />
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save action"}
        </button>
      </div>
    </form>
  );
}

export function UpdateForm({ actionId, readOnly = false }: { actionId: string; readOnly?: boolean }) {
  const [state, formAction, pending] = useActionState(addUpdate, initial);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  if (readOnly) return null;
  return (
    <form action={formAction} className="card p-5">
      <input type="hidden" name="action_id" value={actionId} />
      <h2 className="text-lg font-bold">Add review entry</h2>
      <p className="mt-1 text-sm text-slate-500">
        Record the current position. Leave fields blank when they do not apply.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="review_date">
            Review date
          </label>
          <input
            className="field"
            id="review_date"
            type="date"
            name="review_date"
            defaultValue={today}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="next_review_at">
            Next review
          </label>
          <input className="field" id="next_review_at" type="date" name="next_review_at" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="comments">
            Comments
          </label>
          <textarea
            className="field min-h-24"
            id="comments"
            name="comments"
            placeholder="Key progress updates, status notes or achievements…"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="barriers">
            Barriers
          </label>
          <textarea
            className="field min-h-20"
            id="barriers"
            name="barriers"
            placeholder="Any blockers, risks or dependencies affecting progress…"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="follow_up">
            Follow up
          </label>
          <textarea
            className="field min-h-20"
            id="follow_up"
            name="follow_up"
            placeholder="Next steps, action items or follow-up milestones…"
          />
        </div>
      </div>
      <div className="mt-4">
        <Result state={state} />
      </div>
      <button className="btn btn-primary mt-4" disabled={pending}>
        {pending ? "Adding…" : "Add review entry"}
      </button>
    </form>
  );
}

export function ParticipantsManager({
  action,
  managers,
  readOnly = false,
}: {
  action: ActionRecord;
  managers: Manager[];
  readOnly?: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">Responsibility</h2>
        {!readOnly && !isAdding && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:underline cursor-pointer"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={14} /> Add participant
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {action.participants.map((p) => (
          <ParticipantItem
            key={p.id}
            participant={p}
            actionId={action.id}
            managers={managers}
            readOnly={readOnly}
          />
        ))}

        {!action.participants.length && !isAdding && (
          <p className="text-sm text-slate-500">No participants assigned to this action.</p>
        )}

        {isAdding && (
          <AddParticipantForm
            actionId={action.id}
            managers={managers}
            onClose={() => setIsAdding(false)}
          />
        )}
      </div>
    </section>
  );
}

function ParticipantItem({
  participant,
  actionId,
  managers,
  readOnly,
}: {
  participant: Participant;
  actionId: string;
  managers: Manager[];
  readOnly: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(saveParticipant, initial);

  if (isEditing && !readOnly) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setIsEditing(false);
        }}
        className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-3"
      >
        <input type="hidden" name="id" value={participant.id} />
        <input type="hidden" name="action_id" value={actionId} />

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label text-xs" htmlFor={`edit-mgr-${participant.id}`}>
              Manager
            </label>
            <select
              className="field text-sm"
              id={`edit-mgr-${participant.id}`}
              name="manager_id"
              defaultValue={participant.manager.id}
              required
            >
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs" htmlFor={`edit-type-${participant.id}`}>
              Type
            </label>
            <select
              className="field text-sm"
              id={`edit-type-${participant.id}`}
              name="responsibility_type"
              defaultValue={participant.responsibility_type}
              required
            >
              {RESPONSIBILITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label text-xs" htmlFor={`edit-desc-${participant.id}`}>
            Responsibility description
          </label>
          <textarea
            className="field min-h-16 text-sm"
            id={`edit-desc-${participant.id}`}
            name="responsibility_text"
            defaultValue={participant.responsibility_text}
            required
          />
        </div>

        <Result state={state} />

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            className="btn btn-secondary text-xs h-8 px-3"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary text-xs h-8 px-3"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group rounded-lg border border-slate-100 p-3 hover:border-slate-200 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{participant.manager.name}</p>
          {participant.manager.role_title && (
            <p className="text-xs text-slate-500">{participant.manager.role_title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
            {participant.responsibility_type}
          </span>
          {!readOnly && (
            <>
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-blue-800 cursor-pointer"
                onClick={() => setIsEditing(true)}
                aria-label={`Edit ${participant.manager.name}`}
              >
                <Edit2 size={13} />
              </button>
              <form
                action={removeParticipant}
                onSubmit={(e) => {
                  if (!window.confirm(`Remove ${participant.manager.name} from this action?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={participant.id} />
                <input type="hidden" name="action_id" value={actionId} />
                <button
                  type="submit"
                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  aria-label={`Remove ${participant.manager.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">
        {participant.responsibility_text}
      </p>
    </div>
  );
}

function AddParticipantForm({
  actionId,
  managers,
  onClose,
}: {
  actionId: string;
  managers: Manager[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveParticipant, initial);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onClose();
      }}
      className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3"
    >
      <div className="flex items-center justify-between pb-1 border-b border-blue-200/60">
        <h3 className="text-xs font-bold text-blue-900">
          Add participant
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      <input type="hidden" name="action_id" value={actionId} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="label text-xs" htmlFor="add-part-mgr">
            Manager
          </label>
          <select
            className="field text-sm"
            id="add-part-mgr"
            name="manager_id"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select manager
            </option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label text-xs" htmlFor="add-part-type">
            Responsibility type
          </label>
          <select
            className="field text-sm"
            id="add-part-type"
            name="responsibility_type"
            defaultValue="Owner"
            required
          >
            {RESPONSIBILITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label text-xs" htmlFor="add-part-desc">
          Responsibility description
        </label>
        <textarea
          className="field min-h-16 text-sm"
          id="add-part-desc"
          name="responsibility_text"
          placeholder="e.g. Lead delivery and coordinate workstream milestones"
          required
        />
      </div>

      <Result state={state} />

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          className="btn btn-secondary text-xs h-8 px-3"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary text-xs h-8 px-3"
          disabled={pending}
        >
          {pending ? "Adding…" : "Add participant"}
        </button>
      </div>
    </form>
  );
}

export function ReviewHistoryList({
  action,
  readOnly = false,
}: {
  action: ActionRecord;
  readOnly?: boolean;
}) {
  if (!action.updates?.length) {
    return (
      <section className="mt-5 card p-5">
        <h2 className="text-lg font-bold">Review history</h2>
        <p className="mt-4 text-sm text-slate-500">No review entries yet.</p>
      </section>
    );
  }

  const sorted = [...action.updates].sort((a, b) =>
    b.review_date.localeCompare(a.review_date)
  );

  return (
    <section className="mt-5 card p-5">
      <h2 className="text-lg font-bold">Review history</h2>
      <div className="mt-4 space-y-4">
        {sorted.map((u) => (
          <ReviewItem key={u.id} update={u} actionId={action.id} readOnly={readOnly} />
        ))}
      </div>
    </section>
  );
}

function ReviewItem({
  update,
  actionId,
  readOnly,
}: {
  update: UpdateRecord;
  actionId: string;
  readOnly: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateReview, initial);

  if (isEditing && !readOnly) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setIsEditing(false);
        }}
        className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-4"
      >
        <input type="hidden" name="id" value={update.id} />
        <input type="hidden" name="action_id" value={actionId} />

        <div className="flex items-center justify-between border-b border-blue-200 pb-2">
          <h3 className="text-sm font-bold text-blue-900">Edit review entry</h3>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label text-xs" htmlFor={`edit-rev-date-${update.id}`}>
              Review date
            </label>
            <input
              className="field text-sm"
              id={`edit-rev-date-${update.id}`}
              type="date"
              name="review_date"
              defaultValue={update.review_date}
              required
            />
          </div>

          <div>
            <label className="label text-xs" htmlFor={`edit-next-rev-${update.id}`}>
              Next review
            </label>
            <input
              className="field text-sm"
              id={`edit-next-rev-${update.id}`}
              type="date"
              name="next_review_at"
              defaultValue={update.next_review_at || ""}
            />
          </div>

          {[
            ["comments", "Comments"],
            ["barriers", "Barriers"],
            ["outcome", "Outcome"],
            ["evidence", "Evidence"],
            ["lessons_learned", "Lessons learned"],
            ["follow_up", "Follow up"],
            ["directors_comments", "Director's comments"],
          ].map(([name, label]) => (
            <div
              key={name}
              className={
                name === "comments" || name === "directors_comments"
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <label className="label text-xs" htmlFor={`edit-${name}-${update.id}`}>
                {label}
              </label>
              <textarea
                className="field min-h-20 text-sm"
                id={`edit-${name}-${update.id}`}
                name={name}
                defaultValue={(update as unknown as Record<string, string | null>)[name] || ""}
              />
            </div>
          ))}
        </div>

        <Result state={state} />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200/60">
          <button
            type="button"
            className="btn btn-secondary text-xs h-9 px-3"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary text-xs h-9 px-4"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="border-l-2 border-blue-200 pl-4 py-1">
      <div className="flex items-center justify-between gap-2">
        {!readOnly && <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-900">{formatDate(update.review_date)}</p>
          {update.next_review_at && (
            <span className="text-xs text-slate-500">
              (Next: {formatDate(update.next_review_at)})
            </span>
          )}
        </div>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:underline cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 size={12} /> Edit
          </button>
          <span className="text-slate-300">|</span>
          <form
            action={deleteReview}
            onSubmit={(e) => {
              if (!window.confirm("Are you sure you want to delete this review entry?")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={update.id} />
            <input type="hidden" name="action_id" value={actionId} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline cursor-pointer"
            >
              <Trash2 size={12} /> Delete
            </button>
          </form>
        </div>
      </div>

      {update.comments && <p className="mt-2 text-sm leading-6 text-slate-800">{update.comments}</p>}
      {update.barriers && (
        <p className="mt-2 text-sm leading-6 text-slate-800">
          <strong>Barriers:</strong> {update.barriers}
        </p>
      )}
      {update.outcome && (
        <p className="mt-2 text-sm leading-6 text-slate-800">
          <strong>Outcome:</strong> {update.outcome}
        </p>
      )}
      {update.evidence && (
        <p className="mt-2 text-sm leading-6 text-slate-800">
          <strong>Evidence:</strong> {update.evidence}
        </p>
      )}
      {update.lessons_learned && (
        <p className="mt-2 text-sm leading-6 text-slate-800">
          <strong>Lessons learned:</strong> {update.lessons_learned}
        </p>
      )}
      {update.follow_up && (
        <p className="mt-2 text-sm leading-6 text-slate-800">
          <strong>Follow up:</strong> {update.follow_up}
        </p>
      )}
      {update.directors_comments && (
        <p className="mt-2 text-sm leading-6 text-slate-800">
          <strong>Director&apos;s comments:</strong> {update.directors_comments}
        </p>
      )}
    </article>
  );
}

export function SignOffCard({
  action,
  readOnly = false,
}: {
  action: ActionRecord;
  readOnly?: boolean;
}) {
  const signed = Boolean(action.signoffs?.length || action.completed_at);
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(signOffAction, initial);

  const leadOwner =
    action.participants.find((p) => p.responsibility_type !== "Support")?.manager.name ||
    action.participants[0]?.manager.name ||
    "Lead Manager";

  const options =
    leadOwner && leadOwner !== "Joel Samuel"
      ? [leadOwner, "Joel Samuel", `${leadOwner} / Joel Samuel`]
      : ["Joel Samuel", "Lead Manager", "Joel Samuel / Lead Manager"];

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const signer =
    action.signoffs?.[0]?.signed_off_by_name ||
    (leadOwner !== "Lead Manager" ? `${leadOwner} / Joel Samuel` : "Joel Samuel");
  const signDate = action.signoffs?.[0]?.signed_off_at?.slice(0, 10) || action.completed_at;

  if (readOnly && !signed) {
    return (
      <section className="card p-5">
        <h2 className="font-bold text-slate-900">Sign-off</h2>
        <p className="mt-4 text-sm text-slate-500">This action has not been signed off yet.</p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">Sign-off</h2>
        {!readOnly && signed && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-bold text-blue-800 hover:underline cursor-pointer"
          >
            Change
          </button>
        )}
      </div>

      {signed && !isEditing ? (
        <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
          <p className="flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircle2 size={18} className="text-emerald-600" /> Signed off
          </p>
          <div className="mt-2 space-y-1 text-xs text-emerald-950">
            <p>
              <span className="font-semibold text-emerald-900">Signed off by:</span>{" "}
              {signer}
            </p>
            <p>
              <span className="font-semibold text-emerald-900">Date signed:</span>{" "}
              {formatDate(signDate)}
            </p>
            {action.completed_at && (
              <p>
                <span className="font-semibold text-emerald-900">Date completed:</span>{" "}
                {formatDate(action.completed_at)}
              </p>
            )}
          </div>
          <p className="mt-3 text-xs text-emerald-700">
            This action is listed in{" "}
            <Link href="/archive" className="font-bold underline hover:text-emerald-900">
              Completed Actions
            </Link>
            .
          </p>
        </div>
      ) : (
        <form
          action={async (formData) => {
            await formAction(formData);
            setIsEditing(false);
          }}
          className="mt-4 space-y-4"
        >
          <input type="hidden" name="action_id" value={action.id} />

          <div>
            <label className="label text-xs font-semibold text-slate-700" htmlFor="signed_off_by_name">
              Signed off by
            </label>
            <select
              className="field mt-1 text-sm font-semibold"
              id="signed_off_by_name"
              name="signed_off_by_name"
              defaultValue={action.signoffs?.[0]?.signed_off_by_name || options[0]}
              required
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs font-semibold text-slate-700" htmlFor="signoff_completed_at">
              Date completed
            </label>
            <input
              className="field mt-1 text-sm"
              id="signoff_completed_at"
              type="date"
              name="completed_at"
              defaultValue={action.completed_at || today}
            />
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Signing off marks this action complete and moves it to the archive.
          </p>

          <Result state={state} />

          <div className="flex items-center gap-2 pt-1">
            {isEditing && (
              <button
                type="button"
                className="btn btn-secondary text-xs h-9 px-3 flex-1 cursor-pointer"
                onClick={() => setIsEditing(false)}
                disabled={pending}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary text-xs h-9 px-4 flex-1 cursor-pointer"
              disabled={pending}
            >
              <CheckCircle2 size={16} />
              {pending ? "Signing off…" : "Complete and sign off"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState, useActionState } from "react";
import { X, Trash2 } from "lucide-react";
import { updateAction, deleteAction, type FormState } from "@/app/actions";
import type { ActionRecord, Manager, Workstream } from "@/lib/utils";

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

export function QuickEditDrawer({
  action,
  workstreams,
  managers,
  isOpen,
  onClose,
}: {
  action: ActionRecord | null;
  workstreams: Workstream[];
  managers: Manager[];
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !action) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-edit-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#007A91]">
                  {action.reference}
                </span>
                <h2 id="quick-edit-title" className="text-lg font-bold text-slate-900">
                  Quick edit action
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                onClick={onClose}
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>

            <QuickEditForm
              key={action.id}
              action={action}
              workstreams={workstreams}
              managers={managers}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickEditForm({
  action,
  workstreams,
  managers,
  onClose,
}: {
  action: ActionRecord;
  workstreams: Workstream[];
  managers: Manager[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateAction, initial);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentOwner = action.participants.find((p) => p.responsibility_type !== "Support");
  const currentSupport = action.participants.find((p) => p.responsibility_type === "Support");

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete action ${action.reference}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const fd = new FormData();
      fd.append("id", action.id);
      const res = await deleteAction(fd);
      if (res?.ok === false) {
        alert(res.message || "Failed to delete action");
        setIsDeleting(false);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete action");
      setIsDeleting(false);
    }
  };

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="id" value={action.id} />

      <div>
        <label className="label" htmlFor="quick-title">
          Required outcome
        </label>
        <textarea
          className="field min-h-24"
          id="quick-title"
          name="title"
          defaultValue={action.title}
          required
          minLength={5}
        />
      </div>

      <div>
        <label className="label" htmlFor="quick-workstream">
          Workstream
        </label>
        <select
          className="field"
          id="quick-workstream"
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="quick-owner">
            Lead Manager (Owner)
          </label>
          <select
            className="field"
            id="quick-owner"
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
          <label className="label" htmlFor="quick-support">
            Support Manager
          </label>
          <select
            className="field"
            id="quick-support"
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="quick-priority">
            Priority
          </label>
          <select
            className="field"
            id="quick-priority"
            name="priority"
            defaultValue={action.priority || ""}
          >
            <option value="">Unassigned</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="quick-base-status">
            Base status
          </label>
          <select
            className="field"
            id="quick-base-status"
            name="base_status"
            defaultValue={action.base_status}
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="At Risk">At Risk</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="quick-deadline">
            Deadline
          </label>
          <input
            className="field"
            id="quick-deadline"
            type="date"
            name="deadline"
            defaultValue={action.deadline || ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="quick-extended-deadline">
            Extended deadline
          </label>
          <input
            className="field"
            id="quick-extended-deadline"
            type="date"
            name="extended_deadline"
            defaultValue={action.extended_deadline || ""}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="quick-completed-at">
          Date completed
        </label>
        <input
          className="field"
          id="quick-completed-at"
          type="date"
          name="completed_at"
          defaultValue={action.completed_at || ""}
        />
      </div>

      <div className="pt-2">
        <Result state={state} />
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Trash2 size={14} />
          {isDeleting ? "Deleting…" : "Delete"}
        </button>

        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || isDeleting}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

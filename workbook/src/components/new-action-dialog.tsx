"use client";

import { useEffect, useActionState } from "react";
import { X, Plus } from "lucide-react";
import { createAction, type FormState } from "@/app/actions";
import { RESPONSIBILITY_TYPES, type Manager, type Workstream } from "@/lib/utils";

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

export function NewActionDialog({
  workstreams,
  managers,
  isOpen,
  onClose,
}: {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-action-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <Plus size={20} />
              </div>
              <h2 id="new-action-title" className="text-lg font-bold text-slate-900">
                New leadership action
              </h2>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          <NewActionForm
            workstreams={workstreams}
            managers={managers}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

function NewActionForm({
  workstreams,
  managers,
  onClose,
}: {
  workstreams: Workstream[];
  managers: Manager[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createAction, initial);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="new-ref">
            Reference
          </label>
          <input
            className="field font-mono"
            id="new-ref"
            name="reference"
            placeholder="e.g. BD08"
            pattern="[A-Za-z]{2}[0-9]{2}"
            required
            maxLength={4}
          />
          <p className="mt-1 text-xs text-slate-500">2 letters + 2 digits</p>
        </div>

        <div>
          <label className="label" htmlFor="new-workstream">
            Workstream
          </label>
          <select
            className="field"
            id="new-workstream"
            name="workstream_id"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select workstream
            </option>
            {workstreams.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="new-title">
          Required outcome / Action description
        </label>
        <textarea
          className="field min-h-24"
          id="new-title"
          name="title"
          placeholder="Describe the action outcome..."
          required
          minLength={5}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="new-priority">
            Priority
          </label>
          <select className="field" id="new-priority" name="priority" defaultValue="">
            <option value="">Unassigned</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="new-deadline">
            Deadline
          </label>
          <input className="field" id="new-deadline" type="date" name="deadline" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-sm font-bold text-slate-800">Ownership &amp; Support</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Assign the lead manager in charge and optionally another manager who provides support.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="new-manager">
              Lead Manager (Owner)
            </label>
            <select className="field" id="new-manager" name="manager_id" defaultValue="">
              <option value="">Unassigned</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="new-support-manager">
              Support Manager
            </label>
            <select className="field" id="new-support-manager" name="support_manager_id" defaultValue="">
              <option value="">None</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Result state={state} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {state.ok ? "Close" : "Cancel"}
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create action"}
        </button>
      </div>
    </form>
  );
}

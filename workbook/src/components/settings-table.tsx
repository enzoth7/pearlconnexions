"use client";

import { useState, useTransition } from "react";
import { KeyRound, Mail, Trash2, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { createManager, updateManagerCredentials, deleteManager } from "@/app/actions";
import type { ManagerWithProfile } from "@/lib/data";

export function SettingsTable({ managers }: { managers: ManagerWithProfile[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<ManagerWithProfile | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Leadership Team & User Logins</h2>
          <p className="text-sm text-slate-500">
            Configure access for managers. Managers will only see actions and reviews assigned to them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="btn btn-primary inline-flex items-center gap-2 cursor-pointer"
        >
          <UserPlus size={16} />
          Add Manager
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Manager</th>
                <th className="px-6 py-3.5">Role Title</th>
                <th className="px-6 py-3.5">Email / Login</th>
                <th className="px-6 py-3.5">Access Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {managers.map((m) => {
                const hasAccount = Boolean(m.profile_id);
                return (
                  <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#E0F7FA] font-bold text-[#007A91] text-sm border border-[#0097B2]/20">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{m.name}</p>
                          <p className="text-xs font-mono text-slate-400">Code: {m.source_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {m.role_title || <span className="text-slate-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {m.email ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <Mail size={13} className="text-slate-400" />
                          {m.email}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No email assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasAccount ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <UserCheck size={12} />
                          Active login
                        </span>
                      ) : m.email ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                          <KeyRound size={12} />
                          Needs password
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          <UserX size={12} />
                          No login
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingManager(m)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                        >
                          <KeyRound size={13} />
                          {hasAccount ? "Edit / Password" : "Set login"}
                        </button>
                        <DeleteManagerButton managerId={m.id} managerName={m.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manager Modal */}
      {isAddOpen && <AddManagerModal onClose={() => setIsAddOpen(false)} />}

      {/* Edit Credentials Modal */}
      {editingManager && (
        <EditManagerModal manager={editingManager} onClose={() => setEditingManager(null)} />
      )}
    </div>
  );
}

function DeleteManagerButton({ managerId, managerName }: { managerId: string; managerName: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          window.confirm(
            `Are you sure you want to delete manager "${managerName}"? This will unlink their user account.`
          )
        ) {
          startTransition(async () => {
            const fd = new FormData();
            fd.append("manager_id", managerId);
            const res = await deleteManager(fd);
            if (res?.ok === false) {
              alert(res.message || "Failed to delete manager");
            }
          });
        }
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 p-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
      title={`Delete ${managerName}`}
      aria-label={`Delete ${managerName}`}
    >
      <Trash2 size={13} />
    </button>
  );
}

function AddManagerModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const res = await createManager(fd);
      if (res?.ok === false) {
        setError(res.message || "Failed to create manager");
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Manager</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {error}
              </p>
            )}

            <div>
              <label className="label" htmlFor="new-mgr-name">
                Full Name
              </label>
              <input
                id="new-mgr-name"
                name="name"
                className="field"
                placeholder="e.g. Mike Wright"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="new-mgr-role">
                Role / Title
              </label>
              <input
                id="new-mgr-role"
                name="role_title"
                className="field"
                placeholder="e.g. Operations Manager"
              />
            </div>

            <div>
              <label className="label" htmlFor="new-mgr-email">
                Email address (for login)
              </label>
              <input
                id="new-mgr-email"
                name="email"
                type="email"
                className="field"
                placeholder="mike.wright@pearlconnexions.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="new-mgr-password">
                Initial Password (optional)
              </label>
              <input
                id="new-mgr-password"
                name="password"
                type="password"
                minLength={6}
                className="field"
                placeholder="At least 6 characters"
              />
              <p className="mt-1 text-xs text-slate-400">
                If entered, a login account will be generated immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? "Adding…" : "Add Manager"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditManagerModal({
  manager,
  onClose,
}: {
  manager: ManagerWithProfile;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("manager_id", manager.id);

    startTransition(async () => {
      const res = await updateManagerCredentials(fd);
      if (res?.ok === false) {
        setError(res.message || "Failed to update credentials");
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-[#007A91]">{manager.source_code}</span>
              <h3 className="text-lg font-bold text-slate-900">Manage {manager.name}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {error}
              </p>
            )}

            <div>
              <label className="label" htmlFor="edit-mgr-name">
                Full Name
              </label>
              <input
                id="edit-mgr-name"
                name="name"
                className="field"
                defaultValue={manager.name}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="edit-mgr-role">
                Role / Title
              </label>
              <input
                id="edit-mgr-role"
                name="role_title"
                className="field"
                defaultValue={manager.role_title || ""}
              />
            </div>

            <div>
              <label className="label" htmlFor="edit-mgr-email">
                Email address
              </label>
              <input
                id="edit-mgr-email"
                name="email"
                type="email"
                className="field"
                defaultValue={manager.email || ""}
                placeholder="manager@pearlconnexions.com"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="edit-mgr-password">
                {manager.profile_id ? "Set New Password" : "Assign Password"}
              </label>
              <input
                id="edit-mgr-password"
                name="password"
                type="password"
                minLength={6}
                className="field"
                placeholder={manager.profile_id ? "Leave blank to keep unchanged" : "At least 6 characters"}
                required={!manager.profile_id}
              />
              <p className="mt-1 text-xs text-slate-400">
                {manager.profile_id
                  ? "Enter a new password to update the manager's login password."
                  : "Sets the login password and activates their user account."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

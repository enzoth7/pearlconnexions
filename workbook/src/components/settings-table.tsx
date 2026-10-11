"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, CornerDownRight, KeyRound, Mail, ShieldCheck, Trash2, User, UserCheck, UserPlus, UsersRound, UserX, X } from "lucide-react";
import { createManager, updateManagerCredentials, deleteManager, setManagerEmployeePermission } from "@/app/actions";
import type { ManagerWithProfile } from "@/lib/data";
import {
  AVATAR_PALETTE,
  getInitials,
  getManagerColorKey,
} from "@/lib/manager-colors";

export function SettingsTable({
  managers,
  currentProfileId,
  currentManagerId,
  isDirector,
  canManageEmployees,
  teamHierarchyReady,
}: {
  managers: ManagerWithProfile[];
  currentProfileId?: string;
  currentManagerId?: string | null;
  isDirector: boolean;
  canManageEmployees: boolean;
  teamHierarchyReady: boolean;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<ManagerWithProfile | null>(null);
  const [managerColors, setManagerColors] = useState<Record<string, string>>({});
  const orderedManagers = useMemo(() => flattenManagerTree(managers), [managers]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pearl_manager_avatar_colors");
      if (stored) {
        // Hydrate the client-only preference after the initial server render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setManagerColors(JSON.parse(stored));
        document.cookie = `pc_manager_colors=${encodeURIComponent(stored)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveColor = (managerId: string, colorKey: string) => {
    setManagerColors((prev) => {
      const next = { ...prev, [managerId]: colorKey };
      try {
        const json = JSON.stringify(next);
        localStorage.setItem("pearl_manager_avatar_colors", json);
        document.cookie = `pc_manager_colors=${encodeURIComponent(json)}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {!teamHierarchyReady && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <div>
            <p className="font-bold">Team hierarchy update pending</p>
            <p className="mt-0.5 text-amber-800">
              Existing managers remain available. Reporting lines and employee-management permissions will activate after the database migration is applied.
            </p>
          </div>
        </div>
      )}
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-center ${isDirector ? "sm:justify-end" : "sm:justify-between"}`}>
        {!isDirector && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Employees & User Logins</h2>
            <p className="text-sm text-slate-500">
              {canManageEmployees
                ? "Add employees and manage the people who report directly to you."
                : "View your reporting line."}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="btn btn-primary inline-flex items-center gap-2 cursor-pointer"
        >
          <UserPlus size={16} />
          {isDirector ? "Add Manager" : "Add Employee"}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Manager</th>
                <th className="px-6 py-3.5">Role / Workbook</th>
                <th className="px-6 py-3.5">System Role</th>
                <th className="px-6 py-3.5">Email / Login</th>
                <th className="px-6 py-3.5">Can manage employees?</th>
                <th className="px-6 py-3.5">Access Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orderedManagers.map(({ manager: m, depth }) => {
                const hasAccount = Boolean(m.profile_id);
                const isSelf = Boolean(
                  (currentManagerId && m.id === currentManagerId) ||
                  (currentProfileId && m.profile_id === currentProfileId)
                );
                const isAdmin = m.profile?.role === "director" || (!m.profile && m.role_title?.toLowerCase() === "director");
                const initials = getInitials(m.name, m.source_code);
                const colorKey = getManagerColorKey(m.id, m.source_code, managerColors);
                const color = AVATAR_PALETTE[colorKey] || AVATAR_PALETTE.teal;
                const canEdit = isDirector || m.parent_manager_id === currentManagerId;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4">
                      <div
                        className="flex items-center gap-3"
                        style={{ paddingLeft: `${Math.min(depth, 4) * 28}px` }}
                      >
                        {depth > 0 && (
                          <CornerDownRight
                            aria-label="Employee"
                            className="shrink-0 text-[#0097B2]"
                            size={17}
                          />
                        )}
                        <div
                          className={`grid h-9 w-9 place-items-center rounded-full font-bold text-sm border shadow-2xs transition-colors ${color.bgClass} ${color.textClass} ${color.borderClass}`}
                          title={`Avatar: ${color.name} (${initials})`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{m.name}</p>
                            {isSelf && (
                              <span className="rounded bg-[#E0F7FA] px-1.5 py-0.5 text-[10px] font-bold text-[#007A91] border border-[#0097B2]/30">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-slate-400">Code: {m.source_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {m.role_title || <span className="text-slate-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200"
                          title="Admin (Director) — Full access to all actions and settings"
                        >
                          <ShieldCheck size={13} className="text-purple-600" />
                          Admin
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                          title="Normal (Manager) — Only assigned actions and reviews"
                        >
                          <User size={13} className="text-slate-500" />
                          Normal
                        </span>
                      )}
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
                      {isAdmin ? (
                        <span className="text-xs font-semibold text-slate-400">Director access</span>
                      ) : isDirector ? (
                        <EmployeePermissionToggle manager={m} schemaReady={teamHierarchyReady} />
                      ) : m.can_manage_employees ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-[#007A91]">
                          <UsersRound size={13} /> Yes
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">No</span>
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
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingManager(m)}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                            >
                              <KeyRound size={13} />
                              {hasAccount ? "Edit / Password" : "Set login"}
                            </button>
                            <DeleteManagerButton
                              managerId={m.id}
                              managerName={m.name}
                              isProtected={isSelf}
                            />
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">—</span>
                        )}
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
      {isAddOpen && (
        <AddManagerModal
          managers={managers}
          isDirector={isDirector}
          teamHierarchyReady={teamHierarchyReady}
          onClose={() => setIsAddOpen(false)}
          onCreated={(newId, colorKey) => {
            if (newId && colorKey) handleSaveColor(newId, colorKey);
          }}
        />
      )}

      {/* Edit Credentials Modal */}
      {editingManager && (
        <EditManagerModal
          manager={editingManager}
          managers={managers}
          isDirector={isDirector}
          teamHierarchyReady={teamHierarchyReady}
          currentColorKey={getManagerColorKey(editingManager.id, editingManager.source_code, managerColors)}
          onSaveColor={(colorKey) => handleSaveColor(editingManager.id, colorKey)}
          isSelf={Boolean(
            (currentManagerId && editingManager.id === currentManagerId) ||
            (currentProfileId && editingManager.profile_id === currentProfileId)
          )}
          onClose={() => setEditingManager(null)}
        />
      )}
    </div>
  );
}

function flattenManagerTree(managers: ManagerWithProfile[]) {
  const knownIds = new Set(managers.map((manager) => manager.id));
  const childrenByParent = new Map<string, ManagerWithProfile[]>();
  const roots: ManagerWithProfile[] = [];

  for (const manager of managers) {
    if (manager.parent_manager_id && knownIds.has(manager.parent_manager_id)) {
      const children = childrenByParent.get(manager.parent_manager_id) ?? [];
      children.push(manager);
      childrenByParent.set(manager.parent_manager_id, children);
    } else {
      roots.push(manager);
    }
  }

  const sortManagers = (items: ManagerWithProfile[]) =>
    items.sort((a, b) => {
      const aDirector = a.profile?.role === "director" || a.role_title?.toLowerCase() === "director";
      const bDirector = b.profile?.role === "director" || b.role_title?.toLowerCase() === "director";
      return Number(bDirector) - Number(aDirector) || a.name.localeCompare(b.name);
    });

  const flattened: Array<{ manager: ManagerWithProfile; depth: number }> = [];
  const visited = new Set<string>();
  const visit = (manager: ManagerWithProfile, depth: number) => {
    if (visited.has(manager.id)) return;
    visited.add(manager.id);
    flattened.push({ manager, depth });
    for (const child of sortManagers(childrenByParent.get(manager.id) ?? [])) {
      visit(child, depth + 1);
    }
  };

  for (const root of sortManagers(roots)) visit(root, 0);
  for (const manager of sortManagers(managers.filter((item) => !visited.has(item.id)))) {
    visit(manager, 0);
  }

  return flattened;
}

function EmployeePermissionToggle({
  manager,
  schemaReady,
}: {
  manager: ManagerWithProfile;
  schemaReady: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const enabled = Boolean(manager.can_manage_employees);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${enabled ? "Disable" : "Enable"} employee management for ${manager.name}`}
      disabled={isPending || !schemaReady}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("manager_id", manager.id);
          formData.set("enabled", String(!enabled));
          const result = await setManagerEmployeePermission(formData);
          if (!result.ok) alert(result.message || "Could not update employee access.");
        });
      }}
      title={!schemaReady ? "Available after the team hierarchy migration" : undefined}
      className={`inline-flex min-h-11 min-w-[88px] items-center justify-start gap-2.5 rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        enabled
          ? "border-cyan-200 bg-cyan-50 text-[#007A91]"
          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${enabled ? "bg-[#0097B2]" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left,right] ${
            enabled ? "right-0.5" : "left-0.5"
          }`}
        />
      </span>
      <span className="min-w-6 text-left">{enabled ? "Yes" : "No"}</span>
    </button>
  );
}

function DeleteManagerButton({
  managerId,
  managerName,
  isProtected,
}: {
  managerId: string;
  managerName: string;
  isProtected?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (isProtected) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs text-slate-300 cursor-not-allowed"
        title="You cannot delete your own active account"
      >
        <Trash2 size={13} />
      </span>
    );
  }

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

function AddManagerModal({
  managers,
  isDirector,
  teamHierarchyReady,
  onClose,
  onCreated,
}: {
  managers: ManagerWithProfile[];
  isDirector: boolean;
  teamHierarchyReady: boolean;
  onClose: () => void;
  onCreated?: (newId: string, colorKey: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState("teal");

  const previewInitials = getInitials(name || "New Manager");
  const color = AVATAR_PALETTE[selectedColor] || AVATAR_PALETTE.teal;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("avatar_color", selectedColor);

    startTransition(async () => {
      const res = await createManager(fd);
      if (res?.ok === false) {
        setError(res.message || "Failed to create manager");
      } else {
        if (onCreated && res.managerId) {
          onCreated(res.managerId, selectedColor);
        }
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
            <h3 className="text-lg font-bold text-slate-900">
              {isDirector ? "Add New Manager" : "Add New Employee"}
            </h3>
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
                placeholder={isDirector ? "e.g. Mike Wright" : "e.g. Alex Morgan"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label">Avatar Color</label>
                <span className="text-xs font-semibold text-slate-500">
                  {color.name}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                {Object.entries(AVATAR_PALETTE).map(([key, opt]) => {
                  const isSelected = selectedColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedColor(key)}
                      className={`relative grid h-7 w-7 place-items-center rounded-full transition-all ${opt.dotClass} cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-slate-800 ring-offset-2 scale-110 shadow-xs"
                          : "opacity-80 hover:opacity-100 hover:scale-105"
                      }`}
                      title={opt.name}
                      aria-label={`Select ${opt.name} avatar color`}
                    >
                      {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2.5 px-0.5">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full font-bold text-xs border transition-colors ${color.bgClass} ${color.textClass} ${color.borderClass}`}
                >
                  {previewInitials}
                </div>
                <p className="text-xs text-slate-500">
                  Preview: <span className="font-semibold text-slate-700">{previewInitials}</span> with {color.name} theme
                </p>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="new-mgr-role">
                Role / Workbook
              </label>
              <input
                id="new-mgr-role"
                name="role_title"
                className="field"
                placeholder="e.g. Operations Manager"
              />
            </div>

            {isDirector && (
              <>
                {teamHierarchyReady && (
                  <div>
                    <label className="label" htmlFor="new-mgr-parent">
                      Reports to
                    </label>
                    <select id="new-mgr-parent" name="parent_manager_id" className="field" defaultValue="">
                      <option value="">No manager — leadership level</option>
                      {managers
                        .filter((manager) => manager.profile?.role !== "director")
                        .map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-400">
                      Selecting a manager places this person underneath them in the team view.
                    </p>
                  </div>
                )}

                <div>
                  <label className="label" htmlFor="new-mgr-sys-role">
                    System Role (Permissions)
                  </label>
                  <select
                    id="new-mgr-sys-role"
                    name="system_role"
                    className="field"
                    defaultValue="manager"
                  >
                    <option value="manager">Normal — Assigned and team actions only</option>
                    <option value="director">Admin — Full access (All workbooks & settings)</option>
                  </select>
                </div>
              </>
            )}

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
                {isPending ? "Adding…" : isDirector ? "Add Manager" : "Add Employee"}
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
  managers,
  isDirector,
  teamHierarchyReady,
  currentColorKey,
  onSaveColor,
  isSelf,
  onClose,
}: {
  manager: ManagerWithProfile;
  managers: ManagerWithProfile[];
  isDirector: boolean;
  teamHierarchyReady: boolean;
  currentColorKey: string;
  onSaveColor: (colorKey: string) => void;
  isSelf?: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState(manager.name);
  const [selectedColor, setSelectedColor] = useState(currentColorKey);

  const previewInitials = getInitials(name, manager.source_code);
  const color = AVATAR_PALETTE[selectedColor] || AVATAR_PALETTE.teal;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("manager_id", manager.id);
    fd.append("avatar_color", selectedColor);

    startTransition(async () => {
      const res = await updateManagerCredentials(fd);
      if (res?.ok === false) {
        setError(res.message || "Failed to update credentials");
      } else {
        onSaveColor(selectedColor);
        onClose();
      }
    });
  };

  const isDirectorRole =
    manager.profile?.role === "director" ||
    (!manager.profile && manager.role_title?.toLowerCase() === "director");

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
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label">Avatar Color</label>
                <span className="text-xs font-semibold text-slate-500">
                  {color.name}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                {Object.entries(AVATAR_PALETTE).map(([key, opt]) => {
                  const isSelected = selectedColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedColor(key)}
                      className={`relative grid h-7 w-7 place-items-center rounded-full transition-all ${opt.dotClass} cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-slate-800 ring-offset-2 scale-110 shadow-xs"
                          : "opacity-80 hover:opacity-100 hover:scale-105"
                      }`}
                      title={opt.name}
                      aria-label={`Select ${opt.name} avatar color`}
                    >
                      {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2.5 px-0.5">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full font-bold text-xs border transition-colors ${color.bgClass} ${color.textClass} ${color.borderClass}`}
                >
                  {previewInitials}
                </div>
                <p className="text-xs text-slate-500">
                  Preview: <span className="font-semibold text-slate-700">{previewInitials}</span> with {color.name} theme
                </p>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="edit-mgr-role">
                Role / Workbook
              </label>
              <input
                id="edit-mgr-role"
                name="role_title"
                className="field"
                defaultValue={manager.role_title || ""}
              />
            </div>

            {isDirector && (
              <>
                {teamHierarchyReady && <div>
                  <label className="label" htmlFor="edit-mgr-parent">
                    Reports to
                  </label>
                  <select
                    id="edit-mgr-parent"
                    name="parent_manager_id"
                    className="field"
                    defaultValue={manager.parent_manager_id || ""}
                    disabled={isDirectorRole}
                  >
                    <option value="">No manager — leadership level</option>
                    {managers
                      .filter((option) => option.id !== manager.id && option.profile?.role !== "director")
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                  </select>
                  {isDirectorRole && (
                    <p className="mt-1 text-xs text-slate-400">Directors remain at the top level.</p>
                  )}
                </div>}

                <div>
                  <label className="label" htmlFor="edit-mgr-sys-role">
                    System Role (Permissions)
                  </label>
                  <select
                    id="edit-mgr-sys-role"
                    name="system_role"
                    className="field"
                    defaultValue={isDirectorRole ? "director" : "manager"}
                    disabled={isSelf}
                  >
                    <option value="manager">Normal — Assigned and team actions only</option>
                    <option value="director">Admin — Full access (All workbooks & settings)</option>
                  </select>
                  {isSelf ? (
                    <p className="mt-1 text-xs text-amber-600">
                      You cannot change your own admin director role while logged in.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">
                      Admins have full access to all workbooks and settings.
                    </p>
                  )}
                </div>
              </>
            )}

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
              />
            </div>

            <div>
              <label className="label" htmlFor="edit-mgr-password">
                {manager.profile_id ? "Set New Password" : "Assign Password (Optional)"}
              </label>
              <input
                id="edit-mgr-password"
                name="password"
                type="password"
                minLength={6}
                className="field"
                placeholder={manager.profile_id ? "Leave blank to keep unchanged" : "Leave blank or at least 6 characters"}
              />
              <p className="mt-1 text-xs text-slate-400">
                {manager.profile_id
                  ? "Enter a new password to update the manager's login password."
                  : "Enter a password to activate their user account now, or leave blank to save details only."}
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

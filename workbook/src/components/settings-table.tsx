"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, CornerDownRight, FolderCog, KeyRound, Mail, Pencil, ShieldCheck, Trash2, User, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { createManager, updateManagerCredentials, deleteManager, setManagerPermission } from "@/app/actions";
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
  canManageLogins,
  teamHierarchyReady,
  permissionsReady,
}: {
  managers: ManagerWithProfile[];
  currentProfileId?: string;
  currentManagerId?: string | null;
  isDirector: boolean;
  canManageEmployees: boolean;
  canManageLogins: boolean;
  teamHierarchyReady: boolean;
  permissionsReady: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"settings" | "permissions">("settings");
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
      {isDirector && !permissionsReady && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <div>
            <p className="font-bold">Permissions update pending</p>
            <p className="mt-0.5 text-amber-800">
              Apply the granular permissions migration before changing individual access.
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {!isDirector && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Employees & User Logins</h2>
            <p className="text-sm text-slate-500">
              {canManageEmployees
                ? "Add employees and manage the people who report directly to you."
                : "Manage your login and the employees who report to you."}
            </p>
          </div>
        )}
        {isDirector && (
          <div className="flex items-end gap-1 border-b border-slate-200" role="tablist" aria-label="Team administration">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0097B2] ${
                activeTab === "settings"
                  ? "border-slate-200 bg-white text-slate-900 shadow-[0_-1px_3px_rgba(15,23,42,0.04)]"
                  : "border-transparent bg-slate-100/70 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <FolderCog size={17} /> Settings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "permissions"}
              onClick={() => setActiveTab("permissions")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0097B2] ${
                activeTab === "permissions"
                  ? "border-slate-200 bg-white text-slate-900 shadow-[0_-1px_3px_rgba(15,23,42,0.04)]"
                  : "border-transparent bg-slate-100/70 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <ShieldCheck size={17} /> Permissions
            </button>
          </div>
        )}
        {(isDirector || canManageEmployees) && (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn btn-primary inline-flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={16} />
            {isDirector ? "Add Manager" : "Add Employee"}
          </button>
        )}
      </div>

      {(!isDirector || activeTab === "settings") && <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Manager</th>
                <th className="px-6 py-3.5">Role / Workbook</th>
                <th className="px-6 py-3.5">System Role</th>
                <th className="px-6 py-3.5">Email / Login</th>
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
                const canEdit = isDirector || isSelf || ((canManageEmployees || canManageLogins) && m.parent_manager_id === currentManagerId);

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
                          title="Manager — Access is configured in Permissions"
                        >
                          <User size={13} className="text-slate-500" />
                          Manager
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
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-[#0097B2]/40 hover:bg-[#E0F7FA]/60 hover:text-[#007A91] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0097B2]"
                              title={hasAccount ? `Edit ${m.name}` : `Set login for ${m.name}`}
                              aria-label={hasAccount ? `Edit ${m.name}` : `Set login for ${m.name}`}
                            >
                              <Pencil size={17} />
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
      </div>}

      {isDirector && activeTab === "permissions" && (
        <PermissionsMatrix
          managers={orderedManagers}
          permissionsReady={permissionsReady}
        />
      )}

      {/* Add Manager Modal */}
      {isAddOpen && (
        <AddManagerModal
          managers={managers}
          isDirector={isDirector}
          teamHierarchyReady={teamHierarchyReady}
          canManageLogins={canManageLogins}
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
          canManageEmployees={canManageEmployees}
          canManageLogins={canManageLogins}
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

const PERMISSION_COLUMNS = [
  { key: "can_add_actions", label: "Add actions" },
  { key: "can_edit_actions", label: "Edit actions" },
  { key: "can_reassign_actions", label: "Reassign actions" },
  { key: "can_sign_off_actions", label: "Sign off actions" },
  { key: "can_delete_actions", label: "Delete actions" },
  { key: "can_manage_employees", label: "Manage employees" },
  { key: "can_manage_logins", label: "Manage logins" },
] as const;

type PermissionKey = (typeof PERMISSION_COLUMNS)[number]["key"];

function PermissionsMatrix({
  managers,
  permissionsReady,
}: {
  managers: Array<{ manager: ManagerWithProfile; depth: number }>;
  permissionsReady: boolean;
}) {
  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white" aria-labelledby="permissions-heading">
      <div className="border-b border-slate-200 px-1 py-4">
        <h2 id="permissions-heading" className="font-bold text-slate-900">Manager permissions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose what each manager can do. Director access is always enabled.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1220px] w-full border-collapse text-sm">
          <thead className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-64 border-r border-slate-200 bg-white px-5 py-3.5 text-left">
                Manager
              </th>
              {PERMISSION_COLUMNS.map((permission) => (
                <th key={permission.key} scope="col" className="min-w-36 px-3 py-3.5 text-center">
                  {permission.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {managers.map(({ manager, depth }) => {
              const isAdmin = manager.profile?.role === "director" ||
                (!manager.profile && manager.role_title?.toLowerCase() === "director");
              return (
                <tr key={manager.id} className="group hover:bg-slate-50/70">
                  <th scope="row" className="sticky left-0 z-10 border-r border-slate-100 bg-white px-5 py-3.5 text-left font-normal group-hover:bg-slate-50">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${Math.min(depth, 4) * 22}px` }}>
                      {depth > 0 && <CornerDownRight aria-label="Employee" size={16} className="shrink-0 text-[#0097B2]" />}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900" title={manager.name}>{manager.name}</p>
                        <p className="font-mono text-xs text-slate-400">{manager.source_code}</p>
                      </div>
                    </div>
                  </th>
                  {PERMISSION_COLUMNS.map((permission) => (
                    <td key={permission.key} className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <span className="inline-flex h-11 w-11 items-center justify-center text-purple-600" title="Full access" aria-label={`${permission.label}: full access`}>
                          <Check size={18} strokeWidth={2.5} />
                        </span>
                      ) : (
                        <PermissionToggle
                          manager={manager}
                          permission={permission.key}
                          enabled={Boolean(manager[permission.key])}
                          disabled={!permissionsReady}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PermissionToggle({
  manager,
  permission,
  enabled,
  disabled,
}: {
  manager: ManagerWithProfile;
  permission: PermissionKey;
  enabled: boolean;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const label = PERMISSION_COLUMNS.find((item) => item.key === permission)?.label ?? permission;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${enabled ? "Disable" : "Enable"} ${label.toLowerCase()} for ${manager.name}`}
      disabled={isPending || disabled}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("manager_id", manager.id);
          formData.set("permission", permission);
          formData.set("enabled", String(!enabled));
          const result = await setManagerPermission(formData);
          if (!result.ok) alert(result.message || "Could not update this permission.");
        });
      }}
      title={disabled ? "Available after the permissions migration" : `${label}: ${enabled ? "allowed" : "not allowed"}`}
      className="inline-flex h-11 w-14 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0097B2] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-[#0097B2]" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left,right] ${
            enabled ? "right-0.5" : "left-0.5"
          }`}
        />
      </span>
      <span className="sr-only">{isPending ? "Updating" : enabled ? "Allowed" : "Not allowed"}</span>
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
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-300 cursor-not-allowed"
        title="You cannot delete your own active account"
      >
        <Trash2 size={17} />
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
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-50"
      title={`Delete ${managerName}`}
      aria-label={`Delete ${managerName}`}
    >
      <Trash2 size={17} />
    </button>
  );
}

function AddManagerModal({
  managers,
  isDirector,
  teamHierarchyReady,
  canManageLogins,
  onClose,
  onCreated,
}: {
  managers: ManagerWithProfile[];
  isDirector: boolean;
  teamHierarchyReady: boolean;
  canManageLogins: boolean;
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              aria-label={isDirector ? "Close add manager dialog" : "Close add employee dialog"}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {error}
              </p>
            )}

            {(isDirector || canManageLogins) && <div>
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
            </div>}

            {(isDirector || canManageLogins) && <div>
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
            </div>}

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
                    <option value="manager">Manager — Configurable access</option>
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
  canManageEmployees,
  canManageLogins,
  onClose,
}: {
  manager: ManagerWithProfile;
  managers: ManagerWithProfile[];
  isDirector: boolean;
  teamHierarchyReady: boolean;
  currentColorKey: string;
  onSaveColor: (colorKey: string) => void;
  isSelf?: boolean;
  canManageEmployees: boolean;
  canManageLogins: boolean;
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
  const canEditDetails = isDirector || Boolean(isSelf) || canManageEmployees;
  const canEditLogin = isDirector || Boolean(isSelf) || canManageLogins;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-[#007A91]">{manager.source_code}</span>
              <h3 className="text-lg font-bold text-slate-900">Manage {manager.name}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              aria-label="Close manager editor"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200 md:col-span-2">
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
                disabled={!canEditDetails}
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
                      disabled={!canEditLogin}
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
                disabled={!canEditDetails}
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
                disabled={!canEditLogin}
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
                disabled={!canEditLogin}
              />
              <p className="mt-1 text-xs text-slate-400">
                {manager.profile_id
                  ? "Enter a new password to update the manager's login password."
                  : "Enter a password to activate their user account now, or leave blank to save details only."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 md:col-span-2">
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

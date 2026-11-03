"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { savePermissionChange } from "@/lib/permission-save";
import { canOpenSection, workspaceSectionGroups } from "@/lib/workspace-sections";
import type { ActionState } from "@/app/actions";
import type { WorkspaceUser } from "@/lib/workspace-users";
import type { AccessContext } from "@/lib/auth";
import type { ManagerWithProfile } from "@/workbook/lib/data";
import { SettingsEmployeePermissions, WorkbookActionPermissions } from "@/components/config-permission-controls";

export function WorkspacePermissionsForm({ user, actor, manager, permissionsReady = false }: { user: WorkspaceUser; actor?: AccessContext; manager?: ManagerWithProfile | null; permissionsReady?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const director = user.role === "Director" || user.isAdmin;
  const delegated = Boolean(actor && actor.role !== "director");
  const ownAccess = actor?.userId === user.id;
  const editable = !director && !ownAccess;
  const available = new Set(actor?.role === "director" || !actor ? workspaceSectionGroups.flatMap(group => group.sections.map(section => section.id)) : actor.sections ?? []);
  const [selected, setSelected] = useState(() => new Set((user.sections ?? workspaceSectionGroups.flatMap(group => group.sections.filter(section => canOpenSection({ role: director ? "director" : "manager", qaEnabled: user.qa, finance: user.finance, hr: user.hr, maintenance: user.maintenance, workbookRole: user.workbook ? "manager" : null }, section.id)).map(section => section.id))).filter(id => !actor || actor.role === "director" || actor.sections?.includes(id))));
  const [workbook, setWorkbook] = useState(user.workbook && (!actor || actor.role === "director" || Boolean(actor.workbookRole)));
  const [maintenanceLead, setMaintenanceLead] = useState(Boolean(user.canManageMaintenance && (!actor || actor.role === "director" || actor.managesMaintenance)));
  function toggle(ids: string[], enabled: boolean) {
    setSelected(current => { const next = new Set(current); for (const id of ids) { if (enabled) next.add(id); else next.delete(id); } return next; });
    if (ids.includes("maintenance.issues") && !enabled) setMaintenanceLead(false);
    setState({});
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData();
    data.set("user_id", user.id); data.set("sections_version", "1");
    for (const section of selected) data.append("sections", section);
    if (workbook) data.set("workbook", "on");
    if (maintenanceLead && selected.has("maintenance.issues")) data.set("can_manage_maintenance", "on");
    setState({});
    startTransition(async () => { const result = await savePermissionChange("panels", data); setState(result); if (result.ok) router.refresh(); });
  }
  return <form onSubmit={submit} className="space-y-6">
    <header><h3 className="text-lg font-semibold text-slate-950">Visible tabs & sections</h3><p className="mt-1 text-sm text-slate-600">Choose the areas and sections this person can open.</p></header>
    <div className="grid gap-x-8 gap-y-6 xl:grid-cols-2">
      <section aria-label="Workbook" className="border-t border-slate-300 pt-4"><label className="flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" name="workbook" className="size-5 accent-teal-800" checked={director || workbook} disabled={!editable || !user.canUseWorkbook || (delegated && !actor?.workbookRole) || pending} onChange={event => { setWorkbook(event.target.checked); setState({}); }} />Workbook</label>{manager && actor?.role === "director" && <WorkbookActionPermissions key={manager.id} manager={manager} permissionsReady={permissionsReady} embedded />}</section>
      {workspaceSectionGroups.filter(group => group.sections.some(section => available.has(section.id))).map(group => {
        const eligible = group.sections.filter(section => available.has(section.id));
        const count = eligible.filter(section => director || selected.has(section.id)).length;
        const all = eligible.length > 0 && count === eligible.length;
        const partial = count > 0 && !all;
        return <section key={group.id} className="border-t border-slate-300 pt-4">
          <div className="flex items-center justify-between gap-4"><label className="flex min-h-11 items-center gap-3 font-semibold text-slate-950"><input type="checkbox" className="size-5 accent-teal-800" checked={all} ref={element => { if (element) element.indeterminate = partial; }} aria-checked={partial ? "mixed" : all} disabled={!editable || !eligible.length || pending} onChange={event => toggle(eligible.map(section => section.id), event.target.checked)} />{group.label}</label><span className="text-sm text-slate-500">{count}/{eligible.length}</span></div>
          <div className="ml-8 mt-2 space-y-1">{eligible.map(section => {
            return <label key={section.id} className="flex min-h-11 items-center gap-3 text-sm text-slate-800"><input type="checkbox" className="size-5 accent-teal-800" aria-label={`${group.label}: ${section.label}`} checked={director || selected.has(section.id)} disabled={!editable || pending} onChange={event => toggle([section.id], event.target.checked)} /><span>{section.label}</span></label>;
          })}</div>
          {group.id === "maintenance" && <label className="ml-8 mt-3 flex min-h-11 items-center gap-3 border-t border-slate-200 pt-3 text-sm"><input className="size-5 accent-teal-800" type="checkbox" checked={director || maintenanceLead} disabled={!editable || !selected.has("maintenance.issues") || (delegated && !actor?.managesMaintenance) || pending} onChange={event => { setMaintenanceLead(event.target.checked); setState({}); }} />Manage maintenance across all homes</label>}
        </section>;
      })}
      {manager && actor?.role === "director" && <SettingsEmployeePermissions key={`settings:${manager.id}`} manager={manager} permissionsReady={permissionsReady} embedded />}
    </div>
    {!editable ? <p className="text-sm text-teal-800">{director ? "Director access is always enabled." : "Your own access is set by your manager."}</p> : <div className="flex flex-wrap items-center gap-4"><button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60">{pending ? "Saving…" : "Save section access"}</button>{state.message && <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>}</div>}
  </form>;
}

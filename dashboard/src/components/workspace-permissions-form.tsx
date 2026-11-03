"use client";

import { useActionState } from "react";
import { saveWorkspacePermissions, type ActionState } from "@/app/actions";
import type { WorkspaceUser } from "@/lib/workspace-users";

export function WorkspacePermissionsForm({ user }: { user: WorkspaceUser }) {
  const [state, action, pending] = useActionState(saveWorkspacePermissions, {} as ActionState);
  const areas = [
    { key: "qa", label: "Quality assurance", enabled: user.isAdmin || user.hasQaMembership, hint: "Assign a QA home first" },
    { key: "workbook", label: "Workbook", enabled: user.canUseWorkbook, hint: "Manager account required" },
    { key: "finance", label: "Finance", enabled: true, hint: "" },
    { key: "hr", label: "HR", enabled: true, hint: "" },
  ] as const;

  return <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <input type="hidden" name="user_id" value={user.id} />
    <div className="text-lg font-semibold text-slate-950">Panels</div>
    <div className="mt-1 text-sm text-slate-600">Choose which areas this person can open.</div>
    <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Panel access</legend>
      {areas.map(area => <label key={area.key} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 has-[:checked]:border-teal-300 has-[:checked]:bg-teal-50/70">
        <input type="checkbox" name={area.key} defaultChecked={user[area.key]} disabled={user.isAdmin || !area.enabled || pending}
          className="size-5 accent-teal-700" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{area.label}</div>
          {!area.enabled && <div className="mt-0.5 text-xs text-slate-500">{area.hint}</div>}
        </div>
      </label>)}
    </fieldset>
    {user.isAdmin ? <div className="mt-4 text-xs font-medium text-teal-800">Director access is always enabled.</div> :
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
          {pending ? "Saving…" : "Save panel access"}
        </button>
        {state.message && <div role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</div>}
      </div>}
  </form>;
}

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveQaHomeAssignments } from "@/app/actions";
import type { Home } from "@/lib/types";
import type { WorkspaceUser } from "@/lib/workspace-users";
import { setManagerPermission } from "@/workbook/actions";
import type { ManagerWithProfile } from "@/workbook/lib/data";

const actionGroups = [
  { title: "Actions", items: [
    { key: "can_add_actions", label: "Add actions" },
    { key: "can_edit_actions", label: "Edit actions" },
    { key: "can_reassign_actions", label: "Reassign actions" },
    { key: "can_sign_off_actions", label: "Sign off actions" },
    { key: "can_delete_actions", label: "Delete actions" },
  ] },
  { title: "Team", items: [
    { key: "can_manage_employees", label: "Manage employees" },
    { key: "can_manage_logins", label: "Manage logins" },
  ] },
] as const;

type ActionKey = typeof actionGroups[number]["items"][number]["key"];

export function WorkbookActionPermissions({ manager, permissionsReady }: {
  manager: ManagerWithProfile;
  permissionsReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [values, setValues] = useState<Record<ActionKey, boolean>>(() => Object.fromEntries(
    actionGroups.flatMap(group => group.items.map(item => [item.key, Boolean(manager[item.key])])),
  ) as Record<ActionKey, boolean>);
  const isDirector = manager.profile?.role === "director";

  function change(key: ActionKey, enabled: boolean) {
    setValues(previous => ({ ...previous, [key]: enabled }));
    setFeedback("");
    startTransition(async () => {
      const data = new FormData();
      data.set("manager_id", manager.id);
      data.set("permission", key);
      data.set("enabled", String(enabled));
      const result = await setManagerPermission(data);
      if (!result.ok) {
        setValues(previous => ({ ...previous, [key]: !enabled }));
        setFeedback(result.message || "Could not save this permission.");
      } else router.refresh();
    });
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="workbook-actions-title">
    <h3 id="workbook-actions-title" className="text-lg font-semibold text-slate-950">Workbook actions</h3>
    <div className="mt-1 text-sm text-slate-600">What this person can do in Workbook.</div>
    {!permissionsReady && <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Action permissions are unavailable until the database update is applied.</div>}
    <div className="mt-5 grid gap-6 sm:grid-cols-2">
      {actionGroups.map(group => <fieldset key={group.title} className="border-t border-slate-200 pt-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">{group.title}</legend>
        <div className="space-y-2">
          {group.items.map(item => <label key={item.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-slate-800 hover:bg-slate-50">
            <input type="checkbox" checked={isDirector || values[item.key]} disabled={isDirector || !permissionsReady || pending}
              onChange={event => change(item.key, event.target.checked)} className="size-5 accent-teal-700" />
            {item.label}
          </label>)}
        </div>
      </fieldset>)}
    </div>
    {isDirector && <div className="mt-4 text-xs font-medium text-teal-800">Directors can perform every Workbook action.</div>}
    {feedback && <div role="status" className="mt-4 text-sm text-red-700">{feedback}</div>}
  </section>;
}

export function QaHomePermissions({ user, homes }: { user: WorkspaceUser; homes: Home[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const assigned = new Set(user.qaAssignedHomeIds);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("member_id", user.qaMemberId!);
    data.set("active", data.has("active") ? "true" : "false");
    setFeedback("");
    startTransition(async () => {
      const result = await saveQaHomeAssignments(data);
      setFeedback(result.message || (result.ok ? "QA access saved." : "Could not save QA access."));
      if (result.ok) router.refresh();
    });
  }

  return <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h3 className="text-lg font-semibold text-slate-950">Quality assurance homes</h3>
    <div className="mt-1 text-sm text-slate-600">Choose the homes whose reports this person can access.</div>
    <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-900">
      <input type="checkbox" name="active" defaultChecked={user.qaMemberActive} disabled={pending} className="size-5 accent-teal-700" />
      House Lead access active
    </label>
    <fieldset className="mt-3 grid gap-2 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-semibold text-slate-900">Assigned homes</legend>
      {homes.map(home => <label key={home.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm hover:bg-slate-50">
        <input type="checkbox" name="home_ids" value={home.id} defaultChecked={assigned.has(home.id)} disabled={pending} className="size-5 accent-teal-700" />
        {home.name}{!home.active && " (inactive)"}
      </label>)}
    </fieldset>
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60">{pending ? "Saving…" : "Save QA access"}</button>
      {feedback && <div role="status" className="text-sm text-slate-700">{feedback}</div>}
    </div>
  </form>;
}

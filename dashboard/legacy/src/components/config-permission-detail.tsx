import Link from "next/link";
import { QaHomePermissions, SettingsEmployeePermissions, WorkbookActionPermissions } from "@/components/config-permission-controls";
import { WorkspacePermissionsForm } from "@/components/workspace-permissions-form";
import type { ConfigPerson } from "@/lib/config-directory";
import type { Home } from "@/lib/types";
import type { AccessContext } from "@/lib/auth";

export function ConfigPermissionDetail({ person, homes, permissionsReady, actor }: {
  person: ConfigPerson;
  homes: Home[];
  permissionsReady: boolean;
  actor: AccessContext;
}) {
  return <div className="space-y-5">
    <header className="pb-2">
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">{person.name}</h2>
      <div className="mt-1 text-sm text-slate-600">{person.email || "No login email"} · {person.role}</div>
    </header>
    {actor.role !== "director" && !actor.canManageEmployees && <p className="text-sm text-slate-600">You can view this tab. Changing employee permissions requires a separate permission.</p>}
    {(actor.role === "director" || actor.canManageEmployees) && <>
    {person.user ? <WorkspacePermissionsForm key={`panels:${person.key}`} user={person.user} actor={actor} manager={person.manager} permissionsReady={permissionsReady} /> :
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Panels</div>
        <div className="mt-2 text-sm text-slate-600">This person needs a login before section access can be assigned.</div>
        {actor.role === "director" || actor.canManageLogins ? <Link href={`/config/users?user=${encodeURIComponent(person.key)}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50">Set up login</Link> : <p className="mt-3 text-sm text-slate-600">Ask direction to activate the login.</p>}
      </div>}
    {person.manager && !person.user && actor.role === "director" && <WorkbookActionPermissions key={`workbook:${person.key}`} manager={person.manager} permissionsReady={permissionsReady} />}
    {person.manager && !person.user && actor.role === "director" && <SettingsEmployeePermissions manager={person.manager} permissionsReady={permissionsReady} />}
    {person.user && person.role !== "Director" && actor.userId !== person.user.id && <QaHomePermissions key={`qa:${person.key}`} user={person.user} homes={homes} />}
    </>}
  </div>;
}

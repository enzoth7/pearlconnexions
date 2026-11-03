"use client";

import { useActionState, useState } from "react";
import { saveWorkspaceLinks } from "@/app/links/actions";
import type { WorkspaceLinks, WorkspaceLinksState } from "@/lib/workspace-links";

const destinations = [
  { key: "dashboard_url", name: "Dashboard" },
  { key: "website_url", name: "Website" },
] as const;

export function WorkspaceLinksForm({ links, canEdit }: { links: WorkspaceLinks; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState<WorkspaceLinksState, FormData>(saveWorkspaceLinks, {});
  const [draft, setDraft] = useState(links);
  const savedLinks = state.links ?? links;
  return <form action={formAction} className="space-y-5">
    <div className="grid gap-5 xl:grid-cols-2">
      {destinations.map(({ key, name }) => <section key={key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7" aria-labelledby={`${key}-title`}>
        <h2 id={`${key}-title`} className="text-2xl font-semibold tracking-tight">{name}</h2>
        {canEdit ? <div className="mt-6">
          <label htmlFor={key} className="mb-2 block text-sm font-semibold">{name} URL</label>
          <input id={key} name={key} type="url" value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} required maxLength={2048}
            aria-invalid={Boolean(state.errors?.[key]?.length)} aria-describedby={state.errors?.[key]?.length ? `${key}-error` : undefined}
            className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
          {state.errors?.[key]?.length ? <p id={`${key}-error`} className="mt-2 text-sm text-red-700">{state.errors[key][0]}</p> : null}
        </div> : <p className="mt-4 break-all text-sm text-slate-600">{savedLinks[key]}</p>}
        <a href={savedLinks[key]} target="_blank" rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-teal-800 px-4 py-2 text-sm font-semibold text-teal-900 transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
          Open {name.toLowerCase()}
        </a>
      </section>)}
    </div>
    {canEdit ? <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={pending}
        className="min-h-11 rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60">
        {pending ? "Saving…" : "Save links"}
      </button>
      {state.message ? <p role="status" className={`text-sm ${state.ok ? "text-teal-800" : "text-red-700"}`}>{state.message}</p> : null}
    </div> : null}
  </form>;
}

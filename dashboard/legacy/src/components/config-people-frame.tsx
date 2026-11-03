import Link from "next/link";
import type { ReactNode } from "react";
import type { ConfigPerson } from "@/lib/config-directory";

function ConfigTabs({ view, selectedKey = "" }: { view: "users" | "permissions"; selectedKey?: string }) {
  const selectedQuery = selectedKey && selectedKey !== "new" ? `?user=${encodeURIComponent(selectedKey)}` : "";
  const tabs = [
    { label: "Users", href: selectedKey === "new" ? "/config/users?user=new" : `/config/users${selectedQuery}`, key: "users" },
    { label: "Permissions", href: `/config/permissions${selectedQuery}`, key: "permissions" },
  ] as const;
  return <nav aria-label="Users and permissions tabs" className="inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
    {tabs.map(tab => <Link key={tab.key} href={tab.href} aria-current={view === tab.key ? "page" : undefined}
      className={`min-w-28 rounded-lg px-5 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${view === tab.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
      {tab.label}
    </Link>)}
  </nav>;
}

export function ConfigPeopleFrame({ people, selectedKey, view, canAddUser = true, children }: {
  people: ConfigPerson[];
  selectedKey: string;
  view: "users" | "permissions";
  canAddUser?: boolean;
  children: ReactNode;
}) {
  return <div className="space-y-7">
    <header>
      <h1 className="text-4xl font-semibold tracking-[-0.045em] text-slate-950">Users & permissions</h1>
      <div className="mt-2 max-w-2xl text-sm text-slate-600">Select a person to manage their account and access.</div>
    </header>
    <ConfigTabs view={view} selectedKey={selectedKey} />
    <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(12rem,15.5rem)_minmax(0,1fr)]">
      <aside className="min-w-0 lg:border-r lg:border-slate-200 lg:pr-5">
        <nav aria-label="People" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {people.map(person => <Link key={person.key} href={`/config/${view}?user=${encodeURIComponent(person.key)}`}
            aria-current={selectedKey === person.key ? "true" : undefined}
            className={`min-w-40 shrink-0 rounded-xl px-4 py-3 text-left transition-colors lg:min-w-0 lg:shrink ${selectedKey === person.key ? "bg-[#e1eee9] text-[#164f48]" : "bg-white text-slate-700 hover:bg-slate-100"}`}>
            <strong className="block truncate text-sm">{person.name}</strong>
            <span className="mt-1 block truncate text-xs opacity-75">{person.email || (person.manager ? "No login" : person.role)}</span>
          </Link>)}
        </nav>
        {view === "users" && canAddUser && <Link href="/config/users?user=new" aria-current={selectedKey === "new" ? "true" : undefined}
          className={`mt-3 flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${selectedKey === "new" ? "bg-teal-800 text-white" : "border border-teal-700 bg-white text-teal-800 hover:bg-teal-50"}`}>
          Add user
        </Link>}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  </div>;
}

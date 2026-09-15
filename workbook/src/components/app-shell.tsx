import Link from "next/link";
import { CheckCircle2, ClipboardCheck, LayoutDashboard, ListChecks, LogOut, Settings } from "lucide-react";
import { signOut } from "@/app/actions";

const baseLinks = [
  ["Overview", "/", LayoutDashboard],
  ["Action register", "/actions", ListChecks],
  ["Monthly review", "/reviews", ClipboardCheck],
  ["Completed Actions", "/archive", CheckCircle2],
] as const;

export function AppShell({
  children,
  name,
  role = "director",
}: {
  children: React.ReactNode;
  name: string;
  role?: string;
}) {
  const isDirector = role === "director";
  const links = [
    ...baseLinks,
    ...(isDirector ? ([["Settings", "/settings", Settings]] as const) : []),
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <aside className="border-b border-slate-200 bg-[#102a5a] text-white lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 px-5 lg:h-20">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white font-black text-blue-900">
            P
          </div>
          <div>
            <p className="font-bold">Pearl Connexions</p>
            <p className="text-xs text-blue-200">Leadership</p>
          </div>
        </div>
        <nav
          aria-label="Primary navigation"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible"
        >
          {links.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-blue-50 transition hover:bg-white/10"
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-4 lg:absolute lg:bottom-0 lg:block lg:w-[248px]">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-blue-200 capitalize">{role}</p>
          <form action={signOut} className="mt-3">
            <button className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold hover:bg-white/10">
              <LogOut size={17} /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></div>{action}</header>;
}

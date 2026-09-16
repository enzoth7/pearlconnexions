"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const isDirector = role === "director";
  const links = [
    ...baseLinks,
    ...(isDirector ? ([["Settings", "/settings", Settings]] as const) : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[254px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <aside className="border-b border-slate-800/80 bg-[#0B192C] text-white lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r lg:flex lg:flex-col lg:justify-between">
        <div>
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="overflow-hidden rounded-lg bg-white px-2.5 py-1.5 shadow-xs ring-1 ring-white/10">
                <Image
                  src="/LogoTransp.png"
                  alt="Pearl Connexions"
                  width={140}
                  height={56}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </div>
            </Link>
            <form action={signOut}>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>

          {/* Desktop Header with official brand logo */}
          <div className="hidden border-b border-white/10 p-4 lg:block">
            <Link href="/" className="group block">
              <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-white/15 transition group-hover:shadow-md flex items-center justify-center">
                <Image
                  src="/LogoTransp.png"
                  alt="Pearl Connexions"
                  width={260}
                  height={103}
                  className="h-16 w-auto max-w-full object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav
            aria-label="Primary navigation"
            className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1.5 lg:overflow-visible lg:px-3 lg:pt-4"
          >
            {links.map(([label, href, Icon]) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm transition ${
                    active
                      ? "bg-[#0097B2] text-white shadow-xs font-bold"
                      : "text-slate-200 hover:bg-white/10 hover:text-white font-semibold"
                  }`}
                >
                  <Icon
                    size={18}
                    className={active ? "text-white" : "text-slate-400"}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Footer Profile & Sign Out */}
        <div className="hidden border-t border-white/10 p-4 bg-[#07101E]/60 lg:block">
          <div className="px-1">
            <p className="text-sm font-bold text-white">{name}</p>
            <p className="text-xs text-[#00E5FF] capitalize font-medium">{role}</p>
          </div>
          <form action={signOut} className="mt-3">
            <button className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition">
              <LogOut size={16} /> Sign out
            </button>
          </form>
          <p className="mt-3 text-center text-[10px] text-slate-400/80 italic">
            Pearl Connexions CIC
          </p>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></div>{action}</header>;
}

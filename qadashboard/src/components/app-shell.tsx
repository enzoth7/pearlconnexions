import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  name,
  role,
}: {
  children: React.ReactNode;
  name: string;
  role: "director" | "house_lead";
}) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-[#f4f7fb]">
      <a href="#main" className="sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-white focus:p-3">
        Skip to content
      </a>
      <header className="bg-[linear-gradient(120deg,#071b35_0%,#0d2c54_58%,#123863_100%)] text-white shadow-[0_8px_30px_rgba(8,30,60,0.16)]">
        <div className="mx-auto grid min-h-20 max-w-[1480px] grid-cols-[1fr_auto] items-center gap-x-3 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
          <div className="flex min-w-0 items-center gap-3 py-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white font-black text-[#0b2a52] shadow-sm" aria-hidden="true">P</div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">Pearl Connexions</p>
              <p className="truncate text-base font-bold tracking-tight sm:text-lg">Quality assurance</p>
            </div>
          </div>
          <div className="order-3 col-span-2 min-w-0 border-t border-white/10 lg:order-none lg:col-span-1 lg:border-0">
            <NavLinks role={role} />
          </div>
          <form action={signOut} className="justify-self-end">
            <Button
              type="submit"
              variant="ghost" size="icon"
              className="size-11 cursor-pointer text-white transition-colors hover:bg-white/10 hover:text-white"
              aria-label={`Sign out ${name}`}
            >
              <LogOut aria-hidden="true" />
            </Button>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto min-w-0 max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-[0_2px_10px_rgba(15,42,78,0.06)] sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-700">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#102a52] sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </header>
  );
}
